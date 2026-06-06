package com.vet4pet.app.data.models

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val role: String,
    val nationalId: String? = null
)

data class UserResponse(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val idNumber: String? = null
)

data class AuthResponse(
    val token: String,
    val user: UserResponse
)
