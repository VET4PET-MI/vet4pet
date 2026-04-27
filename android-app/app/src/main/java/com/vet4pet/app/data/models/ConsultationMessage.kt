package com.vet4pet.app.data.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class ConsultationMessage(
    val id: String,
    val consultationId: String,
    val senderId: String,
    val content: String,
    val sentAt: Long
) : Parcelable
