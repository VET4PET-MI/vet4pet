package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.R
import com.vet4pet.app.data.models.api.NotificationDto
import com.vet4pet.app.databinding.ItemNotificationBinding
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class NotificationAdapter(
    private val onClick: (NotificationDto) -> Unit,
    private val onDelete: (NotificationDto) -> Unit
) : ListAdapter<NotificationDto, NotificationAdapter.VH>(DIFF) {

    inner class VH(private val b: ItemNotificationBinding) : RecyclerView.ViewHolder(b.root) {
        fun bind(n: NotificationDto) {
            b.tvNotifTitle.text   = n.toTitle()
            b.tvNotifSub.text     = n.toSubtitle()
            b.tvNotifTime.text    = formatTime(n.createdAt)
            b.ivNotifIcon.setImageResource(n.iconRes())
            b.viewUnreadDot.visibility =
                if (!n.read) android.view.View.VISIBLE else android.view.View.INVISIBLE

            b.root.alpha = if (n.read) 0.65f else 1f
            b.root.setOnClickListener { onClick(n) }
            b.btnDelete.setOnClickListener { onDelete(n) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemNotificationBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(getItem(position))

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<NotificationDto>() {
            override fun areItemsTheSame(a: NotificationDto, b: NotificationDto) = a.id == b.id
            override fun areContentsTheSame(a: NotificationDto, b: NotificationDto) =
                a.read == b.read && a.type == b.type
        }

        fun formatTime(iso: String?): String {
            iso ?: return ""
            return try {
                val sdf  = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val date = sdf.parse(iso.take(19)) ?: return ""
                val now  = Calendar.getInstance()
                val cal  = Calendar.getInstance().apply { time = date }
                val diffMin = ((now.timeInMillis - cal.timeInMillis) / 60_000).toInt()
                when {
                    diffMin < 1  -> "Just now"
                    diffMin < 60 -> "$diffMin min ago"
                    diffMin < 1440 -> "${diffMin / 60}h ago"
                    now.get(Calendar.DAY_OF_YEAR) - cal.get(Calendar.DAY_OF_YEAR) == 1 -> "Yesterday"
                    else -> SimpleDateFormat("MMM d", Locale.getDefault()).format(date)
                }
            } catch (e: Exception) { "" }
        }
    }
}

private fun NotificationDto.iconRes(): Int = when (type) {
    "message_received"              -> R.drawable.ic_nav_messages
    "consultation_requested",
    "consultation_active"           -> R.drawable.ic_video_call
    "appointment_booked_by_owner",
    "appointment_booked_by_vet",
    "appointment_cancelled_by_vet",
    "appointment_cancelled_by_owner",
    "appointment_reminder",
    "appointment_reminder_vet"      -> R.drawable.ic_nav_appointments
    "vaccination_reminder"          -> R.drawable.ic_medical_cross
    else                            -> R.drawable.ic_notifications
}

private fun NotificationDto.toTitle(): String = when (type) {
    "message_received"               -> "New message from ${param("senderName")}"
    "consultation_requested"         -> "Consultation request from ${param("ownerName")}"
    "consultation_active"            -> "Your vet is ready for the call"
    "appointment_booked_by_owner"    -> "${param("ownerName")} booked an appointment"
    "appointment_booked_by_vet"      -> "Appointment confirmed"
    "appointment_cancelled_by_vet"   -> "Appointment cancelled by vet"
    "appointment_cancelled_by_owner" -> "Appointment cancelled by owner"
    "appointment_reminder"           -> "Appointment reminder"
    "appointment_reminder_vet"       -> "Appointment tomorrow"
    "vaccination_reminder"           -> "Vaccination reminder"
    else                             -> type.replace('_', ' ').replaceFirstChar { it.uppercase() }
}

private fun NotificationDto.toSubtitle(): String = when (type) {
    "message_received"               -> "Tap to open conversation"
    "consultation_requested"         -> param("petName").let { if (it.isBlank()) "" else "About: $it" }
    "consultation_active"            -> param("petName").let { if (it.isBlank()) "Join the video call" else "About $it — tap to join" }
    "appointment_booked_by_owner"    -> "Check your schedule"
    "appointment_booked_by_vet"      -> "Check your appointments"
    "appointment_cancelled_by_vet"   -> "Your appointment has been cancelled"
    "appointment_cancelled_by_owner" -> "An upcoming slot is now free"
    "appointment_reminder"           -> "You have an appointment tomorrow"
    "appointment_reminder_vet"       -> "You have a patient tomorrow"
    "vaccination_reminder"           -> "Check vaccination schedule"
    else                             -> ""
}
