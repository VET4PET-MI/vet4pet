package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.data.models.api.NearbyVetDto
import com.vet4pet.app.databinding.ItemEmergencyVetBinding

class EmergencyVetAdapter(
    private val onCall: (phone: String) -> Unit,
    private val onMessage: (vet: NearbyVetDto) -> Unit
) : ListAdapter<NearbyVetDto, EmergencyVetAdapter.VH>(DIFF) {

    inner class VH(private val b: ItemEmergencyVetBinding) : RecyclerView.ViewHolder(b.root) {
        fun bind(vet: NearbyVetDto) {
            b.tvVetName.text    = vet.displayName
            b.tvVetAddress.text = vet.address ?: ""
            b.tvVetAddress.visibility = if (vet.address.isNullOrBlank()) View.GONE else View.VISIBLE

            val dist = vet.formattedDistance
            b.tvDistance.text       = dist
            b.tvDistance.visibility = if (dist.isEmpty()) View.GONE else View.VISIBLE

            if (vet.isOnCall == true) {
                b.tvOnCallBadge.visibility  = View.VISIBLE
                b.tvOffDutyBadge.visibility = View.GONE
                b.ivVetIcon.setBackgroundResource(com.vet4pet.app.R.drawable.bg_vet_on_call)
            } else {
                b.tvOnCallBadge.visibility  = View.GONE
                b.tvOffDutyBadge.visibility = View.VISIBLE
                b.ivVetIcon.setBackgroundResource(com.vet4pet.app.R.drawable.bg_avatar)
            }

            if (!vet.phone.isNullOrBlank()) {
                b.btnCall.visibility = View.VISIBLE
                b.btnCall.setOnClickListener { onCall(vet.phone) }
            } else {
                b.btnCall.visibility = View.GONE
            }

            b.btnMessage.setOnClickListener { onMessage(vet) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemEmergencyVetBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(getItem(position))

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<NearbyVetDto>() {
            override fun areItemsTheSame(a: NearbyVetDto, b: NearbyVetDto) = a.id == b.id
            override fun areContentsTheSame(a: NearbyVetDto, b: NearbyVetDto) = a == b
        }
    }
}
