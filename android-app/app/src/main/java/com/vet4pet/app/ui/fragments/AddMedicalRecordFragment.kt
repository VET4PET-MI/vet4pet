package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputEditText
import com.vet4pet.app.R
import com.vet4pet.app.data.enums.EventType
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class AddMedicalRecordFragment : Fragment(R.layout.fragment_add_medical_record) {

    private var selectedDateMs: Long = MaterialDatePicker.todayInUtcMilliseconds()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val etVetName = view.findViewById<TextInputEditText>(R.id.et_vet_name)
        val etFindings = view.findViewById<TextInputEditText>(R.id.et_findings)
        val acType = view.findViewById<AutoCompleteTextView>(R.id.ac_record_type)
        val etDate = view.findViewById<TextInputEditText>(R.id.et_date)
        val btnSave = view.findViewById<MaterialButton>(R.id.btn_save)

        etDate.setText(formatDate(selectedDateMs))

        setupTypeDropdown(acType)
        setupDatePicker(etDate, view)
        setupValidation(etFindings, acType, btnSave)

        view.findViewById<View>(R.id.btn_back).setOnClickListener {
            findNavController().popBackStack()
        }

        btnSave.setOnClickListener {
            Snackbar.make(view, R.string.snack_record_saved_mock, Snackbar.LENGTH_SHORT).show()
            findNavController().popBackStack()
        }
    }

    private fun setupTypeDropdown(acType: AutoCompleteTextView) {
        val labels = EventType.entries.map { getString(it.labelRes()) }
        acType.setAdapter(
            ArrayAdapter(requireContext(), android.R.layout.simple_list_item_1, labels)
        )
    }

    private fun setupDatePicker(etDate: TextInputEditText, root: View) {
        val openPicker = View.OnClickListener {
            val picker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(getString(R.string.hint_date))
                .setSelection(selectedDateMs)
                .build()
            picker.addOnPositiveButtonClickListener { ms ->
                selectedDateMs = ms
                etDate.setText(formatDate(ms))
            }
            picker.show(parentFragmentManager, "date_picker")
        }
        etDate.setOnClickListener(openPicker)
        root.findViewById<View>(R.id.til_date).also { til ->
            (til as? com.google.android.material.textfield.TextInputLayout)
                ?.setEndIconOnClickListener(openPicker)
        }
    }

    private fun setupValidation(
        etFindings: TextInputEditText,
        acType: AutoCompleteTextView,
        btnSave: MaterialButton
    ) {
        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) {
                btnSave.isEnabled =
                    etFindings.text?.isNotBlank() == true &&
                    acType.text?.isNotBlank() == true
            }
        }
        etFindings.addTextChangedListener(watcher)
        acType.addTextChangedListener(watcher)
    }

    private fun formatDate(epochMs: Long): String {
        val date = Instant.ofEpochMilli(epochMs)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
        return date.format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.getDefault()))
    }
}

private fun EventType.labelRes(): Int = when (this) {
    EventType.VISIT_SUMMARY -> R.string.record_type_visit
    EventType.VACCINATION   -> R.string.record_type_vaccination
    EventType.LAB_RESULT    -> R.string.record_type_lab
    EventType.XRAY          -> R.string.record_type_xray
    EventType.BLOOD_TEST    -> R.string.record_type_blood_test
    EventType.OTHER         -> R.string.record_type_other
}
