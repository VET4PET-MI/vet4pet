package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.google.android.material.bottomnavigation.BottomNavigationView
import androidx.navigation.fragment.findNavController
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.api.PetDto
import com.vet4pet.app.databinding.FragmentHomeBinding
import com.vet4pet.app.databinding.ItemPetPreviewBinding
import com.vet4pet.app.ui.viewmodels.HomeViewModel
import com.vet4pet.app.ui.viewmodels.UiState

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
        binding.btnConsultationsAction.setOnClickListener {
            findNavController().navigate(R.id.consultationsFragment)
        }
        binding.btnEmergencyAction.setOnClickListener {
            findNavController().navigate(R.id.emergencyVetsFragment)
        }

        // ── Section visibility ────────────────────────────────────────────────
        binding.layoutStats.isVisible      = isVet
        binding.layoutPetsHeader.isVisible = !isVet
        binding.btnViewAllPets.setOnClickListener { navigateTo(R.id.petsListFragment) }

        // ── Observe data ──────────────────────────────────────────────────────
        viewModel.statsState.observe(viewLifecycleOwner) { state ->
            binding.progressHome.isVisible = state is UiState.Loading

            if (state is UiState.Success) {
                val data = state.data
                if (isVet) {
                    binding.tvStatAppts.text    = data.todayApptCount.toString()
                    binding.tvStatPatients.text = data.totalPetCount.toString()
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
        val inflater = LayoutInflater.from(requireContext())
        pets.forEach { pet ->
            val item = ItemPetPreviewBinding.inflate(inflater, binding.layoutPetPreview, false)
            item.tvPetEmoji.text = speciesEmoji(pet.species)
            item.tvPetName.text  = pet.name
            item.tvPetBreed.text = pet.breed?.takeIf { it.isNotBlank() } ?: "—"
            item.root.setOnClickListener { navigateTo(R.id.petsListFragment) }
            binding.layoutPetPreview.addView(item.root)
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
