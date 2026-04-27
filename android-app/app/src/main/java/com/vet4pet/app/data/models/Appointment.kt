package com.vet4pet.app.data.models

import android.os.Parcelable
import com.vet4pet.app.data.enums.AppointmentStatus
import kotlinx.parcelize.Parcelize

@Parcelize
data class Appointment(
    val id: String,
    val petId: String,
    val ownerId: String,
    val vetId: String,
    val scheduledAt: Long,
    val durationMinutes: Int,
    val serviceType: String?,
    val status: AppointmentStatus,
    val createdAt: Long
) : Parcelable
