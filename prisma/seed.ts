import { PrismaClient, Gender, GrowthIndicator } from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Seed admin user (idempotent)
  const adminEmail = 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const password = 'Admin123!';
    const hash = await argon2.hash(password);
    await prisma.user.create({
      data: { email: adminEmail, name: 'Administrator', password: hash, role: 'ADMIN' },
    });
    console.log(`Seeded admin user: ${adminEmail} / ${password}`);
  } else {
    console.log('Admin user already exists, skipping');
  }

  // Seed WHO height-for-age standards for boys
  const boysDataPath = path.join(__dirname, 'data', 'height_for_age_boys.json');
  const boysDataRaw = fs.readFileSync(boysDataPath, 'utf-8');
  const boysData: Array<{ ageInMonths: number; l: number; m: number; s: number }> = JSON.parse(boysDataRaw);
  for (const record of boysData) {
    await prisma.whoStandard.upsert({
      where: {
        indicator_gender_ageInMonths: {
          indicator: GrowthIndicator.HEIGHT_FOR_AGE,
          gender: Gender.MALE,
          ageInMonths: record.ageInMonths,
        },
      },
      update: {},
      create: {
        indicator: GrowthIndicator.HEIGHT_FOR_AGE,
        gender: Gender.MALE,
        ageInMonths: record.ageInMonths,
        l: record.l,
        m: record.m,
        s: record.s,
      },
    });
  }
  console.log('Seeding for boys height-for-age completed.');

  // Seed WHO height-for-age standards for girls
  const girlsDataPath = path.join(__dirname, 'data', 'height_for_age_girls.json');
  const girlsDataRaw = fs.readFileSync(girlsDataPath, 'utf-8');
  const girlsData: Array<{ ageInMonths: number; l: number; m: number; s: number }> = JSON.parse(girlsDataRaw);
  for (const record of girlsData) {
    await prisma.whoStandard.upsert({
      where: {
        indicator_gender_ageInMonths: {
          indicator: GrowthIndicator.HEIGHT_FOR_AGE,
          gender: Gender.FEMALE,
          ageInMonths: record.ageInMonths,
        },
      },
      update: {},
      create: {
        indicator: GrowthIndicator.HEIGHT_FOR_AGE,
        gender: Gender.FEMALE,
        ageInMonths: record.ageInMonths,
        l: record.l,
        m: record.m,
        s: record.s,
      },
    });
  }
  console.log('Seeding for girls height-for-age completed.');

  // Seed WHO weight-for-age standards for boys
  try {
    const wfaBoysPath = path.join(__dirname, 'data', 'weight_for_age_boys.json');
    const wfaBoysRaw = fs.readFileSync(wfaBoysPath, 'utf-8');
    const wfaBoys: Array<{ ageInMonths: number; l: number; m: number; s: number }> = JSON.parse(wfaBoysRaw);
    for (const record of wfaBoys) {
      await prisma.whoStandard.upsert({
        where: {
          indicator_gender_ageInMonths: {
            indicator: GrowthIndicator.WEIGHT_FOR_AGE,
            gender: Gender.MALE,
            ageInMonths: record.ageInMonths,
          },
        },
        update: {},
        create: {
          indicator: GrowthIndicator.WEIGHT_FOR_AGE,
          gender: Gender.MALE,
          ageInMonths: record.ageInMonths,
          l: record.l,
          m: record.m,
          s: record.s,
        },
      });
    }
    console.log('Seeding for boys weight-for-age completed.');
  } catch (e) {
    console.warn('Skipping weight-for-age (boys) seeding:', (e as Error).message);
  }

  // Seed WHO weight-for-age standards for girls
  try {
    const wfaGirlsPath = path.join(__dirname, 'data', 'weight_for_age_girls.json');
    const wfaGirlsRaw = fs.readFileSync(wfaGirlsPath, 'utf-8');
    const wfaGirls: Array<{ ageInMonths: number; l: number; m: number; s: number }> = JSON.parse(wfaGirlsRaw);
    for (const record of wfaGirls) {
      await prisma.whoStandard.upsert({
        where: {
          indicator_gender_ageInMonths: {
            indicator: GrowthIndicator.WEIGHT_FOR_AGE,
            gender: Gender.FEMALE,
            ageInMonths: record.ageInMonths,
          },
        },
        update: {},
        create: {
          indicator: GrowthIndicator.WEIGHT_FOR_AGE,
          gender: Gender.FEMALE,
          ageInMonths: record.ageInMonths,
          l: record.l,
          m: record.m,
          s: record.s,
        },
      });
    }
    console.log('Seeding for girls weight-for-age completed.');
  } catch (e) {
    console.warn('Skipping weight-for-age (girls) seeding:', (e as Error).message);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
