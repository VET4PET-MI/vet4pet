package com.vet4pet.app

import com.vet4pet.app.util.buildJitsiCallUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for the Jitsi join-URL builder. The appended config (disableDeepLinking +
 * prejoin off) is what lets the in-app WebView join meet.jit.si directly instead of hitting
 * the mobile "open in app" interstitial that broke video calls on Android.
 */
class JitsiUrlTest {

    @Test
    fun appendsConfigWithHashWhenNonePresent() {
        val result = buildJitsiCallUrl("https://meet.jit.si/Vet4Pet-abc123")
        assertEquals(
            "https://meet.jit.si/Vet4Pet-abc123#config.disableDeepLinking=true&config.prejoinPageEnabled=false",
            result
        )
    }

    @Test
    fun extendsExistingHashWithAmpersand() {
        val result = buildJitsiCallUrl("https://meet.jit.si/Room#userInfo.displayName=Vet")
        assertEquals(
            "https://meet.jit.si/Room#userInfo.displayName=Vet&config.disableDeepLinking=true&config.prejoinPageEnabled=false",
            result
        )
    }

    @Test
    fun isIdempotentWhenConfigAlreadyPresent() {
        val once = buildJitsiCallUrl("https://meet.jit.si/Vet4Pet-x")
        val twice = buildJitsiCallUrl(once)
        assertEquals(once, twice)
    }

    @Test
    fun alwaysDisablesDeepLinkingWithLowercaseTrue() {
        val result = buildJitsiCallUrl("https://meet.jit.si/Vet4Pet-x")
        assertTrue(result.contains("config.disableDeepLinking=true"))
    }
}
