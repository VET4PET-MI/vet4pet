package com.vet4pet.app.util

import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat

object LanguageManager {

    fun setLanguage(lang: String) {
        AppCompatDelegate.setApplicationLocales(
            LocaleListCompat.forLanguageTags(lang)
        )
    }

    fun getCurrentLanguage(): String {
        val locales = AppCompatDelegate.getApplicationLocales()
        if (locales.isEmpty) return "en"
        val tag = locales[0]?.toLanguageTag() ?: return "en"
        return when {
            tag.startsWith("he") || tag.startsWith("iw") -> "he"
            else -> "en"
        }
    }

    fun isHebrew(): Boolean = getCurrentLanguage() == "he"
}
