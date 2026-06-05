package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.chip.Chip
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointForward
import com.google.android.material.datepicker.MaterialDatePicker
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.api.CreateAppointmentRequest
import com.vet4pet.app.data.models.api.VetDto
import com.vet4pet.app.databinding.FragmentBookAppointmentBinding
import com.vet4pet.app.ui.viewmodels.AppointmentsViewModel
import com.vet4pet.app.ui.viewmodels.PetsViewModel
import com.vet4pet.app.ui.viewmodels.UiState
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter

class BookAppointmentFragment : Fragment() {

    private var _binding: FragmentBookAppointmentBinding? = null
    private val binding get() = _binding!!

    private val petsVm: PetsViewModel          by viewModels()
    private val apptVm: AppointmentsViewModel  by viewModels()

    private var currentStep = 1
    private val totalSteps  = 4

    // Selections
    private var selectedPetId   = ""
    private var selectedPetName = ""
    private var selectedVet:    VetDto? = null
    private var selectedDate    = ""   // YYYY-MM-DD
    private var selectedTime    = ""   // HH:MM
    private var selectedType    = "CHECKUP"
    private var selectedDuration = 30

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentBookAppointmentBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        binding.btnPrev.setOnClickListener { goStep(currentStep - 1) }
        binding.btnNext.setOnClickListener { handleNext() }

        observePets()
        observeVets()
        observeSlots()
        observeBookState()
        setupTypeChips()
        setupDurationChips()

        petsVm.loadPets()
        apptVm.loadVets()

        updateStepUi()
    }

    // ── Step navigation ───────────────────────────────────────────────────

    private fun handleNext() {
        when (currentStep) {
            1 -> {
                if (selectedPetId.isEmpty()) {
                    Toast.makeText(requireContext(), R.string.book_select_pet, Toast.LENGTH_SHORT).show()
                    return
                }
                goStep(2)
            }
            2 -> goStep(3)   // vet is optional
            3 -> {
                if (selectedDate.isEmpty() || selectedTime.isEmpty()) {
                    Toast.makeText(requireContext(), R.string.book_select_datetime, Toast.LENGTH_SHORT).show()
                    return
                }
                updateReviewCard()
                goStep(4)
            }
            4 -> confirmBooking()
        }
    }

    private fun goStep(step: Int) {
        currentStep = step.coerceIn(1, totalSteps)
        updateStepUi()
    }

    private fun updateStepUi() {
        binding.stepCard1.isVisible = currentStep == 1
        binding.stepCard2.isVisible = currentStep == 2
        binding.stepCard3.isVisible = currentStep == 3
        binding.stepCard4.isVisible = currentStep == 4

        binding.tvStepLabel.text = getString(R.string.book_step_label, currentStep, totalSteps)
        binding.progressStep.progress = (currentStep * 100) / totalSteps

        binding.btnPrev.isVisible = currentStep > 1
        binding.btnNext.text = if (currentStep == totalSteps)
            getString(R.string.book_confirm) else getString(R.string.book_next)
    }

    // ── Step 1: Type + Duration chips ────────────────────────────────────

    private data class AppointmentType(val key: String, val labelRes: Int)

    private val appointmentTypes = listOf(
        AppointmentType("CHECKUP",      R.string.book_type_checkup),
        AppointmentType("VACCINATION",  R.string.book_type_vaccination),
        AppointmentType("FOLLOW_UP",    R.string.book_type_follow_up),
        AppointmentType("EMERGENCY",    R.string.book_type_emergency),
        AppointmentType("CONSULTATION", R.string.book_type_consultation),
        AppointmentType("OTHER",        R.string.book_type_other)
    )

    private fun setupTypeChips() {
        appointmentTypes.forEach { type ->
            val chip = Chip(requireContext()).apply {
                text = getString(type.labelRes)
                isCheckable = true
                isChecked = type.key == selectedType
                setOnCheckedChangeListener { _, checked ->
                    if (checked) selectedType = type.key
                }
            }
            binding.chipGroupType.addView(chip)
        }
    }

    private fun setupDurationChips() {
        listOf(15 to R.string.book_duration_15,
               30 to R.string.book_duration_30,
               45 to R.string.book_duration_45,
               60 to R.string.book_duration_60).forEach { (mins, labelRes) ->
            val chip = Chip(requireContext()).apply {
                text = getString(labelRes)
                isCheckable = true
                isChecked = mins == selectedDuration
                setOnCheckedChangeListener { _, checked ->
                    if (checked) selectedDuration = mins
                }
            }
            binding.chipGroupDuration.addView(chip)
        }
    }

    // ── Step 1: Select pet ────────────────────────────────────────────────

    private fun observePets() {
        petsVm.petsState.observe(viewLifecycleOwner) { state ->
            binding.progressStep1.isVisible = state is UiState.Loading
            if (state is UiState.Success) {
                binding.chipGroupPets.removeAllViews()
                state.data.forEach { pet ->
                    val chip = Chip(requireContext()).apply {
                        text = pet.name
                        isCheckable = true
                        isChecked = pet.id == selectedPetId
                        setOnCheckedChangeListener { _, checked ->
                            if (checked) {
                                selectedPetId   = pet.id
                                selectedPetName = pet.name
                            }
                        }
                    }
                    binding.chipGroupPets.addView(chip)
                }
            }
        }
    }

    // ── Step 2: Select vet ────────────────────────────────────────────────

    private fun observeVets() {
        apptVm.vetsState.observe(viewLifecycleOwner) { state ->
            binding.progressStep2.isVisible = state is UiState.Loading
            if (state is UiState.Success) {
                binding.chipGroupVets.removeAllViews()

                // "Any vet" option
                val anyChip = Chip(requireContext()).apply {
                    text = getString(R.string.book_any_vet)
                    isCheckable = true
                    isChecked = selectedVet == null
                    setOnCheckedChangeListener { _, checked -> if (checked) selectedVet = null }
                }
                binding.chipGroupVets.addView(anyChip)

                state.data.forEach { vet ->
                    val label = buildString {
                        append("Dr. ${vet.name}")
                        vet.clinicName?.takeIf { it.isNotBlank() }?.let { append(" · $it") }
                        vet.address?.takeIf { it.isNotBlank() }?.let { append(" · $it") }
                    }

                    val chip = Chip(requireContext()).apply {
                        text = label
                        isCheckable = true
                        isChecked = selectedVet?.id == vet.id
                        setOnCheckedChangeListener { _, checked ->
                            if (checked) {
                                selectedVet = vet
                                // Reload slots if date already chosen
                                if (selectedDate.isNotEmpty()) apptVm.loadSlots(selectedDate, vet.id)
                            }
                        }
                    }
                    binding.chipGroupVets.addView(chip)
                }
            }
        }
    }

    // ── Step 3: Date + time slots ─────────────────────────────────────────

    private fun setupDatePicker() {
        binding.btnPickDate.setOnClickListener {
            val constraints = CalendarConstraints.Builder()
                .setValidator(DateValidatorPointForward.now())
                .build()

            val picker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(getString(R.string.book_pick_date))
                .setCalendarConstraints(constraints)
                .build()

            picker.addOnPositiveButtonClickListener { ms ->
                val date = Instant.ofEpochMilli(ms)
                    .atZone(ZoneId.of("UTC"))
                    .toLocalDate()
                selectedDate = date.format(DateTimeFormatter.ISO_LOCAL_DATE)
                binding.btnPickDate.text = date.format(
                    DateTimeFormatter.ofPattern("d MMMM yyyy")
                )
                selectedTime = ""
                apptVm.loadSlots(selectedDate, selectedVet?.id)
            }

            picker.show(parentFragmentManager, "date_picker")
        }
    }

    private fun observeSlots() {
        apptVm.slotsState.observe(viewLifecycleOwner) { state ->
            binding.progressSlots.isVisible = state is UiState.Loading
            binding.tvNoSlots.isVisible     = state is UiState.Success && (state.data as List<*>).isEmpty()
            binding.chipGroupSlots.isVisible = state is UiState.Success && (state.data as List<*>).isNotEmpty()

            if (state is UiState.Success) {
                binding.chipGroupSlots.removeAllViews()
                state.data.forEach { slot ->
                    val chip = Chip(requireContext()).apply {
                        text = slot
                        isCheckable = true
                        isChecked = slot == selectedTime
                        setOnCheckedChangeListener { _, checked ->
                            if (checked) selectedTime = slot
                        }
                    }
                    binding.chipGroupSlots.addView(chip)
                }
            }
        }
    }

    // ── Step 4: Review + confirm ──────────────────────────────────────────

    private fun updateReviewCard() {
        binding.tvReviewPet.text  = selectedPetName
        binding.tvReviewVet.text  = selectedVet?.let { "Dr. ${it.name}" }
            ?: getString(R.string.book_any_vet)
        binding.tvReviewDate.text = runCatching {
            LocalDate.parse(selectedDate)
                .format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy"))
        }.getOrDefault(selectedDate)
        binding.tvReviewTime.text     = selectedTime
        binding.tvReviewType.text     = appointmentTypes.find { it.key == selectedType }
            ?.let { getString(it.labelRes) } ?: selectedType
        binding.tvReviewDuration.text = when (selectedDuration) {
            15   -> getString(R.string.book_duration_15)
            30   -> getString(R.string.book_duration_30)
            45   -> getString(R.string.book_duration_45)
            60   -> getString(R.string.book_duration_60)
            else -> "$selectedDuration min"
        }
    }

    private fun confirmBooking() {
        val notes = binding.etNotes.text?.toString()?.trim() ?: ""
        val request = CreateAppointmentRequest(
            petId    = selectedPetId,
            petName  = selectedPetName,
            vetId    = selectedVet?.id,
            vetName  = selectedVet?.name,
            date     = selectedDate,
            time     = selectedTime,
            duration = selectedDuration,
            type     = selectedType,
            notes    = notes
        )
        apptVm.bookAppointment(request)
    }

    private fun observeBookState() {
        apptVm.bookState.observe(viewLifecycleOwner) { state ->
            binding.btnNext.isEnabled         = state !is UiState.Loading
            binding.progressConfirm.isVisible = state is UiState.Loading

            if (state is UiState.Success) {
                apptVm.resetBookState()
                Toast.makeText(requireContext(), R.string.book_success, Toast.LENGTH_SHORT).show()
                findNavController().popBackStack()
            }
            if (state is UiState.Error) {
                Toast.makeText(requireContext(), state.message, Toast.LENGTH_LONG).show()
                apptVm.resetBookState()
            }
        }
    }

    override fun onViewStateRestored(savedInstanceState: Bundle?) {
        super.onViewStateRestored(savedInstanceState)
        setupDatePicker()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
