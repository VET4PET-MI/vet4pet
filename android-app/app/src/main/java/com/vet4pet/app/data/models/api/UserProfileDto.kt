package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName

data class UserProfileDto(
    @SerializedName("_id") val id: String,
    val name: String,
    val email: String,
    val role: String,
    val nationalId: String?,
    val clinicName: String?,
    val address: String?,
    val phone: String?,
    val lat: Double?,
    val lng: Double?,
    val isOnCall: Boolean?
)

data class UpdateProfileRequest(
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val nationalId: String? = null,
    val clinicName: String? = null,
    val address: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val isOnCall: Boolean? = null
)
