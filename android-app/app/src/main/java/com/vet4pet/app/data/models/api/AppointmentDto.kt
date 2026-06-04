package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName
import com.vet4pet.app.data.models.Appointment
import java.time.Instant

data class AppointmentDto(
    @SerializedName("_id") val id: String,
    val petId: String?,
    val petName: String?,
    val ownerId: String?,
    val ownerName: String?,
    val ownerIdNumber: String?,
    val vetId: String?,
    val vetName: String?,
    val date: String?,       // ISO date string
    val time: String?,       // HH:MM
    val duration: Int?,
    val type: String?,
    val status: String?,
    val notes: String?,
    val createdAt: String?
) {
    fun toDomain(): Appointment = Appointment(
        id            = id,
        petId         = petId ?: "",
        petName       = petName ?: "",
        ownerId       = ownerId ?: "",
        ownerName     = ownerName ?: "",
        ownerIdNumber = ownerIdNumber ?: "",
        vetId         = vetId ?: "",
        vetName       = vetName ?: "",
        date          = date?.take(10) ?: "",  // YYYY-MM-DD from ISO string
        time          = time ?: "",
        duration      = duration ?: 30,
        type          = type ?: "CHECKUP",
        status        = status ?: "booked",
        notes         = notes ?: "",
        createdAt     = createdAt?.let {
            runCatching { Instant.parse(it).toEpochMilli() }.getOrDefault(0L)
        } ?: 0L
    )
}

data class VetDto(
    @SerializedName("_id") val id: String,
    val name: String,
    val email: String?,
    val clinicName: String?,
    val address: String?,
    val phone: String?,
    val isOnCall: Boolean?
)

data class AvailableSlotsDto(
    val date: String,
    val duration: Int,
    val slots: List<String>
)

data class CreateAppointmentRequest(
    val petId: String,
    val petName: String,
    val vetId: String?,
    val vetName: String?,
    val date: String,       // YYYY-MM-DD
    val time: String,       // HH:MM
    val duration: Int = 30,
    val type: String = "CHECKUP",
    val notes: String = ""
)
