package com.vet4pet.app.data.models.api

data class VetScheduleDto(
    val vetId: String?,
    val workingDays: List<Int>,   // 0=Sun … 6=Sat
    val workStart: String,        // HH:MM
    val workEnd: String           // HH:MM
)

data class VetScheduleRequest(
    val workingDays: List<Int>,
    val workStart: String,
    val workEnd: String
)
