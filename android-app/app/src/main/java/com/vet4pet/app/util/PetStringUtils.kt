package com.vet4pet.app.util

import com.vet4pet.app.R

fun speciesStringRes(species: String?): Int = when (species?.lowercase()) {
    "dog"     -> R.string.species_dog
    "cat"     -> R.string.species_cat
    "bird"    -> R.string.species_bird
    "rabbit"  -> R.string.species_rabbit
    "hamster" -> R.string.species_hamster
    "fish"    -> R.string.species_fish
    "reptile" -> R.string.species_reptile
    "other"   -> R.string.species_other
    else      -> 0
}
