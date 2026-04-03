# Multi-Vendor Frontend Implementation Guide

## Overview

The backend now supports **multi-vendor isolation**. Each vendor operates as an independent business unit with its own administrators, dealers, agents, configuration, draws, and data. A **super admin** (`is_superuser=True`) has cross-vendor access.

---

## 1. New Data Model Concepts

### Vendor Hierarchy

```
Super Admin (is_superuser=True)
  └── sees ALL vendors, manages Vendor & VendorDraw CRUD
      
Vendor
  ├── Administrator(s) — is_main_vendor=True (full access) or False (staff)
  ├── Dealer(s) — each belongs to exactly one vendor
  │   └── Agent(s) — inherit vendor from their dealer
  ├── AppConfiguration — one per vendor (prizes, commission, app active status)
  ├── VendorDraw(s) — which draws are assigned to this vendor
  └── LimitNumberCount — vendor-level limits (new config_level='vendor')
```

### Key Rules
- **Data isolation**: Administrators only see dealers/agents/bookings/payments within their own vendor.
- **Super admin** (`is_superuser=True`) bypasses vendor scoping and sees everything.
- **Dealers** are auto-assigned to the creating admin's vendor.
- **Prize/commission hierarchy** now flows: `Global (super admin) → Vendor → Dealer → Agent`.
- **Number limit hierarchy** now flows: `Global → Vendor → Admin-Dealer → Dealer-Agent`.

---

## 2. Authentication Changes

### 2.1 Administrator Login

**Endpoint:** `POST /administrator/login/`

#### Removed Fields (request body)
| Old Field | Status |
|---|---|
| `pre_login_token` | **REMOVED** — no longer needed |

#### New Response Fields
| Field | Type | Description |
|---|---|---|
| `is_main_vendor` | `boolean` | `true` if this admin is the main vendor admin (full access) |
| `vendor_name` | `string\|null` | Name of the vendor, `null` for super admin |

#### Old Response
```json
{
  "access": "eyJ...",
  "user_details": {
    "user_id": 1,
    "username": "admin1",
    "user_type": "ADMINISTRATOR",
    "application_status": true,
    "superuser": false
  }
}
```

#### New Response
```json
{
  "access": "eyJ...",
  "user_details": {
    "user_id": 1,
    "username": "admin1",
    "user_type": "ADMINISTRATOR",
    "application_status": true,
    "superuser": false,
    "is_main_vendor": true,
    "vendor_name": "ABC"
  }
}
```

#### Frontend Changes Required
```javascript
// After login, store the new fields
const loginResponse = await api.post('/administrator/login/', { username, password });
const { user_details } = loginResponse.data;

// Store these for UI logic
localStorage.setItem('is_main_vendor', user_details.is_main_vendor);
localStorage.setItem('vendor_name', user_details.vendor_name);
localStorage.setItem('is_superuser', user_details.superuser);

// Use for conditional UI rendering:
// - Super admin (superuser=true): show Vendor CRUD, Draw CRUD, VendorDraw management
// - Main vendor admin (is_main_vendor=true): show Administrator management, full vendor access
// - Staff admin (is_main_vendor=false): limited access within vendor
```

### 2.2 Dealer Login

**Endpoint:** `POST /dealer/login/`

#### Removed Fields (request body)
| Old Field | Status |
|---|---|
| `pre_login_token` | **REMOVED** |

#### Request Body — New
```json
{
  "username": "dealer1",
  "password": "pass123"
}
```

No response structure changes. Login works the same, just without `pre_login_token`.

### 2.3 Agent Login

**Endpoint:** `POST /agent/login/`

#### Removed Fields (request body)
| Old Field | Status |
|---|---|
| `pre_login_token` | **REMOVED** |

Same simplification — just `username` + `password`.

---

## 3. Removed Endpoints

| Old Endpoint | Status | Reason |
|---|---|---|
| `POST /user/verify-calculate-str/` | **REMOVED** | Pre-login token flow eliminated |

### Frontend Action Required
- Remove any code that calls `/user/verify-calculate-str/`.
- Remove any `pre_login_token` storage/handling logic.
- The `GET /user/get-initial-user-creds/` endpoint still exists but no longer accepts `?type=new`. It always returns the old-format `{calculate_str: secret_pin}` map.

#### Old Flow (remove this)
```
1. GET /user/get-initial-user-creds/?type=new  →  get calculate_str list
2. POST /user/verify-calculate-str/            →  get pre_login_token
3. POST /administrator/login/ { username, password, pre_login_token }
```

#### New Flow
```
1. GET /user/get-initial-user-creds/           →  get {calculate_str: secret_pin} map
2. POST /administrator/login/ { username, password }
```

---

## 4. New Endpoints (Super Admin Only)

### 4.1 Vendor CRUD

**Base URL:** `/administrator/vendors/`  
**Permission:** Super Admin only (`is_superuser=True`)

| Method | URL | Description |
|---|---|---|
| `GET` | `/administrator/vendors/` | List all vendors |
| `POST` | `/administrator/vendors/` | Create a new vendor |
| `GET` | `/administrator/vendors/{id}/` | Retrieve vendor |
| `PUT` | `/administrator/vendors/{id}/` | Update vendor |
| `PATCH` | `/administrator/vendors/{id}/` | Partial update vendor |
| `DELETE` | `/administrator/vendors/{id}/` | Delete vendor |

#### Vendor Object
```json
{
  "id": 1,
  "name": "ABC"
}
```

#### Create Vendor
```javascript
// POST /administrator/vendors/
const response = await api.post('/administrator/vendors/', { name: 'New Vendor' });
// This also auto-creates an AppConfiguration for the new vendor
```

> **Note:** When a vendor is created, an `AppConfiguration` record is automatically created for it with `default_dealer_commission=0`. The super admin should then configure prizes/commission via the prize-configuration endpoint.

### 4.2 Vendor-Draw Assignment

**Base URL:** `/administrator/vendor-draws/`  
**Permission:** Super Admin only

This controls which draws are visible/available to each vendor.

| Method | URL | Description |
|---|---|---|
| `GET` | `/administrator/vendor-draws/` | List all vendor-draw assignments |
| `POST` | `/administrator/vendor-draws/` | Assign a draw to a vendor |
| `GET` | `/administrator/vendor-draws/{id}/` | Retrieve assignment |
| `PUT` | `/administrator/vendor-draws/{id}/` | Update assignment |
| `DELETE` | `/administrator/vendor-draws/{id}/` | Remove draw from vendor |

#### Filtering
```
GET /administrator/vendor-draws/?vendor=1
GET /administrator/vendor-draws/?draw=3
GET /administrator/vendor-draws/?vendor=1&draw=3
```

#### VendorDraw Object
```json
{
  "id": 1,
  "vendor": 1,
  "draw": 3,
  "vendor_name": "ABC",
  "draw_name": "Morning Draw"
}
```

#### Assign Draw to Vendor
```javascript
// POST /administrator/vendor-draws/
await api.post('/administrator/vendor-draws/', { vendor: 2, draw: 3 });
```

### 4.3 Draw CRUD (Permission Change)

**Endpoint:** `/draw/` (AdminDrawViewSet)

**Old permission:** `IsAdministrator` (any admin)  
**New permission:** `IsSuperAdmin` (super admin only)

Only the super admin can create/edit/delete draws. Vendor admins can only view draws assigned to their vendor.

---

## 5. Changed Endpoints — Administrator Management

### 5.1 Administrator CRUD

**Base URL:** `/administrator/administrator/`

**Old permission:** `IsAdministrator` (any admin)  
**New permission:** `IsMainVendor` (main vendor admin or super admin)

Only `is_main_vendor=true` admins (or super admin) can manage other administrators.

#### New Fields in Administrator Object

| Field | Type | Description |
|---|---|---|
| `vendor` | `integer` | Vendor ID this admin belongs to |
| `is_main_vendor` | `boolean` | Whether this admin is the main admin for the vendor |

#### Vendor Scoping
- **Main vendor admin**: sees only administrators in their own vendor.
- **Super admin**: sees all administrators (across all vendors).

#### Create Administrator Example
```javascript
// POST /administrator/administrator/
await api.post('/administrator/administrator/', {
  username: 'new_admin',
  password: 'pass123',
  user_type: 'ADMINISTRATOR',
  vendor: 2,           // which vendor this admin belongs to
  is_main_vendor: false // staff admin (true = main admin)
});
```

---

## 6. Changed Endpoints — Dealer Management

### 6.1 Dealer CRUD

**Endpoint:** `/administrator/dealer/`

#### Vendor Auto-Assignment
- The `vendor` field is **read-only** on create/update.
- Dealers are automatically assigned to the creating admin's vendor.
- The `vendor` field is **excluded** from the dealer list/detail serializer response.

#### Vendor Scoping
- **Vendor admin**: only sees dealers belonging to their vendor.
- **Super admin**: sees all dealers.

No frontend changes needed — dealer CRUD works the same, just scoped automatically.

---

## 7. Draw & Session Scoping

### 7.1 List Draws

**Endpoint:** `GET /draw/list/`

#### Old Behavior
Returns all draws (excluding test draws for non-test users).

#### New Behavior
- **Vendor users** (admin/dealer/agent): only see draws assigned to their vendor via `VendorDraw`.
- **Super admin**: sees all draws.

No query parameter changes. The filtering is automatic based on the authenticated user.

### 7.2 Get Draw Sessions

**Endpoint:** `GET /draw/{id}/`

Same vendor scoping — a vendor user can only retrieve draws assigned to their vendor.

---

## 8. Number Limit Configuration Changes

### 8.1 New Config Level: `vendor`

**Endpoint:** `/draw/limit-number/`

#### Old Config Levels
| Value | Label | Meaning |
|---|---|---|
| `global` | Admin Global | Admin sets limit for all |
| `admin_dealer` | Admin-set Dealer | Admin sets limit for specific dealer |
| `dealer_agent` | Dealer Self-set | Dealer sets limit for their agents |

#### New Config Levels
| Value | Label | Meaning |
|---|---|---|
| `global` | Super Admin Global | Super admin sets limit for all vendors |
| `vendor` | Vendor | Vendor-level limit |
| `admin_dealer` | Vendor-set Dealer | Vendor admin sets limit for specific dealer |
| `dealer_agent` | Dealer Self-set | Dealer sets limit for their agents (unchanged) |

#### Limit Hierarchy (most specific wins)
```
dealer_agent  →  admin_dealer  →  vendor  →  global
```

#### Queryset Scoping
- **Super admin**: sees `global` + `vendor` level limits.
- **Vendor admin**: sees `vendor` (their vendor) + `admin_dealer` (their vendor's dealers) limits.
- **Dealer**: sees `dealer_agent` limits (unchanged).

#### Frontend Filter Update
If you have a dropdown to filter by `config_level`:

```html
<!-- Old -->
<option value="global">Admin Global</option>
<option value="admin_dealer">Admin-set Dealer</option>
<option value="dealer_agent">Dealer Self-set</option>

<!-- New -->
<option value="global">Super Admin Global</option>
<option value="vendor">Vendor</option>
<option value="admin_dealer">Vendor-set Dealer</option>
<option value="dealer_agent">Dealer Self-set</option>
```

#### New LimitNumberCount Fields

| Field | Type | Description |
|---|---|---|
| `vendor` | `integer\|null` | Vendor ID — required when `config_level=vendor`, null otherwise |

#### Creating Vendor-Level Limits (super admin or vendor admin)
```javascript
// POST /draw/limit-number/
await api.post('/draw/limit-number/', {
  draw: 1,
  vendor: 2,           // required for vendor-level
  dealer: null,        // must be null for vendor-level
  config_level: 'vendor',
  number: '123',
  count: 50,
  limit_type: 'single_number',
  number_type: 'triple_digit'
});
```

---

## 9. Booking & Report Endpoints — Automatic Scoping

The following endpoints now automatically scope data to the authenticated user's vendor. **No query parameter or request body changes required.**

| Endpoint | Change |
|---|---|
| `GET /draw-booking/booking/` (list) | Admin sees only vendor's bookings |
| `DELETE /draw-booking/booking/{id}/` | Admin can only delete vendor's bookings |
| `GET /draw-booking/booking-detail/` | Admin sees only vendor's booking details |
| `GET /draw-booking/sales-report/` | Admin sees only vendor's sales |
| `GET /draw-booking/my-commission/` | Admin sees only vendor's commissions |
| `GET /draw-booking/daily-report/` | Admin sees only vendor's daily report |
| `GET /draw-booking/booking-report/` | Admin sees only vendor's booking report |
| `GET /draw-result/winners/` | Admin sees only vendor's winners |
| `GET /draw-result/winners-optimized/` | Admin sees only vendor's winners |
| `GET /draw-result/dashboard/` | Admin sees only vendor's dashboard data |
| `GET /draw-result/daily-sales-report/` | Admin sees only vendor's dealer sales |
| `GET /draw-payment/dealers-pending-balance/` | Admin sees only vendor's dealers |
| `GET /draw-payment/dealers-pending-balance-fast/` | Admin sees only vendor's dealers |
| `GET /draw-payment/agents-pending-balance/` | Admin sees only vendor's agents |
| `GET /draw-payment/bank-details/` | Dealer sees their vendor admin's bank details |

**No frontend code changes needed for these** — the backend handles vendor scoping transparently.

---

## 10. Prize Configuration Scoping

**Endpoint:** `/administrator/prize-configuration/{id}/`

#### Old Behavior
Returns the single global `AppConfiguration`.

#### New Behavior
- **Vendor admin**: sees only their vendor's `AppConfiguration`.
- **Super admin**: sees all configurations.

Each vendor has its own `AppConfiguration` with independent:
- `is_active` (app active/inactive per vendor)
- `default_dealer_commission`
- All prize fields (`single_digit_prize`, `double_digit_prize`, etc.)

---

## 11. Application Activate/Deactivate — Per Vendor

**Endpoints:**
- `POST /administrator/activate/`
- `POST /administrator/deactivate/`

#### Old Behavior
Toggles the single global `AppConfiguration.is_active`.

#### New Behavior
Toggles the `is_active` for the authenticated admin's vendor configuration only. Each vendor can be independently active/inactive.

---

## 12. Agent Management Scoping

**Endpoint:** `/agent/` (AgentViewSet, for admin users)

#### New Behavior
- **Vendor admin**: sees only agents whose dealer belongs to their vendor.
- **Super admin**: sees all agents.
- **Dealer**: unchanged — sees only their own agents.

---

## 13. Bank Details — Vendor Admin Resolution

**Endpoint:** `GET /draw-payment/bank-details/`

#### Old Behavior (Dealer view)
Returns bank details for the hardcoded `MAIN_ADMIN_ID`.

#### New Behavior (Dealer view)
Returns bank details for the **main vendor admin** (`is_main_vendor=True`) of the dealer's vendor.

No frontend changes required — the response structure is identical:
```json
{
  "admin_bank_details": { ... },
  "dealer_bank_details": { ... }
}
```

---

## 14. Daily Sales Report — Vendor Admin Resolution

**Endpoint:** `GET /draw-result/daily-sales-report/`

#### Old Behavior
Uses hardcoded `MAIN_ADMIN_ID` for admin bank details.

#### New Behavior
Resolves the main vendor admin dynamically based on the dealer's vendor.

No response structure changes.

---

## 15. UI Conditional Rendering Guide

### Role-Based Feature Matrix

| Feature | Super Admin | Main Vendor Admin | Staff Vendor Admin | Dealer | Agent |
|---|---|---|---|---|---|
| Vendor CRUD | Yes | No | No | No | No |
| VendorDraw management | Yes | No | No | No | No |
| Draw CRUD | Yes | No | No | No | No |
| Administrator CRUD | Yes | Yes (own vendor) | No | No | No |
| Global number limits | Yes | No | No | No | No |
| Vendor number limits | Yes | Yes (own vendor) | Yes (own vendor) | No | No |
| Dealer CRUD | Yes | Yes (own vendor) | Yes (own vendor) | No | No |
| App activate/deactivate | Yes | Yes (own vendor) | Yes (own vendor) | No | No |
| View dashboard | Yes | Yes (own vendor) | Yes (own vendor) | No | No |

### Detecting User Role in Frontend

```javascript
function getUserRole() {
  const isSuperUser = localStorage.getItem('is_superuser') === 'true';
  const isMainVendor = localStorage.getItem('is_main_vendor') === 'true';
  const userType = localStorage.getItem('user_type');

  if (userType === 'ADMINISTRATOR') {
    if (isSuperUser) return 'SUPER_ADMIN';
    if (isMainVendor) return 'MAIN_VENDOR_ADMIN';
    return 'STAFF_VENDOR_ADMIN';
  }
  return userType; // 'DEALER' or 'AGENT'
}
```

### Sidebar/Navigation Example

```javascript
const role = getUserRole();

const menuItems = [
  // Always visible to admins
  { label: 'Dashboard', path: '/dashboard', roles: ['SUPER_ADMIN', 'MAIN_VENDOR_ADMIN', 'STAFF_VENDOR_ADMIN'] },
  { label: 'Dealers', path: '/dealers', roles: ['SUPER_ADMIN', 'MAIN_VENDOR_ADMIN', 'STAFF_VENDOR_ADMIN'] },
  
  // Super admin only
  { label: 'Vendors', path: '/vendors', roles: ['SUPER_ADMIN'] },
  { label: 'Vendor Draws', path: '/vendor-draws', roles: ['SUPER_ADMIN'] },
  { label: 'Draws', path: '/draws', roles: ['SUPER_ADMIN'] },
  { label: 'Global Limits', path: '/global-limits', roles: ['SUPER_ADMIN'] },
  
  // Main vendor admin + super admin
  { label: 'Administrators', path: '/administrators', roles: ['SUPER_ADMIN', 'MAIN_VENDOR_ADMIN'] },
];

const visibleItems = menuItems.filter(item => item.roles.includes(role));
```

### Vendor Name Display
```html
<!-- Show current vendor context in navbar/header -->
<span class="vendor-badge" v-if="vendorName">
  {{ vendorName }}
</span>
```

---

## 16. Super Admin — Vendor Management Pages

### 16.1 Vendors List Page

```javascript
// Fetch all vendors
const vendors = await api.get('/administrator/vendors/');

// vendors.data = [
//   { "id": 1, "name": "ABC" },
//   { "id": 2, "name": "XYZ" }
// ]
```

### 16.2 Create Vendor Form

```html
<form @submit="createVendor">
  <input v-model="vendorName" placeholder="Vendor Name" required />
  <button type="submit">Create Vendor</button>
</form>
```

```javascript
async function createVendor() {
  await api.post('/administrator/vendors/', { name: vendorName });
  // Auto-creates AppConfiguration for this vendor
  // Next: assign draws via /administrator/vendor-draws/
}
```

### 16.3 Assign Draws to Vendor

```javascript
// Fetch available draws
const draws = await api.get('/draw/');  // super admin sees all draws

// Fetch current assignments for a vendor
const assignments = await api.get('/administrator/vendor-draws/?vendor=2');

// Assign a draw
await api.post('/administrator/vendor-draws/', { vendor: 2, draw: 1 });

// Unassign a draw
await api.delete(`/administrator/vendor-draws/${assignmentId}/`);
```

---

## 17. Migration Checklist

### Must Do
- [ ] Remove `pre_login_token` from all login requests (admin, dealer, agent)
- [ ] Remove `/user/verify-calculate-str/` API call and related logic
- [ ] Remove `?type=new` query param from `/user/get-initial-user-creds/`
- [ ] Store `is_main_vendor` and `vendor_name` from admin login response
- [ ] Add role-based conditional rendering (super admin vs main vendor vs staff)
- [ ] Hide Draw CRUD, Vendor CRUD, VendorDraw management for non-super-admin users
- [ ] Hide Administrator management for non-main-vendor admins

### Should Do
- [ ] Add Vendor management page (super admin)
- [ ] Add Vendor-Draw assignment page (super admin)
- [ ] Display vendor name in admin UI header/navbar
- [ ] Update config_level dropdown labels in number limits UI
- [ ] Add `vendor` config_level option in number limits forms

### No Changes Needed
- [ ] All booking CRUD operations (auto-scoped)
- [ ] All report endpoints (auto-scoped)
- [ ] All payment endpoints (auto-scoped)
- [ ] Winner views (auto-scoped)
- [ ] Dashboard API (auto-scoped)
- [ ] Dealer/Agent login flow (just remove `pre_login_token`)
- [ ] Agent CRUD by dealer (unchanged)

---

## 18. Summary of Parameter Changes

| Endpoint | Parameter | Old | New |
|---|---|---|---|
| `POST /administrator/login/` | `pre_login_token` | optional field | **REMOVED** |
| `POST /dealer/login/` | `pre_login_token` | optional field | **REMOVED** |
| `POST /agent/login/` | `pre_login_token` | optional field | **REMOVED** |
| `POST /user/verify-calculate-str/` | entire endpoint | existed | **REMOVED** |
| `GET /user/get-initial-user-creds/` | `?type=new` | returned list | **REMOVED** (always returns map) |
| `GET /draw/limit-number/` | `config_level` filter | `global`, `admin_dealer`, `dealer_agent` | Added `vendor` option |
| `POST /draw/limit-number/` | `vendor` field | did not exist | New field (required when `config_level=vendor`) |
| `POST /administrator/dealer/` | `vendor` field | did not exist | Auto-set (read-only) |
| `POST /administrator/administrator/` | `vendor`, `is_main_vendor` | did not exist | New fields (super admin sets) |
