package com.vet4pet.app.network

import com.vet4pet.app.data.models.AuthResponse
import com.vet4pet.app.data.models.LoginRequest
import com.vet4pet.app.data.models.RegisterRequest
import com.vet4pet.app.data.models.api.AppointmentDto
import com.vet4pet.app.data.models.api.AvailableSlotsDto
import com.vet4pet.app.data.models.api.CreateAppointmentRequest
import com.vet4pet.app.data.models.api.VetDto
import com.vet4pet.app.data.models.api.AddPetRequest
import com.vet4pet.app.data.models.api.AddRecordRequest
import com.vet4pet.app.data.models.api.MedicalRecordDto
import com.vet4pet.app.data.models.api.PagedRecordsDto
import com.vet4pet.app.data.models.api.PetDto
import com.vet4pet.app.data.models.api.UploadResponse
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {

    // ── Auth ──────────────────────────────────────────────────────────────
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    // ── Pets ──────────────────────────────────────────────────────────────
    @GET("api/pets")
    suspend fun getPets(): List<PetDto>

    @POST("api/pets")
    suspend fun addPet(@Body request: AddPetRequest): PetDto

    // ── Medical Records ───────────────────────────────────────────────────
    @GET("api/records/pet/{petId}")
    suspend fun getRecordsByPet(
        @Path("petId") petId: String,
        @Query("limit") limit: Int = 10,
        @Query("skip") skip: Int = 0
    ): PagedRecordsDto

    @POST("api/records")
    suspend fun addRecord(@Body request: AddRecordRequest): MedicalRecordDto

    // ── Appointments ──────────────────────────────────────────────────────
    @GET("api/appointments")
    suspend fun getAppointments(@Query("status") status: String? = null): List<AppointmentDto>

    @POST("api/appointments")
    suspend fun createAppointment(@Body request: CreateAppointmentRequest): AppointmentDto

    @PATCH("api/appointments/{id}/cancel")
    suspend fun cancelAppointment(@Path("id") id: String): AppointmentDto

    @GET("api/appointments/available-slots")
    suspend fun getAvailableSlots(
        @Query("date") date: String,
        @Query("vetId") vetId: String? = null,
        @Query("duration") duration: Int = 30
    ): AvailableSlotsDto

    // ── Vets ──────────────────────────────────────────────────────────────
    @GET("api/users/vets")
    suspend fun getVets(): List<VetDto>

    // ── File Upload ───────────────────────────────────────────────────────
    @Multipart
    @POST("api/upload")
    suspend fun uploadFile(@Part file: MultipartBody.Part): UploadResponse
}
