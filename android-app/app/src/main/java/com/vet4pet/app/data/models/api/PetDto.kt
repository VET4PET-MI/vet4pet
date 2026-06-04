package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName
import com.vet4pet.app.data.enums.Gender
import com.vet4pet.app.data.models.Pet
import java.time.Instant

data class PetDto(
    @SerializedName("_id") val id: String,
    val name: String,
    val species: String?,
    val breed: String?,
    val age: Int?,
    val gender: String?,
    val ownerId: String?,
    val profileImageUrl: String?,
    val createdAt: String?
) {
    fun toDomain(): Pet = Pet(
        id         = id,
        ownerId    = ownerId ?: "",
        name       = name,
        species    = species ?: "Unknown",
        breed      = breed,
        // Approximate dateOfBirth from age in years
        dateOfBirth = age?.takeIf { it >= 0 }?.let {
            System.currentTimeMillis() - (it * 365.25 * 24 * 3600 * 1000L).toLong()
        },
        gender     = Gender.entries.firstOrNull {
            it.name.equals(gender, ignoreCase = true)
        } ?: Gender.UNKNOWN,
        weight     = null,
        profileImageUrl = profileImageUrl,
        createdAt  = createdAt?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrDefault(0L) } ?: 0L
    )
}

data class AddPetRequest(
    val name: String,
    val species: String,
    val breed: String?,
    val age: Int?,
    val gender: String
)
