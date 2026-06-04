package com.vet4pet.app.ui.fragments

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.api.ConsultationDto
import com.vet4pet.app.data.models.api.PetDto
import com.vet4pet.app.databinding.FragmentConsultationsBinding
import com.vet4pet.app.network.ApiClient
import com.vet4pet.app.ui.adapters.ConsultationAdapter
import com.vet4pet.app.ui.viewmodels.ConsultationsViewModel
import com.vet4pet.app.ui.viewmodels.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ConsultationsFragment : Fragment() {

    private var _binding: FragmentConsultationsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ConsultationsViewModel by viewModels()

    // Tracks the active consultation URL for the owner "vet ready" banner
    private var activeJitsiUrl: String? = null

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentConsultationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        val user    = session.getUser() ?: return
        val isOwner = user.role == "owner"
        val myId    = user.id

        binding.btnBack.setOnClickListener { requireActivity().onBackPressedDispatcher.onBackPressed() }

        // Owner: show FAB, hide vet banner
        // Vet: hide FAB, start polling
        binding.fabRequest.isVisible = isOwner

        // Adapter
        val adapter = ConsultationAdapter(
            isOwner  = isOwner,
            onJoin   = { openJitsi(it.jitsiUrl) },
            onAccept = { c ->
                viewModel.accept(c.id)
                // Open Jitsi immediately after accepting
                viewModel.actionState.observe(viewLifecycleOwner) { state ->
                    if (state is UiState.Success && state.data.id == c.id && state.data.status == "active") {
                        openJitsi(state.data.jitsiUrl)
                        viewModel.resetActionState()
                    }
                }
            },
            onDecline = { viewModel.decline(it.id) },
            onEnd     = { c ->
                MaterialAlertDialogBuilder(requireContext())
                    .setTitle(R.string.consult_end_title)
                    .setMessage(R.string.consult_end_message)
                    .setPositiveButton(R.string.consult_end_confirm) { _, _ -> viewModel.end(c.id) }
                    .setNegativeButton(R.string.action_cancel, null)
                    .show()
            }
        )
        binding.rvConsultations.adapter = adapter

        // Observe consultations
        viewModel.consultations.observe(viewLifecycleOwner) { state ->
            binding.progressConsultations.isVisible = state is UiState.Loading

            if (state is UiState.Success) {
                val list    = state.data
                val pending = list.count { it.status == "pending" }
                val active  = list.count { it.status == "active"  }
                val ended   = list.count { it.status == "ended"   }

                binding.tvStatPending.text = pending.toString()
                binding.tvStatActive.text  = active.toString()
                binding.tvStatEnded.text   = ended.toString()

                binding.layoutEmpty.isVisible       = list.isEmpty()
                binding.rvConsultations.isVisible   = list.isNotEmpty()
                adapter.submitList(list)

                // Owner: show "vet ready" banner if there's an active consultation
                if (isOwner) {
                    val activeConsult = list.firstOrNull { it.status == "active" }
                    if (activeConsult != null) {
                        activeJitsiUrl = activeConsult.jitsiUrl
                        binding.bannerVetReady.isVisible = true
                        binding.btnJoinActive.setOnClickListener { openJitsi(activeConsult.jitsiUrl) }
                    } else {
                        binding.bannerVetReady.isVisible = false
                    }
                }
            }
        }

        // Vet: observe pending for incoming call banner
        viewModel.pending.observe(viewLifecycleOwner) { pendingList ->
            if (isOwner) return@observe
            if (pendingList.isNotEmpty()) {
                val first = pendingList.first()
                val ownerText = buildString {
                    first.ownerName?.let { append(it) }
                    first.petName?.let { append(" · $it") }
                }
                binding.tvIncomingTitle.text = getString(R.string.consult_incoming_call)
                binding.tvIncomingSub.text   = ownerText
                binding.bannerIncoming.isVisible = true

                binding.btnBannerAccept.setOnClickListener {
                    viewModel.accept(first.id)
                    viewModel.actionState.observe(viewLifecycleOwner) { state ->
                        if (state is UiState.Success && state.data.id == first.id) {
                            openJitsi(state.data.jitsiUrl)
                            viewModel.resetActionState()
                        }
                    }
                }
                binding.btnBannerDecline.setOnClickListener { viewModel.decline(first.id) }
            } else {
                binding.bannerIncoming.isVisible = false
            }
        }

        // FAB: owner requests a consultation
        binding.fabRequest.setOnClickListener { showRequestDialog(user.name, myId) }

        // Error feedback via Snackbar (via actionState)
        viewModel.actionState.observe(viewLifecycleOwner) { state ->
            if (state is UiState.Error) {
                com.google.android.material.snackbar.Snackbar
                    .make(binding.root, state.message, com.google.android.material.snackbar.Snackbar.LENGTH_SHORT)
                    .show()
                viewModel.resetActionState()
            }
        }

        viewModel.load()
        if (!isOwner) viewModel.startPolling()
    }

    override fun onStop() {
        super.onStop()
        viewModel.stopPolling()
    }

    override fun onResume() {
        super.onResume()
        viewModel.load()
        val isOwner = SessionManager(requireContext()).getUser()?.role == "owner"
        if (!isOwner) viewModel.startPolling()
    }

    private fun openJitsi(url: String) {
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    private fun showRequestDialog(ownerName: String, ownerId: String) {
        val loadingDialog = MaterialAlertDialogBuilder(requireContext())
            .setMessage(R.string.consult_loading_pets)
            .setCancelable(false)
            .create()
        loadingDialog.show()

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val pets = ApiClient.get(requireContext()).getPets()
                loadingDialog.dismiss()
                if (pets.isEmpty()) {
                    MaterialAlertDialogBuilder(requireContext())
                        .setMessage(R.string.consult_no_pets)
                        .setPositiveButton(android.R.string.ok, null)
                        .show()
                    return@launch
                }
                showPetPickerAndNotesDialog(ownerName, pets)
            } catch (e: Exception) {
                loadingDialog.dismiss()
                MaterialAlertDialogBuilder(requireContext())
                    .setMessage(R.string.messages_load_fail)
                    .setPositiveButton(android.R.string.ok, null)
                    .show()
            }
        }
    }

    private fun showPetPickerAndNotesDialog(ownerName: String, pets: List<PetDto>) {
        var selectedIndex = 0
        val petNames = pets.map { it.name }.toTypedArray()

        val notesInput = TextInputEditText(requireContext()).apply { hint = getString(R.string.consult_notes_hint) }
        val notesLayout = TextInputLayout(requireContext()).apply {
            setPadding(48, 8, 48, 0)
            addView(notesInput)
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.consult_request_title)
            .setSingleChoiceItems(petNames, 0) { _, which -> selectedIndex = which }
            .setView(notesLayout)
            .setPositiveButton(R.string.consult_request_call) { _, _ ->
                val pet   = pets[selectedIndex]
                val notes = notesInput.text?.toString()?.trim() ?: ""
                viewModel.requestConsultation(ownerName, pet.id, pet.name, notes)
            }
            .setNegativeButton(R.string.action_cancel, null)
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
