package com.vet4pet.app.data.local.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface PetDao {
    @Query("SELECT * FROM pets ORDER BY createdAt DESC")
    suspend fun getAll(): List<PetEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(pets: List<PetEntity>)

    @Query("DELETE FROM pets")
    suspend fun deleteAll()

    suspend fun replaceAll(pets: List<PetEntity>) {
        deleteAll()
        insertAll(pets)
    }
}

@Dao
interface AppointmentDao {
    @Query("SELECT * FROM appointments ORDER BY date ASC, time ASC")
    suspend fun getAll(): List<AppointmentEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(appointments: List<AppointmentEntity>)

    @Query("DELETE FROM appointments")
    suspend fun deleteAll()

    @Query("UPDATE appointments SET status = 'cancelled' WHERE id = :id")
    suspend fun markCancelled(id: String)

    suspend fun replaceAll(appointments: List<AppointmentEntity>) {
        deleteAll()
        insertAll(appointments)
    }
}
