package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.LoginRequest
import com.vet4pet.app.data.models.RegisterRequest
import com.vet4pet.app.network.ApiClient
import com.vet4pet.app.util.IsraeliIdValidator
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Success : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val api     = ApiClient.get(application)
    private val session = SessionManager(application)

    private val _state = MutableLiveData<AuthState>(AuthState.Idle)
    val state: LiveData<AuthState> = _state

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _state.value = AuthState.Error("Email and password are required.")
            return
        }
        _state.value = AuthState.Loading
        viewModelScope.launch {
            try {
                val response = api.login(LoginRequest(email.trim(), password))
                session.saveSession(response.token, response.user)
                _state.value = AuthState.Success
            } catch (e: HttpException) {
                val msg = e.response()?.errorBody()?.string()
                    ?.let { parseErrorMessage(it) }
                    ?: "Login failed (${e.code()})"
                _state.value = AuthState.Error(msg)
            } catch (e: IOException) {
                _state.value = AuthState.Error("Cannot connect to server. Check your internet connection.")
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Unexpected error.")
            }
        }
    }

    fun register(
        name: String,
        email: String,
        password: String,
        confirmPassword: String,
        role: String,
        nationalId: String = ""
    ) {
        if (name.isBlank() || email.isBlank() || password.isBlank()) {
            _state.value = AuthState.Error("All fields are required.")
            return
        }
        if (password != confirmPassword) {
            _state.value = AuthState.Error("Passwords do not match.")
            return
        }
        if (password.length < 6) {
            _state.value = AuthState.Error("Password must be at least 6 characters.")
            return
        }
        if (role == "owner") {
            val normalized = IsraeliIdValidator.validate(nationalId)
            if (normalized == null) {
                _state.value = AuthState.Error("Please enter a valid 9-digit Israeli ID number.")
                return
            }
        }
        _state.value = AuthState.Loading
        viewModelScope.launch {
            try {
                val normalizedId = if (role == "owner") IsraeliIdValidator.validate(nationalId) else null
                val response = api.register(RegisterRequest(name.trim(), email.trim(), password, role, normalizedId))
                session.saveSession(response.token, response.user)
                _state.value = AuthState.Success
            } catch (e: HttpException) {
                val msg = e.response()?.errorBody()?.string()
                    ?.let { parseErrorMessage(it) }
                    ?: "Registration failed (${e.code()})"
                _state.value = AuthState.Error(msg)
            } catch (e: IOException) {
                _state.value = AuthState.Error("Cannot connect to server. Check your internet connection.")
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Unexpected error.")
            }
        }
    }

    fun resetState() { _state.value = AuthState.Idle }

    private fun parseErrorMessage(body: String): String? =
        Regex("\"message\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
}
