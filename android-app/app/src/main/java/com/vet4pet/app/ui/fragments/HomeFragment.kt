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
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.api.PetDto
import com.vet4pet.app.databinding.FragmentHomeBinding
import com.vet4pet.app.databinding.ItemPetPreviewBinding
import com.vet4pet.app.ui.viewmodels.HomeViewModel
import com.vet4pet.app.ui.viewmodels.UiState
import com.vet4pet.app.util.LanguageManager

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val viewModel: HomeViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        val user    = session.getUser() ?: return
        val isVet   = user.role == "vet"

        val firstName = user.name
            .replace(Regex("^Dr\\.?\\s+", RegexOption.IGNORE_CASE), "")
            .split(" ").firstOrNull()?.takeIf { it.isNotBlank() } ?: user.name

        // ── Language toggle ───────────────────────────────────────────────────
        binding.btnToggleLanguage.text = if (LanguageManager.isHebrew())
            getString(R.string.lang_switch_to_english)
        else
            getString(R.string.lang_switch_to_hebrew)
        binding.btnToggleLanguage.setOnClickListener {
            if (LanguageManager.isHebrew()) LanguageManager.setLanguage("en")
            else                            LanguageManager.setLanguage("he")
        }

        // ── Greeting ──────────────────────────────────────────────────────────
        if (isVet) {
            binding.tvGreeting.text     = getString(R.string.home_greeting_vet, firstName)
            binding.tvGreetingSub.text  = getString(R.string.home_sub_vet)
            binding.tvGreetingIcon.text = "🩺"
        } else {
            binding.tvGreeting.text     = getString(R.string.home_greeting_owner, firstName)
            binding.tvGreetingSub.text  = getString(R.string.home_sub_owner)
            binding.tvGreetingIcon.text = "🐾"
        }

        // ── Action buttons ────────────────────────────────────────────────────
        if (isVet) {
            binding.btnPrimaryAction.setText(R.string.home_action_appointments)
            binding.btnSecondaryAction.setText(R.string.home_action_patients)
        } else {
            binding.btnPrimaryAction.setText(R.string.home_action_book)
            binding.btnSecondaryAction.setText(R.string.home_action_my_pets)
        }

        binding.btnPrimaryAction.setOnClickListener      { navigateTo(R.id.appointmentsFragment) }
        binding.btnSecondaryAction.setOnClickListener    { navigateTo(R.id.petsListFragment) }
        binding.btnConsultationsAction.setOnClickListener { findNavController().navigate(R.id.consultationsFragment) }
        binding.btnEmergencyAction.setOnClickListener    { findNavController().navigate(R.id.emergencyVetsFragment) }

        // ── Section visibility ────────────────────────────────────────────────
        binding.layoutStats.isVisible  = isVet
        binding.cardSearch.isVisible   = isVet
        binding.layoutPetsHeader.isVisible = !isVet
        binding.btnViewAllPets.setOnClickListener { navigateTo(R.id.petsListFragment) }

        // ── Vet patient search ────────────────────────────────────────────────
        if (isVet) {
            binding.btnSearch.setOnClickListener {
                val id   = binding.etSearchId.text?.toString()
                val name = binding.etSearchName.text?.toString()
                viewModel.searchVetPets(id, name)
            }
            binding.btnClearSearch.setOnClickListener {
                binding.etSearchId.text?.clear()
                binding.etSearchName.text?.clear()
                viewModel.clearSearch()
                binding.layoutSearchResults.isVisible = false
            }
            viewModel.searchResults.observe(viewLifecycleOwner) { state ->
                when (state) {
                    null -> binding.layoutSearchResults.isVisible = false
                    is UiState.Loading -> {
                        binding.layoutSearchResults.isVisible = true
                        binding.tvSearchCount.text = getString(R.string.emergency_locating)
                    }
                    is UiState.Success -> {
                        binding.layoutSearchResults.isVisible = true
                        val pets = state.data
                        binding.tvSearchCount.text =
                            if (pets.isEmpty()) getString(R.string.home_search_no_results)
                            else getString(R.string.home_search_results, pets.size)
                        populateSearchResults(pets)
                    }
                    is UiState.Error -> {
                        binding.layoutSearchResults.isVisible = true
                        binding.tvSearchCount.text = state.message
                        binding.layoutSearchPets.removeAllViews()
                    }
                    else -> {}
                }
            }
        }

        // ── Observe dashboard stats ───────────────────────────────────────────
        viewModel.statsState.observe(viewLifecycleOwner) { state ->
            binding.progressHome.isVisible = state is UiState.Loading
            if (state is UiState.Success) {
                val data = state.data
                if (isVet) {
                    binding.tvStatAppts.text    = data.todayApptCount.toString()
                    binding.tvStatPatients.text = data.totalPetCount.toString()
                    binding.tvStatConsults.text = data.pendingConsults.toString()
                    binding.tvStatMessages.text = data.unreadMessages.toString()
                } else {
                    populatePetPreview(data.previewPets)
                }
            }
        }

        viewModel.load()
    }

    private fun navigateTo(destinationId: Int) {
        requireActivity()
            .findViewById<BottomNavigationView>(R.id.bottom_nav_view)
            .selectedItemId = destinationId
    }

    private fun populatePetPreview(pets: List<PetDto>) {
        binding.layoutPetPreview.removeAllViews()
        if (pets.isEmpty()) {
            binding.layoutPetsHeader.isVisible = false
            return
        }
        binding.layoutPetPreview.isVisible = true
        inflatePreviewPets(pets, binding.layoutPetPreview) { pet ->
            navigateTo(R.id.petsListFragment)
        }
    }

    private fun populateSearchResults(pets: List<PetDto>) {
        binding.layoutSearchPets.removeAllViews()
        if (pets.isEmpty()) return
        inflatePreviewPets(pets, binding.layoutSearchPets) { pet ->
            findNavController().navigate(
                R.id.action_homeFragment_to_medicalHistoryFragment,
                bundleOf(
                    "petId"      to pet.id,
                    "petName"    to pet.name,
                    "petSpecies" to (pet.species ?: ""),
                    "petBreed"   to (pet.breed ?: ""),
                    "petGender"  to "",
                    "petDob"     to 0L
                )
            )
        }
    }

    private fun inflatePreviewPets(
        pets: List<PetDto>,
        container: android.widget.LinearLayout,
        onClick: (PetDto) -> Unit
    ) {
        val inflater = LayoutInflater.from(requireContext())
        pets.forEach { pet ->
            val item = ItemPetPreviewBinding.inflate(inflater, container, false)
            item.tvPetEmoji.text = speciesEmoji(pet.species)
            item.tvPetName.text  = pet.name
            item.tvPetBreed.text = pet.breed?.takeIf { it.isNotBlank() } ?: "—"
            item.root.setOnClickListener { onClick(pet) }
            container.addView(item.root)
        }
    }

    private fun speciesEmoji(species: String?): String = when (species?.lowercase()) {
        "dog"    -> "🐕"
        "cat"    -> "🐈"
        "bird"   -> "🦜"
        "rabbit" -> "🐇"
        "fish"   -> "🐟"
        "turtle" -> "🐢"
        "hamster"-> "🐹"
        else     -> "🐾"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
