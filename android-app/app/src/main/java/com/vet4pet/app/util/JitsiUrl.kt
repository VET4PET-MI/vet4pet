package com.vet4pet.app.util

// Jitsi config appended to the room URL so the in-app WebView joins the call directly:
// disableDeepLinking stops meet.jit.si from serving the mobile "open in app" interstitial,
// and prejoinPageEnabled=false skips the pre-join screen. Lowercase `true` matters.
private const val JITSI_CONFIG = "config.disableDeepLinking=true&config.prejoinPageEnabled=false"

/**
 * Appends the Jitsi join config to a room URL. Config lives in the URL hash; if the URL
 * already has a hash we extend it with `&`, otherwise we start one with `#`. Returns the
 * URL unchanged if the config is already present.
 */
fun buildJitsiCallUrl(url: String): String {
    if (url.contains("disableDeepLinking")) return url
    val separator = if (url.contains("#")) "&" else "#"
    return "$url$separator$JITSI_CONFIG"
}
