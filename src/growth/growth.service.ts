import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Gender, GrowthIndicator } from '@prisma/client';
import { calculateAgeInMonths, calculateZScore, valueFromZ } from '../lib/growth-utils';

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async recordGrowth(
    childId: number,
    data: {
      height: number;
      weight: number;
      date: Date | string;
      inputBy: number; // derived from authenticated user
    },
  ) {
    // 1. Ambil data anak untuk mendapatkan tanggal lahir dan jenis kelamin
    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
    });

    // 2. Hitung usia anak dalam bulan saat pengukuran
  const measurementDate = new Date(data.date);
  const ageInMonths = calculateAgeInMonths(child.dob, measurementDate);

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
      heightZScore = calculateZScore(
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

    return {
      message: 'Data pertumbuhan berhasil direkam.',
      data: newRecord,
    };
  }

  async getGrowthRecords(childId: number, user: { id: number; role: string }) {
    // Allow staff and admins
    if (!['ADMIN', 'PEGAWAI', 'DOKTER'].includes(user.role)) {
      // For parents, verify the child belongs to them
      const child = await this.prisma.child.findUnique({
        where: { id: childId },
        select: { userId: true },
      });
      if (!child || child.userId !== user.id) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const records = await this.prisma.growthRecord.findMany({
      where: { childId: childId },
    });
    return {
      message: 'Data rekaman pertumbuhan berhasil diambil.',
      data: records,
    };
  }

  private async ensureReadAccess(childId: number, user: { id: number; role: string }) {
    if (['ADMIN', 'PEGAWAI', 'DOKTER'].includes(user.role)) return;
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { userId: true },
    });
    if (!child || child.userId !== user.id) {
      throw new ForbiddenException('Forbidden');
    }
  }

  async getGrowthChartData(childId: number, user: { id: number; role: string }) {
    await this.ensureReadAccess(childId, user);

    const child = await this.prisma.child.findUniqueOrThrow({
      where: { id: childId },
      select: { dob: true, gender: true },
    });

    const records = await this.prisma.growthRecord.findMany({
      where: { childId },
      orderBy: { date: 'asc' },
      select: { date: true, height: true, weight: true, ageInMonthsAtRecord: true, heightZScore: true },
    });

    // WHO curves for HEIGHT_FOR_AGE at z = -3,-2,-1,0,1,2,3
    const standards = await this.prisma.whoStandard.findMany({
      where: { indicator: GrowthIndicator.HEIGHT_FOR_AGE, gender: child.gender as Gender },
      orderBy: { ageInMonths: 'asc' },
      select: { ageInMonths: true, l: true, m: true, s: true },
    });

    const zLevels = [-3, -2, -1, 0, 1, 2, 3];
    const whoCurves = zLevels.map((z) => ({
      z,
      points: standards.map((st) => ({ ageInMonths: st.ageInMonths, value: valueFromZ(st.l, st.m, st.s, z) })),
    }));

    return {
      message: 'Chart data generated',
      data: {
        records,
        whoCurves,
      },
    };
  }

  async getGrowthStats(childId: number, user: { id: number; role: string }) {
    await this.ensureReadAccess(childId, user);
    const agg = await this.prisma.growthRecord.aggregate({
      where: { childId },
      _count: { _all: true },
      _avg: { height: true, weight: true, heightZScore: true },
      _min: { date: true, height: true, weight: true, heightZScore: true },
      _max: { date: true, height: true, weight: true, heightZScore: true },
    });
    return {
      message: 'Stats calculated',
      data: agg,
    };
  }
}
