package com.vet4pet.app.data.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class VetProfile(
    val id: String,
    val userId: String,
    val licenseNumber: String,
    val clinicName: String,
    val clinicAddress: String,
    val latitude: Double?,
    val longitude: Double?,
    val specialization: String?,
    val workingHoursStart: String,
    val workingHoursEnd: String,
    val slotDurationMinutes: Int,
    val isEmergencyAvailable: Boolean
) : Parcelable
