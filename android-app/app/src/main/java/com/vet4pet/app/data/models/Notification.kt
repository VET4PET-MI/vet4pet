package com.vet4pet.app.data.models

import android.os.Parcelable
import com.vet4pet.app.data.enums.NotificationType
import kotlinx.parcelize.Parcelize

@Parcelize
data class Notification(
    val id: String,
    val userId: String,
    val type: NotificationType,
    val message: String,
    val relatedEntityId: String?,
    val isRead: Boolean,
    val scheduledAt: Long
) : Parcelable
