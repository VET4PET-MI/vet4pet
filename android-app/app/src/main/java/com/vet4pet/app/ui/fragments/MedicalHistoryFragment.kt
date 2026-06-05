package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.tabs.TabLayout
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.databinding.FragmentMedicalHistoryBinding
import com.vet4pet.app.ui.adapters.MedicalRecordAdapter
import com.vet4pet.app.ui.viewmodels.PetsViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class MedicalHistoryFragment : Fragment() {

    private var _binding: FragmentMedicalHistoryBinding? = null
    private val binding get() = _binding!!
    private val viewModel: PetsViewModel by viewModels()

    private var petId = ""

    companion object {
        private val MEDICAL_TYPES = "VISIT_SUMMARY,VACCINATION,LAB_RESULT,X_RAY,BLOOD_TEST,CONSULTATION"
        private val DOCS_TYPES    = "PRESCRIPTION,OTHER"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMedicalHistoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        petId = arguments?.getString("petId") ?: return

        binding.tvPetNameHeader.text = arguments?.getString("petName") ?: ""

        val adapter = MedicalRecordAdapter { record ->
            findNavController().navigate(
                R.id.action_medicalHistoryFragment_to_medicalRecordDetailFragment,
                bundleOf("record" to record)
            )
        }
        binding.rvMedicalRecords.adapter = adapter

        // Only vets can add medical records
        val role = SessionManager(requireContext()).getUser()?.role ?: "owner"
        binding.fabAddRecord.isVisible = role == "vet"
        binding.fabAddRecord.setOnClickListener {
            findNavController().navigate(
                R.id.action_medicalHistoryFragment_to_addMedicalRecordFragment,
                bundleOf("petId" to petId)
            )
        }

        // ── Tabs ──────────────────────────────────────────────────────────
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText(R.string.tab_medical))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText(R.string.tab_docs))

        fun currentTypes() = if (binding.tabLayout.selectedTabPosition == 0) MEDICAL_TYPES else DOCS_TYPES
        fun currentEmptyText() = if (binding.tabLayout.selectedTabPosition == 0)
            getString(R.string.records_empty) else getString(R.string.records_docs_empty)

        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                viewModel.loadRecords(petId, refresh = true, types = currentTypes())
            }
            override fun onTabUnselected(tab: TabLayout.Tab) {}
            override fun onTabReselected(tab: TabLayout.Tab) {}
        })

        // Infinite scroll — load next page when near the bottom
        binding.rvMedicalRecords.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(rv: RecyclerView, dx: Int, dy: Int) {
                if (dy <= 0) return
                val lm = rv.layoutManager as LinearLayoutManager
                val lastVisible = lm.findLastVisibleItemPosition()
                if (lastVisible >= adapter.itemCount - 3) {
                    viewModel.loadNextPage()
                }
            }
        })

        viewModel.records.observe(viewLifecycleOwner) { records ->
            adapter.submitList(records)
            binding.tvEmptyRecords.isVisible = records.isEmpty() &&
                viewModel.recordsState.value !is UiState.Loading
            if (records.isEmpty()) binding.tvEmptyRecords.text = currentEmptyText()
        }

        viewModel.recordsState.observe(viewLifecycleOwner) { state ->
            binding.progressRecords.isVisible = state is UiState.Loading
            if (state is UiState.Error) {
                binding.tvEmptyRecords.isVisible = true
                binding.tvEmptyRecords.text = state.message
            }
        }

        viewModel.loadRecords(petId, refresh = true, types = MEDICAL_TYPES)
    }

    override fun onResume() {
        super.onResume()
        if (petId.isEmpty() || _binding == null) return
        val types = if (binding.tabLayout.selectedTabPosition == 0) MEDICAL_TYPES else DOCS_TYPES
        viewModel.loadRecords(petId, refresh = true, types = types)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
