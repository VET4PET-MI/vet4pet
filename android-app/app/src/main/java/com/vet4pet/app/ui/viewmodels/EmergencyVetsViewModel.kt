package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.api.NearbyVetDto
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class EmergencyVetsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _vets = MutableLiveData<UiState<List<NearbyVetDto>>>(UiState.Idle)
    val vets: LiveData<UiState<List<NearbyVetDto>>> = _vets

    fun loadVets(lat: Double? = null, lng: Double? = null, onCallOnly: Boolean = false) {
        _vets.value = UiState.Loading
        viewModelScope.launch {
            runCatching {
                api.getNearbyVets(lat, lng, if (onCallOnly) "true" else null)
            }.onSuccess { _vets.value = UiState.Success(it) }
             .onFailure  { _vets.value = UiState.Error(it.toMsg()) }
        }
    }

    private fun Throwable.toMsg() = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Cannot connect to server."
        else             -> message ?: "Unknown error"
    }
}
