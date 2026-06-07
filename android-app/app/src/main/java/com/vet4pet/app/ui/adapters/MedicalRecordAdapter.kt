package com.vet4pet.app.ui.adapters

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.AttrRes
import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.color.MaterialColors
import com.google.android.material.imageview.ShapeableImageView
import com.vet4pet.app.R
import com.vet4pet.app.data.enums.EventType
import com.vet4pet.app.data.models.MedicalRecord
import java.time.Instant
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

class MedicalRecordAdapter(
    private val onItemClick: (MedicalRecord) -> Unit
) : ListAdapter<MedicalRecord, MedicalRecordAdapter.ViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_medical_record, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) =
        holder.bind(getItem(position))

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {

        private val tvDay: TextView = itemView.findViewById(R.id.tv_record_day)
        private val tvMonth: TextView = itemView.findViewById(R.id.tv_record_month)
        private val imgType: ShapeableImageView = itemView.findViewById(R.id.img_record_type)
        private val tvType: TextView = itemView.findViewById(R.id.tv_record_type)
        private val tvVet: TextView = itemView.findViewById(R.id.tv_record_vet)
        private val tvFindings: TextView = itemView.findViewById(R.id.tv_record_findings)
        private val layoutAttachment: LinearLayout = itemView.findViewById(R.id.layout_attachment)
        private val tvAttachmentLabel: TextView = itemView.findViewById(R.id.tv_attachment_label)

        fun bind(record: MedicalRecord) {
            bindDate(record.date)
            bindType(record.type)
            tvVet.text = record.vetName
            tvFindings.text = record.findings
            bindAttachment(record.fileUrl)
            itemView.setOnClickListener { onItemClick(record) }
        }

        private fun bindDate(epochMs: Long) {
            val date = Instant.ofEpochMilli(epochMs)
                .atZone(ZoneId.systemDefault())
                .toLocalDate()
            tvDay.text = date.dayOfMonth.toString()
            tvMonth.text = date.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
        }

        private fun bindType(type: EventType) {
            val info = type.toDisplayInfo()
            imgType.setImageResource(info.iconRes)
            imgType.backgroundTintList = ColorStateList.valueOf(
                MaterialColors.getColor(itemView.context, info.containerAttr, Color.TRANSPARENT)
            )
            imgType.imageTintList = ColorStateList.valueOf(
                MaterialColors.getColor(itemView.context, info.onContainerAttr, Color.TRANSPARENT)
            )
            tvType.setText(info.labelRes)
        }

        private fun bindAttachment(fileUrl: String?) {
            if (fileUrl != null) {
                layoutAttachment.visibility = View.VISIBLE
                tvAttachmentLabel.text = itemView.context.getString(R.string.label_one_attachment)
            } else {
                layoutAttachment.visibility = View.GONE
            }
        }
    }

    private companion object {
        val DiffCallback = object : DiffUtil.ItemCallback<MedicalRecord>() {
            override fun areItemsTheSame(old: MedicalRecord, new: MedicalRecord) =
                old.id == new.id
            override fun areContentsTheSame(old: MedicalRecord, new: MedicalRecord) =
                old == new
        }
    }
}

private data class TypeDisplayInfo(
    @DrawableRes val iconRes: Int,
    @StringRes val labelRes: Int,
    @AttrRes val containerAttr: Int,
    @AttrRes val onContainerAttr: Int
)

private fun EventType.toDisplayInfo(): TypeDisplayInfo = when (this) {
    EventType.VISIT_SUMMARY -> TypeDisplayInfo(
        iconRes = R.drawable.ic_medical_cross,
        labelRes = R.string.record_type_visit,
        containerAttr = com.google.android.material.R.attr.colorPrimaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnPrimaryContainer
    )
    EventType.VACCINATION -> TypeDisplayInfo(
        iconRes = R.drawable.ic_nav_appointments,
        labelRes = R.string.record_type_vaccination,
        containerAttr = com.google.android.material.R.attr.colorTertiaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnTertiaryContainer
    )
    EventType.LAB_RESULT -> TypeDisplayInfo(
        iconRes = R.drawable.ic_quick_records,
        labelRes = R.string.record_type_lab,
        containerAttr = com.google.android.material.R.attr.colorSecondaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.XRAY -> TypeDisplayInfo(
        iconRes = R.drawable.ic_quick_records,
        labelRes = R.string.record_type_xray,
        containerAttr = com.google.android.material.R.attr.colorSecondaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.BLOOD_TEST -> TypeDisplayInfo(
        iconRes = R.drawable.ic_quick_records,
        labelRes = R.string.record_type_blood_test,
        containerAttr = com.google.android.material.R.attr.colorErrorContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnErrorContainer
    )
    EventType.CONSULTATION -> TypeDisplayInfo(
        iconRes = R.drawable.ic_quick_consult,
        labelRes = R.string.record_type_consultation,
        containerAttr = com.google.android.material.R.attr.colorTertiaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnTertiaryContainer
    )
    EventType.PRESCRIPTION -> TypeDisplayInfo(
        iconRes = R.drawable.ic_medical_cross,
        labelRes = R.string.record_type_prescription,
        containerAttr = com.google.android.material.R.attr.colorSecondaryContainer,
        onContainerAttr = com.google.android.material.R.attr.colorOnSecondaryContainer
    )
    EventType.OTHER -> TypeDisplayInfo(
        iconRes = R.drawable.ic_medical_cross,
        labelRes = R.string.record_type_other,
        containerAttr = com.google.android.material.R.attr.colorSurfaceVariant,
        onContainerAttr = com.google.android.material.R.attr.colorOnSurfaceVariant
    )
}
