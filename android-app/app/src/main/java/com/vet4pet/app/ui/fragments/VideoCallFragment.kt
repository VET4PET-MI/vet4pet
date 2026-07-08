package com.vet4pet.app.ui.fragments

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.vet4pet.app.R
import com.vet4pet.app.databinding.FragmentVideoCallBinding
import com.vet4pet.app.util.buildJitsiCallUrl

class VideoCallFragment : Fragment() {

    private var _binding: FragmentVideoCallBinding? = null
    private val binding get() = _binding!!

    private lateinit var callUrl: String

    private val requestPermissions =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
            if (grants.all { it.value }) {
                loadCall()
            } else {
                Toast.makeText(requireContext(), R.string.video_call_permissions_denied, Toast.LENGTH_LONG).show()
                findNavController().navigateUp()
            }
        }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentVideoCallBinding.inflate(inflater, container, false)
        return binding.root
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        callUrl = arguments?.getString("callUrl")?.let { buildJitsiCallUrl(it) } ?: run {
            findNavController().navigateUp()
            return
        }

        binding.btnEndCall.setOnClickListener { findNavController().navigateUp() }

        binding.webView.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            // meet.jit.si serves a "download the app" deep-link interstitial to mobile
            // user-agents, so the call never joins inside a WebView. Presenting a desktop
            // user-agent makes Jitsi serve the full web client, which joins directly.
            settings.userAgentString = DESKTOP_USER_AGENT

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    request.grant(request.resources)
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    // Keep http(s) navigation inside the WebView. Swallow any residual
                    // deep-link scheme (intent://, org.jitsi.meet://) so it can't crash the
                    // WebView with ERR_UNKNOWN_URL_SCHEME.
                    val scheme = request.url.scheme?.lowercase()
                    return scheme != null && scheme != "http" && scheme != "https"
                }

                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    if (_binding != null) binding.progressBar.visibility = View.GONE
                }
            }
        }

        val needed = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(requireContext(), it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) loadCall() else requestPermissions.launch(missing.toTypedArray())
    }

    private fun loadCall() {
        binding.webView.loadUrl(callUrl)
    }

    override fun onDestroyView() {
        binding.webView.destroy()
        super.onDestroyView()
        _binding = null
    }

    companion object {
        // A desktop Chrome UA stops meet.jit.si from routing to the mobile "open in app" flow.
        private const val DESKTOP_USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
}
