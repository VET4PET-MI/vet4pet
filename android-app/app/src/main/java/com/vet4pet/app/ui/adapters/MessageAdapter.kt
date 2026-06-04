package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.data.models.api.MessageDto
import com.vet4pet.app.databinding.ItemMessageMineBinding
import com.vet4pet.app.databinding.ItemMessageTheirsBinding

class MessageAdapter(private val myId: String) :
    ListAdapter<MessageDto, RecyclerView.ViewHolder>(DIFF) {

    companion object {
        private const val VIEW_MINE   = 0
        private const val VIEW_THEIRS = 1

        private val DIFF = object : DiffUtil.ItemCallback<MessageDto>() {
            override fun areItemsTheSame(a: MessageDto, b: MessageDto) = a.id == b.id
            override fun areContentsTheSame(a: MessageDto, b: MessageDto) = a == b
        }
    }

    override fun getItemViewType(position: Int) =
        if (getItem(position).senderId == myId) VIEW_MINE else VIEW_THEIRS

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == VIEW_MINE)
            MineVH(ItemMessageMineBinding.inflate(inflater, parent, false))
        else
            TheirsVH(ItemMessageTheirsBinding.inflate(inflater, parent, false))
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val msg = getItem(position)
        val time = ConversationAdapter.formatTime(msg.createdAt)
        when (holder) {
            is MineVH   -> holder.bind(msg.content, time)
            is TheirsVH -> holder.bind(msg.content, time, msg.senderName)
        }
    }

    class MineVH(private val b: ItemMessageMineBinding) : RecyclerView.ViewHolder(b.root) {
        fun bind(content: String, time: String) {
            b.tvContent.text = content
            b.tvTime.text    = time
        }
    }

    class TheirsVH(private val b: ItemMessageTheirsBinding) : RecyclerView.ViewHolder(b.root) {
        fun bind(content: String, time: String, senderName: String?) {
            b.tvContent.text = content
            b.tvTime.text    = time
            b.tvInitial.text = (senderName?.firstOrNull()?.uppercaseChar() ?: '?').toString()
        }
    }
}
