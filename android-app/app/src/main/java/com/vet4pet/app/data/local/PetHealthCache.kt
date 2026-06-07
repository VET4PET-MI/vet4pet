package com.vet4pet.app.data.local

import android.content.Context
import android.content.SharedPreferences

class PetHealthCache(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("pet_health_cache", Context.MODE_PRIVATE)

    fun setLastVaccination(petId: String, petName: String, epochMs: Long) {
        prefs.edit()
            .putLong("vacc_date_$petId", epochMs)
            .putString("vacc_name_$petId", petName)
            .apply()
        val ids = getPetIds().toMutableSet().also { it.add(petId) }
        prefs.edit().putStringSet("pet_ids", ids).apply()
    }

    fun getLastVaccination(petId: String): Long =
        prefs.getLong("vacc_date_$petId", 0L)

    fun getAllEntries(): List<Pair<String, Long>> =
        getPetIds().map { id ->
            val name = prefs.getString("vacc_name_$id", id) ?: id
            name to prefs.getLong("vacc_date_$id", 0L)
        }.filter { it.second > 0L }

    private fun getPetIds(): Set<String> =
        prefs.getStringSet("pet_ids", emptySet()) ?: emptySet()
}
