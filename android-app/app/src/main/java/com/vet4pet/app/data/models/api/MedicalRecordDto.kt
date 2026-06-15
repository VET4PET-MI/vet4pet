package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName
import com.vet4pet.app.data.enums.EventType
import com.vet4pet.app.data.models.MedicalRecord
import java.time.Instant

data class MedicalRecordDto(
    @SerializedName("_id") val id: String,
    val petId: String,
    val date: String?,
    val vetName: String?,
    val type: String?,
    val findings: String?,
    val prescription: String?,
    val fileUrl: String?,
    val originalFileName: String?,
    val createdAt: String?
) {
    fun toDomain(): MedicalRecord = MedicalRecord(
        id           = id,
        petId        = petId,
        vetId        = "",
        vetName      = vetName ?: "",
        date         = date?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrDefault(0L) } ?: 0L,
        type         = EventType.entries.firstOrNull {
            it.name.equals(type, ignoreCase = true)
        } ?: EventType.OTHER,
        findings     = findings ?: "",
        diagnosis    = null,
        prescription = prescription,
        fileUrl      = fileUrl,
        attachments  = emptyList(),
        createdAt    = createdAt?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrDefault(0L) } ?: 0L
    )
}

data class PagedRecordsDto(
    val items: List<MedicalRecordDto>,
    val total: Int,
    val hasMore: Boolean
)

data class AddRecordRequest(
    val petId: String,
    val date: String,          // ISO 8601
    val vetName: String,
    val type: String,
    val findings: String,
    val prescription: String? = null,
    val fileUrl: String? = null,
    val originalFileName: String? = null
)

data class UpdateRecordRequest(
    val date: String,          // ISO 8601
    val vetName: String,
    val type: String,
    val findings: String,
    val prescription: String? = null,
    val fileUrl: String? = null,
    val originalFileName: String? = null
)

data class UploadResponse(
    val url: String,
    val originalName: String,
    val mimetype: String,
    val size: Long
)
