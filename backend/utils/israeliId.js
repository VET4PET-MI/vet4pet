// Validates an Israeli national ID (תעודת זהות) using the standard
// weighted-checksum algorithm. Returns the normalized 9-digit string,
// or null if the input is not a valid ID.
function isValidIsraeliId(input) {
  const raw = String(input ?? '').trim().replace(/\D/g, '');
  if (!raw || raw.length > 9) return null;

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
