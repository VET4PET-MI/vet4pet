package com.vet4pet.app.data.models

import android.os.Parcelable
import com.vet4pet.app.data.enums.ConsultationStatus
import kotlinx.parcelize.Parcelize

@Parcelize
data class OnlineConsultation(
    val id: String,
    val ownerId: String,
    val petId: String,
    val vetId: String,
    val status: ConsultationStatus,
    val messages: List<ConsultationMessage>,
    val linkedMedicalRecordId: String?,
    val createdAt: Long,
    val closedAt: Long?
) : Parcelable
