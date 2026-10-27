# PAGE SPECIFICATION: AUTENTIKASI PENGGUNA (`/login`)
## Titipin POS — Login Screen Specification

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/login` |
| **Akses** | Publik (Guest Only - redirect ke `/dashboard` jika sudah login) |
| **Komponen Utama** | Centered Glass Card, Form Input, Error Banner |
| **API Terkait** | `POST /api/auth/login` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌─────────────────────────────────────────────────────────────┐
│                      bg-canvas-pattern                      │
│                                                             │
│             ┌─────────────────────────────────┐             │
│             │   TITIPIN POS (glass-panel)     │             │
│             │   [rounded-3xl, p-8, max-w-md]  │             │
│             │                                 │             │
│             │   [Logo Icon] Titipin POS       │             │
│             │   Sistem Kasir & Order Mgmt     │             │
│             │                                 │             │
│             │   [ Alert Banner Error (401) ]  │             │
│             │                                 │             │
│             │   Email Staf                    │             │
│             │   [ admin@titipin.id          ] │             │
│             │                                 │             │
│             │   Kata Sandi                    │             │
│             │   [ **********           (eye)] │             │
│             │                                 │             │
│             │   ┌───────────────────────────┐ │             │
│             │   │  Masuk ke Sistem (Button) │ │             │
│             │   └───────────────────────────┘ │             │
│             │                                 │             │
│             │   © 2026 Titipin Retail POS     │             │
│             └─────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. SPESIFIKASI FORM & VALIDASI ZOD

### 2.1 Schema Validasi Client (`features/auth/schemas/login.schema.ts`)
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

### 2.2 Elemen UI & State Interaktif
1. **Container Luar:**
   * `min-h-screen w-full flex items-center justify-center p-4 bg-canvas-pattern`.
2. **Kartu Kaca (`glass-panel`):**
   * Kelas: `w-full max-w-md p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6`.
3. **Input Email:**
   * Komponen: `<Input />` (`rounded-xl h-12 px-4`).
   * Placeholder: `nama@titipin.id`.
   * Auto-focus aktif saat halaman pertama kali dibuka.
4. **Input Password:**
   * Tipe dinamis `type={showPassword ? 'text' : 'password'}` dengan tombol toggle Lucide `Eye` / `EyeOff`.
5. **Tombol Masuk:**
   * Komponen: `<Button variant="default" size="lg" className="w-full rounded-xl h-12 font-semibold">`.
   * Loading state: saat request dikirim, teks diganti dengan icon spinner `Loader2` berputar dan label "Memverifikasi...".
6. **Error Alert Banner:**
   * Jika menerima `401 Unauthorized`:
     * Muncul banner merah kaca (`bg-rose-50/90 border border-rose-300 text-rose-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in`).
     * Pesan: "Email atau kata sandi tidak valid. Silakan coba kembali." (Pesan seragam tanpa membocorkan status akun nonaktif / `BR-010`).

---

## 3. SIKLUS HIDUP AUTENTIKASI SETELAH LOGIN SUKSES
1. Client menerima respon `200 OK` dengan payload:
   * `access_token` disimpan **hanya in-memory** pada state AuthProvider/React Context.
   * `refresh_token` otomatis terpasang di browser melalui cookie `HttpOnly` oleh backend.
2. Axios client mengonfigurasi header default `Authorization: Bearer <access_token>`.
3. Router Next.js mengarahkan pengguna secara otomatis ke halaman `/pos` (jika role `CASHIER`) atau ke `/dashboard` (jika role `ADMIN`).
