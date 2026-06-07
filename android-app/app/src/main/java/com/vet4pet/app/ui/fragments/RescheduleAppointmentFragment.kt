package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.chip.Chip
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointForward
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.snackbar.Snackbar
import com.vet4pet.app.R
import com.vet4pet.app.data.models.Appointment
import com.vet4pet.app.databinding.FragmentRescheduleAppointmentBinding
import com.vet4pet.app.ui.adapters.toTypeStringRes
import com.vet4pet.app.ui.viewmodels.AppointmentsViewModel
import com.vet4pet.app.ui.viewmodels.UiState
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class RescheduleAppointmentFragment : Fragment() {

    private var _binding: FragmentRescheduleAppointmentBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AppointmentsViewModel by viewModels()

    private lateinit var appt: Appointment
    private var selectedDate = ""
    private var selectedTime = ""

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentRescheduleAppointmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    @Suppress("DEPRECATION")
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        appt = requireArguments().getParcelable("appointment")
            ?: run { findNavController().popBackStack(); return }

        binding.toolbar.setNavigationOnClickListener { findNavController().popBackStack() }

        binding.tvRescheduleSummary.text = buildString {
            appendLine("${getString(R.string.book_review_pet)}: ${appt.petName}")
            appendLine("${getString(R.string.book_type_label)}: ${getString(appt.type.toTypeStringRes())}")
            appendLine("${getString(R.string.book_review_date)}: ${appt.date}  ${appt.time}")
            if (appt.vetName.isNotBlank()) append("${getString(R.string.book_review_vet)}: Dr. ${appt.vetName}")
        }.trimEnd()

        setupDatePicker()
        observeSlots()

        binding.btnConfirmReschedule.setOnClickListener {
            viewModel.rescheduleAppointment(appt.id, selectedDate, selectedTime) { success, msg ->
                if (success) {
                    findNavController().previousBackStackEntry
                        ?.savedStateHandle?.set("rescheduled", true)
                    findNavController().popBackStack()
                } else {
                    Snackbar.make(
                        binding.root,
                        msg ?: getString(R.string.error_save_failed),
                        Snackbar.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    private fun setupDatePicker() {
        binding.btnPickDate.setOnClickListener {
            val constraints = CalendarConstraints.Builder()
                .setValidator(DateValidatorPointForward.now())
                .build()

            val picker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(getString(R.string.reschedule_pick_date))
                .setCalendarConstraints(constraints)
                .build()

            picker.addOnPositiveButtonClickListener { ms ->
                val date = Instant.ofEpochMilli(ms)
                    .atZone(ZoneId.of("UTC"))
                    .toLocalDate()
                selectedDate = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
                binding.btnPickDate.text = date.format(DateTimeFormatter.ofPattern("d MMMM yyyy"))
                selectedTime = ""
                updateConfirmButton()
                viewModel.loadSlots(selectedDate, appt.vetId.takeIf { it.isNotBlank() })
            }

            picker.show(parentFragmentManager, "reschedule_date_picker")
        }
    }

    private fun observeSlots() {
        viewModel.slotsState.observe(viewLifecycleOwner) { state ->
            binding.progressSlots.isVisible    = state is UiState.Loading
            binding.tvNoSlots.isVisible        = (state is UiState.Success && (state.data as List<*>).isEmpty()) || state is UiState.Error
            binding.chipGroupSlots.isVisible   = state is UiState.Success && (state.data as List<*>).isNotEmpty()
            when (state) {
                is UiState.Error   -> binding.tvNoSlots.text = state.message
                is UiState.Success -> binding.tvNoSlots.text = getString(R.string.book_no_slots)
                else -> {}
            }

            if (state is UiState.Success) {
                binding.chipGroupSlots.removeAllViews()
                state.data.forEach { slot ->
                    val chip = Chip(requireContext()).apply {
                        text = slot
                        isCheckable = true
                        setOnCheckedChangeListener { _, checked ->
                            if (checked) {
                                selectedTime = slot
                                updateConfirmButton()
                            } else if (selectedTime == slot) {
                                selectedTime = ""
                                updateConfirmButton()
                            }
                        }
                    }
                    binding.chipGroupSlots.addView(chip)
                }
            }
        }
    }

    private fun updateConfirmButton() {
        binding.btnConfirmReschedule.isEnabled =
            selectedDate.isNotEmpty() && selectedTime.isNotEmpty()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
