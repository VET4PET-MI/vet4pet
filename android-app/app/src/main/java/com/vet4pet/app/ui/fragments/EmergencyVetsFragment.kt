package com.vet4pet.app.ui.fragments

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.net.Uri
import android.os.Bundle
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.os.bundleOf
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.vet4pet.app.R
import com.vet4pet.app.databinding.FragmentEmergencyVetsBinding
import com.vet4pet.app.ui.adapters.EmergencyVetAdapter
import com.vet4pet.app.ui.viewmodels.EmergencyVetsViewModel
import com.vet4pet.app.ui.viewmodels.UiState

class EmergencyVetsFragment : Fragment() {

    private var _binding: FragmentEmergencyVetsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: EmergencyVetsViewModel by viewModels()

    private var currentLat: Double? = null
    private var currentLng: Double? = null

    private val requestPermission = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                      permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) fetchLocation()
        else showLocationError(getString(R.string.emergency_location_denied))
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentEmergencyVetsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnBack.setOnClickListener { requireActivity().onBackPressedDispatcher.onBackPressed() }

        val adapter = EmergencyVetAdapter(
            onCall    = { phone -> startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) },
            onMessage = { vet ->
                findNavController().navigate(
                    R.id.chatFragment,
                    bundleOf("partnerId" to vet.id, "partnerName" to vet.displayName)
                )
            }
        )
        binding.rvVets.adapter = adapter

        binding.btnLocate.setOnClickListener          { checkAndRequestLocation() }
        binding.btnRefreshLocation.setOnClickListener { checkAndRequestLocation() }

        binding.switchOnCall.setOnCheckedChangeListener { _, checked ->
            viewModel.loadVets(currentLat, currentLng, checked)
        }

        viewModel.vets.observe(viewLifecycleOwner) { state ->
            binding.progressEmergency.isVisible = state is UiState.Loading
            when (state) {
                is UiState.Success -> {
                    val list = state.data
                    binding.layoutEmpty.isVisible = list.isEmpty()
                    binding.rvVets.isVisible      = list.isNotEmpty()
                    adapter.submitList(list)
                }
                is UiState.Error -> {
                    binding.layoutEmpty.isVisible = true
                    binding.rvVets.isVisible      = false
                }
                else -> {}
            }
        }

        // Load immediately without location (shows all vets with coordinates)
        viewModel.loadVets()
    }

    private fun checkAndRequestLocation() {
        val fineGranted   = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION)   == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        when {
            fineGranted || coarseGranted -> fetchLocation()
            else -> requestPermission.launch(arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ))
        }
    }

    private fun fetchLocation() {
        binding.btnLocate.isEnabled = false
        binding.btnLocate.text      = getString(R.string.emergency_locating)
        binding.tvLocationError.isVisible = false

        val lm = requireContext().getSystemService(Context.LOCATION_SERVICE) as LocationManager

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                lm.removeUpdates(this)
                currentLat = location.latitude
                currentLng = location.longitude
                onLocationObtained(location)
            }
            @Deprecated("Deprecated in API 29")
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        }

        try {
            // Try GPS first, fall back to network
            val provider = when {
                lm.isProviderEnabled(LocationManager.GPS_PROVIDER)     -> LocationManager.GPS_PROVIDER
                lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> null
            }
            if (provider == null) {
                resetLocateButton()
                showLocationError(getString(R.string.emergency_location_unavailable))
                return
            }

            // Use last known location if recent enough (< 60 seconds)
            val last = lm.getLastKnownLocation(provider)
            if (last != null && System.currentTimeMillis() - last.time < 60_000) {
                lm.removeUpdates(listener)
                currentLat = last.latitude
                currentLng = last.longitude
                onLocationObtained(last)
                return
            }

            lm.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())

            // Timeout after 10s
            binding.root.postDelayed({
                lm.removeUpdates(listener)
                if (currentLat == null) {
                    resetLocateButton()
                    showLocationError(getString(R.string.emergency_location_timeout))
                }
            }, 10_000)

        } catch (e: SecurityException) {
            resetLocateButton()
            showLocationError(getString(R.string.emergency_location_denied))
        }
    }

    private fun onLocationObtained(location: Location) {
        resetLocateButton()
        binding.tvLocationError.isVisible   = false
        binding.layoutNoLocation.isVisible  = false
        binding.layoutHasLocation.isVisible = true
        binding.tvCoords.text = "%.4f, %.4f".format(location.latitude, location.longitude)
        viewModel.loadVets(location.latitude, location.longitude, binding.switchOnCall.isChecked)
    }

    private fun resetLocateButton() {
        binding.btnLocate.isEnabled = true
        binding.btnLocate.text      = getString(R.string.emergency_find_location)
    }

    private fun showLocationError(msg: String) {
        binding.tvLocationError.text      = msg
        binding.tvLocationError.isVisible = true
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
