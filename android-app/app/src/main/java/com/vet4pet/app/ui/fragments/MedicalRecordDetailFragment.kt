package com.vet4pet.app.ui.fragments

import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.BundleCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import coil.load
import coil.transform.RoundedCornersTransformation
import com.google.android.material.color.MaterialColors
import com.vet4pet.app.R
import com.vet4pet.app.data.enums.EventType
import com.vet4pet.app.data.models.MedicalRecord
import com.vet4pet.app.databinding.FragmentMedicalRecordDetailBinding
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class MedicalRecordDetailFragment : Fragment() {

    private var _binding: FragmentMedicalRecordDetailBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentMedicalRecordDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val record = BundleCompat.getParcelable(requireArguments(), "record", MedicalRecord::class.java)!!

        binding.btnBack.setOnClickListener { findNavController().popBackStack() }

        bindType(record.type)
        bindDate(record.date)
        binding.tvDetailVet.text      = record.vetName
        binding.tvDetailFindings.text = record.findings
        bindAttachment(record.fileUrl)
    }

    private fun bindType(type: EventType) {
        val info = type.toDetailInfo()
        binding.tvDetailTitle.setText(info.labelRes)
        binding.tvDetailType.setText(info.labelRes)
        binding.imgDetailType.setImageResource(info.iconRes)
        binding.imgDetailType.backgroundTintList = ColorStateList.valueOf(
            MaterialColors.getColor(requireContext(), info.containerAttr, Color.TRANSPARENT)
        )
        binding.imgDetailType.imageTintList = ColorStateList.valueOf(
            MaterialColors.getColor(requireContext(), info.onContainerAttr, Color.TRANSPARENT)
        )
    }

    private fun bindDate(epochMs: Long) {
        val date = Instant.ofEpochMilli(epochMs)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
        binding.tvDetailDate.text =
            date.format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.getDefault()))
    }

    private fun bindAttachment(fileUrl: String?) {
        if (fileUrl == null) {
            binding.tvAttachmentHeader.isVisible = false
            binding.cardAttachment.isVisible     = false
            return
        }

        binding.tvAttachmentHeader.isVisible = true
        binding.cardAttachment.isVisible     = true

        val isPdf = fileUrl.contains(".pdf", ignoreCase = true) ||
                    fileUrl.contains("raw/upload", ignoreCase = true)

        if (isPdf) {
            // PDF — show a button to open externally
            binding.imgAttachment.isVisible    = false
            binding.progressAttachment.isVisible = false
            binding.layoutOpenPdf.isVisible    = true
            binding.btnOpenPdf.setOnClickListener { openExternally(fileUrl) }
        } else {
            // Image — load with Coil
            binding.layoutOpenPdf.isVisible      = false
            binding.progressAttachment.isVisible = true
            binding.imgAttachment.isVisible      = true

            binding.imgAttachment.load(fileUrl) {
                crossfade(true)
                placeholder(R.drawable.ic_quick_records)
                error(R.drawable.ic_quick_records)
                transformations(RoundedCornersTransformation(16f))
                listener(
                    onSuccess = { _, _ -> binding.progressAttachment.isVisible = false },
                    onError   = { _, _ -> binding.progressAttachment.isVisible = false }
                )
            }

            binding.imgAttachment.setOnClickListener { openExternally(fileUrl) }
        }
    }

    private fun openExternally(url: String) {
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

private data class DetailTypeInfo(
    val iconRes: Int,
    val labelRes: Int,
    val containerAttr: Int,
    val onContainerAttr: Int
)

private fun EventType.toDetailInfo(): DetailTypeInfo = when (this) {
    EventType.VISIT_SUMMARY -> DetailTypeInfo(
        R.drawable.ic_medical_cross, R.string.record_type_visit,
        com.google.android.material.R.attr.colorPrimaryContainer,
        com.google.android.material.R.attr.colorOnPrimaryContainer
    )
    EventType.VACCINATION -> DetailTypeInfo(
        R.drawable.ic_nav_appointments, R.string.record_type_vaccination,
        com.google.android.material.R.attr.colorTertiaryContainer,
        com.google.android.material.R.attr.colorOnTertiaryContainer
    )
    EventType.LAB_RESULT -> DetailTypeInfo(
        R.drawable.ic_quick_records, R.string.record_type_lab,
        com.google.android.material.R.attr.colorSecondaryContainer,
        com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.XRAY -> DetailTypeInfo(
        R.drawable.ic_quick_records, R.string.record_type_xray,
        com.google.android.material.R.attr.colorSecondaryContainer,
        com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.BLOOD_TEST -> DetailTypeInfo(
        R.drawable.ic_quick_records, R.string.record_type_blood_test,
        com.google.android.material.R.attr.colorErrorContainer,
        com.google.android.material.R.attr.colorOnErrorContainer
    )
    EventType.CONSULTATION -> DetailTypeInfo(
        R.drawable.ic_quick_consult, R.string.record_type_consultation,
        com.google.android.material.R.attr.colorTertiaryContainer,
        com.google.android.material.R.attr.colorOnTertiaryContainer
    )
    EventType.PRESCRIPTION -> DetailTypeInfo(
        R.drawable.ic_medical_cross, R.string.record_type_prescription,
        com.google.android.material.R.attr.colorSecondaryContainer,
        com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.OTHER -> DetailTypeInfo(
        R.drawable.ic_medical_cross, R.string.record_type_other,
        com.google.android.material.R.attr.colorSurfaceVariant,
        com.google.android.material.R.attr.colorOnSurfaceVariant
    )
}
