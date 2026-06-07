package com.vet4pet.app

import android.Manifest
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.vet4pet.app.worker.VaccinationReminderWorker
import java.util.concurrent.TimeUnit
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.firebase.messaging.FirebaseMessaging
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.network.ApiClient
import com.vet4pet.app.service.MyFirebaseMessagingService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private val noNavDestinations = setOf(
        R.id.loginFragment,
        R.id.registerFragment,
        R.id.chatFragment,
        R.id.consultationsFragment,
        R.id.emergencyVetsFragment,
        R.id.bookAppointmentFragment,
        R.id.medicalHistoryFragment,
        R.id.medicalRecordDetailFragment,
        R.id.addMedicalRecordFragment,
        R.id.notificationsFragment,
        R.id.vetScheduleFragment
    )

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* granted or denied — no action needed */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        createNotificationChannel()
        requestNotificationPermissionIfNeeded()
        scheduleVaccinationReminder()

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        val bottomNavView = findViewById<BottomNavigationView>(R.id.bottom_nav_view)
        bottomNavView.setupWithNavController(navController)

        if (!SessionManager(this).isLoggedIn()) {
            navController.navigate(
                R.id.loginFragment,
                null,
                androidx.navigation.NavOptions.Builder()
                    .setPopUpTo(R.id.homeFragment, true)
                    .build()
            )
        } else {
            // Re-upload FCM token on every app start in case it changed
            refreshFcmToken()

            // Navigate to notifications if launched from a push notification tap
            if (intent?.getBooleanExtra(EXTRA_OPEN_NOTIFICATIONS, false) == true) {
                navController.navigate(R.id.notificationsFragment)
            }
        }

        navController.addOnDestinationChangedListener { _, destination, _ ->
            bottomNavView.visibility =
                if (destination.id in noNavDestinations) android.view.View.GONE
                else android.view.View.VISIBLE
        }
    }

    // Called when the activity is brought to foreground via a notification tap (already running)
    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra(EXTRA_OPEN_NOTIFICATIONS, false)) {
            val navHostFragment = supportFragmentManager
                .findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
            navHostFragment?.navController?.navigate(R.id.notificationsFragment)
        }
    }

    private fun scheduleVaccinationReminder() {
        val request = PeriodicWorkRequestBuilder<VaccinationReminderWorker>(1, TimeUnit.DAYS)
            .build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            VaccinationReminderWorker.WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request
        )
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            MyFirebaseMessagingService.CHANNEL_ID,
            "התראות VET4PET",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "תורים, חיסונים והתראות כלליות"
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED
        ) {
            requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun refreshFcmToken() {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            lifecycleScope.launch(Dispatchers.IO) {
                try { ApiClient.get(this@MainActivity).updateFcmToken(mapOf("fcmToken" to token)) }
                catch (_: Exception) { /* non-critical */ }
            }
        }
    }

    companion object {
        const val EXTRA_OPEN_NOTIFICATIONS = "open_notifications"
    }
}
