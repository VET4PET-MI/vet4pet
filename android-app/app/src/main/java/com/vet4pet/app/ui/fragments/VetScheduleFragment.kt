package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.google.android.material.button.MaterialButton
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.timepicker.MaterialTimePicker
import com.google.android.material.timepicker.TimeFormat
import com.vet4pet.app.R
import com.vet4pet.app.databinding.FragmentVetScheduleBinding
import com.vet4pet.app.ui.viewmodels.UiState
import com.vet4pet.app.ui.viewmodels.VetScheduleViewModel

class VetScheduleFragment : Fragment() {

    private var _binding: FragmentVetScheduleBinding? = null
    private val binding get() = _binding!!
    private val viewModel: VetScheduleViewModel by viewModels()

    private val selectedDays = mutableSetOf<Int>()
    private var workStart = "08:00"
    private var workEnd   = "18:00"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentVetScheduleBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnBack.setOnClickListener { requireActivity().onBackPressedDispatcher.onBackPressed() }

        // Wire day buttons
        dayButtons().forEachIndexed { index, btn ->
            btn.setOnClickListener {
                if (selectedDays.contains(index)) selectedDays.remove(index)
                else selectedDays.add(index)
                updateDayButtons()
                binding.tvNoDaysWarning.isVisible = selectedDays.isEmpty()
            }
        }

        // Time pickers
        binding.btnStartTime.setOnClickListener { showTimePicker(workStart) { h, m -> workStart = "%02d:%02d".format(h, m); binding.btnStartTime.text = workStart } }
        binding.btnEndTime.setOnClickListener   { showTimePicker(workEnd)   { h, m -> workEnd   = "%02d:%02d".format(h, m); binding.btnEndTime.text   = workEnd   } }

        // Save
        binding.btnSaveSchedule.setOnClickListener {
            if (selectedDays.isEmpty()) {
                binding.tvNoDaysWarning.isVisible = true
                return@setOnClickListener
            }
            viewModel.save(selectedDays.sorted(), workStart, workEnd)
        }

        // Observe
        viewModel.schedule.observe(viewLifecycleOwner) { state ->
            binding.progressSchedule.isVisible = state is UiState.Loading
            if (state is UiState.Success) {
                selectedDays.clear()
                selectedDays.addAll(state.data.workingDays)
                workStart = state.data.workStart
                workEnd   = state.data.workEnd
                updateDayButtons()
                binding.btnStartTime.text = workStart
                binding.btnEndTime.text   = workEnd
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

        viewModel.load()
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

    private fun showTimePicker(current: String, onPicked: (Int, Int) -> Unit) {
        val parts = current.split(":").map { it.toIntOrNull() ?: 0 }
        MaterialTimePicker.Builder()
            .setTimeFormat(TimeFormat.CLOCK_24H)
            .setHour(parts.getOrElse(0) { 0 })
            .setMinute(parts.getOrElse(1) { 0 })
            .setTitleText(getString(R.string.schedule_pick_time))
            .build()
            .also { picker ->
                picker.addOnPositiveButtonClickListener { onPicked(picker.hour, picker.minute) }
                picker.show(parentFragmentManager, "time_picker")
            }
    }

    private fun showSnack(msg: String) = Snackbar.make(binding.root, msg, Snackbar.LENGTH_SHORT).show()

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
