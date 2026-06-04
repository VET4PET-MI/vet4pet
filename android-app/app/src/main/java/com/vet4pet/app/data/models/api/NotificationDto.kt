package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName

data class NotificationDto(
    @SerializedName("_id") val id: String,
    val type: String,
    val params: Map<String, Any>?,
    val link: String?,
    val read: Boolean,
    val createdAt: String?
) {
    fun param(key: String): String =
        (params?.get(key) as? String) ?: ""
}

data class UnreadCountDto(val count: Int)
