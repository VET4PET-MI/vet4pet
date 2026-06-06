package com.vet4pet.app.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.tabs.TabLayout
import com.vet4pet.app.R
import com.vet4pet.app.databinding.FragmentLoginBinding
import com.vet4pet.app.ui.viewmodels.AuthState
import com.vet4pet.app.ui.viewmodels.AuthViewModel
import com.vet4pet.app.util.LanguageManager

class LoginFragment : Fragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!

    private val viewModel: AuthViewModel by viewModels()
    private var selectedRole = "vet"

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupLanguageToggle()
        setupTabs()
        setupActions()
        observeState()
    }

    private fun setupLanguageToggle() {
        binding.btnToggleLanguage.text = if (LanguageManager.isHebrew())
            getString(R.string.lang_switch_to_english)
        else
            getString(R.string.lang_switch_to_hebrew)
        binding.btnToggleLanguage.setOnClickListener {
            if (LanguageManager.isHebrew()) LanguageManager.setLanguage("en")
            else LanguageManager.setLanguage("he")
        }
    }

    private fun setupTabs() {
        binding.tabRole.addTab(binding.tabRole.newTab().setText(R.string.auth_tab_vet))
        binding.tabRole.addTab(binding.tabRole.newTab().setText(R.string.auth_tab_owner))

        binding.tabRole.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                selectedRole = if (tab.position == 0) "vet" else "owner"
                updateWelcomeText()
                viewModel.resetState()
            }
            override fun onTabUnselected(tab: TabLayout.Tab) = Unit
            override fun onTabReselected(tab: TabLayout.Tab) = Unit
        })
    }

    private fun updateWelcomeText() {
        if (selectedRole == "vet") {
            binding.tvWelcome.setText(R.string.auth_welcome_back_doctor)
            binding.tvSubtitle.setText(R.string.auth_login_desc_vet)
        } else {
            binding.tvWelcome.setText(R.string.auth_welcome_back)
            binding.tvSubtitle.setText(R.string.auth_login_desc)
        }
    }

    private fun setupActions() {
        binding.etPassword.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { submitLogin(); true } else false
        }

        binding.btnLogin.setOnClickListener { submitLogin() }

        binding.tvGoRegister.setOnClickListener {
            findNavController().navigate(R.id.action_loginFragment_to_registerFragment)
        }
    }

    private fun submitLogin() {
        val email    = binding.etEmail.text?.toString().orEmpty()
        val password = binding.etPassword.text?.toString().orEmpty()
        viewModel.login(email, password)
    }

    private fun observeState() {
        viewModel.state.observe(viewLifecycleOwner) { state ->
            val loading = state is AuthState.Loading
            binding.btnLogin.isEnabled = !loading
            binding.btnLogin.text = if (loading) getString(R.string.auth_signing_in) else getString(R.string.auth_sign_in)
            binding.tvError.isVisible = state is AuthState.Error
            if (state is AuthState.Error) binding.tvError.text = state.message

            if (state is AuthState.Success &&
                findNavController().currentDestination?.id == R.id.loginFragment) {
                viewModel.resetState()
                findNavController().navigate(
                    R.id.action_loginFragment_to_homeFragment,
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
