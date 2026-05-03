const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const bcrypt   = require('bcryptjs');

dotenv.config();

const Pet           = require('./models/Pet');
const MedicalRecord = require('./models/MedicalRecord');
const User          = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Vet user (upsert so re-runs are safe) ─────────────────────────────
  await User.findOneAndUpdate(
    { email: 'vet@clinic.com' },
    {
      name:     'Dr. Maayan',
      email:    'vet@clinic.com',
      password: await bcrypt.hash('vet123', 12),
      role:     'vet',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Vet user seeded → vet@clinic.com / vet123');

  // ── Owner user ────────────────────────────────────────────────────────────
  const ownerUser = await User.findOneAndUpdate(
    { email: 'owner@test.com' },
    {
      name:     'Sarah Johnson',
      email:    'owner@test.com',
      password: await bcrypt.hash('owner123', 12),
      role:     'owner',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Owner user seeded → owner@test.com / owner123');

  await Pet.deleteMany({});
  await MedicalRecord.deleteMany({});
  console.log('Cleared existing pets and records');

  // ── Pets (assign to seeded owner's real MongoDB ID) ──────────────────
  const [buddy, luna, milo] = await Pet.insertMany([
    { name: 'Buddy', species: 'Dog', breed: 'Labrador Retriever', age: 4, gender: 'Male',   ownerId: ownerUser._id.toString() },
    { name: 'Luna',  species: 'Cat', breed: 'British Shorthair',  age: 3, gender: 'Female', ownerId: ownerUser._id.toString() },
    { name: 'Milo',  species: 'Dog', breed: 'Beagle',             age: 2, gender: 'Male',   ownerId: ownerUser._id.toString() },
  ]);
  console.log(`Inserted pets: ${buddy.name}, ${luna.name}, ${milo.name}`);

  // ── Medical records ───────────────────────────────────────────────────
  await MedicalRecord.insertMany([
    {
      petId:    buddy._id,
      date:     new Date('2025-05-05'),
      vetName:  'Dr. Hagai Cohen',
      type:     'VISIT_SUMMARY',
      findings: 'Routine annual checkup. Dog is in excellent health. Weight stable at 28.5 kg.',
      fileUrl:  null,
    },
    {
      petId:    buddy._id,
      date:     new Date('2025-01-15'),
      vetName:  'Dr. Hagai Cohen',
      type:     'BLOOD_TEST',
      findings: 'Complete blood count normal. All values within healthy range.',
      fileUrl:  'records/buddy_cbc_jan2025.pdf',
    },
    {
      petId:    luna._id,
      date:     new Date('2025-04-05'),
      vetName:  'Dr. Sara Levi',
      type:     'VISIT_SUMMARY',
      findings: 'Luna presented for a general wellness exam. Coat and teeth in good condition.',
      fileUrl:  null,
    },
  ]);
  console.log('Inserted 3 medical records');

  await mongoose.disconnect();
  console.log('Seed complete — disconnected');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
