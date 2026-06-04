package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName

data class TimeBlockDto(
    @SerializedName("_id") val id: String,
    val vetId: String?,
    val date: String,        // YYYY-MM-DD
    val startTime: String,   // HH:MM
    val endTime: String,     // HH:MM
    val reason: String?
)

data class CreateTimeBlockRequest(
    val date: String,
    val startTime: String,
    val endTime: String,
    val reason: String = ""
)
