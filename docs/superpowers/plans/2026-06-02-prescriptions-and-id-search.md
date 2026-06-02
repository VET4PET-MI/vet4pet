# Prescriptions/Documents + National-ID Owner Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a national-ID (ת"ז) identity for owners so a vet can search a pet by owner ת"ז + name, let existing owners add their ת"ז via Settings, and add a "Prescriptions/Documents" tab to the pet profile.

**Architecture:** Reuse the existing `MedicalRecord` system (a new `PRESCRIPTION` type + a server-side `types` filter feeds two tabs in `PetProfile`). For identity, add a `nationalId` field on `User` (sparse-unique), validated by a pure Israeli-ID checksum helper; the vet search resolves a ת"ז to the owner's `_id` and filters pets by it. Owners set/update their ת"ז through the existing (now owner-accessible) Settings page.

**Tech Stack:** Node/Express + Mongoose (backend), React + Vite + react-i18next + Tailwind (web-app). Scope: `backend/` + `web-app/` only — do not touch `android-app/`.

**Testing approach:** The repo currently has **no test harness** (`backend` test script is a stub; web-app has no test runner). Introducing full integration/UI test infrastructure is out of scope for this feature. We therefore add **automated unit tests only for the pure Israeli-ID checksum helper** using Node's built-in `node:test` (zero new dependencies). All wired endpoints are verified with explicit `curl` commands, and UI changes are verified by running the app and following the documented manual steps. This is a conscious tradeoff, stated so the coverage boundary is explicit rather than silent.

---

## File Structure

**Backend — create:**
- `backend/utils/israeliId.js` — pure `isValidIsraeliId(input)` → normalized 9-digit string or `null`.
- `backend/test/israeliId.test.js` — `node:test` unit tests for the helper.

**Backend — modify:**
- `backend/package.json` — add a real `test` script.
- `backend/models/User.js` — `nationalId` field + sparse-unique index.
- `backend/models/MedicalRecord.js` — add `PRESCRIPTION` to the type enum.
- `backend/controllers/authController.js` — `register` validates/stores `nationalId` for owners.
- `backend/controllers/petController.js` — `getPets` resolves `nationalId` → owner `_id`.
- `backend/controllers/userController.js` — `updateMe` validates/stores `nationalId`.
- `backend/controllers/medicalRecordController.js` — `getRecordsByPet` optional `types` filter.

**Web-app — modify:**
- `web-app/src/i18n/he.json` and `web-app/src/i18n/en.json` — new keys.
- `web-app/src/pages/Register.jsx` — owner ת"ז field.
- `web-app/src/pages/Dashboard.jsx` — send `nationalId` instead of `ownerId`.
- `web-app/src/App.jsx` — `/settings` becomes any-authenticated.
- `web-app/src/components/AppLayout.jsx` — owner Settings nav item.
- `web-app/src/pages/Settings.jsx` — `OwnerIdSection`.
- `web-app/src/pages/PetProfile.jsx` — tabs + `PRESCRIPTION` type.

---

## Task 1: Israeli-ID validation helper (TDD)

**Files:**
- Create: `backend/utils/israeliId.js`
- Test: `backend/test/israeliId.test.js`
- Modify: `backend/package.json:10`

- [ ] **Step 1: Write the failing test**

Create `backend/test/israeliId.test.js`:

```js
const { test } = require('node:test');
const assert   = require('node:assert');
const { isValidIsraeliId } = require('../utils/israeliId');

test('accepts a valid 9-digit ID and returns it normalized', () => {
  assert.strictEqual(isValidIsraeliId('123456782'), '123456782');
});

test('left-pads short IDs to 9 digits before validating', () => {
  // "18" -> "000000018" is a valid checksum
  assert.strictEqual(isValidIsraeliId('18'), '000000018');
});

test('rejects an ID with a bad check digit', () => {
  assert.strictEqual(isValidIsraeliId('123456789'), null);
});

test('rejects non-numeric input', () => {
  assert.strictEqual(isValidIsraeliId('12a456782'), null);
});

test('rejects empty / nullish input', () => {
  assert.strictEqual(isValidIsraeliId(''), null);
  assert.strictEqual(isValidIsraeliId(null), null);
  assert.strictEqual(isValidIsraeliId(undefined), null);
});

test('rejects input longer than 9 digits', () => {
  assert.strictEqual(isValidIsraeliId('1234567820'), null);
});

test('trims surrounding whitespace', () => {
  assert.strictEqual(isValidIsraeliId('  123456782  '), '123456782');
});
```

- [ ] **Step 2: Add the test script and run to verify it fails**

Edit `backend/package.json` line 10, replace the stub:

```json
    "test": "node --test"
```

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module '../utils/israeliId'`.

- [ ] **Step 3: Write minimal implementation**

Create `backend/utils/israeliId.js`:

```js
// Validates an Israeli national ID (תעודת זהות) using the standard
// weighted-checksum algorithm. Returns the normalized 9-digit string,
// or null if the input is not a valid ID.
function isValidIsraeliId(input) {
  const raw = String(input ?? '').trim();
  if (!/^\d{1,9}$/.test(raw)) return null;

  const id = raw.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(id[i]) * ((i % 2) + 1); // weights alternate 1,2,1,2,...
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0 ? id : null;
}

module.exports = { isValidIsraeliId };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS — all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/utils/israeliId.js backend/test/israeliId.test.js backend/package.json
git commit -m "feat(backend): add Israeli national-ID validation helper with tests"
```

---

## Task 2: Add `nationalId` to the User model

**Files:**
- Modify: `backend/models/User.js`

- [ ] **Step 1: Add the field and index**

In `backend/models/User.js`, add the `nationalId` field right after the `role` field (line 8), and add a sparse-unique index next to the existing `lat/lng` index (line 21).

Field (after `role: { ... }`):

```js
    // Owner identity — used by vets to look up a client's pets.
    // sparse+unique: existing/owner-less users without a value are unaffected.
    nationalId: { type: String, trim: true, default: undefined },
```

Index (after `userSchema.index({ lat: 1, lng: 1 });`):

```js
userSchema.index({ nationalId: 1 }, { unique: true, sparse: true });
```

- [ ] **Step 2: Verify the model loads**

Run: `cd backend && node -e "require('./models/User'); console.log('User model OK')"`
Expected: prints `User model OK` with no schema errors.

- [ ] **Step 3: Commit**

```bash
git add backend/models/User.js
git commit -m "feat(backend): add sparse-unique nationalId field to User"
```

---

## Task 3: Validate & store `nationalId` at registration

**Files:**
- Modify: `backend/controllers/authController.js`

- [ ] **Step 1: Require the helper**

At the top of `backend/controllers/authController.js`, after the existing requires (line 3), add:

```js
const { isValidIsraeliId } = require('../utils/israeliId');
```

- [ ] **Step 2: Replace the `register` function body**

Replace the whole `register` function (currently lines 17–34) with:

```js
async function register(req, res) {
  try {
    const { name, email, password, role, nationalId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const userRole = role || 'owner';

    // Owners must supply a valid national ID; vets ignore it.
    let normalizedId;
    if (userRole === 'owner') {
      normalizedId = isValidIsraeliId(nationalId);
      if (!normalizedId) {
        return res.status(400).json({ message: 'A valid national ID is required.' });
      }
      if (await User.findOne({ nationalId: normalizedId })) {
        return res.status(409).json({ message: 'National ID already registered.' });
      }
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({
      name,
      email,
      password: hashed,
      role: userRole,
      ...(normalizedId && { nationalId: normalizedId }),
    });
    console.log('[Auth] registered:', user.email, 'role:', user.role);
    res.status(201).json({ token: signToken(user), user: sanitize(user) });
  } catch (err) {
    console.error('[Auth] register error:', err.message);
    res.status(500).json({ message: err.message });
  }
}
```

Note: `sanitize(user)` (lines 13–15) is unchanged, so `nationalId` is **not** returned to the client — keep it that way.

- [ ] **Step 3: Verify with curl**

Start the backend (`cd backend && npm run dev`) in one terminal, then in another:

```bash
# Missing ID for an owner -> 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Owner","email":"owner_noid@test.com","password":"secret1","role":"owner"}'
# Expected: 400

# Valid ID for an owner -> 201
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Owner","email":"owner_ok@test.com","password":"secret1","role":"owner","nationalId":"123456782"}'
# Expected: 201

# Duplicate ID -> 409
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Other Owner","email":"owner_dup@test.com","password":"secret1","role":"owner","nationalId":"123456782"}'
# Expected: 409
```

Expected: `400`, then `201`, then `409`. Also confirm the 201 response body does **not** contain `nationalId` (`curl ... | grep nationalId` returns nothing).

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/authController.js
git commit -m "feat(backend): validate and store owner nationalId on register"
```

---

## Task 4: Vet search by `nationalId`

**Files:**
- Modify: `backend/controllers/petController.js`

- [ ] **Step 1: Require deps**

At the top of `backend/controllers/petController.js`, after `const Pet = require('../models/Pet');` (line 1), add:

```js
const User = require('../models/User');
const { isValidIsraeliId } = require('../utils/israeliId');
```

- [ ] **Step 2: Replace the `getPets` function**

Replace `getPets` (currently lines 3–19) with:

```js
async function getPets(req, res) {
  try {
    const { nationalId, name } = req.query;
    const filter = {};

    if (req.user.role === 'owner') {
      filter.ownerId = req.user.id;
    } else {
      // Vet: resolve a national ID to the owning user, then scope by their _id.
      if (nationalId) {
        const normalizedId = isValidIsraeliId(nationalId);
        const owner = normalizedId
          ? await User.findOne({ nationalId: normalizedId, role: 'owner' }).select('_id')
          : null;
        if (!owner) return res.json([]); // no such owner -> empty result, not an error
        filter.ownerId = owner._id.toString();
      }
      if (name) filter.name = { $regex: name, $options: 'i' };
    }

    const pets = await Pet.find(filter).sort({ createdAt: -1 });
    res.json(pets);
  } catch (err) {
    console.error('[Pet] getPets error:', err.message);
    res.status(500).json({ message: err.message });
  }
}
```

- [ ] **Step 3: Verify with curl**

Log in as the vet to get a token (replace email/password with a seeded vet account, or register a vet first). Capture the token:

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"VET_EMAIL","password":"VET_PASSWORD"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# Search a registered owner's ID -> JSON array (possibly empty if that owner has no pets yet)
curl -s "http://localhost:5000/api/pets?nationalId=123456782" -H "Authorization: Bearer $TOKEN"
# Expected: a JSON array (HTTP 200)

# Search a non-existent ID -> []
curl -s "http://localhost:5000/api/pets?nationalId=000000018" -H "Authorization: Bearer $TOKEN"
# Expected: []
```

Expected: valid-but-unknown ID returns `[]`; a known owner returns an array (empty until Task 12 lets you add pets/records, which is fine).

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/petController.js
git commit -m "feat(backend): vet pet search resolves owner by nationalId"
```

---

## Task 5: Let existing owners set `nationalId` via `updateMe`

**Files:**
- Modify: `backend/controllers/userController.js`

- [ ] **Step 1: Require the helper**

At the top of `backend/controllers/userController.js`, after `const User = require('../models/User');` (line 1), add:

```js
const { isValidIsraeliId } = require('../utils/israeliId');
```

- [ ] **Step 2: Replace the `updateMe` function**

Replace `updateMe` (currently lines 56–72) with:

```js
async function updateMe(req, res) {
  try {
    const allowed = ['name', 'clinicName', 'address', 'phone', 'lat', 'lng', 'isOnCall'];
    const update = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];

    // nationalId needs validation + uniqueness, so handle it separately.
    if ('nationalId' in req.body) {
      const normalizedId = isValidIsraeliId(req.body.nationalId);
      if (!normalizedId) {
        return res.status(400).json({ message: 'A valid national ID is required.' });
      }
      const clash = await User.findOne({ nationalId: normalizedId, _id: { $ne: req.user.id } }).select('_id');
      if (clash) return res.status(409).json({ message: 'National ID already registered.' });
      update.nationalId = normalizedId;
    }

    const updated = await User.findByIdAndUpdate(req.user.id, update, {
      new: true, runValidators: true,
    }).select('-password');

    if (!updated) return res.status(404).json({ message: 'User not found.' });
    res.json(updated);
  } catch (err) {
    console.error('[User] updateMe error:', err.message);
    res.status(500).json({ message: err.message });
  }
}
```

Note: `getMe` already returns `select('-password')`, so the owner's own `nationalId` is included in `GET /api/users/me` — the Settings UI relies on this in Task 11.

- [ ] **Step 3: Verify with curl**

Log in as an owner (the `owner_ok@test.com` account from Task 3) and capture the token:

```bash
OTOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner_ok@test.com","password":"secret1"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# Invalid ID -> 400
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $OTOKEN" -H "Content-Type: application/json" \
  -d '{"nationalId":"123456789"}'
# Expected: 400

# Another owner's ID would 409; setting a fresh valid ID succeeds (200)
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH http://localhost:5000/api/users/me \
  -H "Authorization: Bearer $OTOKEN" -H "Content-Type: application/json" \
  -d '{"nationalId":"000000018"}'
# Expected: 200

# Confirm it is persisted and returned by /me
curl -s http://localhost:5000/api/users/me -H "Authorization: Bearer $OTOKEN" | grep -o '"nationalId":"[0-9]*"'
# Expected: "nationalId":"000000018"
```

Expected: `400`, then `200`, then the grep prints the stored ID.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/userController.js
git commit -m "feat(backend): allow owners to set nationalId via updateMe"
```

---

## Task 6: Prescription record type + `types` filter

**Files:**
- Modify: `backend/models/MedicalRecord.js:3`
- Modify: `backend/controllers/medicalRecordController.js`

- [ ] **Step 1: Add `PRESCRIPTION` to the enum**

In `backend/models/MedicalRecord.js` line 3, replace the `RECORD_TYPES` array with:

```js
const RECORD_TYPES = ['VISIT_SUMMARY', 'VACCINATION', 'LAB_RESULT', 'XRAY', 'BLOOD_TEST', 'CONSULTATION', 'PRESCRIPTION', 'OTHER'];
```

- [ ] **Step 2: Add the `types` filter to `getRecordsByPet`**

In `backend/controllers/medicalRecordController.js`, replace the `getRecordsByPet` function (currently lines 3–19) with:

```js
async function getRecordsByPet(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip  = Math.max(parseInt(req.query.skip,  10) || 0, 0);
    const filter = { petId: req.params.petId };

    // Optional comma-separated type filter (used by the profile tabs).
    if (req.query.types) {
      const types = req.query.types.split(',').map(s => s.trim()).filter(Boolean);
      if (types.length) filter.type = { $in: types };
    }

    const [items, total] = await Promise.all([
      MedicalRecord.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      MedicalRecord.countDocuments(filter),
    ]);

    res.json({ items, total, hasMore: skip + items.length < total });
  } catch (err) {
    console.error('[MedicalRecord] getRecordsByPet error:', err.message);
    res.status(500).json({ message: err.message });
  }
}
```

- [ ] **Step 3: Verify with curl**

Using the vet token from Task 4 and any valid pet id `PET_ID`:

```bash
# Filtered to prescriptions/documents — pagination fields present, only those types returned
curl -s "http://localhost:5000/api/records/pet/PET_ID?types=PRESCRIPTION,OTHER&limit=10&skip=0" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"items":[...],"total":N,"hasMore":false} with items.type in {PRESCRIPTION,OTHER} only

# No types -> unchanged behavior (all types)
curl -s "http://localhost:5000/api/records/pet/PET_ID?limit=10&skip=0" \
  -H "Authorization: Bearer $TOKEN"
# Expected: all record types returned
```

Expected: the filtered call returns only the requested types (or an empty `items` with correct `total`); the unfiltered call is unchanged.

- [ ] **Step 4: Commit**

```bash
git add backend/models/MedicalRecord.js backend/controllers/medicalRecordController.js
git commit -m "feat(backend): add PRESCRIPTION type and types filter to records"
```

---

## Task 7: i18n keys (he + en)

**Files:**
- Modify: `web-app/src/i18n/he.json`
- Modify: `web-app/src/i18n/en.json`

Note: `he.json` defines `petProfile` twice; the **second** definition (the one containing a `types` object) is the effective one — edit that block.

- [ ] **Step 1: Update Hebrew keys**

In `web-app/src/i18n/he.json`:

In the `auth` block, after `"errorPwShort": ...`, add:

```json
    "nationalIdLabel": "תעודת זהות",
    "nationalIdPlaceholder": "9 ספרות",
    "errorIdInvalid": "תעודת זהות לא תקינה.",
    "errorIdTaken": "תעודת הזהות כבר רשומה במערכת.",
```

In the `dashboard` block, change these two values:

```json
    "ownerId": "תעודת זהות בעלים",
    "ownerIdPlaceholder": "9 ספרות",
```

In the `settings` block, after `"footer": ...` add a comma to that line and append:

```json
    "ownerIdTitle": "תעודת זהות",
    "ownerIdDesc": "נדרשת כדי שהווטרינר יוכל למצוא את החיות שלך בחיפוש",
    "ownerIdLabel": "תעודת זהות",
    "ownerIdPlaceholder": "9 ספרות",
    "ownerIdSave": "שמירת תעודת זהות",
    "ownerIdSaved": "נשמר!",
    "ownerIdInvalid": "תעודת זהות לא תקינה.",
    "ownerIdTaken": "תעודת הזהות כבר רשומה במערכת.",
    "ownerIdSaveFail": "השמירה נכשלה."
```

In the effective `petProfile` block (the second one), after `"medicalHistory": "היסטוריה רפואית",` add:

```json
    "tabMedical": "היסטוריה רפואית",
    "tabDocs": "מרשמים ומסמכים",
    "noDocsTitle": "אין מרשמים או מסמכים עדיין",
    "noDocsHint": "הוסיפו מרשם או מסמך עבור החיה.",
    "addFirstDoc": "הוספת מרשם",
```

In the `petProfile.types` object, add a `prescription` key (after `"consultation": ...`):

```json
      "prescription": "מרשם",
```

- [ ] **Step 2: Update English keys**

In `web-app/src/i18n/en.json`, mirror the same structure with English text:

`auth`:
```json
    "nationalIdLabel": "National ID",
    "nationalIdPlaceholder": "9 digits",
    "errorIdInvalid": "Invalid national ID.",
    "errorIdTaken": "This national ID is already registered.",
```

`dashboard`:
```json
    "ownerId": "Owner national ID",
    "ownerIdPlaceholder": "9 digits",
```

`settings`:
```json
    "ownerIdTitle": "National ID",
    "ownerIdDesc": "Required so your vet can find your pets when searching",
    "ownerIdLabel": "National ID",
    "ownerIdPlaceholder": "9 digits",
    "ownerIdSave": "Save national ID",
    "ownerIdSaved": "Saved!",
    "ownerIdInvalid": "Invalid national ID.",
    "ownerIdTaken": "This national ID is already registered.",
    "ownerIdSaveFail": "Save failed."
```

`petProfile` (the effective block — check which `petProfile` block has a `types` object and edit that one):
```json
    "tabMedical": "Medical history",
    "tabDocs": "Prescriptions & documents",
    "noDocsTitle": "No prescriptions or documents yet",
    "noDocsHint": "Add a prescription or document for this pet.",
    "addFirstDoc": "Add prescription",
```

`petProfile.types`:
```json
      "prescription": "Prescription",
```

- [ ] **Step 3: Verify JSON validity**

Run: `cd web-app && node -e "JSON.parse(require('fs').readFileSync('src/i18n/he.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/en.json','utf8')); console.log('i18n JSON OK')"`
Expected: prints `i18n JSON OK` (no JSON syntax errors — watch for missing/trailing commas).

- [ ] **Step 4: Commit**

```bash
git add web-app/src/i18n/he.json web-app/src/i18n/en.json
git commit -m "feat(i18n): add nationalId and prescriptions/documents keys"
```

---

## Task 8: Owner national-ID field on Register

**Files:**
- Modify: `web-app/src/pages/Register.jsx`

- [ ] **Step 1: Add `nationalId` to form state**

In `web-app/src/pages/Register.jsx`, change the form state initializer (line 16) to include `nationalId`:

```jsx
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '', nationalId: '' })
```

- [ ] **Step 2: Validate and send `nationalId` for owners**

In `handleSubmit` (lines 26–52), add an owner-only validation right after the password-length check (after line 35, before `setLoading(true)`):

```jsx
    if (tab === 'owner' && !/^\d{9}$/.test(form.nationalId.trim())) {
      setError(t('auth.errorIdInvalid'))
      return
    }
```

Then include `nationalId` in the POST body. Replace the `axios.post(...)` body object (lines 39–44) with:

```jsx
      const { data } = await axios.post(`${API_BASE}/api/auth/register`, {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     tab,
        ...(tab === 'owner' && { nationalId: form.nationalId.trim() }),
      })
```

- [ ] **Step 3: Render the field for owners only**

In the form, add the ת"ז input immediately after the Name field block (after its closing `</div>` at line 127, before the Email block). Render it only when `!isVet`:

```jsx
            {/* National ID (owners only) */}
            {!isVet && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('auth.nationalIdLabel')}
                </label>
                <input
                  type="text"
                  name="nationalId"
                  inputMode="numeric"
                  value={form.nationalId}
                  onChange={handleChange}
                  placeholder={t('auth.nationalIdPlaceholder')}
                  required
                  maxLength={9}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                />
              </div>
            )}
```

- [ ] **Step 4: Verify in the running app**

Run the web-app (`cd web-app && npm run dev`) with the backend running. Open the Register page:
- Switch to the **owner** tab → the National ID field appears; the **vet** tab hides it.
- Register an owner with a valid ID (e.g. `123456782`) → account is created and you land on the dashboard.
- Try an invalid ID (e.g. `123456789` is checksum-invalid, but client only checks 9 digits) → the **backend** rejects with the translated "Invalid national ID." message; a 5-digit value is blocked client-side with the same message.

Expected: field visibility toggles by role; valid registration succeeds; invalid ID surfaces the error.

- [ ] **Step 5: Commit**

```bash
git add web-app/src/pages/Register.jsx
git commit -m "feat(web): owner national-ID field on registration"
```

---

## Task 9: Vet dashboard searches by `nationalId`

**Files:**
- Modify: `web-app/src/pages/Dashboard.jsx`

- [ ] **Step 1: Rename the search state and param**

In `web-app/src/pages/Dashboard.jsx`, in `VetDashboard`:

Change the state declaration (line 52) from `ownerId` to `nationalId`:

```jsx
  const [nationalId, setNationalId] = useState('')
```

Update `handleSearch` (lines 83–96) to use the new state and query param:

```jsx
  async function handleSearch(e) {
    e.preventDefault()
    if (!nationalId.trim() && !name.trim()) return
    setLoading(true); setError(null)
    try {
      const params = {}
      if (nationalId.trim()) params.nationalId = nationalId.trim()
      if (name.trim())       params.name       = name.trim()
      const { data } = await api.get('/api/pets', { params })
      setResults(data)
    } catch {
      setError(t('dashboard.searchFail'))
    } finally { setLoading(false) }
  }
```

Update `clearSearch` (line 98):

```jsx
  function clearSearch() { setResults(null); setNationalId(''); setName('') }
```

- [ ] **Step 2: Bind the input to the new state**

Update the owner-ID input (lines 156–160) and the submit `disabled` condition (line 173):

Input:
```jsx
                <input
                  type="text" value={nationalId} onChange={e => setNationalId(e.target.value)}
                  inputMode="numeric" maxLength={9}
                  placeholder={t('dashboard.ownerIdPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
```

Submit button `disabled`:
```jsx
              disabled={loading || (!nationalId.trim() && !name.trim())}
```

The label already uses `t('dashboard.ownerId')`, which Task 7 changed to "תעודת זהות בעלים" — no change needed there.

- [ ] **Step 3: Verify in the running app**

As a vet, on the dashboard:
- Enter the ת"ז of the owner you registered in Task 8 → search returns that owner's pets (none yet is fine — you'll see the empty-results state).
- Enter a random 9-digit number → empty-results state, no error.

Expected: search posts `nationalId` (verify in the browser Network tab: request URL contains `?nationalId=...`).

- [ ] **Step 4: Commit**

```bash
git add web-app/src/pages/Dashboard.jsx
git commit -m "feat(web): vet dashboard searches pets by owner national ID"
```

---

## Task 10: Make Settings owner-accessible + add nav item

**Files:**
- Modify: `web-app/src/App.jsx:52`
- Modify: `web-app/src/components/AppLayout.jsx`

- [ ] **Step 1: Open the `/settings` route to any authenticated user**

In `web-app/src/App.jsx`, change the settings route (line 52) from vet-only to protected:

```jsx
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
```

Move/keep it among the shared routes — placement doesn't matter functionally, but for clarity put it next to the other `ProtectedRoute` entries (after the `/consultations` route, line 47). Remove the old vet-only `/settings` line from the "Vet-only routes" group.

- [ ] **Step 2: Add Settings to the owner nav**

In `web-app/src/components/AppLayout.jsx`, add a Settings entry to `OWNER_NAV` (lines 31–38). The `Settings` icon is already imported (line 5). Append after the emergency item:

```jsx
    { icon: Settings,        label: t('nav.settings'),       path: '/settings' },
```

- [ ] **Step 3: Verify in the running app**

Log in as an owner:
- The sidebar now shows a **Settings** (הגדרות) item.
- Clicking it opens the Settings page without redirecting to home.
- Vet-only sections (clinic info, availability shortcut) are **absent** for the owner; the profile, language, and account sections are present.

Expected: owner reaches `/settings`; no vet-only content leaks.

- [ ] **Step 4: Commit**

```bash
git add web-app/src/App.jsx web-app/src/components/AppLayout.jsx
git commit -m "feat(web): make Settings accessible to owners with nav entry"
```

---

## Task 11: Owner national-ID section in Settings

**Files:**
- Modify: `web-app/src/pages/Settings.jsx`

- [ ] **Step 1: Add an `IdCard` icon import**

In `web-app/src/pages/Settings.jsx`, add `IdCard` to the lucide import (line 3):

```jsx
import { User, Mail, Shield, Calendar, ChevronRight, LogOut, Languages, MapPin, Loader2, Save, Check, IdCard } from 'lucide-react'
```

- [ ] **Step 2: Add the `OwnerIdSection` component**

Add this component above `export default function Settings()` (before line 144):

```jsx
function OwnerIdSection() {
  const { t } = useTranslation()
  const [value, setValue]   = useState('')
  const [loading, setLoad]  = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState(null)

  useEffect(() => {
    api.get('/api/users/me')
      .then(r => setValue(r.data.nationalId ?? ''))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setError(null); setSaved(false)
    if (!/^\d{9}$/.test(value.trim())) {
      setError(t('settings.ownerIdInvalid'))
      return
    }
    setSaving(true)
    try {
      await api.patch('/api/users/me', { nationalId: value.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const status = err.response?.status
      setError(
        status === 409 ? t('settings.ownerIdTaken')
        : status === 400 ? t('settings.ownerIdInvalid')
        : t('settings.ownerIdSaveFail')
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.ownerIdTitle')}</p>
        <p className="text-xs text-slate-400 mt-1">{t('settings.ownerIdDesc')}</p>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('settings.ownerIdLabel')}</label>
          <input
            value={value}
            onChange={e => { setValue(e.target.value); setSaved(false); setError(null) }}
            inputMode="numeric"
            maxLength={9}
            placeholder={t('settings.ownerIdPlaceholder')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          {saving  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('emergency.vetSettings.saving')}</>
           : saved ? <><Check className="w-4 h-4" /> {t('settings.ownerIdSaved')}</>
           : <><IdCard className="w-4 h-4" /> {t('settings.ownerIdSave')}</>}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Render it for owners**

In the `Settings` component's JSX, add the owner section right after the language switcher block and before the vet-only clinic section (before line 224, `{user?.role === 'vet' && <VetClinicSection />}`):

```jsx
        {/* Owner-only: national ID (so vets can find their pets) */}
        {user?.role === 'owner' && <OwnerIdSection />}
```

- [ ] **Step 4: Verify in the running app**

As the owner from Task 8 (who already has an ID) open Settings:
- The National ID section shows the current value.
- Change it to another valid 9-digit value → "Saved!" appears.
- Enter `12345` → client-side "Invalid national ID." error, no request sent.
- Enter a 9-digit value already used by another owner → "already registered" error (409).
As an owner who registered without an ID (if any), the field is empty and can be set.

Expected: load/save/duplicate/invalid all behave as described.

- [ ] **Step 5: Commit**

```bash
git add web-app/src/pages/Settings.jsx
git commit -m "feat(web): owner can set national ID in Settings"
```

---

## Task 12: Prescriptions/Documents tab in PetProfile

**Files:**
- Modify: `web-app/src/pages/PetProfile.jsx`

- [ ] **Step 1: Add the `PRESCRIPTION` type def and tab type groups**

In `web-app/src/pages/PetProfile.jsx`, add a `PRESCRIPTION` entry to `RECORD_TYPE_DEFS` (insert before the `CONSULTATION` entry or right after it — order controls the picker layout; place it after `CONSULTATION`, line 18):

```jsx
  { value: 'PRESCRIPTION',  key: 'prescription', icon: '💊', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
```

Immediately after the `RECORD_TYPE_DEFS` array (after line 20), add the tab groupings:

```jsx
const MEDICAL_TYPES = ['VISIT_SUMMARY', 'VACCINATION', 'LAB_RESULT', 'XRAY', 'BLOOD_TEST', 'CONSULTATION']
const DOCS_TYPES    = ['PRESCRIPTION', 'OTHER']
```

- [ ] **Step 2: Accept a `defaultType` prop in `AddRecordModal`**

Change the `AddRecordModal` signature (line 203) and its initial form `type`:

Signature:
```jsx
function AddRecordModal({ petId, user, defaultType = 'VISIT_SUMMARY', onClose, onSaved }) {
```

Form initializer (line 206) — use the prop:
```jsx
  const [form, setForm]         = useState({ type: defaultType, date: today, vetName: user?.name ?? '', findings: '' })
```

- [ ] **Step 3: Add tab state and split the data loading by tab**

In the `PetProfile` component, add a `tab` state next to the others (after line 408, `const [showModal, setModal] = useState(false)`):

```jsx
  const [tab, setTab] = useState('medical') // 'medical' | 'docs'
```

Replace the single effect + `fetchAll` + `loadMore` + `handleSaved` (lines 410–451) with tab-aware versions:

```jsx
  useEffect(() => { fetchPet() }, [id])
  useEffect(() => { fetchRecords(true) }, [id, tab])

  async function fetchPet() {
    try {
      const { data } = await api.get(`/api/pets/${id}`)
      setPet(data)
    } catch {
      setError(t('petProfile.notFound'))
    }
  }

  async function fetchRecords(reset) {
    if (reset) setLoading(true)
    else       setLoadingMore(true)
    setError(null)
    try {
      const skip = reset ? 0 : records.length
      const { data } = await api.get(`/api/records/pet/${id}`, {
        params: { limit: PAGE_SIZE, skip, types: (tab === 'medical' ? MEDICAL_TYPES : DOCS_TYPES).join(',') },
      })
      if (reset) {
        setRecords(data.items)
      } else {
        setRecords(prev => [...prev, ...data.items])
      }
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch {
      if (reset) setError(t('petProfile.notFound'))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function loadMore() {
    if (loadingMore || !hasMore) return
    fetchRecords(false)
  }

  async function handleSaved() {
    setModal(false)
    fetchRecords(true)
  }
```

Note: `fetchRecords` recomputes the `types` param inline from the current `tab`, so it always reflects the active tab even right after a tab switch.

- [ ] **Step 4: Add the tab switcher and make the empty state tab-aware**

In the records `<section>` (starts line 538), replace the header block (lines 539–542) with a header that includes the tab switcher:

```jsx
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-7 bg-brand rounded-full" />
              <h2 className="text-lg font-bold text-ink">
                {tab === 'medical' ? t('petProfile.medicalHistory') : t('petProfile.tabDocs')}
              </h2>
            </div>
            <div className="ms-auto flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
              <button
                type="button"
                onClick={() => setTab('medical')}
                className={`px-3 py-1.5 transition-colors ${tab === 'medical' ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t('petProfile.tabMedical')}
              </button>
              <button
                type="button"
                onClick={() => setTab('docs')}
                className={`px-3 py-1.5 transition-colors ${tab === 'docs' ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t('petProfile.tabDocs')}
              </button>
            </div>
          </div>
```

In the empty-state block (lines 544–561), make the texts tab-aware. Replace the title/hint/button text:

- Title (line 549): `{tab === 'medical' ? t('petProfile.noRecordsTitle') : t('petProfile.noDocsTitle')}`
- Hint (lines 550–552): `{tab === 'medical' ? t('petProfile.noRecordsHint') : t('petProfile.noDocsHint')}`
- Button (line 558): `{tab === 'medical' ? t('petProfile.addFirstRecord') : t('petProfile.addFirstDoc')}`

- [ ] **Step 5: Pass `defaultType` to the modal**

Update the `AddRecordModal` render (lines 595–602) to pass the tab-appropriate default type:

```jsx
      {!readOnly && showModal && (
        <AddRecordModal
          petId={pet._id}
          user={user}
          defaultType={tab === 'docs' ? 'PRESCRIPTION' : 'VISIT_SUMMARY'}
          onClose={() => setModal(false)}
          onSaved={handleSaved}
        />
      )}
```

- [ ] **Step 6: Verify in the running app**

As a vet, open a pet profile (search by owner ת"ז, or navigate directly). With the backend running:
- Two tabs appear: **היסטוריה רפואית** | **מרשמים ומסמכים**.
- On the **מרשמים ומסמכים** tab, click "Add record" → the modal opens with **מרשם (💊)** preselected. Save a prescription (optionally attach a PDF) → it appears in this tab only.
- Switch to **היסטוריה רפואית** → the prescription is **not** listed there; clinical records are.
- Add a clinical record (e.g. Vaccination) from the medical tab → appears there, not under documents.
- "Load more" works within each tab (add >10 records of one group to confirm pagination, or trust the per-tab `total`).
- Log in as the **owner**: open the pet from "My pets" → both tabs are visible and read-only (no "Add record" button); prescriptions are viewable/downloadable.

Expected: records are correctly partitioned per tab; default type follows the active tab; owner sees both tabs read-only.

- [ ] **Step 7: Commit**

```bash
git add web-app/src/pages/PetProfile.jsx
git commit -m "feat(web): prescriptions/documents tab in pet profile"
```

---

## Final verification

- [ ] **Backend unit tests pass:** `cd backend && npm test` → all Israeli-ID tests pass.
- [ ] **Web-app builds:** `cd web-app && npm run build` → completes with no errors.
- [ ] **End-to-end manual flow:**
  1. Register a new owner with a valid ת"ז → success.
  2. As that owner, add a pet (My pets), then open Settings and confirm the ת"ז is shown.
  3. As a vet, search the owner's ת"ז on the dashboard → the pet appears.
  4. Open the pet → add a prescription with an attached file under "מרשמים ומסמכים".
  5. Add a clinical record under "היסטוריה רפואית".
  6. Confirm each record shows under the correct tab, for both vet and owner.

---

## Self-review notes (coverage)

- Spec "national-ID field on User (sparse-unique)" → Task 2.
- Spec "Israeli ID validation helper + checksum" → Task 1.
- Spec "register requires/validates owner ID, not exposed in API" → Task 3.
- Spec "vet search resolves nationalId → ownerId" → Task 4.
- Spec "existing owners add ID via Settings (updateMe validation + uniqueness; route opened; nav; OwnerIdSection)" → Tasks 5, 10, 11.
- Spec "PRESCRIPTION type + types filter with correct pagination" → Task 6.
- Spec "tabs in PetProfile; unify PRESCRIPTION+OTHER; default type per tab; per-tab empty state; owner read-only" → Task 12.
- Spec "i18n keys (he+en)" → Task 7.
- Spec "Register owner field; Dashboard sends nationalId" → Tasks 8, 9.
