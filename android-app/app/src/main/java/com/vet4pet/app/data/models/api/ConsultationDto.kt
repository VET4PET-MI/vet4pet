package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName

data class ConsultationDto(
    @SerializedName("_id") val id: String,
    val ownerId: String?,
    val ownerName: String?,
    val petId: String?,
    val petName: String?,
    val status: String,       // pending | active | ended
    val joinUrl: String?,
    val notes: String?,
    val startedAt: String?,
    val endedAt: String?,
    val createdAt: String?
) {
    val jitsiUrl: String get() = joinUrl ?: "https://meet.jit.si/Vet4Pet-$id"
}

data class CreateConsultationRequest(
    val ownerName: String,
    val petId: String?,
    val petName: String,
    val notes: String
)

data class UpdateStatusRequest(val status: String)
