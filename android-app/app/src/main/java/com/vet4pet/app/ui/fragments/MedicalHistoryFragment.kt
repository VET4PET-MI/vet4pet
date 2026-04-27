package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import com.vet4pet.app.R
import com.vet4pet.app.ui.adapters.MedicalRecordAdapter
import com.vet4pet.app.ui.viewmodels.PetsViewModel

class MedicalHistoryFragment : Fragment(R.layout.fragment_medical_history) {

    private val viewModel: PetsViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val petId = arguments?.getString("petId") ?: "pet_1"

        val adapter = MedicalRecordAdapter(onItemClick = { record ->
            findNavController().navigate(
                R.id.action_medicalHistoryFragment_to_medicalRecordDetailFragment,
                bundleOf("record" to record)
            )
        })

        view.findViewById<ExtendedFloatingActionButton>(R.id.fab_add_record).setOnClickListener {
            findNavController().navigate(
                R.id.action_medicalHistoryFragment_to_addMedicalRecordFragment,
                bundleOf("petId" to petId)
            )
        }

        view.findViewById<RecyclerView>(R.id.rv_medical_records).adapter = adapter

        viewModel.pets.observe(viewLifecycleOwner) { pets ->
            view.findViewById<TextView>(R.id.tv_pet_name_header).text =
                pets.find { it.id == petId }?.name.orEmpty()
        }

        viewModel.medicalRecords.observe(viewLifecycleOwner) { records ->
            adapter.submitList(records.filter { it.petId == petId })
        }
    }
}
