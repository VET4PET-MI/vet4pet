package com.vet4pet.app.ui.viewmodels

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.vet4pet.app.data.models.MedicalRecord
import com.vet4pet.app.data.models.Pet
import com.vet4pet.app.data.models.api.AddPetRequest
import com.vet4pet.app.data.models.api.UpdatePetRequest
import com.vet4pet.app.data.models.api.AddRecordRequest
import com.vet4pet.app.data.models.api.UpdateRecordRequest
import com.vet4pet.app.data.local.db.AppDatabase
import com.vet4pet.app.data.local.db.toEntity
import com.vet4pet.app.network.ApiClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import retrofit2.HttpException
import java.io.File
import java.io.IOException
import java.time.Instant

sealed class UiState<out T> {
    object Idle : UiState<Nothing>()
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

class PetsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = ApiClient.get(application)
    private val db  = AppDatabase.get(application)

    // ── Pets ──────────────────────────────────────────────────────────────

    private val _pets = MutableLiveData<UiState<List<Pet>>>(UiState.Idle)
    val petsState: LiveData<UiState<List<Pet>>> = _pets

    fun loadPets() {
        viewModelScope.launch {
            // 1. Show cache immediately (fast path)
            val cached = db.petDao().getAll().map { it.toDomain() }
            if (cached.isNotEmpty()) _pets.value = UiState.Success(cached)
            else _pets.value = UiState.Loading

            // 2. Fetch fresh from network
            try {
                val fresh = api.getPets().map { it.toDomain() }
                db.petDao().replaceAll(fresh.map { it.toEntity() })
                _pets.value = UiState.Success(fresh)
            } catch (e: Exception) {
                if (cached.isEmpty()) _pets.value = UiState.Error(e.toUserMessage())
                // else: keep showing cached data silently
            }
        }
    }

    fun updateRecord(
        recordId: String,
        petId: String,
        vetName: String,
        type: String,
        findings: String,
        dateMs: Long,
        fileUri: Uri?,
        existingFileUrl: String?,
        onDone: (success: Boolean, error: String?) -> Unit
    ) {
        viewModelScope.launch {
            try {
                val ctx = getApplication<Application>()
                var uploadedUrl: String? = existingFileUrl
                var uploadedName: String? = null

                if (fileUri != null) {
                    val file = uriToTempFile(ctx, fileUri)
                    val mime = ctx.contentResolver.getType(fileUri) ?: "application/octet-stream"
                    val part = MultipartBody.Part.createFormData(
                        "file", file.name,
                        file.asRequestBody(mime.toMediaTypeOrNull())
                    )
                    val resp = api.uploadFile(part)
                    uploadedUrl  = resp.url
                    uploadedName = resp.originalName
                    file.delete()
                }

                api.updateRecord(
                    recordId,
                    UpdateRecordRequest(
                        date             = Instant.ofEpochMilli(dateMs).toString(),
                        vetName          = vetName,
                        type             = type,
                        findings         = findings,
                        fileUrl          = uploadedUrl,
                        originalFileName = uploadedName
                    )
                )
                loadRecords(petId, refresh = true)
                onDone(true, null)
            } catch (e: Exception) {
                onDone(false, e.toUserMessage())
            }
        }
    }

    fun searchPets(nationalId: String, name: String?) {
        viewModelScope.launch {
            _pets.value = UiState.Loading
            try {
                val fresh = api.getPets(
                    nationalId = nationalId,
                    name = name?.takeIf { it.isNotBlank() }
                ).map { it.toDomain() }
                _pets.value = UiState.Success(fresh)
            } catch (e: Exception) {
                _pets.value = UiState.Error(e.toUserMessage())
            }
        }
    }

    fun addPet(name: String, species: String, breed: String?, age: Int?, gender: String,
               onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                api.addPet(AddPetRequest(name, species, breed?.takeIf { it.isNotBlank() }, age, gender))
                loadPets()
                onDone(true)
            } catch (e: Exception) {
                onDone(false)
            }
        }
    }

    fun updatePet(id: String, name: String, species: String, breed: String?, age: Int?,
                  gender: String, weight: Double?, onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                api.updatePet(id, UpdatePetRequest(name, species, breed?.takeIf { it.isNotBlank() }, age, gender, weight))
                loadPets()
                onDone(true)
            } catch (e: Exception) {
                onDone(false)
            }
        }
    }

    fun uploadAndSavePetPhoto(
        petId: String,
        fileUri: android.net.Uri,
        onDone: (success: Boolean, newUrl: String?, error: String?) -> Unit
    ) {
        viewModelScope.launch {
            try {
                val ctx  = getApplication<Application>()
                val file = uriToTempFile(ctx, fileUri)
                val rawMime = ctx.contentResolver.getType(fileUri) ?: "image/jpeg"
                val mime = if (rawMime == "image/jpg") "image/jpeg" else rawMime
                val part = okhttp3.MultipartBody.Part.createFormData(
                    "file", file.name,
                    file.asRequestBody(mime.toMediaTypeOrNull())
                )
                val updatedPet = api.uploadPetPhoto(petId, part)
                file.delete()
                loadPets()
                onDone(true, updatedPet.profileImageUrl, null)
            } catch (e: Exception) {
                val msg = if (e is HttpException) {
                    try {
                        val body = e.response()?.errorBody()?.string()
                        val json = org.json.JSONObject(body ?: "")
                        json.getString("message")
                    } catch (_: Exception) {
                        "Server error (${e.code()})"
                    }
                } else e.toUserMessage()
                onDone(false, null, msg)
            }
        }
    }

    // ── Records ───────────────────────────────────────────────────────────

    private val _records      = MutableLiveData<List<MedicalRecord>>(emptyList())
    private val _recordsState = MutableLiveData<UiState<Unit>>(UiState.Idle)
    private val _hasMore      = MutableLiveData(false)

    val records:      LiveData<List<MedicalRecord>> = _records
    val recordsState: LiveData<UiState<Unit>>       = _recordsState
    val hasMore:      LiveData<Boolean>             = _hasMore

    private var currentPetId  = ""
    private var currentSkip   = 0
    private var currentTypes: String? = null
    private val pageSize      = 10
    private var loadJob: Job? = null

    fun loadRecords(petId: String, refresh: Boolean = false, types: String? = null) {
        val typesChanged = types != currentTypes
        if (petId != currentPetId || typesChanged) {
            currentPetId  = petId
            currentTypes  = types
            currentSkip   = 0
            _records.value = emptyList()
        }
        if (refresh) {
            currentSkip = 0
            _records.value = emptyList()
        }

        // Cancel any in-flight request so stale results can't overwrite the new state
        loadJob?.cancel()

        _recordsState.value = UiState.Loading
        loadJob = viewModelScope.launch {
            try {
                val page = api.getRecordsByPet(petId, pageSize, currentSkip, currentTypes)
                val existing = if (currentSkip == 0) emptyList() else _records.value ?: emptyList()
                val newList  = existing + page.items.map { it.toDomain() }
                _records.value  = newList
                _hasMore.value  = page.hasMore
                currentSkip    += page.items.size
                _recordsState.value = UiState.Success(Unit)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _recordsState.value = UiState.Error(e.toUserMessage())
            }
        }
    }

    fun loadNextPage() {
        if (_hasMore.value == true) loadRecords(currentPetId, types = currentTypes)
    }

    // ── Vaccination ───────────────────────────────────────────────────────

    private val _lastVaccination = MutableLiveData<MedicalRecord?>(null)
    val lastVaccination: LiveData<MedicalRecord?> = _lastVaccination

    fun loadVaccination(petId: String) {
        viewModelScope.launch {
            try {
                val page = api.getRecordsByPet(petId, 1, 0, "VACCINATION")
                _lastVaccination.value = page.items.firstOrNull()?.toDomain()
            } catch (e: Exception) {
                _lastVaccination.value = null
            }
        }
    }

    fun addRecord(
        petId: String,
        vetName: String,
        type: String,
        findings: String,
        dateMs: Long,
        fileUri: Uri?,
        onDone: (success: Boolean, error: String?) -> Unit
    ) {
        viewModelScope.launch {
            try {
                val ctx = getApplication<Application>()
                var uploadedUrl: String? = null
                var uploadedName: String? = null

                if (fileUri != null) {
                    val file = uriToTempFile(ctx, fileUri)
                    val mime = ctx.contentResolver.getType(fileUri) ?: "application/octet-stream"
                    val part = MultipartBody.Part.createFormData(
                        "file", file.name,
                        file.asRequestBody(mime.toMediaTypeOrNull())
                    )
                    val resp = api.uploadFile(part)
                    uploadedUrl  = resp.url
                    uploadedName = resp.originalName
                    file.delete()
                }

                api.addRecord(
                    AddRecordRequest(
                        petId            = petId,
                        date             = Instant.ofEpochMilli(dateMs).toString(),
                        vetName          = vetName,
                        type             = type,
                        findings         = findings,
                        fileUrl          = uploadedUrl,
                        originalFileName = uploadedName
                    )
                )
                loadRecords(petId, refresh = true)
                onDone(true, null)
            } catch (e: Exception) {
                onDone(false, e.toUserMessage())
            }
        }
    }

    private fun uriToTempFile(ctx: android.content.Context, uri: Uri): File {
        val inputStream = ctx.contentResolver.openInputStream(uri)!!
        val ext = ctx.contentResolver.getType(uri)?.let {
            when {
                it.contains("pdf")  -> "pdf"
                it.contains("png")  -> "png"
                it.contains("jpeg") -> "jpg"
                it.contains("jpg")  -> "jpg"
                it.contains("gif")  -> "gif"
                it.contains("webp") -> "webp"
                else -> "bin"
            }
        } ?: "bin"
        val file = File.createTempFile("upload_", ".$ext", ctx.cacheDir)
        file.outputStream().use { out -> inputStream.copyTo(out) }
        return file
    }

    private fun Exception.toUserMessage(): String = when (this) {
        is HttpException -> "Server error (${code()})"
        is IOException   -> "Connection failed. Check your network."
        else             -> message ?: "Unknown error"
    }
}
