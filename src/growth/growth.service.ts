import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { GrowthIndicator } from '@prisma/client';

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  private _calculateAgeInMonths(dob: Date, measurementDate: Date): number {
    let months =
      (measurementDate.getFullYear() - dob.getFullYear()) * 12 +
      (measurementDate.getMonth() - dob.getMonth());

    // Koreksi jika hari pengukuran lebih kecil dari hari lahir, berarti belum genap sebulan.
    if (measurementDate.getDate() < dob.getDate()) {
      months--;
    }
    return months;
  }

  private _calculateZScore(
    l: number,
    m: number,
    s: number,
    value: number,
  ): number {
    // Kasus khusus jika L = 0, rumusnya berbeda
    if (l === 0) {
      const zScore = Math.log(value / m) / s;
      return parseFloat(zScore.toFixed(2));
    }

    const zScore = (Math.pow(value / m, l) - 1) / (l * s);
    return parseFloat(zScore.toFixed(2)); // Dibulatkan 2 angka desimal
  }

  async recordGrowth(
    childId: number,
    data: {
      height: number;
      weight: number;
      date: Date | string;
      inputBy: number;
    },
  ) {
    // 1. Ambil data anak untuk mendapatkan tanggal lahir dan jenis kelamin
    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
    });

    // 2. Hitung usia anak dalam bulan saat pengukuran
    const measurementDate = new Date(data.date);
    const ageInMonths = this._calculateAgeInMonths(child.dob, measurementDate);

    if (ageInMonths < 0) {
      throw new Error(
        'Tanggal pengukuran tidak boleh sebelum tanggal lahir anak.',
      );
    }

    // 3. Cari standar LMS yang sesuai di database
    const standard = await this.prisma.whoStandard.findUnique({
      where: {
        indicator_gender_ageInMonths: {
          indicator: GrowthIndicator.HEIGHT_FOR_AGE,
          gender: child.gender,
          ageInMonths: ageInMonths,
        },
      },
    });

    let heightZScore: number | null = null;
    if (standard) {
      // 4. Jika standar ditemukan, hitung Z-score
      heightZScore = this._calculateZScore(
        standard.l,
        standard.m,
        standard.s,
        data.height,
      );
    } else {
      console.warn(
        `PERINGATAN: Standar WHO untuk [${child.gender}, ${ageInMonths} bulan] tidak ditemukan. Z-score tidak dihitung.`,
      );
    }

    // 5. Simpan data mentah DAN hasil perhitungan ke tabel GrowthRecord
    const newRecord = await this.prisma.growthRecord.create({
      data: {
        childId: childId,
        height: data.height,
        weight: data.weight,
        date: measurementDate,
        inputBy: data.inputBy,
        ageInMonthsAtRecord: ageInMonths,
        heightZScore: heightZScore,
      },
    });

    return newRecord;
  }
}
