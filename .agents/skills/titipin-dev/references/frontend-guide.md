# TITIPIN DEV — FRONTEND ARCHITECTURE & STYLING GUIDE
## Next.js 15 App Router, React 19, TanStack Query, Glassmorphism & Lucide Icons

This guide provides explicit rules and patterns for building user interfaces in `apps/frontend/`.

---

## 1. STRUKTUR FOLDER FRONTEND (`apps/frontend/`)

```
apps/frontend/src/
├── app/                     # App Router pages and layouts
│   ├── (auth)/              # Route group login: /login
│   │   └── login/page.tsx
│   ├── (dashboard)/         # Authenticated app shell with glass sidebar/header
│   │   ├── layout.tsx       # App shell layout (sidebar, topbar, mobile drawer)
│   │   ├── page.tsx         # Redirect to /pos or /dashboard
│   │   ├── pos/page.tsx     # POS checkout terminal
│   │   ├── products/page.tsx # Product catalog
│   │   ├── customers/page.tsx# Member directory
│   │   ├── orders/          # Order history & detail
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── users/page.tsx   # Staff accounts (Admin only)
│   │   ├── audit-logs/page.tsx # Security audit trail (Admin only)
│   │   └── dashboard/page.tsx # Metrics & sales trends
│   ├── layout.tsx           # Root HTML, fonts, QueryClientProvider, Toaster
│   └── globals.css          # Tailwind CSS directives, glass classes, thermal print CSS
├── components/
│   ├── ui/                  # Reusable primitives (button, badge, input, dialog, sheet, datatable)
│   ├── pos/                 # POS-specific widgets (cart, product-grid, payment-modal, hold-modal)
│   └── layouts/             # App shell components (sidebar, topbar, user-menu)
├── hooks/                   # Custom hooks (useCart, useAuth, useDebounce)
├── lib/
│   ├── api-client.ts        # Axios instance with JWT refresh token mutex queue
│   ├── query-client.ts      # TanStack Query client configuration
│   └── utils.ts             # cn() classnames helper, formatCurrency(), formatDate()
└── middleware.ts            # Edge SSR route protection (redirect unauthorized users)
```

---

## 2. ATURAN KOMPONEN: SERVER VS CLIENT

1. **Default ke Server Components**: Seluruh layout dan halaman yang hanya mengambil data awal dibuat sebagai Server Component (tanpa `'use client'`).
2. **Kapan Menggunakan `'use client'`**:
   - Komponen interaktif yang menggunakan state (`useState`, `useReducer`).
   - Komponen yang menggunakan React hooks (`useCart`, `useQuery`, `useMutation`).
   - Komponen yang mendengarkan event DOM (`onClick`, `onChange`, `onSubmit`).
   - Komponen modal, sheet drawer, dan dropdown menu.

---

## 3. INTEGRASI API: AXIOS MUTEX & TANSTACK QUERY V5

### 3.1 Axios Instance dengan Queue Refresh Mutex (`lib/api-client.ts`)
Ketika Access Token (15 menit) kedaluwarsa (401 Unauthorized), Axios menahan request yang sedang berjalan dan mengeksekusi refresh token secara tunggal (*mutex lock*) untuk mencegah multiple refresh calls:

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true, // Wajib untuk transfer HttpOnly refresh token cookie
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh');
        const newToken = data.data.accessToken;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        failedQueue.forEach((prom) => prom.resolve(newToken));
        failedQueue = [];
        return apiClient(originalRequest);
      } catch (refreshError) {
        failedQueue.forEach((prom) => prom.reject(refreshError));
        failedQueue = [];
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

### 3.2 Konvensi TanStack Query v5
Gunakan query key factories untuk cache invalidation yang deterministik:
```typescript
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: { page: number; search?: string }) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

// Penggunaan di hook:
export function useProducts(filters: { page: number; search?: string }) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      const res = await apiClient.get('/products', { params: filters });
      return res.data;
    },
  });
}
```

---

## 4. DESIGN TOKENS & TACTILE GLASSMORPHISM

### 4.1 Kelas Utilitas Kaca (Wajib Digunakan)
Terapkan kelas utility kaca dari `docs/design/TOKENS.md`:
* `.glass-panel`: Untuk container utama (dashboard shell, card POS, modal)
* `.glass-card`: Untuk item kartu produk dan invoice
* `.glass-button`: Untuk tombol aksi dengan subtle hover highlight
* `.glass-input`: Untuk search bar dan form input

### 4.2 Skala Sudut & Spacing
* Radius kurva: Gunakan `rounded-xl` (12px) untuk input/button, `rounded-2xl` (16px) untuk card, `rounded-3xl` (24px) untuk container panel.
* Padding: Desain mengutamakan *breathable padding* (`p-6` hingga `p-8` pada desktop, `p-4` pada mobile).

### 4.3 Struk Thermal Print Styling
```css
@media print {
  body * {
    visibility: hidden;
  }
  #thermal-receipt, #thermal-receipt * {
    visibility: visible;
  }
  #thermal-receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm;
    font-family: monospace;
    font-size: 11px;
    color: black;
  }
}
```

---

## 5. KEBIJAKAN ICON: MUTLAK HANYA `lucide-react`

* **DILARANG KERAS**: Menggunakan tag `<svg>`, elemen inline SVG, atau emoji teks.
* **WAJIB**: Import icon resmi dari `lucide-react`. Contoh:
  ```tsx
  import { ShoppingBag, CreditCard, Banknote, Search, Printer, AlertTriangle } from 'lucide-react';
  ```
