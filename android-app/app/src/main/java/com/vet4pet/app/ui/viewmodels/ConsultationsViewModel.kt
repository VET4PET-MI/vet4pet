package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.api.ConsultationDto
import com.vet4pet.app.data.models.api.CreateConsultationRequest
import com.vet4pet.app.data.models.api.UpdateStatusRequest
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class ConsultationsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _consultations = MutableLiveData<UiState<List<ConsultationDto>>>(UiState.Idle)
    val consultations: LiveData<UiState<List<ConsultationDto>>> = _consultations

    private val _pending = MutableLiveData<List<ConsultationDto>>(emptyList())
    val pending: LiveData<List<ConsultationDto>> = _pending

    private val _actionState = MutableLiveData<UiState<ConsultationDto>>(UiState.Idle)
    val actionState: LiveData<UiState<ConsultationDto>> = _actionState

    private var pollJob: Job? = null

    fun load() {
        _consultations.value = UiState.Loading
        viewModelScope.launch {
            runCatching {
                val all     = api.getConsultations()
                val pending = api.getPendingConsultations()
                Pair(all, pending)
            }.onSuccess { (all, pend) ->
                _consultations.value = UiState.Success(all)
                _pending.value = pend
            }.onFailure {
                _consultations.value = UiState.Error(it.toMsg())
            }
        }
    }

    fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (true) {
                delay(5_000)
                runCatching { api.getPendingConsultations() }
                    .onSuccess { _pending.value = it }
            }
        }
    }

    fun stopPolling() {
        pollJob?.cancel()
        pollJob = null
    }

    fun accept(id: String) = updateStatus(id, "active")
    fun decline(id: String) = updateStatus(id, "ended")
    fun end(id: String)     = updateStatus(id, "ended")

    private fun updateStatus(id: String, status: String) {
        _actionState.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.updateConsultationStatus(id, UpdateStatusRequest(status)) }
                .onSuccess { updated ->
                    _actionState.value = UiState.Success(updated)
                    load()
                }
                .onFailure { _actionState.value = UiState.Error(it.toMsg()) }
        }
    }

    fun requestConsultation(ownerName: String, petId: String?, petName: String, notes: String) {
        _actionState.value = UiState.Loading
        viewModelScope.launch {
            runCatching {
                api.createConsultation(CreateConsultationRequest(ownerName, petId, petName, notes))
            }.onSuccess {
                _actionState.value = UiState.Success(it)
                load()
            }.onFailure {
                _actionState.value = UiState.Error(it.toMsg())
            }
        }
    }

    fun resetActionState() { _actionState.value = UiState.Idle }

    private fun Throwable.toMsg() = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Cannot connect to server."
        else             -> message ?: "Unknown error"
    }
}
