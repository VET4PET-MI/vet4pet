package com.vet4pet.app.data.models

import android.os.Parcelable
import com.vet4pet.app.data.enums.UserRole
import kotlinx.parcelize.Parcelize

@Parcelize
data class User(
    val id: String,
    val email: String,
    val fullName: String,
    val phone: String,
    val role: UserRole,
    val profileImageUrl: String?,
    val createdAt: Long
) : Parcelable
