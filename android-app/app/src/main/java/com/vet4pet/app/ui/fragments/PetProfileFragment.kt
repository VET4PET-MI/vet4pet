package com.vet4pet.app.ui.fragments

import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import coil.load
import coil.transform.CircleCropTransformation
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.vet4pet.app.R
import com.vet4pet.app.databinding.FragmentPetProfileBinding
import com.vet4pet.app.ui.viewmodels.PetsViewModel
import com.vet4pet.app.ui.viewmodels.UiState
import com.vet4pet.app.util.speciesStringRes
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId

class PetProfileFragment : Fragment() {

    private var _binding: FragmentPetProfileBinding? = null
    private val binding get() = _binding!!
    private val viewModel: PetsViewModel by viewModels()

    private lateinit var petId: String
    private var petName     = ""
    private var petSpecies  = ""
    private var petBreed    = ""
    private var petGender   = "UNKNOWN"
    private var petDob      = 0L
    private var petPhotoUrl = ""

    private val speciesApiValues = listOf("Dog", "Cat", "Bird", "Rabbit", "Hamster", "Fish", "Reptile", "Other")
    private val speciesLabels: List<String> by lazy {
        listOf(
            getString(R.string.species_dog), getString(R.string.species_cat),
            getString(R.string.species_bird), getString(R.string.species_rabbit),
            getString(R.string.species_hamster), getString(R.string.species_fish),
            getString(R.string.species_reptile), getString(R.string.species_other)
        )
    }

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri ?: return@registerForActivityResult
        uploadPhoto(uri)
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPetProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        petId       = arguments?.getString("petId") ?: run { findNavController().navigateUp(); return }
        petName     = arguments?.getString("petName") ?: ""
        petSpecies  = arguments?.getString("petSpecies") ?: ""
        petBreed    = arguments?.getString("petBreed") ?: ""
        petGender   = arguments?.getString("petGender") ?: "UNKNOWN"
        petDob      = arguments?.getLong("petDob") ?: 0L
        petPhotoUrl = arguments?.getString("petPhotoUrl") ?: ""

        binding.btnBack.setOnClickListener { findNavController().navigateUp() }
        binding.btnEditPet.setOnClickListener { showEditDialog() }
        binding.framePhoto.setOnClickListener { pickImage.launch("image/*") }

        binding.btnViewHistory.setOnClickListener {
            findNavController().navigate(
                R.id.action_petProfileFragment_to_medicalHistoryFragment,
                bundleOf(
                    "petId"      to petId,
                    "petName"    to petName,
                    "petSpecies" to petSpecies,
                    "petBreed"   to petBreed,
                    "petGender"  to petGender,
                    "petDob"     to petDob
                )
            )
        }

        // Refresh UI when pets reload (after edit or photo upload)
        viewModel.petsState.observe(viewLifecycleOwner) { state ->
            if (state is UiState.Success) {
                val updated = state.data.find { it.id == petId } ?: return@observe
                petName     = updated.name
                petSpecies  = updated.species
                petBreed    = updated.breed ?: ""
                petGender   = updated.gender.name
                petDob      = updated.dateOfBirth ?: 0L
                petPhotoUrl = updated.profileImageUrl ?: ""
                renderDetails()
            }
        }

        renderDetails()
        viewModel.loadPets()
    }

    private fun renderDetails() {
        val speciesLabel = speciesStringRes(petSpecies).takeIf { it != 0 }
            ?.let { getString(it) } ?: petSpecies
        val genderLabel = when (petGender.uppercase()) {
            "MALE"   -> getString(R.string.gender_male)
            "FEMALE" -> getString(R.string.gender_female)
            else     -> getString(R.string.gender_unknown)
        }

        binding.tvPetName.text        = petName
        binding.tvPetSubtitle.text    = "$speciesLabel · $genderLabel"
        binding.tvDetailSpecies.text  = speciesLabel
        binding.tvDetailBreed.text    = petBreed.takeIf { it.isNotBlank() } ?: getString(R.string.age_unknown)
        binding.tvDetailAge.text      = if (petDob > 0) formatAge(petDob) else getString(R.string.age_unknown)
        binding.tvDetailGender.text   = genderLabel

        if (petPhotoUrl.isNotBlank()) {
            binding.imgPetPhoto.load(petPhotoUrl) {
                transformations(CircleCropTransformation())
                placeholder(R.drawable.ic_nav_pets)
                error(R.drawable.ic_nav_pets)
            }
            binding.imgPetPhoto.setPadding(0, 0, 0, 0)
            binding.imgPetPhoto.clearColorFilter()
            binding.imgPetPhoto.backgroundTintList = null
        } else {
            binding.imgPetPhoto.setImageResource(R.drawable.ic_nav_pets)
            val pad = (22 * resources.displayMetrics.density).toInt()
            binding.imgPetPhoto.setPadding(pad, pad, pad, pad)
            binding.imgPetPhoto.setColorFilter(
                requireContext().getColor(R.color.brand),
                android.graphics.PorterDuff.Mode.SRC_IN
            )
            binding.imgPetPhoto.backgroundTintList =
                requireContext().getColorStateList(R.color.brand_soft)
        }
    }

    private fun uploadPhoto(uri: Uri) {
        Snackbar.make(binding.root, R.string.pet_photo_uploading, Snackbar.LENGTH_LONG).show()
        viewModel.uploadAndSavePetPhoto(petId, uri) { success, error ->
            if (_binding == null) return@uploadAndSavePetPhoto
            if (success) {
                Snackbar.make(binding.root, R.string.pet_photo_saved, Snackbar.LENGTH_SHORT).show()
            } else {
                Snackbar.make(
                    binding.root,
                    error ?: getString(R.string.error_save_failed),
                    Snackbar.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun showEditDialog() {
        val dialogView = LayoutInflater.from(requireContext())
            .inflate(R.layout.dialog_add_pet, null)

        val etName    = dialogView.findViewById<TextInputEditText>(R.id.et_pet_name)
        val acSpecies = dialogView.findViewById<AutoCompleteTextView>(R.id.ac_species)
        val etBreed   = dialogView.findViewById<TextInputEditText>(R.id.et_pet_breed)
        val etAge     = dialogView.findViewById<TextInputEditText>(R.id.et_pet_age)
        val acGender  = dialogView.findViewById<AutoCompleteTextView>(R.id.ac_gender)

        acSpecies.setAdapter(
            ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, speciesLabels)
        )
        val genders      = listOf("MALE", "FEMALE", "UNKNOWN")
        val genderLabels = listOf(
            getString(R.string.gender_male),
            getString(R.string.gender_female),
            getString(R.string.gender_unknown)
        )
        acGender.setAdapter(
            ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, genderLabels)
        )

        // Prefill with current values
        etName.setText(petName)
        val spIdx = speciesApiValues.indexOfFirst { it.equals(petSpecies, ignoreCase = true) }
        if (spIdx >= 0) acSpecies.setText(speciesLabels[spIdx], false)
        etBreed.setText(petBreed)
        if (petDob > 0) {
            val ageYears = ((System.currentTimeMillis() - petDob) / (365.25 * 24 * 3600 * 1000)).toInt()
            if (ageYears >= 0) etAge.setText(ageYears.toString())
        }
        val gIdx = genders.indexOfFirst { it.equals(petGender, ignoreCase = true) }
        if (gIdx >= 0) acGender.setText(genderLabels[gIdx], false)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.edit_pet_title)
            .setView(dialogView)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_save) { _, _ ->
                val name    = etName.text?.toString()?.trim().orEmpty()
                val spLabel = acSpecies.text?.toString()?.trim() ?: ""
                val spApiIdx = speciesLabels.indexOf(spLabel)
                if (spApiIdx < 0) {
                    Toast.makeText(requireContext(), R.string.pet_species_required, Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                val sp     = speciesApiValues[spApiIdx]
                val breed  = etBreed.text?.toString()?.trim()
                val age    = etAge.text?.toString()?.toIntOrNull()
                val gLabel = acGender.text?.toString()?.trim()
                val gender = genders.getOrNull(genderLabels.indexOf(gLabel)) ?: "UNKNOWN"

                if (name.isBlank()) {
                    Toast.makeText(requireContext(), R.string.pet_name_required, Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                viewModel.updatePet(petId, name, sp, breed, age, gender) { success ->
                    if (!success) Toast.makeText(requireContext(), R.string.error_save_failed, Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }

    private fun formatAge(epochMs: Long): String {
        val dob    = Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()).toLocalDate()
        val period = Period.between(dob, LocalDate.now())
        return when {
            period.years  > 0 -> resources.getQuantityString(R.plurals.age_years,  period.years,  period.years)
            period.months > 0 -> resources.getQuantityString(R.plurals.age_months, period.months, period.months)
            else              -> getString(R.string.age_less_than_one_month)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
