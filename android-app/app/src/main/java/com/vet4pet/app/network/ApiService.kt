package com.vet4pet.app.network

import com.vet4pet.app.data.models.AuthResponse
import com.vet4pet.app.data.models.LoginRequest
import com.vet4pet.app.data.models.RegisterRequest
import com.vet4pet.app.data.models.api.AppointmentDto
import com.vet4pet.app.data.models.api.AvailableSlotsDto
import com.vet4pet.app.data.models.api.CreateAppointmentRequest
import com.vet4pet.app.data.models.api.UpdateAppointmentRequest
import com.vet4pet.app.data.models.api.VetDto
import com.vet4pet.app.data.models.api.AddPetRequest
import com.vet4pet.app.data.models.api.UpdatePetRequest
import com.vet4pet.app.data.models.api.AddRecordRequest
import com.vet4pet.app.data.models.api.MedicalRecordDto
import com.vet4pet.app.data.models.api.PagedRecordsDto
import com.vet4pet.app.data.models.api.PetDto
import com.vet4pet.app.data.models.api.ConsultationDto
import com.vet4pet.app.data.models.api.NearbyVetDto
import com.vet4pet.app.data.models.api.ConversationDto
import com.vet4pet.app.data.models.api.CreateConsultationRequest
import com.vet4pet.app.data.models.api.UpdateStatusRequest
import com.vet4pet.app.data.models.api.MessageDto
import com.vet4pet.app.data.models.api.SendMessageRequest
import com.vet4pet.app.data.models.api.NotificationDto
import com.vet4pet.app.data.models.api.UnreadCountDto
import com.vet4pet.app.data.models.api.UpdateProfileRequest
import com.vet4pet.app.data.models.api.TimeBlockDto
import com.vet4pet.app.data.models.api.CreateTimeBlockRequest
import com.vet4pet.app.data.models.api.VetScheduleDto
import com.vet4pet.app.data.models.api.VetScheduleRequest
import com.vet4pet.app.data.models.api.UploadResponse
import com.vet4pet.app.data.models.api.UserProfileDto
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
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
    suspend fun getPets(
        @Query("nationalId") nationalId: String? = null,
        @Query("name")       name:       String? = null
    ): List<PetDto>

    @POST("api/pets")
    suspend fun addPet(@Body request: AddPetRequest): PetDto

    @PUT("api/pets/{id}")
    suspend fun updatePet(
        @Path("id") id: String,
        @Body request: UpdatePetRequest
    ): PetDto

    @PATCH("api/pets/{id}/image")
    suspend fun updatePetImage(
        @Path("id") id: String,
        @Body body: Map<String, String?>
    ): PetDto

    @Multipart
    @POST("api/pets/{id}/photo")
    suspend fun uploadPetPhoto(
        @Path("id") id: String,
        @Part file: MultipartBody.Part
    ): PetDto

    // ── Medical Records ───────────────────────────────────────────────────
    @GET("api/records/pet/{petId}")
    suspend fun getRecordsByPet(
        @Path("petId") petId: String,
        @Query("limit") limit: Int = 10,
        @Query("skip")  skip:  Int = 0,
        @Query("types") types: String? = null
    ): PagedRecordsDto

    @POST("api/records")
    suspend fun addRecord(@Body request: AddRecordRequest): MedicalRecordDto

    // ── Appointments ──────────────────────────────────────────────────────
    @GET("api/appointments")
    suspend fun getAppointments(
        @Query("status") status: String? = null,
        @Query("date")   date:   String? = null
    ): List<AppointmentDto>

    @POST("api/appointments")
    suspend fun createAppointment(@Body request: CreateAppointmentRequest): AppointmentDto

    @PUT("api/appointments/{id}")
    suspend fun updateAppointment(
        @Path("id") id: String,
        @Body request: UpdateAppointmentRequest
    ): AppointmentDto

    @PATCH("api/appointments/{id}/cancel")
    suspend fun cancelAppointment(@Path("id") id: String): AppointmentDto

    @PATCH("api/appointments/{id}/reschedule")
    suspend fun rescheduleAppointment(
        @Path("id") id: String,
        @Body body: Map<String, String>
    ): AppointmentDto

    @GET("api/appointments/available-slots")
    suspend fun getAvailableSlots(
        @Query("date") date: String,
        @Query("vetId") vetId: String? = null,
        @Query("duration") duration: Int = 30
    ): AvailableSlotsDto

    // ── User profile ──────────────────────────────────────────────────────
    @GET("api/users/me")
    suspend fun getMe(): UserProfileDto

    @PATCH("api/users/me")
    suspend fun updateMe(@Body request: UpdateProfileRequest): UserProfileDto

    @PUT("api/users/me/fcm-token")
    suspend fun updateFcmToken(@Body body: Map<String, String>): Map<String, Boolean>

    // ── Vets ──────────────────────────────────────────────────────────────
    @GET("api/users/vets")
    suspend fun getVets(): List<VetDto>

    // ── Emergency / Nearby Vets ───────────────────────────────────────────
    @GET("api/users/vets/nearby")
    suspend fun getNearbyVets(
        @Query("lat")    lat:    Double? = null,
        @Query("lng")    lng:    Double? = null,
        @Query("onCall") onCall: String? = null
    ): List<NearbyVetDto>

    // ── Consultations ─────────────────────────────────────────────────────
    @GET("api/consultations")
    suspend fun getConsultations(): List<ConsultationDto>

    @GET("api/consultations/pending")
    suspend fun getPendingConsultations(): List<ConsultationDto>

    @POST("api/consultations")
    suspend fun createConsultation(@Body request: CreateConsultationRequest): ConsultationDto

    @PATCH("api/consultations/{id}/status")
    suspend fun updateConsultationStatus(
        @Path("id") id: String,
        @Body request: UpdateStatusRequest
    ): ConsultationDto

    // ── Messages ──────────────────────────────────────────────────────────
    @GET("api/messages/conversations")
    suspend fun getConversations(): List<ConversationDto>

    @GET("api/messages")
    suspend fun getMessages(@Query("withUser") withUser: String): List<MessageDto>

    @POST("api/messages")
    suspend fun sendMessage(@Body request: SendMessageRequest): MessageDto

    @PUT("api/messages/conversation/{otherId}/read")
    suspend fun markConversationRead(@Path("otherId") otherId: String): Map<String, Boolean>

    // ── Time Blocks ───────────────────────────────────────────────────────
    @GET("api/time-blocks")
    suspend fun getTimeBlocks(@Query("date") date: String? = null): List<TimeBlockDto>

    @POST("api/time-blocks")
    suspend fun createTimeBlock(@Body request: CreateTimeBlockRequest): TimeBlockDto

    @DELETE("api/time-blocks/{id}")
    suspend fun deleteTimeBlock(@Path("id") id: String)

    // ── Vet Schedule ──────────────────────────────────────────────────────
    @GET("api/vet-schedule")
    suspend fun getVetSchedule(): VetScheduleDto

    @PUT("api/vet-schedule")
    suspend fun upsertVetSchedule(@Body request: VetScheduleRequest): VetScheduleDto

    // ── Notifications ─────────────────────────────────────────────────────
    @GET("api/notifications")
    suspend fun getNotifications(): List<NotificationDto>

    @GET("api/notifications/unread-count")
    suspend fun getUnreadCount(): UnreadCountDto

    @PATCH("api/notifications/read-all")
    suspend fun markAllRead(): Map<String, Boolean>

    @PATCH("api/notifications/{id}/read")
    suspend fun markRead(@Path("id") id: String): NotificationDto

    @DELETE("api/notifications/{id}")
    suspend fun deleteNotification(@Path("id") id: String): Map<String, Boolean>

    // ── File Upload ───────────────────────────────────────────────────────
    @Multipart
    @POST("api/upload")
    suspend fun uploadFile(@Part file: MultipartBody.Part): UploadResponse
}
