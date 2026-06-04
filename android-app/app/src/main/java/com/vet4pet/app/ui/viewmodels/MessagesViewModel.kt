package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.api.ConversationDto
import com.vet4pet.app.data.models.api.MessageDto
import com.vet4pet.app.data.models.api.SendMessageRequest
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

class MessagesViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _convos = MutableLiveData<UiState<List<ConversationDto>>>(UiState.Idle)
    val conversations: LiveData<UiState<List<ConversationDto>>> = _convos

    private val _messages = MutableLiveData<UiState<List<MessageDto>>>(UiState.Idle)
    val messages: LiveData<UiState<List<MessageDto>>> = _messages

    private val _sendState = MutableLiveData<UiState<Unit>>(UiState.Idle)
    val sendState: LiveData<UiState<Unit>> = _sendState

    private var pollJob: Job? = null

    fun loadConversations() {
        _convos.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.getConversations() }
                .onSuccess { _convos.value = UiState.Success(it) }
                .onFailure { _convos.value = UiState.Error(it.toUserMessage()) }
        }
    }

    fun openConversation(partnerId: String) {
        fetchMessages(partnerId)
        viewModelScope.launch { runCatching { api.markConversationRead(partnerId) } }
        startPolling(partnerId)
    }

    private fun fetchMessages(partnerId: String) {
        _messages.value = UiState.Loading
        viewModelScope.launch {
            runCatching { api.getMessages(partnerId) }
                .onSuccess { _messages.value = UiState.Success(it) }
                .onFailure { _messages.value = UiState.Error(it.toUserMessage()) }
        }
    }

    private fun startPolling(partnerId: String) {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (true) {
                delay(5_000)
                runCatching { api.getMessages(partnerId) }
                    .onSuccess { _messages.value = UiState.Success(it) }
            }
        }
    }

    fun stopPolling() {
        pollJob?.cancel()
        pollJob = null
    }

    fun sendMessage(content: String, receiverId: String, receiverName: String) {
        _sendState.value = UiState.Loading
        viewModelScope.launch {
            runCatching {
                api.sendMessage(SendMessageRequest(receiverId, receiverName, content))
            }.onSuccess {
                _sendState.value = UiState.Success(Unit)
                fetchMessages(receiverId)
                viewModelScope.launch { runCatching { _convos.value = UiState.Success(api.getConversations()) } }
            }.onFailure {
                _sendState.value = UiState.Error(it.toUserMessage())
            }
        }
    }

    fun resetSendState() { _sendState.value = UiState.Idle }

    private fun Throwable.toUserMessage() = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Cannot connect to server."
        else             -> message ?: "Unknown error"
    }
}
