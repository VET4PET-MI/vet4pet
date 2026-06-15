package com.vet4pet.app.ui.fragments

import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.os.BundleCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.snackbar.Snackbar
import com.vet4pet.app.R
import com.vet4pet.app.data.enums.EventType
import com.vet4pet.app.data.models.MedicalRecord
import com.vet4pet.app.databinding.FragmentAddMedicalRecordBinding
import com.vet4pet.app.ui.viewmodels.PetsViewModel
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class AddMedicalRecordFragment : Fragment() {

    private var _binding: FragmentAddMedicalRecordBinding? = null
    private val binding get() = _binding!!
    private val viewModel: PetsViewModel by viewModels()

    private var selectedDateMs: Long = MaterialDatePicker.todayInUtcMilliseconds()
    private var selectedFileUri: Uri? = null
    private var existingRecord: MedicalRecord? = null

    private val pickFileLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri != null) {
            selectedFileUri = uri
            requireContext().contentResolver.takePersistableUriPermission(
                uri, android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
            val name = getFileName(uri)
            binding.tvSelectedFile.text = name
            binding.tvSelectedFile.isVisible = true
            binding.btnAttachFile.text = getString(R.string.action_change_file)
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentAddMedicalRecordBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val petId = arguments?.getString("petId") ?: return
        existingRecord = BundleCompat.getParcelable(requireArguments(), "record", MedicalRecord::class.java)
        val isEditMode = existingRecord != null

        if (isEditMode) {
            binding.tvFormTitle.setText(R.string.title_edit_medical_record)
            prefillForEdit(existingRecord!!)
        } else {
            binding.etDate.setText(formatDate(selectedDateMs))
        }

        setupTypeDropdown()
        setupDatePicker()
        setupValidation()

        // Pre-filled fields don't fire TextWatchers, so force a button-state check
        if (isEditMode) updateSaveButton()

        binding.btnBack.setOnClickListener { findNavController().popBackStack() }

        binding.btnAttachFile.setOnClickListener {
            pickFileLauncher.launch(arrayOf(
                "application/pdf",
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp"
            ))
        }

        binding.btnSave.setOnClickListener {
            if (isEditMode) submitEdit(petId, existingRecord!!)
            else submitRecord(petId)
        }
    }

    private fun prefillForEdit(record: MedicalRecord) {
        selectedDateMs = record.date
        binding.etDate.setText(formatDate(record.date))
        binding.etVetName.setText(record.vetName)
        binding.etFindings.setText(record.findings)

        val typeLabel = EventType.entries.firstOrNull { it == record.type }
            ?.let { getString(it.labelRes()) } ?: ""
        binding.acRecordType.setText(typeLabel, false)

        if (record.type == EventType.PRESCRIPTION) {
            binding.tilPrescription.isVisible = true
            binding.etPrescription.setText(record.prescription ?: "")
        }

        if (!record.fileUrl.isNullOrBlank()) {
            binding.tvSelectedFile.text = getString(R.string.action_change_file)
            binding.tvSelectedFile.isVisible = true
        }
    }

    private fun submitRecord(petId: String) {
        val vetName      = binding.etVetName.text?.toString()?.trim().orEmpty()
        val findings     = binding.etFindings.text?.toString()?.trim().orEmpty()
        val prescription = binding.etPrescription.text?.toString()?.trim()?.takeIf { it.isNotBlank() }
        val typeLabel    = binding.acRecordType.text?.toString()?.trim().orEmpty()
        val typeEnum     = EventType.entries.firstOrNull {
            getString(it.labelRes()) == typeLabel
        } ?: return

        binding.btnSave.isEnabled = false
        binding.progressSave.isVisible = true

        viewModel.addRecord(
            petId        = petId,
            vetName      = vetName,
            type         = typeEnum.name,
            findings     = findings,
            prescription = prescription,
            dateMs       = selectedDateMs,
            fileUri      = selectedFileUri
        ) { success, error ->
            binding.btnSave.isEnabled     = true
            binding.progressSave.isVisible = false
            if (success) {
                findNavController().popBackStack()
            } else {
                Snackbar.make(
                    requireView(),
                    error ?: getString(R.string.error_save_failed),
                    Snackbar.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun submitEdit(petId: String, record: MedicalRecord) {
        val vetName      = binding.etVetName.text?.toString()?.trim().orEmpty()
        val findings     = binding.etFindings.text?.toString()?.trim().orEmpty()
        val prescription = binding.etPrescription.text?.toString()?.trim()?.takeIf { it.isNotBlank() }
        val typeLabel    = binding.acRecordType.text?.toString()?.trim().orEmpty()
        val typeEnum     = EventType.entries.firstOrNull {
            getString(it.labelRes()) == typeLabel
        } ?: return

        binding.btnSave.isEnabled = false
        binding.progressSave.isVisible = true

        viewModel.updateRecord(
            recordId        = record.id,
            petId           = petId,
            vetName         = vetName,
            type            = typeEnum.name,
            findings        = findings,
            prescription    = prescription,
            dateMs          = selectedDateMs,
            fileUri         = selectedFileUri,
            existingFileUrl = record.fileUrl
        ) { success, error ->
            binding.btnSave.isEnabled     = true
            binding.progressSave.isVisible = false
            if (success) {
                // Pop both the edit screen and the detail screen back to history list
                findNavController().popBackStack()
                findNavController().popBackStack()
            } else {
                Snackbar.make(
                    requireView(),
                    error ?: getString(R.string.error_save_failed),
                    Snackbar.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun setupTypeDropdown() {
        val labels = EventType.entries.map { getString(it.labelRes()) }
        binding.acRecordType.setAdapter(
            ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, labels)
        )
        binding.acRecordType.setOnItemClickListener { _, _, _, _ ->
            val typeLabel = binding.acRecordType.text?.toString()?.trim() ?: ""
            val isPrescription = EventType.entries.firstOrNull {
                getString(it.labelRes()) == typeLabel
            } == EventType.PRESCRIPTION
            binding.tilPrescription.isVisible = isPrescription
        }
    }

    private fun setupDatePicker() {
        val openPicker = View.OnClickListener {
            val picker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(getString(R.string.hint_date))
                .setSelection(selectedDateMs)
                .build()
            picker.addOnPositiveButtonClickListener { ms ->
                selectedDateMs = ms
                binding.etDate.setText(formatDate(ms))
            }
            picker.show(parentFragmentManager, "date_picker")
        }
        binding.etDate.setOnClickListener(openPicker)
        binding.tilDate.setEndIconOnClickListener(openPicker)
    }

    private fun setupValidation() {
        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) { updateSaveButton() }
        }
        binding.etFindings.addTextChangedListener(watcher)
        binding.acRecordType.addTextChangedListener(watcher)
    }

    private fun updateSaveButton() {
        binding.btnSave.isEnabled =
            binding.etFindings.text?.isNotBlank() == true &&
            binding.acRecordType.text?.isNotBlank() == true
    }

    private fun formatDate(epochMs: Long): String {
        val date = Instant.ofEpochMilli(epochMs)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
        return date.format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.getDefault()))
    }

    private fun getFileName(uri: Uri): String {
        val cursor = requireContext().contentResolver.query(uri, null, null, null, null)
        return cursor?.use {
            if (it.moveToFirst()) {
                val idx = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (idx >= 0) it.getString(idx) else uri.lastPathSegment ?: "file"
            } else uri.lastPathSegment ?: "file"
        } ?: uri.lastPathSegment ?: "file"
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

private fun EventType.labelRes(): Int = when (this) {
    EventType.VISIT_SUMMARY -> R.string.record_type_visit
    EventType.VACCINATION   -> R.string.record_type_vaccination
    EventType.LAB_RESULT    -> R.string.record_type_lab
    EventType.XRAY          -> R.string.record_type_xray
    EventType.BLOOD_TEST    -> R.string.record_type_blood_test
    EventType.CONSULTATION  -> R.string.record_type_consultation
    EventType.PRESCRIPTION  -> R.string.record_type_prescription
    EventType.OTHER         -> R.string.record_type_other
}
