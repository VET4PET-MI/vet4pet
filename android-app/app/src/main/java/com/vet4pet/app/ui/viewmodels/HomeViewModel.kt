package com.vet4pet.app.ui.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.api.PetDto
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException
import java.time.LocalDate

data class HomeStats(
    val todayApptCount:    Int = 0,
    val pendingConsults:   Int = 0,
    val unreadMessages:    Int = 0,
    val totalPetCount:     Int = 0,
    val previewPets: List<PetDto> = emptyList()
)

class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    // ── Dashboard stats (owner + vet) ─────────────────────────────────────

    private val _stats = MutableLiveData<UiState<HomeStats>>(UiState.Idle)
    val statsState: LiveData<UiState<HomeStats>> = _stats

    fun load() {
        if (_stats.value is UiState.Loading) return
        _stats.value = UiState.Loading
        viewModelScope.launch {
            try {
                val petsDeferred     = async { api.getPets() }
                val apptsDeferred    = async { api.getAppointments() }
                val consultsDeferred = async { runCatching { api.getPendingConsultations() }.getOrDefault(emptyList()) }
                val msgsDeferred     = async { runCatching { api.getUnreadCount() }.getOrDefault(com.vet4pet.app.data.models.api.UnreadCountDto(0)) }

                val pets     = petsDeferred.await()
                val appts    = apptsDeferred.await()
                val consults = consultsDeferred.await()
                val msgs     = msgsDeferred.await()

                val today = LocalDate.now().toString()
                val todayCount = appts.count { a ->
                    a.date?.take(10) == today && a.status != "cancelled"
                }

                _stats.value = UiState.Success(
                    HomeStats(
                        todayApptCount = todayCount,
                        pendingConsults = consults.size,
                        unreadMessages  = msgs.count,
                        totalPetCount   = pets.size,
                        previewPets     = pets.take(3)
                    )
                )
            } catch (e: Exception) {
                _stats.value = UiState.Error(when (e) {
                    is HttpException -> "Server error (${e.code()})"
                    is IOException   -> "Cannot connect to server."
                    else             -> e.message ?: "Unknown error"
                })
            }
        }
    }

    // ── Vet patient search ────────────────────────────────────────────────

    private val _searchResults = MutableLiveData<UiState<List<PetDto>>?>(null)
    val searchResults: LiveData<UiState<List<PetDto>>?> = _searchResults

    fun searchVetPets(nationalId: String?, name: String?) {
        if (nationalId.isNullOrBlank() && name.isNullOrBlank()) return
        _searchResults.value = UiState.Loading
        viewModelScope.launch {
            runCatching {
                api.getPets(
                    nationalId = nationalId?.trim()?.takeIf { it.isNotBlank() },
                    name       = name?.trim()?.takeIf { it.isNotBlank() }
                )
            }.onSuccess { _searchResults.value = UiState.Success(it) }
             .onFailure { _searchResults.value = UiState.Error(it.message ?: "Error") }
        }
    }

    fun clearSearch() { _searchResults.value = null }
}
