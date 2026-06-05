package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.api.AppointmentDto
import com.vet4pet.app.data.models.api.CreateAppointmentRequest
import com.vet4pet.app.data.models.api.CreateTimeBlockRequest
import com.vet4pet.app.data.models.api.TimeBlockDto
import com.vet4pet.app.data.models.api.UpdateAppointmentRequest
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class VetCalendarViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _appointments = MutableLiveData<UiState<List<AppointmentDto>>>(UiState.Idle)
    val appointments: LiveData<UiState<List<AppointmentDto>>> = _appointments

    private val _blocks = MutableLiveData<List<TimeBlockDto>>(emptyList())
    val blocks: LiveData<List<TimeBlockDto>> = _blocks

    fun loadDay(date: String) {
        _appointments.value = UiState.Loading
        viewModelScope.launch {
            try {
                val appts = api.getAppointments(date = date)
                _appointments.value = UiState.Success(appts)
            } catch (e: Exception) {
                _appointments.value = UiState.Error(e.toMsg())
            }
        }
        viewModelScope.launch {
            runCatching { api.getTimeBlocks(date) }
                .onSuccess { _blocks.value = it }
                .onFailure { _blocks.value = emptyList() }
        }
    }

    fun bookAppointment(request: CreateAppointmentRequest, date: String, onDone: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            runCatching { api.createAppointment(request) }
                .onSuccess { loadDay(date); onDone(true, null) }
                .onFailure { onDone(false, it.toMsg()) }
        }
    }

    fun updateAppointment(id: String, request: UpdateAppointmentRequest, date: String, onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            runCatching { api.updateAppointment(id, request) }
                .onSuccess { loadDay(date); onDone(true) }
                .onFailure { onDone(false) }
        }
    }

    fun cancelAppointment(id: String, date: String, onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            runCatching { api.cancelAppointment(id) }
                .onSuccess { loadDay(date); onDone(true) }
                .onFailure { onDone(false) }
        }
    }

    fun blockSlot(date: String, startTime: String, reason: String, onDone: (Boolean) -> Unit) {
        val parts   = startTime.split(":").map { it.toIntOrNull() ?: 0 }
        val endMins = parts[0] * 60 + parts.getOrElse(1) { 0 } + 30
        val endTime = "%02d:%02d".format(endMins / 60, endMins % 60)
        viewModelScope.launch {
            runCatching { api.createTimeBlock(CreateTimeBlockRequest(date, startTime, endTime, reason)) }
                .onSuccess { loadDay(date); onDone(true) }
                .onFailure { onDone(false) }
        }
    }

    fun deleteBlock(blockId: String, date: String) {
        viewModelScope.launch {
            runCatching { api.deleteTimeBlock(blockId) }
                .onSuccess { loadDay(date) }
        }
    }

    private fun Exception.toMsg(): String = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Connection failed."
        else             -> message ?: "Unknown error"
    }

    private fun Throwable.toMsg(): String = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Connection failed."
        else             -> message ?: "Unknown error"
    }
}
