package com.vet4pet.app.data.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class Vaccination(
    val id: String,
    val petId: String,
    val vaccineName: String,
    val administeredDate: Long,
    val nextDueDate: Long?,
    val vetId: String?,
    val notes: String?
) : Parcelable
