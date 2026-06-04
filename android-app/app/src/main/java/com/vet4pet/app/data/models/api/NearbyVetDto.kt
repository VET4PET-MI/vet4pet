package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName

data class NearbyVetDto(
    @SerializedName("_id") val id: String,
    val name: String,
    val clinicName: String?,
    val address: String?,
    val phone: String?,
    val lat: Double?,
    val lng: Double?,
    val isOnCall: Boolean?,
    val distanceKm: Double?
) {
    val displayName: String get() = clinicName?.takeIf { it.isNotBlank() } ?: name
    val formattedDistance: String get() = when {
        distanceKm == null || distanceKm.isNaN() || distanceKm.isInfinite() -> ""
        distanceKm < 1.0 -> "${(distanceKm * 1000).toInt()} m"
        else -> "${"%.1f".format(distanceKm)} km"
    }
}
