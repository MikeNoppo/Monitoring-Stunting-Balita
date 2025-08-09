// Reusable growth-related utilities (age calculation and LMS Z-score)

/**
 * Hitung usia dalam bulan antara tanggal lahir dan tanggal pengukuran.
 * Mengoreksi jika hari pengukuran belum melewati hari lahir pada bulan berjalan.
 */
export function calculateAgeInMonths(dob: Date, measurementDate: Date): number {
  let months =
    (measurementDate.getFullYear() - dob.getFullYear()) * 12 +
    (measurementDate.getMonth() - dob.getMonth());

  // Koreksi jika hari pengukuran lebih kecil dari hari lahir, berarti belum genap sebulan.
  if (measurementDate.getDate() < dob.getDate()) {
    months--;
  }
  return months;
}

/**
 * Hitung Z-score menggunakan parameter LMS (CDC/WHO) untuk suatu nilai (mis. tinggi/berat).
 * - Jika L = 0, gunakan rumus khusus: ln(value/M) / S
 * - Selain itu, gunakan rumus umum: ( (value/M)^L - 1 ) / (L*S)
 * Mengembalikan angka dibulatkan ke 2 desimal.
 */
export function calculateZScore(
  l: number,
  m: number,
  s: number,
  value: number,
): number {
  if (l === 0) {
    const zScore = Math.log(value / m) / s;
    return parseFloat(zScore.toFixed(2));
  }

  const zScore = (Math.pow(value / m, l) - 1) / (l * s);
  return parseFloat(zScore.toFixed(2)); // Dibulatkan 2 angka desimal
}
