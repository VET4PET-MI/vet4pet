package com.vet4pet.app.data.models

import android.os.Parcelable
import com.vet4pet.app.data.enums.AttachmentType
import kotlinx.parcelize.Parcelize

@Parcelize
data class MedicalAttachment(
    val id: String,
    val recordId: String,
    val fileName: String,
    val fileUrl: String,
    val fileType: AttachmentType,
    val uploadedAt: Long
) : Parcelable
