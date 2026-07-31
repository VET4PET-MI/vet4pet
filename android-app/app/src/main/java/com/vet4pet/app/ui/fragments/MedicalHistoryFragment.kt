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
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId
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
        private val MEDICAL_TYPES       = "VISIT_SUMMARY,VACCINATION,LAB_RESULT,XRAY,BLOOD_TEST,CONSULTATION"
        private val PRESCRIPTIONS_TYPES = "PRESCRIPTION"
        private val DOCS_TYPES          = "OTHER"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMedicalHistoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        petId = arguments?.getString("petId") ?: return

        binding.tvPetNameHeader.text = arguments?.getString("petName") ?: ""
        bindPetHero()

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
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText(R.string.tab_prescriptions))
        binding.tabLayout.addTab(binding.tabLayout.newTab().setText(R.string.tab_docs))

        fun currentTypes() = when (binding.tabLayout.selectedTabPosition) {
            1    -> PRESCRIPTIONS_TYPES
            2    -> DOCS_TYPES
            else -> MEDICAL_TYPES
        }
        fun currentEmptyText() = when (binding.tabLayout.selectedTabPosition) {
            1    -> getString(R.string.records_prescriptions_empty)
            2    -> getString(R.string.records_docs_empty)
            else -> getString(R.string.records_empty)
        }

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

    private fun speciesToLabel(apiValue: String): String = when (apiValue.lowercase()) {
        "dog"     -> getString(R.string.species_dog)
        "cat"     -> getString(R.string.species_cat)
        "bird"    -> getString(R.string.species_bird)
        "rabbit"  -> getString(R.string.species_rabbit)
        "hamster" -> getString(R.string.species_hamster)
        "fish"    -> getString(R.string.species_fish)
        "reptile" -> getString(R.string.species_reptile)
        else      -> getString(R.string.species_other)
    }

    private fun bindPetHero() {
        val species = arguments?.getString("petSpecies") ?: ""
        val breed   = arguments?.getString("petBreed") ?: ""
        val gender  = arguments?.getString("petGender") ?: ""
        val dob     = arguments?.getLong("petDob") ?: 0L

        if (species.isBlank() && breed.isBlank()) return
        binding.layoutPetStats.isVisible = true
        binding.tvPetSpecies.text = speciesToLabel(species)
        binding.tvPetBreed.text   = breed.takeIf { it.isNotBlank() } ?: ""
        binding.tvPetBreed.isVisible = breed.isNotBlank()

        val agePart = if (dob > 0) {
            val birthDate = Instant.ofEpochMilli(dob).atZone(ZoneId.systemDefault()).toLocalDate()
            val period    = Period.between(birthDate, LocalDate.now())
            when {
                period.years  > 0 -> resources.getQuantityString(R.plurals.age_years,  period.years,  period.years)
                period.months > 0 -> resources.getQuantityString(R.plurals.age_months, period.months, period.months)
                else -> null
            }
        } else null

        val genderPart = when (gender.uppercase()) {
            "MALE"   -> "♂"
            "FEMALE" -> "♀"
            else -> null
        }

        binding.tvPetAgeGender.text = listOfNotNull(agePart, genderPart).joinToString(" · ")
        binding.tvPetAgeGender.isVisible = binding.tvPetAgeGender.text.isNotBlank()
    }

    override fun onResume() {
        super.onResume()
        if (petId.isEmpty() || _binding == null) return
        val types = when (binding.tabLayout.selectedTabPosition) {
            1    -> PRESCRIPTIONS_TYPES
            2    -> DOCS_TYPES
            else -> MEDICAL_TYPES
        }
        viewModel.loadRecords(petId, refresh = true, types = types)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
