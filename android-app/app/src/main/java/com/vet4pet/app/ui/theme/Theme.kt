package com.vet4pet.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary                = Brand,
    onPrimary              = Surface,
    primaryContainer       = BrandSoft,
    onPrimaryContainer     = BrandDeep,
    secondary              = BrandDark,
    onSecondary            = Surface,
    secondaryContainer     = BrandTint,
    onSecondaryContainer   = BrandDeep,
    tertiary               = Emerald700,
    onTertiary             = Surface,
    tertiaryContainer      = Emerald50,
    onTertiaryContainer    = Emerald900,
    background             = Bg,
    onBackground           = Ink,
    surface                = Surface,
    onSurface              = Ink,
    onSurfaceVariant       = InkMuted,
    surfaceVariant         = Slate100,
    outline                = Slate200,
)

@Composable
fun VET4PETTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography  = Typography,
        content     = content
    )
}
