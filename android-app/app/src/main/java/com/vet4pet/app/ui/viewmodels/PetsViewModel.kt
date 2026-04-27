package com.vet4pet.app.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.vet4pet.app.data.enums.EventType
import com.vet4pet.app.data.enums.Gender
import com.vet4pet.app.data.models.MedicalRecord
import com.vet4pet.app.data.models.Pet

class PetsViewModel : ViewModel() {

    val pets: LiveData<List<Pet>> = MutableLiveData(MOCK_PETS)
    val medicalRecords: LiveData<List<MedicalRecord>> = MutableLiveData(MOCK_RECORDS)

    fun recordsForPet(petId: String): List<MedicalRecord> =
        MOCK_RECORDS.filter { it.petId == petId }

    companion object {

        private val MOCK_PETS = listOf(
            Pet(
                id = "pet_1", ownerId = "user_1",
                name = "Buddy", species = "Dog",
                breed = "Labrador Retriever",
                dateOfBirth = 1_580_000_000_000L,
                gender = Gender.MALE,
                weight = 28.5,
                profileImageUrl = null,
                createdAt = 1_580_000_000_000L
            ),
            Pet(
                id = "pet_2", ownerId = "user_1",
                name = "Luna", species = "Cat",
                breed = "British Shorthair",
                dateOfBirth = 1_640_000_000_000L,
                gender = Gender.FEMALE,
                weight = 4.2,
                profileImageUrl = null,
                createdAt = 1_640_000_000_000L
            )
        )

        private val MOCK_RECORDS = listOf(
            MedicalRecord(
                id = "rec_1", petId = "pet_1",
                vetId = "vet_1", vetName = "Dr. Hagai Cohen",
                date = 1_746_403_200_000L,       // 2025-05-05
                type = EventType.VISIT_SUMMARY,
                findings = "Routine annual checkup. Dog is in excellent health. Weight stable at 28.5 kg.",
                diagnosis = null, prescription = null,
                fileUrl = null, attachments = emptyList(),
                createdAt = 1_746_403_200_000L
            ),
            MedicalRecord(
                id = "rec_2", petId = "pet_1",
                vetId = "vet_1", vetName = "Dr. Hagai Cohen",
                date = 1_736_899_200_000L,       // 2025-01-15
                type = EventType.BLOOD_TEST,
                findings = "Complete blood count normal. All values within healthy range.",
                diagnosis = null, prescription = null,
                fileUrl = "records/buddy_cbc_jan2025.pdf",
                attachments = emptyList(),
                createdAt = 1_736_899_200_000L
            ),
            MedicalRecord(
                id = "rec_3", petId = "pet_1",
                vetId = "vet_2", vetName = "Dr. Sara Levi",
                date = 1_733_184_000_000L,       // 2024-12-03
                type = EventType.XRAY,
                findings = "Hip X-ray shows no signs of dysplasia. Joints appear healthy for age.",
                diagnosis = null, prescription = null,
                fileUrl = "records/buddy_hip_xray_dec2024.jpg",
                attachments = emptyList(),
                createdAt = 1_733_184_000_000L
            ),
            MedicalRecord(
                id = "rec_4", petId = "pet_1",
                vetId = "vet_1", vetName = "Dr. Hagai Cohen",
                date = 1_726_704_000_000L,       // 2024-09-19
                type = EventType.VACCINATION,
                findings = "Annual booster vaccinations administered: DHPP, Rabies. No adverse reactions.",
                diagnosis = null, prescription = null,
                fileUrl = null, attachments = emptyList(),
                createdAt = 1_726_704_000_000L
            ),
            MedicalRecord(
                id = "rec_5", petId = "pet_2",
                vetId = "vet_1", vetName = "Dr. Hagai Cohen",
                date = 1_743_811_200_000L,       // 2025-04-05
                type = EventType.VISIT_SUMMARY,
                findings = "Luna presented for a general wellness exam. Coat and teeth in good condition.",
                diagnosis = null, prescription = null,
                fileUrl = null, attachments = emptyList(),
                createdAt = 1_743_811_200_000L
            ),
            MedicalRecord(
                id = "rec_6", petId = "pet_2",
                vetId = "vet_2", vetName = "Dr. Sara Levi",
                date = 1_738_022_400_000L,       // 2025-01-28
                type = EventType.LAB_RESULT,
                findings = "Urinalysis and thyroid panel results within normal limits.",
                diagnosis = null, prescription = null,
                fileUrl = "records/luna_lab_jan2025.pdf",
                attachments = emptyList(),
                createdAt = 1_738_022_400_000L
            )
        )
    }
}
