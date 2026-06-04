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
import com.vet4pet.app.databinding.FragmentAppointmentsBinding
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

        val adapter = AppointmentAdapter { appt ->
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

        binding.rvAppointments.adapter = adapter

        binding.fabBookAppointment.setOnClickListener {
            findNavController().navigate(R.id.action_appointmentsFragment_to_bookAppointmentFragment)
        }

        viewModel.appointmentsState.observe(viewLifecycleOwner) { state ->
            binding.progressAppointments.isVisible = state is UiState.Loading
            binding.tvEmptyAppointments.isVisible  = state is UiState.Success &&
                (state.data as List<*>).isEmpty()

            if (state is UiState.Success) {
                val sorted = state.data.sortedWith(compareBy(
                    { if (it.status == "cancelled" || it.status == "completed") 1 else 0 },
                    { it.date },
                    { it.time }
                ))
                adapter.submitList(sorted)
            }
            if (state is UiState.Error) showError(state.message)
        }

        viewModel.loadAppointments()
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
