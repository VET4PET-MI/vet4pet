package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.google.android.material.button.MaterialButton
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.timepicker.MaterialTimePicker
import com.google.android.material.timepicker.TimeFormat
import com.vet4pet.app.R
import com.vet4pet.app.data.models.api.TimeBlockDto
import com.vet4pet.app.databinding.FragmentVetScheduleBinding
import com.vet4pet.app.databinding.ItemTimeBlockBinding
import com.vet4pet.app.ui.viewmodels.UiState
import com.vet4pet.app.ui.viewmodels.VetScheduleViewModel
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class VetScheduleFragment : Fragment() {

    private var _binding: FragmentVetScheduleBinding? = null
    private val binding get() = _binding!!
    private val viewModel: VetScheduleViewModel by viewModels()

    // Working hours state
    private val selectedDays = mutableSetOf<Int>()
    private var workStart = "08:00"
    private var workEnd   = "18:00"

    // Time block state
    private var blockDate      = todayIso()
    private var blockStartTime = "09:00"
    private var blockEndTime   = "10:00"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentVetScheduleBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnBack.setOnClickListener { requireActivity().onBackPressedDispatcher.onBackPressed() }

        setupWorkingHours()
        setupTimeBlocks()

        viewModel.load()
        viewModel.loadBlocks(blockDate)
    }

    // ── Working Hours ─────────────────────────────────────────────────────

    private fun setupWorkingHours() {
        dayButtons().forEachIndexed { index, btn ->
            btn.setOnClickListener {
                if (selectedDays.contains(index)) selectedDays.remove(index)
                else selectedDays.add(index)
                updateDayButtons()
                binding.tvNoDaysWarning.isVisible = selectedDays.isEmpty()
            }
        }

        binding.btnStartTime.setOnClickListener { showTimePicker(workStart) { h, m -> workStart = "%02d:%02d".format(h, m); binding.btnStartTime.text = workStart } }
        binding.btnEndTime.setOnClickListener   { showTimePicker(workEnd)   { h, m -> workEnd   = "%02d:%02d".format(h, m); binding.btnEndTime.text   = workEnd   } }

        binding.btnSaveSchedule.setOnClickListener {
            if (selectedDays.isEmpty()) { binding.tvNoDaysWarning.isVisible = true; return@setOnClickListener }
            viewModel.save(selectedDays.sorted(), workStart, workEnd)
        }

        viewModel.schedule.observe(viewLifecycleOwner) { state ->
            binding.progressSchedule.isVisible = state is UiState.Loading
            if (state is UiState.Success) {
                selectedDays.clear(); selectedDays.addAll(state.data.workingDays)
                workStart = state.data.workStart; workEnd = state.data.workEnd
                updateDayButtons()
                binding.btnStartTime.text = workStart; binding.btnEndTime.text = workEnd
            }
            if (state is UiState.Error) showSnack(state.message)
        }

        viewModel.saveState.observe(viewLifecycleOwner) { state ->
            binding.btnSaveSchedule.isEnabled = state !is UiState.Loading
            when (state) {
                is UiState.Success -> { showSnack(getString(R.string.schedule_saved)); viewModel.resetSaveState() }
                is UiState.Error   -> { showSnack(state.message); viewModel.resetSaveState() }
                else -> {}
            }
        }
    }

    private fun dayButtons(): List<MaterialButton> = listOf(
        binding.btnDay0, binding.btnDay1, binding.btnDay2, binding.btnDay3,
        binding.btnDay4, binding.btnDay5, binding.btnDay6
    )

    private fun updateDayButtons() {
        val ctx = requireContext()
        dayButtons().forEachIndexed { index, btn ->
            val active = selectedDays.contains(index)
            if (active) {
                btn.setBackgroundColor(ctx.getColor(R.color.brand))
                btn.setTextColor(ctx.getColor(android.R.color.white))
            } else {
                btn.setBackgroundColor(ctx.getColor(android.R.color.transparent))
                btn.setTextColor(ctx.getColor(R.color.ink_muted))
            }
        }
    }

    // ── Time Blocks ───────────────────────────────────────────────────────

    private fun setupTimeBlocks() {
        // Update date button display
        binding.btnBlockDate.text = formatDateDisplay(blockDate)

        binding.btnBlockDate.setOnClickListener {
            val picker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(getString(R.string.schedule_pick_date))
                .setSelection(MaterialDatePicker.todayInUtcMilliseconds())
                .build()
            picker.addOnPositiveButtonClickListener { millis ->
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                sdf.timeZone = TimeZone.getTimeZone("UTC")
                blockDate = sdf.format(Date(millis))
                binding.btnBlockDate.text = formatDateDisplay(blockDate)
                viewModel.loadBlocks(blockDate)
            }
            picker.show(parentFragmentManager, "date_picker")
        }

        binding.btnBlockStart.setOnClickListener {
            showTimePicker(blockStartTime) { h, m ->
                blockStartTime = "%02d:%02d".format(h, m)
                binding.btnBlockStart.text = blockStartTime
            }
        }
        binding.btnBlockEnd.setOnClickListener {
            showTimePicker(blockEndTime) { h, m ->
                blockEndTime = "%02d:%02d".format(h, m)
                binding.btnBlockEnd.text = blockEndTime
            }
        }

        binding.btnAddBlock.setOnClickListener {
            val reason = binding.etBlockReason.text?.toString()?.trim() ?: ""
            viewModel.addBlock(blockDate, blockStartTime, blockEndTime, reason)
        }

        viewModel.blocks.observe(viewLifecycleOwner) { state ->
            when (state) {
                is UiState.Success -> renderBlocks(state.data)
                is UiState.Error   -> showSnack(state.message)
                else -> {}
            }
        }

        viewModel.blockState.observe(viewLifecycleOwner) { state ->
            binding.btnAddBlock.isEnabled = state !is UiState.Loading
            when (state) {
                is UiState.Success -> {
                    binding.etBlockReason.text?.clear()
                    showSnack(getString(R.string.schedule_block_added))
                    viewModel.resetBlockState()
                }
                is UiState.Error -> {
                    showSnack(state.message)
                    viewModel.resetBlockState()
                }
                else -> {}
            }
        }
    }

    private fun renderBlocks(blocks: List<TimeBlockDto>) {
        binding.layoutBlocksList.removeAllViews()
        val hasDate = blockDate.isNotBlank()
        binding.tvBlocksLabel.isVisible = hasDate
        binding.tvNoBlocks.isVisible    = hasDate && blocks.isEmpty()

        if (blocks.isEmpty()) return

        val inflater = LayoutInflater.from(requireContext())
        blocks.forEach { block ->
            val item = ItemTimeBlockBinding.inflate(inflater, binding.layoutBlocksList, false)
            item.tvBlockTime.text = "${block.startTime} – ${block.endTime}"
            if (!block.reason.isNullOrBlank()) {
                item.tvBlockReason.text      = block.reason
                item.tvBlockReason.isVisible = true
            }
            item.btnDeleteBlock.setOnClickListener { viewModel.deleteBlock(block.id, blockDate) }
            binding.layoutBlocksList.addView(item.root)
        }
    }

    // ── Utilities ─────────────────────────────────────────────────────────

    private fun showTimePicker(current: String, onPicked: (Int, Int) -> Unit) {
        val parts = current.split(":").map { it.toIntOrNull() ?: 0 }
        MaterialTimePicker.Builder()
            .setTimeFormat(TimeFormat.CLOCK_24H)
            .setHour(parts.getOrElse(0) { 0 })
            .setMinute(parts.getOrElse(1) { 0 })
            .setTitleText(getString(R.string.schedule_pick_time))
            .build()
            .also { it.addOnPositiveButtonClickListener { _ -> onPicked(it.hour, it.minute) }
                    it.show(parentFragmentManager, "time_picker") }
    }

    private fun formatDateDisplay(iso: String): String = try {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val disp = SimpleDateFormat("EEE, MMM d", Locale.getDefault())
        disp.format(sdf.parse(iso)!!)
    } catch (e: Exception) { iso }

    private fun showSnack(msg: String) = Snackbar.make(binding.root, msg, Snackbar.LENGTH_SHORT).show()

    private fun todayIso(): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Calendar.getInstance().time)

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
