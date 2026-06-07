package com.vet4pet.app.ui.fragments

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
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
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
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
    private var cancellationSource = CancellationTokenSource()

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

        cancellationSource.cancel()
        cancellationSource = CancellationTokenSource()

        val fusedClient = LocationServices.getFusedLocationProviderClient(requireContext())
        try {
            fusedClient.getCurrentLocation(
                Priority.PRIORITY_BALANCED_POWER_ACCURACY,
                cancellationSource.token
            ).addOnSuccessListener { location ->
                if (_binding == null) return@addOnSuccessListener
                resetLocateButton()
                if (location != null) {
                    currentLat = location.latitude
                    currentLng = location.longitude
                    binding.tvLocationError.isVisible   = false
                    binding.layoutNoLocation.isVisible  = false
                    binding.layoutHasLocation.isVisible = true
                    binding.tvCoords.text = "%.4f, %.4f".format(location.latitude, location.longitude)
                    viewModel.loadVets(location.latitude, location.longitude, binding.switchOnCall.isChecked)
                } else {
                    showLocationError(getString(R.string.emergency_location_timeout))
                }
            }.addOnFailureListener {
                if (_binding == null) return@addOnFailureListener
                resetLocateButton()
                showLocationError(getString(R.string.emergency_location_unavailable))
            }
        } catch (e: SecurityException) {
            resetLocateButton()
            showLocationError(getString(R.string.emergency_location_denied))
        }
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
        cancellationSource.cancel()
        super.onDestroyView()
        _binding = null
    }
}
