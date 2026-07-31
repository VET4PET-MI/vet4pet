package com.vet4pet.app.worker

import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.vet4pet.app.R
import com.vet4pet.app.data.local.PetHealthCache
import com.vet4pet.app.service.MyFirebaseMessagingService

class VaccinationReminderWorker(
    private val context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        MyFirebaseMessagingService.ensureChannel(context)
        val cache = PetHealthCache(context)
        val now   = System.currentTimeMillis()
        val oneYearMs = 365L * 24 * 3600 * 1000

        cache.getAllEntries().forEachIndexed { index, (petName, lastVaccMs) ->
            if (lastVaccMs > 0 && now - lastVaccMs >= oneYearMs) {
                val body = context.getString(R.string.vacc_reminder_body, petName)
                val notification = NotificationCompat.Builder(context, MyFirebaseMessagingService.CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_launcher_foreground)
                    .setContentTitle(context.getString(R.string.vacc_reminder_title))
                    .setContentText(body)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setAutoCancel(true)
                    .build()
                val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.notify(NOTIF_ID_BASE + index, notification)
            }
        }
        return Result.success()
    }

    companion object {
        private const val NOTIF_ID_BASE = 2000
        const val WORK_NAME = "vaccination_reminder"
    }
}
