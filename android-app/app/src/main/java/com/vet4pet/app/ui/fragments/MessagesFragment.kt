package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.api.VetDto
import com.vet4pet.app.databinding.FragmentMessagesBinding
import com.vet4pet.app.network.ApiClient
import com.vet4pet.app.ui.adapters.ConversationAdapter
import com.vet4pet.app.ui.viewmodels.MessagesViewModel
import com.vet4pet.app.ui.viewmodels.UiState
import kotlinx.coroutines.launch

class MessagesFragment : Fragment() {

    private var _binding: FragmentMessagesBinding? = null
    private val binding get() = _binding!!
    private val viewModel: MessagesViewModel by activityViewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMessagesBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session   = SessionManager(requireContext())
        val myId      = session.getUser()?.id ?: ""
        val isOwner   = session.getUser()?.role == "owner"

        val adapter = ConversationAdapter(myId) { partnerId, partnerName ->
            findNavController().navigate(
                R.id.action_messagesFragment_to_chatFragment,
                bundleOf("partnerId" to partnerId, "partnerName" to partnerName)
            )
        }
        binding.rvConversations.adapter = adapter

        viewModel.conversations.observe(viewLifecycleOwner) { state ->
            binding.progressMessages.isVisible = state is UiState.Loading
            when (state) {
                is UiState.Success -> {
                    val list = state.data
                    binding.layoutEmpty.isVisible = list.isEmpty()
                    binding.rvConversations.isVisible = list.isNotEmpty()
                    adapter.submitList(list)
                }
                is UiState.Error -> {
                    binding.layoutEmpty.isVisible = true
                    binding.tvEmptyMessages.text = state.message
                }
                else -> {}
            }
        }

        binding.fabNewMessage.setOnClickListener {
            if (isOwner) showOwnerComposeDialog()
            else showVetComposeDialog(myId)
        }

        viewModel.loadConversations()
    }

    override fun onResume() {
        super.onResume()
        viewModel.loadConversations()
    }

    private fun showOwnerComposeDialog() {
        val loadingDialog = MaterialAlertDialogBuilder(requireContext())
            .setMessage(R.string.messages_loading_vets)
            .setCancelable(false)
            .create()
        loadingDialog.show()

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                val vets = ApiClient.get(requireContext()).getVets()
                loadingDialog.dismiss()
                if (vets.isEmpty()) {
                    MaterialAlertDialogBuilder(requireContext())
                        .setMessage(R.string.messages_no_vets)
                        .setPositiveButton(android.R.string.ok, null)
                        .show()
                    return@launch
                }
                showVetPickerDialog(vets)
            } catch (e: Exception) {
                loadingDialog.dismiss()
                MaterialAlertDialogBuilder(requireContext())
                    .setMessage(R.string.messages_load_fail)
                    .setPositiveButton(android.R.string.ok, null)
                    .show()
            }
        }
    }

    private fun showVetPickerDialog(vets: List<VetDto>) {
        val names   = vets.map { it.name }.toTypedArray()
        var selected = 0
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.messages_select_vet)
            .setSingleChoiceItems(names, 0) { _, which -> selected = which }
            .setPositiveButton(R.string.messages_next) { _, _ ->
                val vet = vets[selected]
                showComposeContentDialog(vet.id, vet.name)
            }
            .setNegativeButton(R.string.action_cancel, null)
            .show()
    }

    private fun showComposeContentDialog(receiverId: String, receiverName: String) {
        val input = TextInputEditText(requireContext()).apply {
            hint = getString(R.string.messages_input_hint)
            minLines = 3
        }
        val layout = TextInputLayout(requireContext()).apply {
            addView(input)
            setPadding(48, 16, 48, 0)
        }
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.messages_to, receiverName))
            .setView(layout)
            .setPositiveButton(R.string.messages_send) { _, _ ->
                val content = input.text?.toString()?.trim() ?: return@setPositiveButton
                if (content.isNotEmpty()) {
                    viewModel.sendMessage(content, receiverId, receiverName)
                    navigateToChat(receiverId, receiverName)
                }
            }
            .setNegativeButton(R.string.action_cancel, null)
            .show()
    }

    private fun showVetComposeDialog(myId: String) {
        val view    = layoutInflater.inflate(R.layout.dialog_compose_message, null)
        val etId    = view.findViewById<TextInputEditText>(R.id.et_receiver_id)
        val etName  = view.findViewById<TextInputEditText>(R.id.et_receiver_name)
        val etMsg   = view.findViewById<TextInputEditText>(R.id.et_compose_content)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.messages_new_message)
            .setView(view)
            .setPositiveButton(R.string.messages_send) { _, _ ->
                val receiverId   = etId.text?.toString()?.trim()   ?: return@setPositiveButton
                val receiverName = etName.text?.toString()?.trim() ?: receiverId
                val content      = etMsg.text?.toString()?.trim()  ?: return@setPositiveButton
                if (receiverId.isNotEmpty() && content.isNotEmpty()) {
                    viewModel.sendMessage(content, receiverId, receiverName)
                    navigateToChat(receiverId, receiverName.ifBlank { receiverId })
                }
            }
            .setNegativeButton(R.string.action_cancel, null)
            .show()
    }

    private fun navigateToChat(partnerId: String, partnerName: String) {
        findNavController().navigate(
            R.id.action_messagesFragment_to_chatFragment,
            bundleOf("partnerId" to partnerId, "partnerName" to partnerName)
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
