package com.vet4pet.app.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.vet4pet.app.data.enums.Gender
import com.vet4pet.app.data.models.Appointment
import com.vet4pet.app.data.models.Pet

@Entity(tableName = "pets")
data class PetEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val name: String,
    val species: String,
    val breed: String?,
    val dateOfBirth: Long?,
    val gender: String,
    val weight: Double?,
    val profileImageUrl: String?,
    val createdAt: Long
) {
    fun toDomain() = Pet(
        id              = id,
        ownerId         = ownerId,
        name            = name,
        species         = species,
        breed           = breed,
        dateOfBirth     = dateOfBirth,
        gender          = Gender.entries.firstOrNull { it.name == gender } ?: Gender.UNKNOWN,
        weight          = weight,
        profileImageUrl = profileImageUrl,
        createdAt       = createdAt
    )
}

fun Pet.toEntity() = PetEntity(
    id              = id,
    ownerId         = ownerId,
    name            = name,
    species         = species,
    breed           = breed,
    dateOfBirth     = dateOfBirth,
    gender          = gender.name,
    weight          = weight,
    profileImageUrl = profileImageUrl,
    createdAt       = createdAt
)

@Entity(tableName = "appointments")
data class AppointmentEntity(
    @PrimaryKey val id: String,
    val petId: String,
    val petName: String,
    val ownerId: String,
    val ownerName: String,
    val ownerIdNumber: String,
    val vetId: String,
    val vetName: String,
    val date: String,
    val time: String,
    val duration: Int,
    val type: String,
    val status: String,
    val notes: String,
    val createdAt: Long
) {
    fun toDomain() = Appointment(
        id            = id,
        petId         = petId,
        petName       = petName,
        ownerId       = ownerId,
        ownerName     = ownerName,
        ownerIdNumber = ownerIdNumber,
        vetId         = vetId,
        vetName       = vetName,
        date          = date,
        time          = time,
        duration      = duration,
        type          = type,
        status        = status,
        notes         = notes,
        createdAt     = createdAt
    )
}

fun Appointment.toEntity() = AppointmentEntity(
    id            = id,
    petId         = petId,
    petName       = petName,
    ownerId       = ownerId,
    ownerName     = ownerName,
    ownerIdNumber = ownerIdNumber,
    vetId         = vetId,
    vetName       = vetName,
    date          = date,
    time          = time,
    duration      = duration,
    type          = type,
    status        = status,
    notes         = notes,
    createdAt     = createdAt
)
