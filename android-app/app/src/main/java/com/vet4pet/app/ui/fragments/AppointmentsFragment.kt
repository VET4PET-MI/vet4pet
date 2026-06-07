package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.vet4pet.app.R
import com.vet4pet.app.data.models.Appointment
import com.vet4pet.app.ui.adapters.toTypeStringRes
import java.time.LocalDate
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.databinding.FragmentAppointmentsBinding
import com.vet4pet.app.ui.adapters.ApptListItem
import com.vet4pet.app.ui.adapters.AppointmentAdapter
import com.vet4pet.app.ui.viewmodels.AppointmentsViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class AppointmentsFragment : Fragment() {

    private var _binding: FragmentAppointmentsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AppointmentsViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAppointmentsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val adapter = AppointmentAdapter { appt -> showAppointmentDialog(appt) }

        binding.rvAppointments.adapter = adapter

        // Only owners can book appointments via the wizard; vets book from their calendar
        val isOwner = SessionManager(requireContext()).getUser()?.role == "owner"
        binding.fabBookAppointment.isVisible = isOwner
        binding.fabBookAppointment.setOnClickListener {
            findNavController().navigate(R.id.action_appointmentsFragment_to_bookAppointmentFragment)
        }

        viewModel.appointmentsState.observe(viewLifecycleOwner) { state ->
            binding.progressAppointments.isVisible = state is UiState.Loading
            binding.tvEmptyAppointments.isVisible  = state is UiState.Success &&
                (state.data as List<*>).isEmpty()

            if (state is UiState.Success) {
                adapter.submitList(buildSectionedList(state.data))
            }
            if (state is UiState.Error) showError(state.message)
        }

        viewModel.loadAppointments()
    }

    private fun buildSectionedList(appts: List<com.vet4pet.app.data.models.Appointment>): List<ApptListItem> {
        val today = LocalDate.now()
        fun isPast(a: com.vet4pet.app.data.models.Appointment) =
            a.status == "cancelled" || a.status == "completed" ||
            runCatching { LocalDate.parse(a.date) }.getOrNull()?.isBefore(today) == true

        val (pastList, upcomingList) = appts.partition { isPast(it) }
        val upcoming = upcomingList.sortedWith(compareBy({ it.date }, { it.time }))
        val past     = pastList.sortedWith(
            compareByDescending<com.vet4pet.app.data.models.Appointment> { it.date }.thenByDescending { it.time }
        )

        return buildList {
            if (upcoming.isNotEmpty()) {
                add(ApptListItem.Header(getString(R.string.appts_upcoming)))
                upcoming.forEach { add(ApptListItem.Item(it)) }
            }
            if (past.isNotEmpty()) {
                add(ApptListItem.Header(getString(R.string.appts_past)))
                past.forEach { add(ApptListItem.Item(it)) }
            }
        }
    }

    private fun showAppointmentDialog(appt: Appointment) {
        val typeLabel = getString(appt.type.toTypeStringRes())
        val details = buildString {
            appendLine("${getString(R.string.book_review_pet)}: ${appt.petName}")
            appendLine("${getString(R.string.book_type_label)}: $typeLabel")
            appendLine("${getString(R.string.book_review_date)}: ${appt.date}")
            appendLine("${getString(R.string.book_review_time)}: ${appt.time}")
            if (appt.vetName.isNotBlank()) appendLine("${getString(R.string.book_review_vet)}: Dr. ${appt.vetName}")
            if (appt.notes.isNotBlank()) append("Notes: ${appt.notes}")
        }.trimEnd()

        val canCancel = appt.status == "booked" || appt.status == "confirmed"
        val builder = MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.appt_details)
            .setMessage(details)
            .setPositiveButton(R.string.action_close, null)

        if (canCancel) {
            builder.setNegativeButton(R.string.cancel_appointment_title) { _, _ ->
                MaterialAlertDialogBuilder(requireContext())
                    .setTitle(R.string.cancel_appointment_title)
                    .setMessage(R.string.cancel_appointment_message)
                    .setNegativeButton(R.string.action_cancel, null)
                    .setPositiveButton(R.string.action_confirm_cancel) { _, _ ->
                        viewModel.cancelAppointment(appt.id) { success ->
                            if (!success) showError(getString(R.string.error_save_failed))
                        }
                    }
                    .show()
            }
        }

        builder.show()
    }

    private fun showError(msg: String) {
        binding.tvEmptyAppointments.isVisible = true
        binding.tvEmptyAppointments.text = msg
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
