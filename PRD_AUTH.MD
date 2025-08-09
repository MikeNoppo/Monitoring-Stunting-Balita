# PRD_AUTH - Sistem Autentikasi (JWT Only, No Refresh Token)

## 1. Ringkasan
Sistem autentikasi untuk aplikasi Monitoring Stunting Balita menggunakan JWT sebagai mekanisme stateless auth. Hanya Access Token (AT) dengan masa berlaku 1 jam. Tidak ada Refresh Token, tidak ada penyimpanan token atau session state di database. Fokus: sederhana, aman, mudah dikembangkan lanjut (extensible) nanti jika diperlukan.

## 2. Ruang Lingkup (In Scope)
- Registrasi user baru (role default: ORANG_TUA kecuali admin seeding)
- Login & issuance JWT (1 jam)
- Endpoint profil user saat ini (`/auth/me`)
- Endpoint listing user (`/users`) (role-based restriction)
- Update role user (`PATCH /users/:id/role`) (hanya ADMIN)
- Forgot password (generate reset token & reset flow dasar) – DIIZINKAN (fase awal minimal)
- Rate limiting login attempts
- Proteksi endpoint via Bearer token
- Validasi minimal password (>= 6 karakter)
- Hash password dengan Argon2
- Error handling seragam untuk kredensial salah

## 3. Di Luar Lingkup (Out of Scope Sekarang)
- Refresh token / rotasi token
- Multi-device session tracking
- Token revocation list (kecuali forced by password change di masa depan)
- Email verification / aktivasi akun
- Advanced audit logging & metrics
- Policy-based authorization granular (CASL, ABAC)
- Password strength enforcement kompleks (hanya panjang min)
- Social login / SSO
- Multi-factor authentication

## 4. Entitas & Model Data (Eksisting + Catatan)
Model `user` (dari Prisma):
```
user {
  id        Int @id @default(autoincrement())
  email     String @unique
  name      String
  password  String  // akan berisi argon2 hash
  role      role    // enum: ORANG_TUA, PEGAWAI, DOKTER, ADMIN
  children  child[]
}
```
Tambahan model untuk forgot password (opsional minimal):
- Tidak menambah kolom dulu (fase awal dapat di-skip implementasi token real; placeholder). Jika dilanjut, usulan tabel:
```
password_reset {
  id Int @id @default(autoincrement())
  userId Int
  tokenHash String
  expiresAt DateTime
  used Boolean @default(false)
  user user @relation(fields: [userId], references: [id])
}
```
Status: implementasi token reset boleh DIKERJAKAN atau ditunda; PRD menandai sebagai opsional minimal.

## 5. Endpoint Spesifikasi
| Endpoint | Method | Auth | Deskripsi | Validasi Utama |
|----------|--------|------|-----------|----------------|
| /auth/register | POST | Public | Registrasi user baru | email unik, password >=6 |
| /auth/login | POST | Public | Login & dapatkan JWT | email/password valid |
| /auth/forgot-password | POST | Public | Inisiasi reset password | email format valid (respon selalu generik) |
| /auth/me | GET | Bearer | Profil user saat ini | Token valid |
| /users | GET | Bearer (ADMIN/PEGAWAI/DOKTER?) *policy final* | List user | Role guard |
| /users/:id/role | PATCH | Bearer (ADMIN) | Ubah role user | Role valid enum |

Catatan: Listing `/users` – jika hanya ADMIN diizinkan, tegaskan saat implementasi. (Saat ini asumsi: ADMIN saja).

## 6. DTO & Payload (Draft)
- POST /auth/register
  - Request: { email, name, password }
  - Response (201): { id, email, name, role }
- POST /auth/login
  - Request: { email, password }
  - Response (200): { accessToken, user: { id, email, name, role } }
- GET /auth/me
  - Response (200): { id, email, name, role }
- POST /auth/forgot-password
  - Request: { email }
  - Response (200): { message: 'If your email exists, reset instructions sent' }
- PATCH /users/:id/role
  - Request: { role }
  - Response (200): { id, email, name, role }

## 7. JWT Konfigurasi
- Algoritma: HS256
- Secret: ACCESS_TOKEN_SECRET (>= 32 byte random) via ENV
- Expiry: 1h (3600s)
- Claims minimal: { sub: user.id, role: user.role, email (opsional) }
- Issuer (opsional): monitoring-app
- Audience (opsional): monitoring-api

## 8. Autentikasi & Autorisasi
- Bearer token di header Authorization
- Guard: JwtAuthGuard (custom extends AuthGuard('jwt'))
- RolesGuard untuk batasi endpoint: gunakan metadata @Roles(...)
- Tidak ada refresh → user harus re-login setelah expiration

## 9. Forgot Password (Level Minimal)
Jika diaktifkan:
1. Terima email
2. Lookup user (jika tidak ada → respon generik)
3. Generate token random (32+ bytes) → hash & simpan (opsional implementasi belakangan)
4. Kirim (placeholder) – saat ini bisa log ke console / skip email real
5. Endpoint reset belum diminta → belum dibuat

Saat ini endpoint hanya inisiasi (POST /auth/forgot-password) tanpa reset implementasi (boleh ditambah nanti).

## 10. Validasi & Error Handling
- Password < 6 → 400 Bad Request
- Email duplicate → 409 Conflict
- Login gagal (email tidak ada / password salah) → 401 Unauthorized (pesan generik: 'Invalid credentials')
- Token expired → 401 Unauthorized
- Token invalid / signature mismatch → 401 Unauthorized
- Akses tanpa role cukup → 403 Forbidden

## 11. Rate Limiting
- Target: /auth/login (misal 5 percobaan / menit / IP) – detail config nanti di module (nestjs-rate-limiter atau ThrottlerModule)
- Ekskalasi (opsional): lock-out sederhana (tidak prioritas awal)

## 12. Keamanan
- Hash: Argon2id default params (dapat disetel memoryCost/timeCost)
- Tidak menyimpan token apa pun di DB
- Helmet middleware di global
- CORS ketat (domain frontend) – implementasi di main.ts
- No sensitive info in error messages
- Env variables: ACCESS_TOKEN_SECRET
- Disarankan: jangan log full JWT

## 13. Integrasi Prisma
- Menggunakan `nestjs-prisma` untuk inject PrismaService
- Query user by email di login & register
- Unique constraint handling pakai try/catch Prisma error code P2002

## 14. Seeding Admin
- Seed script (prisma/seed.ts) membuat user ADMIN jika belum ada
  - email: admin@example.com (placeholder) & password default (harus diubah manual nanti)
- Hash password via argon2 di script

## 15. Non-Functional Requirements
| Area | Kriteria |
|------|----------|
| Performansi | Login < 300ms (termasuk hashing argon2) di hardware wajar |
| Skalabilitas | Stateless (JWT only) – cocok horizontal scaling |
| Observabilitas | Log event auth minimal (login success/fail) |
| Maintainability | Modular (auth module terpisah), mudah tambah refresh token nanti |
| Keamanan | Tidak ada plain password, minimal kebocoran info, best practice hash |

## 16. Risiko & Mitigasi
| Risiko | Mitigasi |
|--------|----------|
| Tidak bisa revoke token aktif | Expiry pendek (1h) |
| Brute force login | Rate limit + argon2 cost |
| Credential stuffing | Bisa tambah monitoring gagal login (fase lanjut) |
| Leak JWT di client | Edukasi penyimpanan (in-memory / secure) |

## 17. Future Enhancements (Backlog)
- Refresh token & rotasi
- Email verification
- Reset password lengkap (token + endpoint /auth/reset-password)
- Multi-factor auth
- Audit trail & login history
- Revocation list / blacklist (Redis)
- Fine-grained permissions (policy-based)

## 18. Definisi Selesai (DoD) Auth Tahap Ini
- Semua endpoint di Section 5 tersedia & terproteksi sesuai ketentuan
- Argon2 hashing berjalan
- JWT 1 jam bekerja & diverifikasi guard
- Role guard menolak akses tidak sah `/users` & patch role
- Rate limit login aktif (konfigurasi baseline)
- Seed admin tersedia
- PRD ini tersimpan di repo root (PRD_AUTH.MD)

## 19. Contoh Alur Utama
1. Register → sukses (201)
2. Login → terima { accessToken }
3. Request GET /auth/me dengan Authorization Bearer <token> → 200 profil
4. Akses /users tanpa role ADMIN → 403
5. Admin ubah role user lain → 200 (role updated)
6. Token kadaluarsa setelah 1h → permintaan berikutnya 401; user re-login

## 20. Open Points (Semua Sudah Diputuskan / None Pending)
Tidak ada keputusan kritikal yang tertunda.

---
Dokumen ini merepresentasikan spesifikasi final tahap awal implementasi auth. Perubahan baru harus melalui update dokumen ini.

## 21. Status Implementasi (Checkpoint)

Legenda: ✅ Selesai | 🟡 Parsial | ⏳ Belum | ❌ Belum & perlu perhatian khusus

### Core Fungsional
- ⏳ POST /auth/register (belum diimplementasi controller + service)
- ⏳ POST /auth/login (belum)
- ⏳ POST /auth/forgot-password (belum)
- ⏳ GET /auth/me (belum)
- 🟡 GET /users (controller sudah ada, guard/roles belum aktif karena guard belum dibuat)
- 🟡 PATCH /users/:id/role (controller ada, proteksi belum lengkap)

### Auth Layer & Keamanan
- ✅ AuthModule dengan JwtModule (expiry 1h) & strategy dasar
- 🟡 JwtStrategy (validate sudah; secret via env diperlukan verifikasi di runtime)
- ⏳ JwtAuthGuard (belum dibuat file)
- ⏳ RolesGuard & @Roles decorator (belum)
- ⏳ @CurrentUser decorator (belum)
- ⏳ DTO & Validation (class-validator belum dipakai, belum ada DTO files)
- ⏳ Global ValidationPipe (belum di main.ts)
- 🟡 Rate limiting: ThrottlerModule terpasang, aplikasi route login belum (butuh guard / decorator) 
- ⏳ Uniform error response wrapper (belum)
- ⏳ Helmet middleware (belum ditambahkan di main.ts)
- ⏳ CORS konfigurasi ketat (belum di main.ts)
- 🟡 Argon2 dependency terpasang & digunakan di seed; register belum memanfaatkan
- ✅ Tidak ada refresh token (sesuai desain)

### Data & Prisma
- ✅ Model user sudah sesuai (tanpa perubahan tambahan)
- ✅ Prisma Client generate OK
- ✅ Seed admin user (script dibuat)
- ⏳ Forgot password storage (opsional; belum dibuat tabel / logika)

### Layanan & Logika
- ⏳ AuthService (masih minimal / kosong untuk register/login)
- 🟡 UsersService (list/find/updateRole ada; validasi peran & proteksi belum final)
- ⏳ Password policy enforcement (min length akan diterapkan saat register DTO)
- ⏳ Error handling invalid credentials seragam (belum implementasi)

### Non-Fungsional & Lain
- ✅ PRD_AUTH.MD dibuat
- 🟡 Rate limit (infrastruktur ada; penerapan endpoint belum)
- ⏳ Logging login success/fail (belum)
- ⏳ Dokumentasi .env contoh (ACCESS_TOKEN_SECRET) belum

### Ringkasan
- Selesai (✅): PRD, seed admin, struktur module dasar, JWT strategy, argon2 dependency, tanpa refresh token.
- Parsial (🟡): Users endpoints (butuh guard), rate limit infra, argon2 penggunaan, UsersService.
- Belum (⏳): Mayoritas endpoint auth, guard, decorator, DTO, validation, security middleware, error standardization, tests.

### Prioritas Next Step (Usulan)
1. Buat DTO (RegisterDto, LoginDto, UpdateRoleDto, ForgotPasswordDto) + ValidationPipe global.
2. Implement AuthService (register + login hashing & JWT signing) + uniform error.
3. Buat JwtAuthGuard, Roles decorator & RolesGuard, CurrentUser decorator.
4. Tambah endpoint /auth/me & integrasi guard pada users controller.
5. Tambah Helmet & CORS & set ACCESS_TOKEN_SECRET contoh.
6. Terapkan rate limit spesifik pada login.
7. Forgot-password stub (generate token dummy / log) jika tetap diinginkan tahap ini.
8. Tambah basic tests (e2e: register->login->me).

Dokumentasi ini akan diperbarui setelah langkah-langkah di atas direalisasikan.
