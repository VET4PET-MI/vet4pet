package com.vet4pet.app.data.models.api

import com.google.gson.annotations.SerializedName

data class MessageDto(
    @SerializedName("_id") val id: String,
    val conversationId: String?,
    val senderId: String,
    val senderName: String?,
    val receiverId: String,
    val receiverName: String?,
    val content: String,
    val read: Boolean,
    val createdAt: String?
)

data class ConversationDto(
    @SerializedName("_id") val id: String,   // "userId1::userId2"
    val lastMessage: MessageDto,
    val unread: Int
)

data class SendMessageRequest(
    val receiverId: String,
    val receiverName: String,
    val content: String
)
