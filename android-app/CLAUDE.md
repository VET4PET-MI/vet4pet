# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

All Gradle commands use the wrapper (`./gradlew` on Unix, `gradlew.bat` on Windows):

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Run JVM unit tests
./gradlew test

# Run a single unit test class
./gradlew test --tests "com.vet4pet.app.ExampleUnitTest"

# Run instrumented tests (requires connected device/emulator)
./gradlew connectedAndroidTest

# Lint
./gradlew lint

# Clean build outputs
./gradlew clean
```

## Architecture

This is a standard single-module Android app using **Jetpack Compose** and **Material3**.

- `app/src/main/java/com/vet4pet/app/` — application source root
  - `MainActivity.kt` — single activity entry point; uses `setContent` to host the Compose UI tree
  - `ui/theme/` — `Theme.kt`, `Color.kt`, `Type.kt` define the app-wide `VET4PETTheme` composable (Material3, dynamic color on Android 12+, dark/light support)
- `app/src/test/` — JVM unit tests (JUnit 4)
- `app/src/androidTest/` — instrumented tests (Espresso + Compose test rules)

Dependency versions are managed centrally in `gradle/libs.versions.toml` (version catalog). Add new dependencies there before referencing them in `app/build.gradle.kts`.

## Key Config

- `minSdk = 26`, `targetSdk / compileSdk = 35`
- Kotlin 2.0.21, AGP 8.9.2, Compose BOM 2024.09.00
- Package namespace: `com.vet4pet.app`
