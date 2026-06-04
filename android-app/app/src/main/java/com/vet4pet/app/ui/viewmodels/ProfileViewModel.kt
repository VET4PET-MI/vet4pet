package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.api.UpdateProfileRequest
import com.vet4pet.app.data.models.api.UserProfileDto
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class ProfileViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _profile = MutableLiveData<UiState<UserProfileDto>>(UiState.Idle)
    val profile: LiveData<UiState<UserProfileDto>> = _profile

    private val _saveState = MutableLiveData<UiState<Unit>>(UiState.Idle)
    val saveState: LiveData<UiState<Unit>> = _saveState

    fun loadProfile() {
        _profile.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.getMe() }
                .onSuccess { _profile.value = UiState.Success(it) }
                .onFailure { _profile.value = UiState.Error(it.toMsg()) }
        }
    }

    fun saveProfile(request: UpdateProfileRequest, session: SessionManager) {
        _saveState.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.updateMe(request) }
                .onSuccess { updated ->
                    _profile.value = UiState.Success(updated)
                    session.updateName(updated.name)
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
