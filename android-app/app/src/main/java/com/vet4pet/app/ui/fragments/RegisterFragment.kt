package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import androidx.core.view.isVisible
import com.vet4pet.app.util.IsraeliIdValidator
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.tabs.TabLayout
import com.vet4pet.app.R
import com.vet4pet.app.databinding.FragmentRegisterBinding
import com.vet4pet.app.ui.viewmodels.AuthState
import com.vet4pet.app.ui.viewmodels.AuthViewModel

class RegisterFragment : Fragment() {

    private var _binding: FragmentRegisterBinding? = null
    private val binding get() = _binding!!

    private val viewModel: AuthViewModel by viewModels()
    private var selectedRole = "owner"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentRegisterBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupTabs()
        setupActions()
        updateNationalIdVisibility()   // owner is default tab
        observeState()
    }

    private fun setupTabs() {
        binding.tabRole.addTab(binding.tabRole.newTab().setText(R.string.auth_tab_vet))
        binding.tabRole.addTab(binding.tabRole.newTab().setText(R.string.auth_tab_owner))
        binding.tabRole.selectTab(binding.tabRole.getTabAt(1)) // default: owner

        binding.tabRole.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                selectedRole = if (tab.position == 0) "vet" else "owner"
                updateTitle()
                updateNationalIdVisibility()
                viewModel.resetState()
            }
            override fun onTabUnselected(tab: TabLayout.Tab) = Unit
            override fun onTabReselected(tab: TabLayout.Tab) = Unit
        })
    }

    private fun updateTitle() {
        binding.tvTitle.setText(
            if (selectedRole == "vet") R.string.auth_join_as_vet else R.string.auth_join_as_owner
        )
    }

    private fun updateNationalIdVisibility() {
        binding.layoutNationalIdRegister.isVisible = selectedRole == "owner"
    }

    private fun setupActions() {
        // Done on confirm-password submits when vet (no ID field); owner moves to ID field
        binding.etConfirmPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE && selectedRole == "vet") {
                submitRegister(); true
            } else false
        }
        // Done on national ID field always submits
        binding.etNationalIdRegister.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { submitRegister(); true } else false
        }

        binding.btnRegister.setOnClickListener { submitRegister() }

        binding.tvGoLogin.setOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun submitRegister() {
        val name       = binding.etName.text?.toString().orEmpty()
        val email      = binding.etEmail.text?.toString().orEmpty()
        val password   = binding.etPassword.text?.toString().orEmpty()
        val confirm    = binding.etConfirmPassword.text?.toString().orEmpty()
        val nationalId = binding.etNationalIdRegister.text?.toString().orEmpty()

        // Inline validation for national ID so the error appears on the field itself
        if (selectedRole == "owner") {
            binding.layoutNationalIdRegister.error = null
            if (nationalId.isBlank()) {
                binding.layoutNationalIdRegister.error = getString(R.string.auth_national_id_required)
                return
            }
            if (IsraeliIdValidator.validate(nationalId) == null) {
                binding.layoutNationalIdRegister.error = getString(R.string.auth_national_id_invalid)
                return
            }
        }

        viewModel.register(name, email, password, confirm, selectedRole, nationalId)
    }

    private fun observeState() {
        viewModel.state.observe(viewLifecycleOwner) { state ->
            val loading = state is AuthState.Loading
            binding.btnRegister.isEnabled = !loading
            binding.btnRegister.text = if (loading) getString(R.string.auth_creating_account) else getString(R.string.auth_create_account_btn)
            binding.tvError.isVisible = state is AuthState.Error
            if (state is AuthState.Error) binding.tvError.text = state.message

            if (state is AuthState.Success &&
                findNavController().currentDestination?.id == R.id.registerFragment) {
                viewModel.resetState()
                findNavController().navigate(
                    R.id.action_registerFragment_to_homeFragment,
                    null,
                    androidx.navigation.NavOptions.Builder()
                        .setPopUpTo(R.id.homeFragment, false)
                        .build()
                )
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
