package com.vet4pet.app.ui.fragments

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.vet4pet.app.R
import com.vet4pet.app.data.local.SessionManager
import com.vet4pet.app.data.models.api.UpdateProfileRequest
import com.vet4pet.app.data.models.api.UserProfileDto
import com.vet4pet.app.databinding.FragmentProfileBinding
import com.vet4pet.app.ui.viewmodels.NotificationsViewModel
import com.vet4pet.app.ui.viewmodels.ProfileViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ProfileViewModel by viewModels()
    private val notifViewModel: NotificationsViewModel by viewModels()

    private var pendingLat: Double? = null
    private var pendingLng: Double? = null

    private val requestLocation = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                      permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) fetchLocationForClinic()
        else showSnack(getString(R.string.emergency_location_denied))
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val session = SessionManager(requireContext())
        val user    = session.getUser() ?: return
        val isVet   = user.role == "vet"

        // Show vet-only fields
        binding.layoutClinic.isVisible   = isVet
        binding.layoutAddress.isVisible  = isVet
        binding.layoutPhone.isVisible    = isVet
        binding.switchOnCall.isVisible   = isVet
        binding.btnSetLocation.isVisible = isVet

        // Observe profile load
        viewModel.profile.observe(viewLifecycleOwner) { state ->
            binding.progressProfile.isVisible = state is UiState.Loading
            if (state is UiState.Success) populateForm(state.data)
            if (state is UiState.Error) showSnack(state.message)
        }

        // Observe save
        viewModel.saveState.observe(viewLifecycleOwner) { state ->
            binding.btnSave.isEnabled = state !is UiState.Loading
            binding.progressProfile.isVisible = state is UiState.Loading
            when (state) {
                is UiState.Success -> {
                    showSnack(getString(R.string.profile_saved))
                    viewModel.resetSaveState()
                }
                is UiState.Error -> {
                    showSnack(state.message)
                    viewModel.resetSaveState()
                }
                else -> {}
            }
        }

        // Notifications row
        notifViewModel.unreadCount.observe(viewLifecycleOwner) { count ->
            if (count > 0) {
                binding.tvUnreadCount.text      = resources.getQuantityString(R.plurals.notif_unread, count, count)
                binding.tvUnreadCount.visibility = android.view.View.VISIBLE
            } else {
                binding.tvUnreadCount.visibility = android.view.View.GONE
            }
        }
        binding.rowNotifications.setOnClickListener {
            findNavController().navigate(R.id.notificationsFragment)
        }
        notifViewModel.loadUnreadCount()

        // Set Location button
        binding.btnSetLocation.setOnClickListener { checkAndFetchLocation() }

        // Save button
        binding.btnSave.setOnClickListener { save(session, isVet) }

        // Logout
        binding.btnLogout.setOnClickListener {
            MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.action_logout)
                .setMessage(R.string.logout_confirm_message)
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.action_logout) { _, _ ->
                    session.clearSession()
                    findNavController().navigate(
                        R.id.loginFragment, null,
                        NavOptions.Builder().setPopUpTo(R.id.nav_graph, true).build()
                    )
                }
                .show()
        }

        viewModel.loadProfile()
    }

    private fun populateForm(profile: UserProfileDto) {
        // Header
        val initial = profile.name.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
        binding.tvAvatarInitial.text = initial
        binding.tvUserName.text      = profile.name
        binding.tvUserEmail.text     = profile.email
        binding.tvUserRole.text      = if (profile.role == "vet") "Veterinarian" else "Pet Owner"

        // Editable fields
        binding.etName.setText(profile.name)
        binding.etClinic.setText(profile.clinicName ?: "")
        binding.etAddress.setText(profile.address ?: "")
        binding.etPhone.setText(profile.phone ?: "")
        binding.switchOnCall.isChecked = profile.isOnCall == true

        // Show existing clinic location status
        if (profile.lat != null && profile.lng != null) {
            binding.tvLocationStatus.text      = getString(R.string.profile_location_set,
                "%.4f".format(profile.lat), "%.4f".format(profile.lng))
            binding.tvLocationStatus.isVisible = true
        }
    }

    private fun save(session: SessionManager, isVet: Boolean) {
        val name = binding.etName.text?.toString()?.trim() ?: ""
        if (name.isBlank()) {
            binding.layoutName.error = getString(R.string.profile_name_required)
            return
        }
        binding.layoutName.error = null

        val request = if (isVet) {
            UpdateProfileRequest(
                name      = name,
                clinicName = binding.etClinic.text?.toString()?.trim(),
                address    = binding.etAddress.text?.toString()?.trim(),
                phone      = binding.etPhone.text?.toString()?.trim(),
                lat        = pendingLat ?: (viewModel.profile.value as? UiState.Success)?.data?.lat,
                lng        = pendingLng ?: (viewModel.profile.value as? UiState.Success)?.data?.lng,
                isOnCall   = binding.switchOnCall.isChecked
            )
        } else {
            UpdateProfileRequest(name = name)
        }

        viewModel.saveProfile(request, session)
    }

    private fun checkAndFetchLocation() {
        val fine   = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION)
        val coarse = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_COARSE_LOCATION)
        if (fine == PackageManager.PERMISSION_GRANTED || coarse == PackageManager.PERMISSION_GRANTED) {
            fetchLocationForClinic()
        } else {
            requestLocation.launch(arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ))
        }
    }

    private fun fetchLocationForClinic() {
        binding.btnSetLocation.isEnabled = false
        binding.btnSetLocation.text      = getString(R.string.emergency_locating)

        val lm = requireContext().getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val listener = object : LocationListener {
            override fun onLocationChanged(loc: android.location.Location) {
                lm.removeUpdates(this)
                pendingLat = loc.latitude
                pendingLng = loc.longitude
                binding.btnSetLocation.isEnabled = true
                binding.btnSetLocation.text      = getString(R.string.profile_set_location)
                binding.tvLocationStatus.text      = getString(R.string.profile_location_set,
                    "%.4f".format(loc.latitude), "%.4f".format(loc.longitude))
                binding.tvLocationStatus.isVisible = true
                showSnack(getString(R.string.profile_location_captured))
            }
            @Deprecated("Deprecated in API 29")
            override fun onStatusChanged(p: String?, s: Int, e: Bundle?) {}
        }

        try {
            val provider = when {
                lm.isProviderEnabled(LocationManager.GPS_PROVIDER)     -> LocationManager.GPS_PROVIDER
                lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> null
            }
            if (provider == null) {
                resetLocationButton()
                showSnack(getString(R.string.emergency_location_unavailable))
                return
            }
            val last = lm.getLastKnownLocation(provider)
            if (last != null && System.currentTimeMillis() - last.time < 60_000) {
                lm.removeUpdates(listener)
                listener.onLocationChanged(last)
                return
            }
            lm.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
            binding.root.postDelayed({
                lm.removeUpdates(listener)
                if (pendingLat == null) {
                    resetLocationButton()
                    showSnack(getString(R.string.emergency_location_timeout))
                }
            }, 10_000)
        } catch (e: SecurityException) {
            resetLocationButton()
            showSnack(getString(R.string.emergency_location_denied))
        }
    }

    private fun resetLocationButton() {
        binding.btnSetLocation.isEnabled = true
        binding.btnSetLocation.text      = getString(R.string.profile_set_location)
    }

    private fun showSnack(msg: String) =
        Snackbar.make(binding.root, msg, Snackbar.LENGTH_SHORT).show()

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
