package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.api.NotificationDto
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class NotificationsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _notifications = MutableLiveData<UiState<List<NotificationDto>>>(UiState.Idle)
    val notifications: LiveData<UiState<List<NotificationDto>>> = _notifications

    private val _unreadCount = MutableLiveData(0)
    val unreadCount: LiveData<Int> = _unreadCount

    fun load() {
        _notifications.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.getNotifications() }
                .onSuccess {
                    _notifications.value = UiState.Success(it)
                    _unreadCount.value = it.count { n -> !n.read }
                }
                .onFailure { _notifications.value = UiState.Error(it.toMsg()) }
        }
    }

    fun loadUnreadCount() {
        viewModelScope.launch {
            runCatching { api.getUnreadCount() }
                .onSuccess { _unreadCount.value = it.count }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            runCatching { api.markAllRead() }
                .onSuccess { load() }
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            runCatching { api.markRead(id) }.onSuccess { load() }
        }
    }

    fun delete(id: String) {
        viewModelScope.launch {
            runCatching { api.deleteNotification(id) }.onSuccess { load() }
        }
    }

    private fun Throwable.toMsg() = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Cannot connect to server."
        else             -> message ?: "Unknown error"
    }
}
