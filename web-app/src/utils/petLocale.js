// Translates user-generated pet data (species, breed, gender) from the DB
// into the current UI language. Falls back to the original value when unknown.

const SPECIES_KEYS = {
  dog: 'dog', cat: 'cat', bird: 'bird', rabbit: 'rabbit', other: 'other',
}

const GENDER_KEYS = {
  male: 'male', female: 'female',
  m: 'male', f: 'female',
}

const BREED_KEYS = {
  // Dogs
  'labrador':                  'labrador',
  'labrador retriever':        'labrador',
  'golden retriever':          'golden',
  'german shepherd':           'germanShepherd',
  'beagle':                    'beagle',
  'bulldog':                   'bulldog',
  'french bulldog':            'frenchBulldog',
  'poodle':                    'poodle',
  'rottweiler':                'rottweiler',
  'yorkshire terrier':         'yorkshire',
  'dachshund':                 'dachshund',
  'siberian husky':            'husky',
  'husky':                     'husky',
  'chihuahua':                 'chihuahua',
  'border collie':             'borderCollie',
  'shih tzu':                  'shihTzu',
  'pomeranian':                'pomeranian',
  'doberman':                  'doberman',
  'maltese':                   'maltese',
  // Cats
  'persian':                   'persian',
  'persian cat':               'persian',
  'british shorthair':         'britishShorthair',
  'siamese':                   'siamese',
  'maine coon':                'maineCoon',
  'ragdoll':                   'ragdoll',
  'bengal':                    'bengal',
  'sphynx':                    'sphynx',
  'scottish fold':             'scottishFold',
  'mixed':                     'mixed',
  'mix':                       'mixed',
}

export function localizeSpecies(value, t) {
  if (!value) return ''
  const key = SPECIES_KEYS[String(value).toLowerCase().trim()]
  return key ? t(`pet.species.${key}`) : value
}

export function localizeGender(value, t) {
  if (!value) return ''
  const key = GENDER_KEYS[String(value).toLowerCase().trim()]
  return key ? t(`pet.gender.${key}`) : value
}

export function localizeBreed(value, t) {
  if (!value) return ''
  const key = BREED_KEYS[String(value).toLowerCase().trim()]
  return key ? t(`pet.breeds.${key}`) : value
}
