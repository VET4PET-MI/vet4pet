package com.vet4pet.app.data.models

import android.os.Parcelable
import com.vet4pet.app.data.enums.Gender
import kotlinx.parcelize.Parcelize

@Parcelize
data class Pet(
    val id: String,
    val ownerId: String,
    val name: String,
    val species: String,
    val breed: String?,
    val dateOfBirth: Long?,
    val gender: Gender,
    val weight: Double?,
    val profileImageUrl: String?,
    val createdAt: Long
) : Parcelable
