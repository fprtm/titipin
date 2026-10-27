# PAGE SPECIFICATION: AUDIT TRAIL TERPUSAT (`/audit-logs`)
## Titipin POS — Centralized System Audit Log Viewer

| Metadata | Keterangan |
| :--- | :--- |
| **Route** | `/audit-logs` |
| **Akses** | **ADMIN ONLY** (`role: ADMIN`). Kasir diblokir 403 Forbidden. |
| **Komponen Utama** | Data Table Audit Kaca, Multi-Filter Toolbar, Modal Diff Payload JSON |
| **API Terkait** | `GET /api/audit-logs` |

---

## 1. STRUKTUR VISUAL & WIREFRAME (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Audit Trail Aktivitas Pengguna Sistem                          │
│                                                                        │
│ ┌───────────────┐ ┌────────────────┐ ┌───────────────┐ ┌─────────────┐ │
│ │ [Pilih Staf ] │ │ [Aksi: Semua ] │ │ [Entitas: All]│ │ [Rentang Tgl]│ │
│ └───────────────┘ └────────────────┘ └───────────────┘ └─────────────┘ │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ TABEL AUDIT (glass-panel rounded-2xl)                              │ │
│ │ WAKTU            PENGGUNA        AKSI           ENTITAS    AKSI    │ │
│ │ ──────────────── ─────────────── ────────────── ────────── ─────── │ │
│ │ 27/10/26 14:35   Kasir Utama     ORDER_CREATED  ORDER #1   [Diff]  │ │
│ │ 27/10/26 14:20   Admin Titipin   PRODUCT_UPDATED PRODUCT #5[Diff]  │ │
│ │ 27/10/26 12:00   Admin Titipin   AUTH_LOGIN     AUTH       [Diff]  │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ Menampilkan 1 - 10 dari 240 log aktivitas [Prev] [1] [2] [Next]    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MODAL INSPEKSI DIFF PAYLOAD (`AuditDiffModal`)

* **Trigger:** Tombol `[Lihat Diff]` pada baris log audit.
* **Container:** `<Dialog />` (`rounded-3xl p-8 max-w-2xl glass-panel`).
* **Visual Diff:**
  * Menampilkan JSON perbandingan sebelum dan sesudah mutasi (*before vs after*).
  * Format teks monospace `font-mono text-xs bg-slate-900 text-slate-100 p-5 rounded-2xl overflow-x-auto`.
  * Highlight hijau untuk baris baru / nilai setelah perubahan, dan merah untuk nilai lama sebelum perubahan.
