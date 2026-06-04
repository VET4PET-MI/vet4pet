package com.vet4pet.app.data.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class Appointment(
    val id: String,
    val petId: String,
    val petName: String,
    val ownerId: String,
    val ownerName: String,
    val ownerIdNumber: String,  // Israeli national ID — shown to vet
    val vetId: String,
    val vetName: String,
    val date: String,           // YYYY-MM-DD
    val time: String,           // HH:MM
    val duration: Int,          // minutes
    val type: String,           // CHECKUP, VACCINATION, etc.
    val status: String,         // booked, confirmed, cancelled, completed
    val notes: String,
    val createdAt: Long
) : Parcelable
