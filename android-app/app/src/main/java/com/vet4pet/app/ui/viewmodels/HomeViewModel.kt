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
    val todayApptCount: Int = 0,
    val totalPetCount: Int = 0,
    val previewPets: List<PetDto> = emptyList()
)

class HomeViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)

    private val _stats = MutableLiveData<UiState<HomeStats>>(UiState.Idle)
    val statsState: LiveData<UiState<HomeStats>> = _stats

    fun load() {
        if (_stats.value is UiState.Loading) return
        _stats.value = UiState.Loading
        viewModelScope.launch {
            try {
                val petsDeferred  = async { api.getPets() }
                val apptsDeferred = async { api.getAppointments() }

                val pets  = petsDeferred.await()
                val appts = apptsDeferred.await()

                val today = LocalDate.now().toString()
                val todayCount = appts.count { a ->
                    a.date?.take(10) == today && a.status != "cancelled"
                }

                _stats.value = UiState.Success(
                    HomeStats(
                        todayApptCount = todayCount,
                        totalPetCount  = pets.size,
                        previewPets    = pets.take(3)
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
}
