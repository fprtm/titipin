# Milestone 2 — Explorer M2-2 Investigation & Frontend Blueprint
## Slice 4: Customers & Membership Management UI (`/customers`)

---

## 1. Observation

### 1.1 Existing Frontend Codebase & Routing
- **Directory Layout**: In `apps/frontend/src/app/(dashboard)/`, existing routes include `dashboard/page.tsx`, `pos/page.tsx`, `products/page.tsx`, and `users/page.tsx`. Currently, the route `/customers` (`apps/frontend/src/app/(dashboard)/customers/page.tsx`) does **not exist**.
- **Sidebar Integration**: In `apps/frontend/src/components/layout/sidebar.tsx` (lines 26–34), `/customers` is already registered in `NAV_ITEMS`:
  ```typescript
  { label: 'Data Pelanggan', href: '/customers', icon: Users2 }
  ```
  Crucially, it is defined without `adminOnly: true`, making it visible to both `CASHIER` and `ADMIN`.

### 1.2 Design Tokens & Styling Primitives
- In `apps/frontend/src/app/globals.css`:
  - Canvas background: `.bg-canvas-pattern` (micro dot-matrix radial gradient with `#F8FAFC`).
  - Container panel: `.glass-panel` (blur 16px, saturate 160%, `border: 1px solid rgba(255, 255, 255, 0.70)`, specular rim highlight, `rounded-3xl` / 24px, `p-6` or `p-8`).
  - Item / KPI cards: `.glass-card` (blur 12px, hover emerald accent `rgba(15, 118, 110, 0.35)`, `rounded-2xl` / 16px, `p-5`).
  - Interactive elements: `.glass-button` (`rounded-xl` / 12px), `.glass-input` (`rounded-xl` / 12px, focus ring emerald `#0F766E`).
- In `apps/frontend/src/components/ui/`:
  - `Button` (`components/ui/button.tsx`): Variants `default` (emerald-700), `glass`, `secondary`, `outline`, `destructive`, `ghost`. Sizes `sm`, `default`, `lg`, `icon`. Handles `isLoading` with `Loader2`.
  - `Input` (`components/ui/input.tsx`): Supports `leftIcon`, `rightIcon`, `hasError`, `errorMessage`.
  - `Badge` (`components/ui/badge.tsx`): Variants `success`, `warning`, `destructive`, `info`, `neutral`.

### 1.3 Data Contracts & Schemas
- In `packages/shared/src/schemas/customer.schema.ts`:
  - `createCustomerSchema`:
    - `customer_name`: string, `min(2, 'Nama pelanggan minimal 2 karakter')`, `max(150, 'Nama pelanggan maksimal 150 karakter')`, trimmed.
    - `customer_address`: string, `min(5, 'Alamat minimal 5 karakter')`, `max(255, 'Alamat maksimal 255 karakter')`, trimmed.
    - `gender`: `z.nativeEnum(Gender)` where `Gender.PRIA = 'Pria'`, `Gender.WANITA = 'Wanita'`.
    - `birth_date`: string, regex `^\d{4}-\d{2}-\d{2}$` ('Format tanggal lahir harus YYYY-MM-DD').
    - `phone`: string nullable/optional, `max(20, 'Nomor telepon maksimal 20 karakter')`, trimmed.
  - `updateCustomerSchema`: `createCustomerSchema.partial()`.
  - `customerQuerySchema`: `page` (default 1), `per_page` (default 10, max 100), `search` (string optional), `sort` (string optional), `order` ('asc' | 'desc', default 'asc').
- In `packages/shared/src/types/customer.types.ts`:
  - `CustomerItem`: Contains `id` (UUID), `customerName` / `customer_name`, `customerAddress` / `customer_address`, `gender` ('Pria' | 'Wanita'), `birthDate` / `birth_date`, `phone`, `createdAt` / `created_at`, `updatedAt` / `updated_at`, `deletedAt` / `deleted_at`.
  - `CustomerListResponse`: `{ success: boolean, data: CustomerItem[], meta: PaginationMeta }`.
  - `CustomerDetailResponse`: `{ success: boolean, data: CustomerItem }`.

### 1.4 API Endpoints & RBAC Constraints
- From `ORIGINAL_REQUEST.md § R2` and verified by `apps/backend/test/customers.e2e-spec.ts`:
  - `GET /api/customers` (search & pagination): Cashier & Admin (200 OK).
  - `POST /api/customers` (register customer): Cashier & Admin (201 Created).
  - `GET /api/customers/:id` (customer profile): Cashier & Admin (200 OK, 404 if deleted/missing).
  - `PUT /api/customers/:id` (update customer): Admin ONLY (403 Forbidden for Cashier).
  - `DELETE /api/customers/:id` (soft-delete): Admin ONLY (403 Forbidden for Cashier).

### 1.5 Icon Audit Policy
- Tool verification confirmed all required icons exist in `lucide-react`:
  - `Users2`, `UserPlus`, `User`, `UserCheck`, `Search`, `RefreshCw`, `Edit3`, `Trash2`, `AlertCircle`, `AlertTriangle`, `CheckCircle2`, `Loader2`, `X`, `Phone`, `MapPin`, `Calendar`, `Cake`, `ChevronLeft`, `ChevronRight`, `Filter`.
- `pnpm audit:quality` requires:
  `grep -rn "<svg" apps/frontend/src/` returns 0 occurrences. Zero emoji characters.

---

## 2. Logic Chain

1. **Route Cohesion**: Because `apps/frontend/src/components/layout/sidebar.tsx` already directs to `/customers`, creating `apps/frontend/src/app/(dashboard)/customers/page.tsx` will seamlessly integrate into the authenticated dashboard shell.
2. **RBAC UI Alignment**: Since both Cashier and Admin can create customers (`POST /api/customers`), the "+ Tambah Pelanggan" button must be visible to both roles. However, because updating (`PUT /api/customers/:id`) and soft-deleting (`DELETE /api/customers/:id`) are strictly Admin-only (returning HTTP 403 Forbidden to Cashiers), the "Ubah" and "Hapus" action buttons in each table row must only be visible/interactive when `user.role === 'ADMIN'`.
3. **Gender UI Input (Pills UX)**: The dispatch instruction specifies "gender (Pria/Wanita pills)". Using interactive segmented button pills with `User` icons provides a tactile, touch-friendly UI on mobile/POS terminals while preventing typo errors.
4. **Member Birthday Awareness (`BR-006`)**: Titipin business rule `BR-006` grants a 5% discount (capped at Rp 50.000) when a customer's birth date (`MM-DD`) matches the order date. Rendering a prominent "Ulang Tahun Hari Ini" indicator (`Cake` icon with subtle pulse badge) on the customer list immediately surfaces birthday eligibility to cashiers and admins.
5. **Quality Compliance**: To guarantee 100% pass on `pnpm audit:quality`, all icons must be explicitly imported from `lucide-react` with zero inline `<svg>` and zero emoji characters.

---

## 3. Caveats

- **API Availability**: Backend implementation of `CustomersController` and `CustomersRepository` is being prepared concurrently by Explorer M2-1. Frontend unit tests must mock `apiClient` (`apiClient.get`, `post`, `put`, `delete`) to ensure deterministic testing independent of the live database server.
- **CamelCase vs SnakeCase**: The backend schema uses `customer_name`, `customer_address`, `birth_date`, but the Drizzle model maps to `customerName`, `customerAddress`, `birthDate`. The frontend accessors should use defensive fallbacks:
  `customer.customerName || customer.customer_name`
  `customer.customerAddress || customer.customer_address`
  `customer.birthDate || customer.birth_date`
- **Soft-Delete Representation**: Soft-deleted customers (`deleted_at IS NOT NULL`) are filtered out by the backend query. Once deleted, the UI will display a toast notification and reload the table, excluding the deleted member.

---

## 4. Conclusion & Concrete Component Blueprint

### 4.1 Component Tree Architecture
```
apps/frontend/src/app/(dashboard)/customers/
├── page.tsx                    # Main Client Page Component
└── customers.test.tsx          # Vitest Unit & Integration Test Suite
```

### 4.2 Page Layout & Feature Specifications

#### A. Header Section
- **Title**: `Data Pelanggan & Member`
- **Subtitle**: `Kelola direktori pelanggan, keanggotaan loyalty, dan diskon ulang tahun (BR-006).`
- **Action Buttons**:
  - `Segarkan` (`RefreshCw` icon, `.glass-button`)
  - `+ Tambah Pelanggan` (`UserPlus` icon, `bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl`) — Available to Cashier & Admin.

#### B. KPI Summary Cards (4 Cards Grid)
- `Total Member`: Active customer count (`Users2` icon, emerald badge)
- `Member Pria`: Count of male members (`User` icon, sky/blue badge)
- `Member Wanita`: Count of female members (`User` icon, rose/pink badge)
- `Ultah Hari Ini`: Count of members whose birthday matches today (`MM-DD`) (`Cake` icon, amber badge)

#### C. Search & Filter Toolbar (`.glass-panel`)
- Search input: `.glass-input` with `Search` icon on left, 300ms debounce.
- Gender filter dropdown: `Semua Gender`, `Pria`, `Wanita`.
- Sort dropdown: `Nama (A - Z)`, `Nama (Z - A)`, `Terbaru`, `Terlama`.

#### D. Customer Data Table (`.glass-panel rounded-3xl`)
- Columns:
  1. `Pelanggan`: Avatar initials (`rounded-xl bg-emerald-100 text-emerald-800`), Name, ID snippet (`#uuid...`).
  2. `Gender`: Pill badge (`Pria` or `Wanita`).
  3. `Telepon`: Phone number with `Phone` icon (or `-` if none).
  4. `Tanggal Lahir`: Date with `Calendar` icon + `Cake` badge if birthday is today (`MM-DD`).
  5. `Alamat`: Address text with `MapPin` icon (truncated with `title` tooltip).
  6. `Terdaftar`: Registration date (`formatDate`).
  7. `Aksi` (Admin Only):
     - `Ubah` (`Edit3` icon, `.glass-button`)
     - `Hapus` (`Trash2` icon, border-rose-500/20 bg-rose-500/10 text-rose-600)
- Loading State: `Loader2` spinning indicator with message.
- Empty State: Friendly empty illustration with `Users2` icon and action button to create first customer.

#### E. Pagination & Summary Bar
- Left: "Menampilkan X dari Y data pelanggan aktif"
- Right: "Sebelumnya" (`ChevronLeft`), "Halaman X / Y", "Selanjutnya" (`ChevronRight`).

#### F. Modals & Dialogs

1. **`CreateCustomerModal`** (Cashier & Admin):
   - Form fields:
     - `customer_name`: text input (min 2, max 150 chars)
     - `gender`: interactive pill button group (`Pria` vs `Wanita`)
     - `birth_date`: date input `YYYY-MM-DD` with helper hint for `BR-006` birthday discount
     - `phone`: tel/text input (optional, max 20 chars)
     - `customer_address`: textarea/input (min 5, max 255 chars)
   - Client-side validation before sending POST request.
   - Buttons: `Batal` (`glass-button`) and `Daftar Pelanggan` (`bg-emerald-700 text-white rounded-xl`).

2. **`EditCustomerModal`** (Admin Only):
   - Pre-populated form fields with customer's current data.
   - PUT request to `/api/customers/:id`.
   - Buttons: `Batal` and `Simpan Perubahan`.

3. **`DeleteCustomerDialog`** (Admin Only):
   - Warning dialog with `AlertTriangle` icon.
   - Shows customer name and phone.
   - Text explicitly notes that previous order history is preserved.
   - DELETE request to `/api/customers/:id`.
   - Destructive button: `Hapus Pelanggan` (`bg-rose-600 hover:bg-rose-700 text-white rounded-xl`).

#### G. Notification Banners
- Success banner with `CheckCircle2` and dismiss `X`.
- Error banner with `AlertCircle` and dismiss `X`.

---

## 5. Verification Method

### 5.1 Automated Quality & Test Commands
Once implemented, verify independently using:
```bash
# 1. Zero raw inline SVG audit (must output 0 matches)
grep -rn "<svg" apps/frontend/src/

# 2. Frontend Vitest unit & component test suite
pnpm --filter @titipin/frontend test

# 3. TypeScript Typecheck
pnpm --filter @titipin/frontend typecheck

# 4. ESLint Compliance
pnpm --filter @titipin/frontend lint

# 5. Full Monorepo Quality Pipeline
pnpm audit:quality
```

### 5.2 Test Scenarios for `customers.test.tsx`
1. **Rendering**: Renders customer list with avatar initials, name, gender badge, phone, birth date, address, and KPI metric cards.
2. **Birthday Highlight**: Correctly marks customers with `Cake` icon when birth date `MM-DD` matches today's date.
3. **Search & Debounce**: Typing into search input triggers debounced API call with `search` query parameter.
4. **RBAC Check**:
   - Cashier role sees "+ Tambah Pelanggan" button.
   - Cashier role does NOT see "Ubah" and "Hapus" action buttons.
   - Admin role sees "+ Tambah Pelanggan", "Ubah", and "Hapus" buttons.
5. **Create Customer Flow**: Submits valid registration payload (`customer_name`, `customer_address`, `gender`, `birth_date`, `phone`) to `POST /api/customers`.
6. **Edit Customer Flow**: Prefills existing data and sends `PUT /api/customers/:id`.
7. **Soft Delete Flow**: Opens delete confirmation and executes `DELETE /api/customers/:id`.
8. **Validation**: Displays inline error when required fields are empty or invalid (name < 2 chars, address < 5 chars, invalid date format).
