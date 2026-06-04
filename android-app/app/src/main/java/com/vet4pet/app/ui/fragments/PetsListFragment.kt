package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Toast
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.databinding.FragmentPetsListBinding
import com.vet4pet.app.ui.adapters.PetAdapter
import com.vet4pet.app.ui.viewmodels.PetsViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class PetsListFragment : Fragment() {

    private var _binding: FragmentPetsListBinding? = null
    private val binding get() = _binding!!
    private val viewModel: PetsViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentPetsListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val adapter = PetAdapter { pet ->
            findNavController().navigate(
                R.id.action_petsListFragment_to_medicalHistoryFragment,
                bundleOf("petId" to pet.id, "petName" to pet.name)
            )
        }
        binding.rvPets.adapter = adapter

        // Only owners can add their own pets
        val session = SessionManager(requireContext())
        val role    = session.getUser()?.role ?: "owner"
        binding.fabAddPet.isVisible = role == "owner"
        binding.fabAddPet.setOnClickListener { showAddPetDialog() }

        viewModel.petsState.observe(viewLifecycleOwner) { state ->
            binding.progressPets.isVisible = state is UiState.Loading
            binding.tvEmptyPets.isVisible  = state is UiState.Success && (state.data as List<*>).isEmpty()
            if (state is UiState.Success) adapter.submitList(state.data)
            if (state is UiState.Error) {
                binding.tvEmptyPets.isVisible = true
                binding.tvEmptyPets.text = state.message
            }
        }

        viewModel.loadPets()
    }

    private fun showAddPetDialog() {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_add_pet, null)

        val etName   = dialogView.findViewById<TextInputEditText>(R.id.et_pet_name)
        val acSpecies = dialogView.findViewById<AutoCompleteTextView>(R.id.ac_species)
        val etBreed  = dialogView.findViewById<TextInputEditText>(R.id.et_pet_breed)
        val etAge    = dialogView.findViewById<TextInputEditText>(R.id.et_pet_age)
        val acGender = dialogView.findViewById<AutoCompleteTextView>(R.id.ac_gender)

        val species = listOf("Dog", "Cat", "Bird", "Rabbit", "Hamster", "Fish", "Reptile", "Other")
        acSpecies.setAdapter(ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, species))

        val genders = listOf("MALE", "FEMALE", "UNKNOWN")
        val genderLabels = listOf(
            getString(R.string.gender_male),
            getString(R.string.gender_female),
            getString(R.string.gender_unknown)
        )
        acGender.setAdapter(ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, genderLabels))

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.add_pet_title)
            .setView(dialogView)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_save) { _, _ ->
                val name    = etName.text?.toString()?.trim().orEmpty()
                val sp      = acSpecies.text?.toString()?.trim() ?: "Unknown"
                val breed   = etBreed.text?.toString()?.trim()
                val age     = etAge.text?.toString()?.toIntOrNull()
                val gLabel  = acGender.text?.toString()?.trim()
                val gender  = genders.getOrNull(genderLabels.indexOf(gLabel)) ?: "UNKNOWN"

                if (name.isBlank()) {
                    Toast.makeText(requireContext(), R.string.pet_name_required, Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                viewModel.addPet(name, sp, breed, age, gender) { success ->
                    if (!success) {
                        Toast.makeText(requireContext(), R.string.error_save_failed, Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
