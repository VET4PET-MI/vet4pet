package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.R
import com.vet4pet.app.data.models.Appointment
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

class AppointmentAdapter(
    private val onCancel: (Appointment) -> Unit
) : ListAdapter<Appointment, AppointmentAdapter.ViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_appointment, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) =
        holder.bind(getItem(position))

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {

        private val tvMonth:   TextView = itemView.findViewById(R.id.tv_month)
        private val tvDay:     TextView = itemView.findViewById(R.id.tv_day)
        private val tvTime:    TextView = itemView.findViewById(R.id.tv_time)
        private val tvAmpm:    TextView = itemView.findViewById(R.id.tv_ampm)
        private val tvType:    TextView = itemView.findViewById(R.id.tv_appt_type)
        private val tvPetName: TextView = itemView.findViewById(R.id.tv_appt_pet_name)
        private val tvVetName: TextView = itemView.findViewById(R.id.tv_vet_name)
        private val tvNotes:   TextView = itemView.findViewById(R.id.tv_appt_notes)

        fun bind(appt: Appointment) {
            // Date
            runCatching {
                val date = LocalDate.parse(appt.date)
                tvMonth.text = date.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
                    .uppercase(Locale.getDefault())
                tvDay.text = date.dayOfMonth.toString()
            }

            // Time
            if (appt.time.isNotBlank()) {
                val parts = appt.time.split(":")
                val h = parts[0].toIntOrNull() ?: 0
                val ampm = if (h < 12) "AM" else "PM"
                val h12 = when { h == 0 -> 12; h > 12 -> h - 12; else -> h }
                tvTime.text = "$h12:${parts.getOrElse(1) { "00" }}"
                tvAmpm.text = ampm
            }

            // Type label
            tvType.text = appt.type.replace('_', ' ').lowercase()
                .replaceFirstChar { it.uppercaseChar() }

            tvPetName.text = appt.petName
            tvVetName.text = if (appt.vetName.isNotBlank()) "Dr. ${appt.vetName}" else ""

            if (appt.notes.isNotBlank()) {
                tvNotes.text = "· ${appt.notes}"
                tvNotes.visibility = android.view.View.VISIBLE
            } else {
                tvNotes.visibility = android.view.View.GONE
            }

            // Status tint
            val alpha = if (appt.status == "cancelled" || appt.status == "completed") 0.4f else 1f
            itemView.alpha = alpha

            // Long-press to cancel (only booked/confirmed)
            itemView.setOnLongClickListener {
                if (appt.status == "booked" || appt.status == "confirmed") {
                    onCancel(appt)
                    true
                } else false
            }
        }
    }

    private companion object {
        val DiffCallback = object : DiffUtil.ItemCallback<Appointment>() {
            override fun areItemsTheSame(old: Appointment, new: Appointment) = old.id == new.id
            override fun areContentsTheSame(old: Appointment, new: Appointment) = old == new
        }
    }
}
