package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.View
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.RecyclerView
import com.vet4pet.app.R
import com.vet4pet.app.ui.adapters.PetAdapter
import com.vet4pet.app.ui.viewmodels.PetsViewModel

class PetsListFragment : Fragment(R.layout.fragment_pets_list) {

    private val viewModel: PetsViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val adapter = PetAdapter { pet ->
            findNavController().navigate(
                R.id.action_petsListFragment_to_medicalHistoryFragment,
                bundleOf("petId" to pet.id)
            )
        }

        view.findViewById<RecyclerView>(R.id.rv_pets).adapter = adapter

        viewModel.pets.observe(viewLifecycleOwner) { pets ->
            adapter.submitList(pets)
        }
    }
}
