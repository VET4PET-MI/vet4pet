package com.vet4pet.app.data.models

import android.os.Parcelable
import com.vet4pet.app.data.enums.EventType
import kotlinx.parcelize.Parcelize

@Parcelize
data class MedicalRecord(
    val id: String,
    val petId: String,
    val vetId: String,
    val vetName: String,
    val date: Long,
    val type: EventType,
    val findings: String,
    val diagnosis: String?,
    val prescription: String?,
    val fileUrl: String?,
    val attachments: List<MedicalAttachment>,
    val createdAt: Long
) : Parcelable
