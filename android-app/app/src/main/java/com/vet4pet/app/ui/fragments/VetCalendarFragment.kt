package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.TextView
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.timepicker.MaterialTimePicker
import com.google.android.material.timepicker.TimeFormat
import com.vet4pet.app.R
import com.vet4pet.app.data.models.api.AppointmentDto
import com.vet4pet.app.data.models.api.CreateAppointmentRequest
import com.vet4pet.app.data.models.api.TimeBlockDto
import com.vet4pet.app.data.models.api.UpdateAppointmentRequest
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.databinding.FragmentVetCalendarBinding
import androidx.navigation.fragment.findNavController
import com.vet4pet.app.databinding.ItemScheduleSlotBinding
import com.vet4pet.app.ui.adapters.toTypeStringRes
import com.vet4pet.app.ui.viewmodels.UiState
import com.vet4pet.app.ui.viewmodels.VetCalendarViewModel
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

class VetCalendarFragment : Fragment() {

    private var _binding: FragmentVetCalendarBinding? = null
    private val binding get() = _binding!!
    private val viewModel: VetCalendarViewModel by viewModels()

    private var weekStart    = LocalDate.now().with(DayOfWeek.MONDAY)
    private var selectedDate = LocalDate.now()
    private var vetName      = ""

    // Dynamic working hours (updated when schedule loads)
    private var workStart    = "08:00"
    private var workEnd      = "18:00"
    private var workingDaysSet: Set<Int> = setOf(1, 2, 3, 4, 5) // Mon–Fri by default

    companion object {
        val TIME_SLOTS = (0 until 20).map { i ->
            val mins = 8 * 60 + i * 30
            "%02d:%02d".format(mins / 60, mins % 60)
        }

        val TYPE_COLORS = mapOf(
            "CHECKUP"      to android.R.color.holo_blue_light,
            "VACCINATION"  to android.R.color.holo_green_light,
            "FOLLOW_UP"    to android.R.color.holo_orange_light,
            "EMERGENCY"    to android.R.color.holo_red_light,
            "CONSULTATION" to android.R.color.holo_purple,
            "OTHER"        to android.R.color.darker_gray
        )

        val APPOINTMENT_TYPES = listOf(
            "CHECKUP", "VACCINATION", "FOLLOW_UP", "EMERGENCY", "CONSULTATION", "OTHER"
        )
        val DURATIONS = listOf(15, 30, 45, 60)
        val STATUSES  = listOf("booked", "confirmed", "completed", "cancelled")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentVetCalendarBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        vetName = SessionManager(requireContext()).getUser()?.name ?: ""

        binding.btnBack.setOnClickListener { requireActivity().onBackPressedDispatcher.onBackPressed() }
        binding.btnPrevWeek.setOnClickListener { shiftWeek(-7) }
        binding.btnNextWeek.setOnClickListener { shiftWeek(7) }
        binding.btnBookNew.setOnClickListener      { openBookDialog(null) }
        binding.btnWorkingHours.setOnClickListener { findNavController().navigate(R.id.action_vetCalendarFragment_to_vetScheduleFragment) }

        val adapter = ScheduleAdapter(
            onBookSlot  = { slot -> openBookDialog(slot) },
            onBlockSlot = { slot -> openBlockDialog(slot) },
            onTapAppt   = { appt -> openEditDialog(appt) },
            onDelBlock  = { block -> viewModel.deleteBlock(block.id, selectedDate.toString()) }
        )
        binding.rvSchedule.adapter = adapter

        viewModel.appointments.observe(viewLifecycleOwner) { state ->
            binding.progressCalendar.isVisible = state is UiState.Loading
            if (state is UiState.Success) rebuildSlots(state.data, adapter)
        }
        viewModel.blocks.observe(viewLifecycleOwner) { _ ->
            val state = viewModel.appointments.value
            if (state is UiState.Success) rebuildSlots(state.data, adapter)
        }
        viewModel.schedule.observe(viewLifecycleOwner) { sched ->
            if (sched != null) {
                workStart = sched.workStart
                workEnd   = sched.workEnd
                workingDaysSet = sched.workingDays.toSet()
                renderDayChips()
                val state = viewModel.appointments.value
                if (state is UiState.Success) rebuildSlots(state.data, adapter)
            }
        }

        renderDayChips()
        viewModel.loadSchedule()
        loadSelectedDay()
    }

    private fun computeTimeSlots(start: String, end: String): List<String> {
        val (sh, sm) = start.split(":").map { it.toInt() }
        val (eh, em) = end.split(":").map { it.toInt() }
        val startMins = sh * 60 + sm
        val endMins   = eh * 60 + em
        return (startMins until endMins step 30).map { m -> "%02d:%02d".format(m / 60, m % 60) }
    }

    private fun isDayWorking(date: LocalDate): Boolean {
        // ISO DayOfWeek: Mon=1..Sun=7; workingDays: 0=Sun,1=Mon..6=Sat
        val dayIdx = date.dayOfWeek.value % 7
        return workingDaysSet.contains(dayIdx)
    }

    // ── Week / day navigation ──────────────────────────────────────────

    private fun shiftWeek(days: Long) {
        weekStart    = weekStart.plusDays(days)
        selectedDate = selectedDate.plusDays(days)
        renderDayChips()
        loadSelectedDay()
    }

    private fun selectDay(date: LocalDate) {
        selectedDate = date
        renderDayChips()
        loadSelectedDay()
    }

    private fun renderDayChips() {
        val container = binding.layoutDayChips
        container.removeAllViews()
        val inflater = LayoutInflater.from(requireContext())
        (0 until 7).forEach { i ->
            val day = weekStart.plusDays(i.toLong())
            val chip = inflater.inflate(R.layout.item_day_chip, container, false) as TextView
            chip.text = buildString {
                append(day.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()))
                append("\n")
                append(day.dayOfMonth)
            }
            val isSelected  = day == selectedDate
            val isToday     = day == LocalDate.now()
            val isWorkDay   = isDayWorking(day)
            chip.isSelected = isSelected
            chip.alpha      = if (isWorkDay) 1f else 0.4f
            chip.setBackgroundResource(
                when {
                    isSelected -> R.drawable.bg_day_chip_selected
                    isToday    -> R.drawable.bg_day_chip_today
                    else       -> R.drawable.bg_day_chip_normal
                }
            )
            chip.setOnClickListener { selectDay(day) }
            container.addView(chip)
        }
    }

    private fun loadSelectedDay() {
        val fmt = DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale.getDefault())
        binding.tvDayLabel.text = selectedDate.format(fmt)
        viewModel.loadDay(selectedDate.toString())
    }

    // ── Build slot list ────────────────────────────────────────────────

    private fun rebuildSlots(appts: List<AppointmentDto>, adapter: ScheduleAdapter) {
        val blocks      = viewModel.blocks.value ?: emptyList()
        val activeAppts = appts.filter { it.status != "cancelled" }
        val slots       = computeTimeSlots(workStart, workEnd)
        val isWorkingDay = isDayWorking(selectedDate)

        // Show/hide day-off banner
        binding.tvDayOff.isVisible   = !isWorkingDay
        binding.rvSchedule.isVisible = isWorkingDay

        if (!isWorkingDay) { adapter.submitList(emptyList()); return }

        // Calculate slots occupied by multi-duration appointments (skip rendering)
        val occupied = mutableSetOf<String>()
        activeAppts.forEach { appt ->
            val startIdx = slots.indexOf(appt.time)
            if (startIdx < 0) return@forEach
            val slotsNeeded = Math.ceil((appt.duration ?: 30) / 30.0).toInt()
            for (k in 1 until slotsNeeded) {
                val idx = startIdx + k
                if (idx in slots.indices) occupied.add(slots[idx])
            }
        }

        val items = slots.filterNot { occupied.contains(it) }.map { slot ->
            ScheduleSlot(
                time  = slot,
                appt  = activeAppts.firstOrNull { it.time == slot },
                block = blocks.firstOrNull { slot >= it.startTime && slot < it.endTime }
            )
        }
        adapter.submitList(items)

        val count = activeAppts.size
        binding.tvApptCount.text = resources.getQuantityString(R.plurals.schedule_appt_count, count, count)
    }

    // ── Dialogs ────────────────────────────────────────────────────────

    private fun openBookDialog(presetTime: String?) {
        showApptDialog(existing = null, presetTime = presetTime)
    }

    private fun openEditDialog(appt: AppointmentDto) {
        showApptDialog(existing = appt, presetTime = null)
    }

    private fun showApptDialog(existing: AppointmentDto?, presetTime: String?) {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_schedule_appt, null)

        val etPet     = dialogView.findViewById<TextInputEditText>(R.id.et_pet_name)
        val etOwner   = dialogView.findViewById<TextInputEditText>(R.id.et_owner_name)
        val btnDate   = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btn_appt_date)
        val btnTime   = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btn_appt_time)
        val chipType  = dialogView.findViewById<ChipGroup>(R.id.chip_group_appt_type)
        val chipDur   = dialogView.findViewById<ChipGroup>(R.id.chip_group_appt_duration)
        val layoutSt  = dialogView.findViewById<View>(R.id.layout_status)
        val acStatus  = dialogView.findViewById<AutoCompleteTextView>(R.id.ac_status)
        val etNotes   = dialogView.findViewById<TextInputEditText>(R.id.et_appt_notes)

        var chosenDate = existing?.date?.take(10) ?: selectedDate.toString()
        var chosenTime = existing?.time ?: presetTime ?: "09:00"
        var chosenType = existing?.type ?: "CHECKUP"
        var chosenDur  = existing?.duration ?: 30
        var chosenSt   = existing?.status ?: "booked"

        // Pre-fill
        etPet.setText(existing?.petName ?: "")
        etOwner.setText(existing?.ownerName ?: "")
        etNotes.setText(existing?.notes ?: "")
        btnDate.text = chosenDate
        btnTime.text = chosenTime

        // Date picker
        btnDate.setOnClickListener {
            val picker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(getString(R.string.book_pick_date))
                .build()
            picker.addOnPositiveButtonClickListener { ms ->
                chosenDate = Instant.ofEpochMilli(ms).atZone(ZoneId.of("UTC")).toLocalDate()
                    .format(DateTimeFormatter.ISO_LOCAL_DATE)
                btnDate.text = chosenDate
            }
            picker.show(parentFragmentManager, "cal_date")
        }

        // Time picker
        btnTime.setOnClickListener {
            val parts = chosenTime.split(":").map { it.toIntOrNull() ?: 0 }
            MaterialTimePicker.Builder()
                .setTimeFormat(TimeFormat.CLOCK_24H)
                .setHour(parts.getOrElse(0) { 9 })
                .setMinute(parts.getOrElse(1) { 0 })
                .build()
                .also { p ->
                    p.addOnPositiveButtonClickListener {
                        chosenTime = "%02d:%02d".format(p.hour, p.minute)
                        btnTime.text = chosenTime
                    }
                    p.show(parentFragmentManager, "cal_time")
                }
        }

        // Type chips
        APPOINTMENT_TYPES.forEach { type ->
            val label = typeLabel(type)
            chipType.addView(Chip(requireContext()).apply {
                text = label; isCheckable = true
                isChecked = type == chosenType
                setOnCheckedChangeListener { _, checked -> if (checked) chosenType = type }
            })
        }

        // Duration chips
        DURATIONS.forEach { dur ->
            chipDur.addView(Chip(requireContext()).apply {
                text = getString(R.string.book_duration_minutes, dur)
                isCheckable = true
                isChecked = dur == chosenDur
                setOnCheckedChangeListener { _, checked -> if (checked) chosenDur = dur }
            })
        }

        // Status (edit mode only)
        if (existing != null) {
            layoutSt.isVisible = true
            acStatus.setAdapter(ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, STATUSES))
            acStatus.setText(chosenSt, false)
            acStatus.setOnItemClickListener { _, _, pos, _ -> chosenSt = STATUSES[pos] }
        }

        val title = if (existing != null) getString(R.string.schedule_edit_title)
                    else getString(R.string.schedule_book_title)

        val builder = MaterialAlertDialogBuilder(requireContext())
            .setTitle(title)
            .setView(dialogView)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_save) { _, _ ->
                val petName   = etPet.text?.toString()?.trim().orEmpty()
                val ownerName = etOwner.text?.toString()?.trim()
                val notes     = etNotes.text?.toString()?.trim() ?: ""
                if (petName.isBlank()) {
                    Toast.makeText(requireContext(), R.string.book_select_pet, Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                if (existing != null) {
                    viewModel.updateAppointment(
                        existing.id,
                        UpdateAppointmentRequest(petName, ownerName, chosenDate, chosenTime, chosenDur, chosenType, notes, chosenSt),
                        chosenDate
                    ) { success ->
                        if (_binding == null) return@updateAppointment
                        if (!success) Toast.makeText(requireContext(), R.string.error_save_failed, Toast.LENGTH_SHORT).show()
                    }
                } else {
                    viewModel.bookAppointment(
                        CreateAppointmentRequest(
                            petId = "", petName = petName,
                            vetId = null, vetName = vetName,
                            date = chosenDate, time = chosenTime,
                            duration = chosenDur, type = chosenType, notes = notes
                        ),
                        chosenDate
                    ) { success, err ->
                        if (_binding == null) return@bookAppointment
                        if (!success) Toast.makeText(requireContext(), err ?: getString(R.string.error_save_failed), Toast.LENGTH_SHORT).show()
                    }
                }
            }

        if (existing != null) {
            builder.setNeutralButton(R.string.schedule_cancel_appt) { _, _ ->
                MaterialAlertDialogBuilder(requireContext())
                    .setTitle(R.string.cancel_appointment_title)
                    .setMessage(R.string.cancel_appointment_message)
                    .setPositiveButton(R.string.action_confirm_cancel) { _, _ ->
                        viewModel.cancelAppointment(existing.id, existing.date?.take(10) ?: selectedDate.toString()) { success ->
                            if (_binding == null) return@cancelAppointment
                            if (!success) Toast.makeText(requireContext(), R.string.error_save_failed, Toast.LENGTH_SHORT).show()
                        }
                    }
                    .setNegativeButton(R.string.action_cancel, null)
                    .show()
            }
        }

        builder.show()
    }

    private fun openBlockDialog(slot: String) {
        val input = TextInputEditText(requireContext()).apply {
            hint = getString(R.string.schedule_block_reason_hint)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            setPadding(48, 32, 48, 16)
        }
        MaterialAlertDialogBuilder(requireContext())
            .setTitle(getString(R.string.schedule_block_title, slot))
            .setView(input)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.schedule_block) { _, _ ->
                val reason = input.text?.toString()?.trim() ?: ""
                viewModel.blockSlot(selectedDate.toString(), slot, reason) { success ->
                    if (_binding == null) return@blockSlot
                    if (!success) Toast.makeText(requireContext(), R.string.error_save_failed, Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }

    private fun typeLabel(type: String): String =
        getString(type.toTypeStringRes())

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    // ── Adapter ────────────────────────────────────────────────────────

    data class ScheduleSlot(val time: String, val appt: AppointmentDto?, val block: TimeBlockDto?)

    inner class ScheduleAdapter(
        private val onBookSlot:  (String)       -> Unit,
        private val onBlockSlot: (String)       -> Unit,
        private val onTapAppt:   (AppointmentDto) -> Unit,
        private val onDelBlock:  (TimeBlockDto)  -> Unit
    ) : ListAdapter<ScheduleSlot, ScheduleAdapter.VH>(object : DiffUtil.ItemCallback<ScheduleSlot>() {
        override fun areItemsTheSame(a: ScheduleSlot, b: ScheduleSlot) = a.time == b.time
        override fun areContentsTheSame(a: ScheduleSlot, b: ScheduleSlot) = a == b
    }) {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = VH(
            ItemScheduleSlotBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        )

        override fun onBindViewHolder(holder: VH, position: Int) = holder.bind(getItem(position))

        inner class VH(private val b: ItemScheduleSlotBinding) : RecyclerView.ViewHolder(b.root) {
            fun bind(slot: ScheduleSlot) {
                b.tvSlotTime.text = slot.time

                when {
                    slot.appt != null -> {
                        b.cardAppt.isVisible   = true
                        b.layoutBlock.isVisible = false
                        b.layoutEmpty.isVisible = false

                        b.tvApptPet.text   = slot.appt.petName ?: "—"
                        b.tvApptOwner.text = slot.appt.ownerName?.takeIf { it.isNotBlank() } ?: "—"
                        b.tvApptTypeLabel.text = buildString {
                            append(typeLabel(slot.appt.type ?: "OTHER"))
                            append(" · ")
                            append(getString(R.string.book_duration_minutes, slot.appt.duration ?: 30))
                        }

                        val colorRes = TYPE_COLORS[slot.appt.type] ?: android.R.color.darker_gray
                        b.viewTypeBar.setBackgroundColor(requireContext().getColor(colorRes))
                        b.cardAppt.setOnClickListener { onTapAppt(slot.appt) }
                    }

                    slot.block != null -> {
                        b.cardAppt.isVisible    = false
                        b.layoutBlock.isVisible = true
                        b.layoutEmpty.isVisible = false

                        b.tvBlockReason.text = slot.block.reason?.takeIf { it.isNotBlank() }
                            ?: getString(R.string.schedule_blocked)
                        b.btnDeleteBlock.setOnClickListener { onDelBlock(slot.block) }
                    }

                    else -> {
                        b.cardAppt.isVisible    = false
                        b.layoutBlock.isVisible = false
                        b.layoutEmpty.isVisible = true

                        b.btnBookSlot.setOnClickListener  { onBookSlot(slot.time) }
                        b.btnBlockSlot.setOnClickListener { onBlockSlot(slot.time) }
                    }
                }
            }
        }
    }
}
