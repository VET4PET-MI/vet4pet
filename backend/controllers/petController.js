const Pet = require('../models/Pet');
const User = require('../models/User');
const { isValidIsraeliId } = require('../utils/israeliId');

async function getPets(req, res) {
  try {
    const { nationalId, name } = req.query;
    const filter = {};

    if (req.user.role === 'owner') {
      filter.ownerId = req.user.id;
    } else {
      // Vet: nationalId is mandatory — no browsing the full patient list (privacy)
      if (!nationalId) return res.json([]);
      const normalizedId = isValidIsraeliId(nationalId);
      const owner = normalizedId
        ? await User.findOne({ nationalId: normalizedId, role: 'owner' }).select('_id')
        : null;
      if (!owner) return res.json([]);
      filter.ownerId = owner._id.toString();
      if (name) filter.name = { $regex: name, $options: 'i' };
    }

    const pets = await Pet.find(filter).sort({ createdAt: -1 });
    res.json(pets);
  } catch (err) {
    console.error('[Pet] getPets error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function getPetById(req, res) {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (req.user.role === 'owner' && pet.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    res.json(pet);
  } catch (err) {
    console.error('[Pet] getPetById error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function addPet(req, res) {
  try {
    const data = { ...req.body };
    if (req.user.role === 'owner') data.ownerId = req.user.id;
    const pet = await Pet.create(data);
    console.log('[Pet] created:', pet._id, 'owner:', pet.ownerId);
    res.status(201).json(pet);
  } catch (err) {
    console.error('[Pet] addPet error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function updatePet(req, res) {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (req.user.role === 'owner' && pet.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    const updated = await Pet.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    console.error('[Pet] updatePet error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function uploadPetPhoto(req, res) {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (req.user.role === 'owner' && pet.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file received.' });
    pet.profileImageUrl = req.file.path;
    await pet.save();
    console.log('[Pet] photo uploaded:', pet._id, req.file.path);
    res.json(pet);
  } catch (err) {
    console.error('[Pet] uploadPetPhoto error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function deletePet(req, res) {
  try {
    const pet = await Pet.findByIdAndDelete(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    console.log('[Pet] deleted:', req.params.id);
    res.status(204).send();
  } catch (err) {
    console.error('[Pet] deletePet error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

async function updatePetImage(req, res) {
  try {
    const { profileImageUrl } = req.body;
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    if (req.user.role === 'owner' && pet.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    pet.profileImageUrl = profileImageUrl ?? null;
    await pet.save();
    console.log('[Pet] image updated:', pet._id);
    res.json(pet);
  } catch (err) {
    console.error('[Pet] updatePetImage error:', err.message);
    res.status(500).json({ message: err.message });
  }
}

module.exports = { getPets, getPetById, addPet, updatePet, deletePet, updatePetImage, uploadPetPhoto };
