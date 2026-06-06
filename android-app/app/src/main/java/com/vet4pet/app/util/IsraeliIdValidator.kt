package com.vet4pet.app.util

object IsraeliIdValidator {
    /** Returns the normalized 9-digit ID string, or null if the input is invalid. */
    fun validate(input: String): String? {
        val raw = input.trim()
        if (!raw.matches(Regex("\\d{1,9}"))) return null
        val id = raw.padStart(9, '0')
        var sum = 0
        for (i in 0..8) {
            var n = id[i].digitToInt() * ((i % 2) + 1)
            if (n > 9) n -= 9
            sum += n
        }
        return if (sum % 10 == 0) id else null
    }
}
