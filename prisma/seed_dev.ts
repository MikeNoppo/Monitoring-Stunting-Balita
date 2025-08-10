import { PrismaClient, Gender, GrowthIndicator } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Utilities (duplicated here to avoid Nest import coupling)
function calculateAgeInMonths(dob: Date, measurementDate: Date): number {
  let months =
    (measurementDate.getFullYear() - dob.getFullYear()) * 12 +
    (measurementDate.getMonth() - dob.getMonth());
  if (measurementDate.getDate() < dob.getDate()) months--;
  return months;
}

function calculateZScore(l: number, m: number, s: number, value: number): number {
  if (l === 0) return parseFloat((Math.log(value / m) / s).toFixed(2));
  return parseFloat(((Math.pow(value / m, l) - 1) / (l * s)).toFixed(2));
}

function valueFromZ(l: number, m: number, s: number, z: number): number {
  if (l === 0) return m * Math.exp(s * z);
  return m * Math.pow(1 + l * s * z, 1 / l);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  // Ensure measurement day >= dob day to avoid age off-by-one in calc
  if (d.getDate() < date.getDate()) d.setDate(date.getDate());
  return d;
}

async function ensureUser(
  params: { email: string; name: string; role: 'ADMIN' | 'PEGAWAI' | 'DOKTER' | 'ORANG_TUA'; password: string },
) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) return existing;
  const hash = await argon2.hash(params.password);
  return prisma.user.create({
    data: {
      email: params.email,
      name: params.name,
      password: hash,
      role: params.role,
    },
  });
}

async function main() {
  console.log('Start dev seeding...');

  // Create operator users
  const staffCred = { email: 'staff1@example.com', name: 'Petugas 1', password: 'Staff123!' };
  const doctorCred = { email: 'doctor1@example.com', name: 'Dokter 1', password: 'Doctor123!' };
  const staff = await ensureUser({ ...staffCred, role: 'PEGAWAI' });
  const doctor = await ensureUser({ ...doctorCred, role: 'DOKTER' });

  // Create parents with children
  const parents = [
    {
      email: 'parent1@example.com',
      name: 'Ortu Satu',
      password: 'Parent123!',
      children: [
  { name: 'Budi', gender: Gender.MALE, dob: new Date('2023-01-15'), nik: 'NIK-P1-BUDI-001' },
  { name: 'Sari', gender: Gender.FEMALE, dob: new Date('2024-03-10'), nik: 'NIK-P1-SARI-002' },
      ],
    },
    {
      email: 'parent2@example.com',
      name: 'Ortu Dua',
      password: 'Parent123!',
      children: [
  { name: 'Andi', gender: Gender.MALE, dob: new Date('2022-06-20'), nik: 'NIK-P2-ANDI-003' },
      ],
    },
  ];

  const createdParents: Array<{ email: string; password: string; id: number }> = [];

  for (const p of parents) {
    const user = await ensureUser({ email: p.email, name: p.name, password: p.password, role: 'ORANG_TUA' });
    createdParents.push({ email: p.email, password: p.password, id: user.id });

    // Upsert children by unique NIK
    for (const c of p.children) {
      await prisma.child.upsert({
        where: { nik: c.nik },
        update: { name: c.name, dob: c.dob, gender: c.gender, userId: user.id },
        create: { name: c.name, dob: c.dob, gender: c.gender, nik: c.nik, user: { connect: { id: user.id } } },
      });
    }
  }

  // Create growth records for each child at selected ages using WHO standards
  const allChildren = await prisma.child.findMany({});
  const inputById = staff.id; // records entered by staff
  const targetAges = [0, 6, 12, 24]; // months

  for (const ch of allChildren) {
    for (const age of targetAges) {
      const date = addMonths(new Date(ch.dob), age);
      const hfa = await prisma.whoStandard.findUnique({
        where: {
          indicator_gender_ageInMonths: {
            indicator: GrowthIndicator.HEIGHT_FOR_AGE,
            gender: ch.gender,
            ageInMonths: age,
          },
        },
      });
      const wfa = await prisma.whoStandard.findUnique({
        where: {
          indicator_gender_ageInMonths: {
            indicator: GrowthIndicator.WEIGHT_FOR_AGE,
            gender: ch.gender,
            ageInMonths: age,
          },
        },
      });

      // Skip if standards missing
      if (!hfa || !wfa) {
        console.warn(`WHO standard missing for child ${ch.id} at age ${age} mo, gender=${ch.gender}`);
        continue;
      }

      // Vary z to simulate different statuses
      const zHeight = age === 0 ? 0 : age === 6 ? -1 : age === 12 ? 0.5 : -2;
      const zWeight = age === 0 ? 0 : age === 6 ? -0.5 : age === 12 ? 0.7 : -1.5;

      const heightVal = parseFloat(valueFromZ(hfa.l, hfa.m, hfa.s, zHeight).toFixed(1));
      const weightVal = parseFloat(valueFromZ(wfa.l, wfa.m, wfa.s, zWeight).toFixed(2));
      const heightZ = calculateZScore(hfa.l, hfa.m, hfa.s, heightVal);
      const weightZ = calculateZScore(wfa.l, wfa.m, wfa.s, weightVal);

      const ageInMonths = calculateAgeInMonths(new Date(ch.dob), date);

      // Avoid duplicate per child/date by checking existing record for that date
      const exists = await prisma.growthRecord.findFirst({ where: { childId: ch.id, date } });
      if (exists) continue;

      await prisma.growthRecord.create({
        data: {
          childId: ch.id,
          height: heightVal,
          weight: weightVal,
          date,
          inputBy: inputById,
          ageInMonthsAtRecord: ageInMonths,
          heightZScore: heightZ,
          weightZScore: weightZ,
        },
      });
    }
  }

  console.log('--- Dev seed credentials (parents) ---');
  for (const p of createdParents) {
    console.log(`Parent -> ${p.email} / ${p.password}`);
  }
  console.log('Staff  ->', staffCred.email, '/', staffCred.password);
  console.log('Doctor ->', doctorCred.email, '/', doctorCred.password);

  console.log('Dev seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
