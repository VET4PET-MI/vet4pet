package com.vet4pet.app.ui.fragments

import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Toast
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.Pet
import com.vet4pet.app.databinding.FragmentPetsListBinding
import com.vet4pet.app.ui.adapters.PetAdapter
import com.vet4pet.app.ui.viewmodels.PetsViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class PetsListFragment : Fragment() {

    private var _binding: FragmentPetsListBinding? = null
    private val binding get() = _binding!!
    private val viewModel: PetsViewModel by viewModels()

    // Vet-only: results stay hidden until an owner-ID search is performed (medical privacy)
    private var vetHasSearched = false

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentPetsListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        val role    = session.getUser()?.role ?: "owner"
        val isOwner = role == "owner"
        val isVet   = role == "vet"

        val adapter = PetAdapter(
            onItemClick = { pet ->
                findNavController().navigate(
                    R.id.action_petsListFragment_to_petProfileFragment,
                    bundleOf(
                        "petId"       to pet.id,
                        "petName"     to pet.name,
                        "petSpecies"  to pet.species,
                        "petBreed"    to (pet.breed ?: ""),
                        "petGender"   to pet.gender.name,
                        "petDob"      to (pet.dateOfBirth ?: 0L),
                        "petPhotoUrl" to (pet.profileImageUrl ?: "")
                    )
                )
            },
            onPhotoClick = null,
            onEditClick  = null
        )
        binding.rvPets.adapter = adapter

        binding.fabAddPet.isVisible = isOwner

        if (isVet) {
            // Vets use the dedicated national-ID search — hide the owner search bar
            binding.searchInputLayout.isVisible = false
            binding.vetSearchContainer.isVisible = true

            // Show prompt instead of empty-pets text until the vet searches
            binding.tvEmptyPets.text = getString(R.string.vet_search_prompt)
            binding.tvEmptyPets.isVisible = true

            binding.btnVetSearch.setOnClickListener { performVetSearch() }
            binding.etPetNameVet.setOnEditorActionListener { _, _, _ ->
                performVetSearch()
                true
            }

            // Privacy: clearing the owner ID resets the list back to empty
            binding.etNationalId.addTextChangedListener(object : android.text.TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: android.text.Editable?) {
                    if (s?.toString()?.trim().isNullOrEmpty()) {
                        vetHasSearched = false
                        adapter.submitList(emptyList())
                        binding.progressPets.isVisible = false
                        binding.tvEmptyPets.isVisible = true
                        binding.tvEmptyPets.text = getString(R.string.vet_search_prompt)
                    }
                }
            })
        } else {
            binding.fabAddPet.setOnClickListener { showAddPetDialog() }

            // Owner: local filter on already-loaded list
            binding.etSearch.addTextChangedListener(object : android.text.TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: android.text.Editable?) {
                    val query = s?.toString()?.trim() ?: ""
                    val state = viewModel.petsState.value
                    if (state is UiState.Success) {
                        val filtered = if (query.isBlank()) state.data
                        else state.data.filter {
                            it.name.contains(query, ignoreCase = true) ||
                            it.species.contains(query, ignoreCase = true) ||
                            it.breed?.contains(query, ignoreCase = true) == true
                        }
                        adapter.submitList(filtered)
                    }
                }
            })

            viewModel.loadPets()
        }

        viewModel.petsState.observe(viewLifecycleOwner) { state ->
            // Vet privacy: show nothing until a search has been performed this session
            if (isVet && !vetHasSearched) {
                binding.progressPets.isVisible = false
                adapter.submitList(emptyList())
                binding.tvEmptyPets.isVisible = true
                binding.tvEmptyPets.text = getString(R.string.vet_search_prompt)
                return@observe
            }
            binding.progressPets.isVisible = state is UiState.Loading
            if (state is UiState.Success) {
                val list = state.data as List<Pet>
                val isEmpty = list.isEmpty()
                binding.tvEmptyPets.isVisible = isEmpty
                if (isEmpty) {
                    binding.tvEmptyPets.text = if (isVet)
                        getString(R.string.vet_no_results)
                    else
                        getString(R.string.pets_empty)
                }
                if (isOwner) {
                    val query = binding.etSearch.text?.toString()?.trim() ?: ""
                    val filtered = if (query.isBlank()) list
                    else list.filter {
                        it.name.contains(query, ignoreCase = true) ||
                        it.species.contains(query, ignoreCase = true) ||
                        it.breed?.contains(query, ignoreCase = true) == true
                    }
                    adapter.submitList(filtered)
                } else {
                    adapter.submitList(list)
                }
            }
            if (state is UiState.Error) {
                binding.tvEmptyPets.isVisible = true
                binding.tvEmptyPets.text = state.message
            }
        }
    }

    private fun performVetSearch() {
        val nationalId = binding.etNationalId.text?.toString()?.trim() ?: ""
        if (nationalId.isBlank()) {
            binding.tilNationalId.error = getString(R.string.error_national_id_required)
            return
        }
        binding.tilNationalId.error = null
        vetHasSearched = true
        val petName = binding.etPetNameVet.text?.toString()?.trim()
        viewModel.searchPets(nationalId, petName)
    }

    // API values sent to server are always English; labels shown to user are translated
    private val speciesApiValues = listOf("Dog", "Cat", "Bird", "Rabbit", "Hamster", "Fish", "Reptile", "Other")
    // Lazily cached after context is available — re-computed only if fragment is recreated
    private val speciesLabels: List<String> by lazy {
        listOf(
            getString(R.string.species_dog), getString(R.string.species_cat),
            getString(R.string.species_bird), getString(R.string.species_rabbit),
            getString(R.string.species_hamster), getString(R.string.species_fish),
            getString(R.string.species_reptile), getString(R.string.species_other)
        )
    }
    private fun apiToLabel(apiValue: String): String {
        val idx = speciesApiValues.indexOfFirst { it.equals(apiValue, ignoreCase = true) }
        return if (idx >= 0) speciesLabels[idx] else apiValue
    }
    private fun labelToApi(label: String): String? {
        val idx = speciesLabels.indexOf(label)
        return if (idx >= 0) speciesApiValues[idx] else null
    }

    private fun showAddPetDialog() {
        val dialogView = LayoutInflater.from(requireContext()).inflate(R.layout.dialog_add_pet, null)

        val etName    = dialogView.findViewById<TextInputEditText>(R.id.et_pet_name)
        val acSpecies = dialogView.findViewById<AutoCompleteTextView>(R.id.ac_species)
        val etBreed   = dialogView.findViewById<TextInputEditText>(R.id.et_pet_breed)
        val etAge     = dialogView.findViewById<TextInputEditText>(R.id.et_pet_age)
        val acGender  = dialogView.findViewById<AutoCompleteTextView>(R.id.ac_gender)

        acSpecies.setAdapter(ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, speciesLabels))

        val genders = listOf("MALE", "FEMALE", "UNKNOWN")
        val genderLabels = listOf(getString(R.string.gender_male), getString(R.string.gender_female), getString(R.string.gender_unknown))
        acGender.setAdapter(ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, genderLabels))

        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.add_pet_title)
            .setView(dialogView)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_save) { _, _ ->
                val name   = etName.text?.toString()?.trim().orEmpty()
                val sp     = labelToApi(acSpecies.text?.toString()?.trim() ?: "") ?: run {
                    Toast.makeText(requireContext(), R.string.pet_species_required, Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val breed  = etBreed.text?.toString()?.trim()
                val age    = etAge.text?.toString()?.toIntOrNull()
                val gLabel = acGender.text?.toString()?.trim()
                val gender = genders.getOrNull(genderLabels.indexOf(gLabel)) ?: "UNKNOWN"

                if (name.isBlank()) {
                    Toast.makeText(requireContext(), R.string.pet_name_required, Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                viewModel.addPet(name, sp, breed, age, gender) { success ->
                    if (!success) Toast.makeText(requireContext(), R.string.error_save_failed, Toast.LENGTH_SHORT).show()
                }
            }
            .show()
        dialog.setCanceledOnTouchOutside(false)
        @Suppress("DEPRECATION")
        dialog.window?.setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN or
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
