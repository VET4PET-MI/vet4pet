package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.R
import com.vet4pet.app.data.models.Appointment
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

sealed class ApptListItem {
    data class Header(val title: String) : ApptListItem()
    data class Item(val appt: Appointment) : ApptListItem()
}

class AppointmentAdapter(
    private val onItemClick: (Appointment) -> Unit
) : ListAdapter<ApptListItem, RecyclerView.ViewHolder>(DiffCallback) {

    override fun getItemViewType(position: Int) = when (getItem(position)) {
        is ApptListItem.Header -> 0
        is ApptListItem.Item   -> 1
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == 0) {
            HeaderVH(inflater.inflate(R.layout.item_appt_section_header, parent, false))
        } else {
            ItemVH(inflater.inflate(R.layout.item_appointment, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val item = getItem(position)) {
            is ApptListItem.Header -> (holder as HeaderVH).bind(item.title)
            is ApptListItem.Item   -> (holder as ItemVH).bind(item.appt)
        }
    }

    inner class HeaderVH(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvHeader: TextView = itemView.findViewById(R.id.tv_section_header)
        fun bind(title: String) { tvHeader.text = title }
    }

    inner class ItemVH(itemView: View) : RecyclerView.ViewHolder(itemView) {

        private var lastClickMs = 0L

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

            // Type label (translated via string resource)
            tvType.text = itemView.context.getString(appt.type.toTypeStringRes())

            tvPetName.text = appt.petName
            tvVetName.text = buildString {
                if (appt.vetName.isNotBlank()) append("Dr. ${appt.vetName}")
                if (appt.duration > 0) {
                    if (isNotEmpty()) append("  ·  ")
                    append("${appt.duration} min")
                }
            }

            if (appt.notes.isNotBlank()) {
                tvNotes.text = "· ${appt.notes}"
                tvNotes.visibility = android.view.View.VISIBLE
            } else {
                tvNotes.visibility = android.view.View.GONE
            }

            // Status tint
            val alpha = if (appt.status == "cancelled" || appt.status == "completed") 0.4f else 1f
            itemView.alpha = alpha

            itemView.setOnClickListener {
                val now = System.currentTimeMillis()
                if (now - lastClickMs > 600L) {
                    lastClickMs = now
                    onItemClick(appt)
                }
            }
        }
    }

    private companion object {
        val DiffCallback = object : DiffUtil.ItemCallback<ApptListItem>() {
            override fun areItemsTheSame(a: ApptListItem, b: ApptListItem) = when {
                a is ApptListItem.Header && b is ApptListItem.Header -> a.title == b.title
                a is ApptListItem.Item   && b is ApptListItem.Item   -> a.appt.id == b.appt.id
                else -> false
            }
            override fun areContentsTheSame(a: ApptListItem, b: ApptListItem) = a == b
        }
    }
}

fun String.toTypeStringRes(): Int = when (this) {
    "CHECKUP"      -> R.string.book_type_checkup
    "VACCINATION"  -> R.string.book_type_vaccination
    "FOLLOW_UP"    -> R.string.book_type_follow_up
    "EMERGENCY"    -> R.string.book_type_emergency
    "CONSULTATION" -> R.string.book_type_consultation
    else           -> R.string.book_type_other
}
