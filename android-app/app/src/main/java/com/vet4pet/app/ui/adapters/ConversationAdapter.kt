package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.data.models.api.ConversationDto
import com.vet4pet.app.databinding.ItemConversationBinding
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class ConversationAdapter(
    private val myId: String,
    private val onClick: (partnerId: String, partnerName: String) -> Unit
) : ListAdapter<ConversationDto, ConversationAdapter.VH>(DIFF) {

    inner class VH(private val binding: ItemConversationBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(conv: ConversationDto) {
            val msg         = conv.lastMessage
            val partnerId   = conv.id.split("::").firstOrNull { it != myId } ?: conv.id
            val partnerName = if (msg.senderId == partnerId) msg.senderName else msg.receiverName
            val name        = partnerName?.takeIf { it.isNotBlank() } ?: "Unknown"

            binding.tvInitial.text      = name.first().uppercaseChar().toString()
            binding.tvName.text         = name
            binding.tvLastMessage.text  = msg.content
            binding.tvTime.text         = formatTime(msg.createdAt)

            if (conv.unread > 0) {
                binding.tvUnread.text      = conv.unread.toString()
                binding.tvUnread.visibility = android.view.View.VISIBLE
            } else {
                binding.tvUnread.visibility = android.view.View.GONE
            }

            binding.root.setOnClickListener { onClick(partnerId, name) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemConversationBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(getItem(position))

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<ConversationDto>() {
            override fun areItemsTheSame(a: ConversationDto, b: ConversationDto) = a.id == b.id
            override fun areContentsTheSame(a: ConversationDto, b: ConversationDto) =
                a.lastMessage.id == b.lastMessage.id && a.unread == b.unread
        }

        fun formatTime(iso: String?): String {
            iso ?: return ""
            return try {
                val sdf  = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                val date = sdf.parse(iso.take(19)) ?: return ""
                val now  = Calendar.getInstance()
                val cal  = Calendar.getInstance().apply { time = date }
                when {
                    isSameDay(cal, now)                                   ->
                        SimpleDateFormat("HH:mm", Locale.getDefault()).format(date)
                    now.get(Calendar.DAY_OF_YEAR) - cal.get(Calendar.DAY_OF_YEAR) == 1 ->
                        "Yesterday"
                    else ->
                        SimpleDateFormat("MMM d", Locale.getDefault()).format(date)
                }
            } catch (e: Exception) { "" }
        }

        private fun isSameDay(a: Calendar, b: Calendar) =
            a.get(Calendar.YEAR) == b.get(Calendar.YEAR) &&
            a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR)
    }
}
