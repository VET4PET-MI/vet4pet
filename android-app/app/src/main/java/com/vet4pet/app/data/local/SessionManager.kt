package com.vet4pet.app.data.local

import android.content.Context
import android.content.SharedPreferences
import com.vet4pet.app.data.models.UserResponse

class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun saveSession(token: String, user: UserResponse) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_USER_NAME, user.name)
            .putString(KEY_USER_EMAIL, user.email)
            .putString(KEY_USER_ROLE, user.role)
            .putString(KEY_ID_NUMBER, user.nationalId ?: "")
            .apply()
    }

    fun updateName(name: String) {
        prefs.edit().putString(KEY_USER_NAME, name).apply()
    }

    fun saveIdNumber(idNumber: String) {
        prefs.edit().putString(KEY_ID_NUMBER, idNumber).apply()
    }

    fun getIdNumber(): String = prefs.getString(KEY_ID_NUMBER, "") ?: ""

    fun clearSession() = prefs.edit().clear().apply()

    fun getToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun isLoggedIn(): Boolean = getToken() != null

    fun getUser(): UserResponse? {
        val id    = prefs.getString(KEY_USER_ID, null)    ?: return null
        val name  = prefs.getString(KEY_USER_NAME, null)  ?: return null
        val email = prefs.getString(KEY_USER_EMAIL, null) ?: return null
        val role  = prefs.getString(KEY_USER_ROLE, null)  ?: return null
        return UserResponse(id, name, email, role)
    }

    companion object {
        private const val PREFS_NAME  = "vet4pet_session"
        private const val KEY_TOKEN      = "token"
        private const val KEY_USER_ID    = "user_id"
        private const val KEY_USER_NAME  = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_ROLE  = "user_role"
        private const val KEY_ID_NUMBER  = "id_number"
    }
}
