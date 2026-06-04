package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.api.VetScheduleDto
import com.vet4pet.app.data.models.api.VetScheduleRequest
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class VetScheduleViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _schedule = MutableLiveData<UiState<VetScheduleDto>>(UiState.Idle)
    val schedule: LiveData<UiState<VetScheduleDto>> = _schedule

    private val _saveState = MutableLiveData<UiState<Unit>>(UiState.Idle)
    val saveState: LiveData<UiState<Unit>> = _saveState

    fun load() {
        _schedule.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.getVetSchedule() }
                .onSuccess { _schedule.value = UiState.Success(it) }
                .onFailure { _schedule.value = UiState.Error(it.toMsg()) }
        }
    }

    fun save(workingDays: List<Int>, workStart: String, workEnd: String) {
        if (workingDays.isEmpty()) return
        _saveState.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.upsertVetSchedule(VetScheduleRequest(workingDays, workStart, workEnd)) }
                .onSuccess { updated ->
                    _schedule.value = UiState.Success(updated)
                    _saveState.value = UiState.Success(Unit)
                }
                .onFailure { _saveState.value = UiState.Error(it.toMsg()) }
        }
    }

    fun resetSaveState() { _saveState.value = UiState.Idle }

    private fun Throwable.toMsg() = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Cannot connect to server."
        else             -> message ?: "Unknown error"
    }
}
