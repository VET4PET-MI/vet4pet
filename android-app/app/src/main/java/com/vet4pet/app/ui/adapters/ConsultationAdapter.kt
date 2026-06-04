package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.R
import com.vet4pet.app.data.models.api.ConsultationDto
import com.vet4pet.app.databinding.ItemConsultationBinding
import java.text.SimpleDateFormat
import java.util.Locale

class ConsultationAdapter(
    private val isOwner: Boolean,
    private val onJoin: (ConsultationDto) -> Unit,
    private val onAccept: (ConsultationDto) -> Unit,
    private val onDecline: (ConsultationDto) -> Unit,
    private val onEnd: (ConsultationDto) -> Unit
) : ListAdapter<ConsultationDto, ConsultationAdapter.VH>(DIFF) {

    inner class VH(private val b: ItemConsultationBinding) : RecyclerView.ViewHolder(b.root) {

        fun bind(c: ConsultationDto) {
            // Title line
            b.tvConsultTitle.text = if (isOwner)
                c.petName?.takeIf { it.isNotBlank() } ?: b.root.context.getString(R.string.consult_consultation)
            else
                c.ownerName?.takeIf { it.isNotBlank() } ?: b.root.context.getString(R.string.consult_pet_owner)

            // Sub-line: pet name for vet, notes for owner
            val sub = if (!isOwner && !c.petName.isNullOrBlank()) c.petName
                      else c.notes?.takeIf { it.isNotBlank() }
            b.tvConsultSub.text       = sub ?: ""
            b.tvConsultSub.visibility = if (sub != null) View.VISIBLE else View.GONE

            // Time
            b.tvConsultTime.text = formatTime(c.createdAt)

            // Status badge
            val ctx = b.root.context
            when (c.status) {
                "pending" -> {
                    b.tvStatus.text = ctx.getString(R.string.consult_status_pending)
                    b.tvStatus.setBackgroundResource(R.drawable.bg_status_pending)
                }
                "active" -> {
                    b.tvStatus.text = ctx.getString(R.string.consult_status_active)
                    b.tvStatus.setBackgroundResource(R.drawable.bg_status_active)
                }
                else -> {
                    b.tvStatus.text = ctx.getString(R.string.consult_status_ended)
                    b.tvStatus.setBackgroundResource(R.drawable.bg_status_ended)
                }
            }

            // Action buttons
            b.btnJoin.visibility    = View.GONE
            b.btnAccept.visibility  = View.GONE
            b.btnDecline.visibility = View.GONE
            b.btnEnd.visibility     = View.GONE

            if (isOwner) {
                if (c.status == "active") {
                    b.btnJoin.visibility = View.VISIBLE
                    b.btnJoin.setOnClickListener { onJoin(c) }
                }
            } else {
                when (c.status) {
                    "pending" -> {
                        b.btnAccept.visibility  = View.VISIBLE
                        b.btnDecline.visibility = View.VISIBLE
                        b.btnAccept.setOnClickListener  { onAccept(c) }
                        b.btnDecline.setOnClickListener { onDecline(c) }
                    }
                    "active" -> {
                        b.btnJoin.visibility = View.VISIBLE
                        b.btnEnd.visibility  = View.VISIBLE
                        b.btnJoin.setOnClickListener { onJoin(c) }
                        b.btnEnd.setOnClickListener  { onEnd(c) }
                    }
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemConsultationBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(getItem(position))

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<ConsultationDto>() {
            override fun areItemsTheSame(a: ConsultationDto, b: ConsultationDto) = a.id == b.id
            override fun areContentsTheSame(a: ConsultationDto, b: ConsultationDto) =
                a.status == b.status && a.notes == b.notes
        }

        fun formatTime(iso: String?): String {
            iso ?: return ""
            return try {
                val sdf  = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val date = sdf.parse(iso.take(19)) ?: return ""
                SimpleDateFormat("MMM d, HH:mm", Locale.getDefault()).format(date)
            } catch (e: Exception) { "" }
        }
    }
}
