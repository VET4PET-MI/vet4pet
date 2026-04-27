package com.vet4pet.app.ui.fragments

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.core.os.BundleCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.card.MaterialCardView
import com.google.android.material.color.MaterialColors
import com.google.android.material.imageview.ShapeableImageView
import com.vet4pet.app.R
import com.vet4pet.app.data.enums.EventType
import com.vet4pet.app.data.models.MedicalRecord
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class MedicalRecordDetailFragment : Fragment(R.layout.fragment_medical_record_detail) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val record = BundleCompat.getParcelable(requireArguments(), "record", MedicalRecord::class.java)!!

        view.findViewById<View>(R.id.btn_back).setOnClickListener {
            findNavController().popBackStack()
        }

        bindType(view, record.type)
        bindDate(view, record.date)
        view.findViewById<TextView>(R.id.tv_detail_vet).text = record.vetName
        view.findViewById<TextView>(R.id.tv_detail_findings).text = record.findings
        bindAttachment(view, record.fileUrl)
    }

    private fun bindType(view: View, type: EventType) {
        val (iconRes, labelRes, containerAttr, onContainerAttr) = type.toDetailInfo()

        view.findViewById<TextView>(R.id.tv_detail_title).setText(labelRes)
        view.findViewById<TextView>(R.id.tv_detail_type).setText(labelRes)

        val img = view.findViewById<ShapeableImageView>(R.id.img_detail_type)
        img.setImageResource(iconRes)
        img.backgroundTintList = ColorStateList.valueOf(
            MaterialColors.getColor(requireContext(), containerAttr, Color.TRANSPARENT)
        )
        img.imageTintList = ColorStateList.valueOf(
            MaterialColors.getColor(requireContext(), onContainerAttr, Color.TRANSPARENT)
        )
    }

    private fun bindDate(view: View, epochMs: Long) {
        val date = Instant.ofEpochMilli(epochMs)
            .atZone(ZoneId.systemDefault())
            .toLocalDate()
        val formatter = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.getDefault())
        view.findViewById<TextView>(R.id.tv_detail_date).text = date.format(formatter)
    }

    private fun bindAttachment(view: View, fileUrl: String?) {
        val header = view.findViewById<View>(R.id.tv_attachment_header)
        val card = view.findViewById<MaterialCardView>(R.id.card_image_placeholder)
        if (fileUrl != null) {
            header.visibility = View.VISIBLE
            card.visibility = View.VISIBLE
        }
    }
}

private data class DetailTypeInfo(
    val iconRes: Int,
    val labelRes: Int,
    val containerAttr: Int,
    val onContainerAttr: Int
)

private fun EventType.toDetailInfo(): DetailTypeInfo = when (this) {
    EventType.VISIT_SUMMARY -> DetailTypeInfo(
        iconRes = R.drawable.ic_medical_cross,
        labelRes = R.string.record_type_visit,
        containerAttr = com.google.android.material.R.attr.colorPrimaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnPrimaryContainer
    )
    EventType.VACCINATION -> DetailTypeInfo(
        iconRes = R.drawable.ic_nav_appointments,
        labelRes = R.string.record_type_vaccination,
        containerAttr = com.google.android.material.R.attr.colorTertiaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnTertiaryContainer
    )
    EventType.LAB_RESULT -> DetailTypeInfo(
        iconRes = R.drawable.ic_quick_records,
        labelRes = R.string.record_type_lab,
        containerAttr = com.google.android.material.R.attr.colorSecondaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.XRAY -> DetailTypeInfo(
        iconRes = R.drawable.ic_quick_records,
        labelRes = R.string.record_type_xray,
        containerAttr = com.google.android.material.R.attr.colorSecondaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.BLOOD_TEST -> DetailTypeInfo(
        iconRes = R.drawable.ic_quick_records,
        labelRes = R.string.record_type_blood_test,
        containerAttr = com.google.android.material.R.attr.colorErrorContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnErrorContainer
    )
    EventType.OTHER -> DetailTypeInfo(
        iconRes = R.drawable.ic_medical_cross,
        labelRes = R.string.record_type_other,
        containerAttr = com.google.android.material.R.attr.colorSurfaceVariant,
        onContainerAttr = com.google.android.material.R.attr.colorOnSurfaceVariant
    )
}
