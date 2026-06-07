package com.vet4pet.app.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import coil.transform.CircleCropTransformation
import com.google.android.material.card.MaterialCardView
import com.google.android.material.imageview.ShapeableImageView
import com.vet4pet.app.R
import com.vet4pet.app.data.enums.Gender
import com.vet4pet.app.data.models.Pet
import com.vet4pet.app.util.speciesStringRes
import java.time.Instant
import java.time.LocalDate
import java.time.Period
import java.time.ZoneId

class PetAdapter(
    private val onItemClick: (Pet) -> Unit,
    private val onPhotoClick: ((Pet) -> Unit)? = null,
    private val onEditClick: ((Pet) -> Unit)? = null    // null = edit not available
) : ListAdapter<Pet, PetAdapter.ViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_pet, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {

        private val tvName:      TextView          = itemView.findViewById(R.id.tv_pet_name)
        private val tvBreed:     TextView          = itemView.findViewById(R.id.tv_pet_breed)
        private val tvGender:    TextView          = itemView.findViewById(R.id.tv_pet_gender)
        private val tvAge:       TextView          = itemView.findViewById(R.id.tv_pet_age)
        private val imgPhoto:    ShapeableImageView = itemView.findViewById(R.id.img_pet_photo)
        private val framePhoto:  View              = itemView.findViewById(R.id.frame_pet_photo)
        private val badgeCamera: MaterialCardView  = itemView.findViewById(R.id.badge_camera)

        // Save the tint from XML so we can restore it for the placeholder state
        private val defaultImageTint = imgPhoto.imageTintList
        private val defaultBgTint    = imgPhoto.backgroundTintList

        fun bind(pet: Pet) {
            tvName.text  = pet.name
            tvBreed.text = pet.breed?.takeIf { it.isNotBlank() }
                ?: speciesStringRes(pet.species).takeIf { it != 0 }
                    ?.let { itemView.context.getString(it) }
                ?: pet.species
            tvGender.text = itemView.context.getString(pet.gender.toLabelRes())
            tvAge.text = pet.dateOfBirth?.let { formatAge(it) }
                ?: itemView.context.getString(R.string.age_unknown)

            // Photo
            if (!pet.profileImageUrl.isNullOrBlank()) {
                imgPhoto.load(pet.profileImageUrl) {
                    transformations(CircleCropTransformation())
                    placeholder(R.drawable.ic_nav_pets)
                    error(R.drawable.ic_nav_pets)
                }
                imgPhoto.setPadding(0, 0, 0, 0)
                imgPhoto.imageTintList    = null
                imgPhoto.backgroundTintList = null
            } else {
                imgPhoto.setImageResource(R.drawable.ic_nav_pets)
                val dp16 = (16 * itemView.context.resources.displayMetrics.density).toInt()
                imgPhoto.setPadding(dp16, dp16, dp16, dp16)
                imgPhoto.imageTintList    = defaultImageTint
                imgPhoto.backgroundTintList = defaultBgTint
            }

            // Camera badge (only when onPhotoClick is wired)
            if (onPhotoClick != null) {
                badgeCamera.visibility = View.VISIBLE
                framePhoto.setOnClickListener { onPhotoClick.invoke(pet) }
            } else {
                badgeCamera.visibility = View.GONE
                framePhoto.setOnClickListener(null)
            }

            itemView.setOnClickListener { onItemClick(pet) }
            if (onEditClick != null) {
                itemView.setOnLongClickListener { onEditClick.invoke(pet); true }
            } else {
                itemView.setOnLongClickListener(null)
            }
        }

        private fun formatAge(epochMs: Long): String {
            val dob = Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()).toLocalDate()
            val period = Period.between(dob, LocalDate.now())
            return when {
                period.years > 0  -> itemView.context.resources.getQuantityString(R.plurals.age_years,  period.years,  period.years)
                period.months > 0 -> itemView.context.resources.getQuantityString(R.plurals.age_months, period.months, period.months)
                else              -> itemView.context.getString(R.string.age_less_than_one_month)
            }
        }
    }

    private companion object {
        val DiffCallback = object : DiffUtil.ItemCallback<Pet>() {
            override fun areItemsTheSame(old: Pet, new: Pet) = old.id == new.id
            override fun areContentsTheSame(old: Pet, new: Pet) = old == new
        }
    }
}

private fun Gender.toLabelRes(): Int = when (this) {
    Gender.MALE    -> R.string.gender_male
    Gender.FEMALE  -> R.string.gender_female
    Gender.UNKNOWN -> R.string.gender_unknown
}
