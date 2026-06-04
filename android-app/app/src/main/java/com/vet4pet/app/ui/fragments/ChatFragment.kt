package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.core.widget.doOnTextChanged
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.databinding.FragmentChatBinding
import com.vet4pet.app.ui.adapters.MessageAdapter
import com.vet4pet.app.ui.viewmodels.MessagesViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class ChatFragment : Fragment() {

    private var _binding: FragmentChatBinding? = null
    private val binding get() = _binding!!
    private val viewModel: MessagesViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentChatBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val partnerId   = arguments?.getString("partnerId")   ?: return
        val partnerName = arguments?.getString("partnerName") ?: partnerId

        val session  = SessionManager(requireContext())
        val myId     = session.getUser()?.id ?: ""
        val isOwner  = session.getUser()?.role == "owner"

        // Header
        binding.tvPartnerName.text  = partnerName
        binding.tvPartnerRole.text  = if (isOwner) getString(R.string.messages_role_vet)
                                      else getString(R.string.messages_role_owner)
        binding.tvChatInitial.text  = partnerName.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
        binding.btnBack.setOnClickListener { requireActivity().onBackPressedDispatcher.onBackPressed() }

        // Messages RecyclerView
        val adapter = MessageAdapter(myId)
        val llm     = LinearLayoutManager(requireContext()).apply { stackFromEnd = true }
        binding.rvMessages.layoutManager = llm
        binding.rvMessages.adapter       = adapter

        // Observe messages
        viewModel.messages.observe(viewLifecycleOwner) { state ->
            binding.progressChat.isVisible = state is UiState.Loading && adapter.itemCount == 0
            if (state is UiState.Success) {
                adapter.submitList(state.data) {
                    if (state.data.isNotEmpty()) {
                        binding.rvMessages.scrollToPosition(state.data.size - 1)
                    }
                }
            }
        }

        // Observe send state
        viewModel.sendState.observe(viewLifecycleOwner) { state ->
            binding.btnSend.isEnabled = state !is UiState.Loading
            if (state is UiState.Success) {
                binding.etMessage.text?.clear()
                viewModel.resetSendState()
            }
        }

        // Send button
        binding.btnSend.setOnClickListener {
            val content = binding.etMessage.text?.toString()?.trim() ?: return@setOnClickListener
            if (content.isNotEmpty()) {
                viewModel.sendMessage(content, partnerId, partnerName)
            }
        }

        // Open conversation (loads messages + starts polling)
        viewModel.openConversation(partnerId)
    }

    override fun onStop() {
        super.onStop()
        viewModel.stopPolling()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
