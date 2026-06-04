package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.Appointment
import com.vet4pet.app.data.models.api.CreateAppointmentRequest
import com.vet4pet.app.data.models.api.VetDto
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class AppointmentsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    // ── Appointment list ──────────────────────────────────────────────────

    private val _appointments = MutableLiveData<UiState<List<Appointment>>>(UiState.Idle)
    val appointmentsState: LiveData<UiState<List<Appointment>>> = _appointments

    fun loadAppointments() {
        _appointments.value = UiState.Loading
        viewModelScope.launch {
            try {
                val list = api.getAppointments().map { it.toDomain() }
                _appointments.value = UiState.Success(list)
            } catch (e: Exception) {
                _appointments.value = UiState.Error(e.toUserMessage())
            }
        }
    }

    fun cancelAppointment(id: String, onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                api.cancelAppointment(id)
                loadAppointments()
                onDone(true)
            } catch (e: Exception) {
                onDone(false)
            }
        }
    }

    // ── Booking wizard ────────────────────────────────────────────────────

    private val _vets = MutableLiveData<UiState<List<VetDto>>>(UiState.Idle)
    val vetsState: LiveData<UiState<List<VetDto>>> = _vets

    fun loadVets() {
        if (_vets.value is UiState.Success) return
        _vets.value = UiState.Loading
        viewModelScope.launch {
            try {
                _vets.value = UiState.Success(api.getVets())
            } catch (e: Exception) {
                _vets.value = UiState.Error(e.toUserMessage())
            }
        }
    }

    private val _slots = MutableLiveData<UiState<List<String>>>(UiState.Idle)
    val slotsState: LiveData<UiState<List<String>>> = _slots

    fun loadSlots(date: String, vetId: String?) {
        _slots.value = UiState.Loading
        viewModelScope.launch {
            try {
                val resp = api.getAvailableSlots(date, vetId?.takeIf { it.isNotBlank() })
                _slots.value = UiState.Success(resp.slots)
            } catch (e: Exception) {
                _slots.value = UiState.Error(e.toUserMessage())
            }
        }
    }

    private val _bookState = MutableLiveData<UiState<Unit>>(UiState.Idle)
    val bookState: LiveData<UiState<Unit>> = _bookState

    fun bookAppointment(request: CreateAppointmentRequest) {
        _bookState.value = UiState.Loading
        viewModelScope.launch {
            try {
                api.createAppointment(request)
                _bookState.value = UiState.Success(Unit)
                loadAppointments()
            } catch (e: Exception) {
                _bookState.value = UiState.Error(e.toUserMessage())
            }
        }
    }

    fun resetBookState() { _bookState.value = UiState.Idle }

    private fun Exception.toUserMessage(): String = when (this) {
        is HttpException -> {
            val body = response()?.errorBody()?.string()
            val msg  = body?.let { Regex("\"message\"\\s*:\\s*\"([^\"]+)\"").find(it)?.groupValues?.get(1) }
            msg ?: "Server error (${code()})"
        }
        is IOException -> "Cannot connect to server. Check your network."
        else -> message ?: "Unknown error"
    }
}
