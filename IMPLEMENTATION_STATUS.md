# Module Access Control & Penyokong Workflow - Implementation Status

## Current Status: Foundation Complete ✅

The system foundation is now in place with the core infrastructure for module-based access control and the three-step supplement approval workflow.

---

## What's Implemented

### ✅ Step 1: Database Schema
- SQL migration to add `module_permissions` JSONB column to profiles
- Migration to add `supporter_id`, `supporter_status`, `supporter_notes`, `supporter_reviewed_at` to supplement_requests
- Migration to add `coordinator_notes` field for coordinator feedback
- Migration updates status enum to include `'semakan_lulus'`, `'semakan_tolak'`, `'partial'`

**Status**: Completed by user (SQL run in Supabase)

---

### ✅ Step 2: TypeScript Type Definitions (`src/types/index.ts`)
```typescript
// New ModulePermissions interface
export interface ModulePermissions {
  athletes: boolean
  inbody: boolean
  supplement: boolean
  physio: boolean
  fitness: boolean
  strength: boolean
  reports: boolean
  supplement_coordinator: boolean
  supplement_supporter: boolean
  supplement_approver: boolean
}

// Updated Profile interface
export interface Profile {
  id: string
  full_name: string
  role: UserRole
  module_permissions: ModulePermissions  // ← NEW
  created_at: string
}

// Extended SupplementRequest with workflow fields
export interface SupplementRequest {
  // ... existing fields ...
  status: 'pending' | 'semakan_lulus' | 'semakan_tolak' | 'approved' | 'partial'  // ← UPDATED
  coordinator_id?: string        // ← NEW
  coordinator_notes?: string     // ← NEW
  supporter_id?: string          // ← NEW
  supporter_status?: 'sokong' | 'tidak_sokong'  // ← NEW
  supporter_notes?: string       // ← NEW
  supporter_reviewed_at?: string // ← NEW
}
```

**Status**: ✅ Complete

---

### ✅ Step 3: Authentication Context
No changes needed - `AuthContext` already fetches all profile fields with `select('*')`.

**Status**: ✅ Complete (verified)

---

### ✅ Step 4: Protected Route with Module Checks (`src/components/ProtectedRoute.tsx`)
```typescript
interface Props {
  children: React.ReactNode
  roles?: UserRole[]
  module?: keyof ModulePermissions  // ← NEW
}

export function ProtectedRoute({ children, roles, module }: Props) {
  // ... existing role checks ...
  
  const isSuperAdmin = profile?.role === 'superadmin'
  if (module && !isSuperAdmin && profile && !profile.module_permissions?.[module]) {
    return <AccessDeniedPage />  // ← Shows if module access denied
  }
  
  return <>{children}</>
}
```

**Status**: ✅ Complete

---

### ✅ Step 5: Route-Level Module Protection (`src/App.tsx`)
All routes now have module guards:
```typescript
<Route path="athletes" element={<ProtectedRoute module="athletes"><AthletesPage /></ProtectedRoute>} />
<Route path="fitness/strength" element={<ProtectedRoute module="strength"><StrengthPage /></ProtectedRoute>} />
<Route path="performance/inbody" element={<ProtectedRoute module="inbody"><InBodyPage /></ProtectedRoute>} />
<Route path="performance/supplement" element={<ProtectedRoute module="supplement"><SupplementPage /></ProtectedRoute>} />
<Route path="rehabilitation/physio" element={<ProtectedRoute module="physio"><PhysioPage /></ProtectedRoute>} />
<Route path="fitness/testing" element={<ProtectedRoute module="fitness"><FitnessTestingPage /></ProtectedRoute>} />
<Route path="fitness/config" element={<ProtectedRoute module="fitness"><FitnessTestConfigPage /></ProtectedRoute>} />
<Route path="reports" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />
```

**Status**: ✅ Complete

---

## What's Not Yet Implemented

### 🔄 Step 6: Sidebar Navigation Filtering (`src/components/Sidebar.tsx`)
**What needs to be done**:
- Add `module` field to NavItem interface
- Import `ModulePermissions` type
- Create `can()` helper function that checks permissions
- Conditionally render each nav item and group based on user's module_permissions
- Only show sections if user has access to at least one module in that group

**Impact**: Navigation items will be hidden/shown based on user permissions

---

### 🔄 Step 7: User Management UI (`src/pages/admin/UserManagementPage.tsx`)
**What needs to be done**:
- Add module permission checkboxes to Create User modal
- Add module permission checkboxes to Edit User modal
- Two sections:
  - **Akses Modul**: 7 checkboxes for page access (athletes, inbody, supplement, physio, fitness, strength, reports)
  - **Kebenaran Aliran Suplemen**: 3 checkboxes for workflow roles (coordinator, supporter, approver)
- Superadmin sees read-only toggles (always all enabled)
- Include module_permissions in create/update payloads

**Impact**: Admins can assign permissions when creating/editing users

---

### 🔄 Step 8: Supplement Workflow UI (`src/pages/performance/supplement/SupplementPage.tsx`)
**What needs to be done**:
- Add role-based action visibility:
  - `isCoordinator = profile?.module_permissions?.supplement_coordinator`
  - `isSupporter = profile?.module_permissions?.supplement_supporter`
  - `isApprover = profile?.module_permissions?.supplement_approver`
  
- Coordinator step (when `status === 'pending' && isCoordinator`):
  - Show "Sahkan" (Accept) button → opens modal for coordinator_notes
  - Show "Tolak" (Reject) button → opens modal for coordinator_notes
  
- Supporter step (when `status === 'semakan_lulus' && !supporter_status && isSupporter`):
  - Show "Sokong" (Support) button → opens modal for supporter_notes
  - Show "Tidak Sokong" (Object) button → opens modal for supporter_notes
  
- Approver step (when `status === 'semakan_lulus' && supporter_status === 'sokong' && isApprover`):
  - Show "Lulus Penuh" (Full Approval) button
  - Show "Lulus Sebahagian" (Partial Approval) button
  
- Replace inline buttons with "Lihat" (View) button that opens timeline modal
- Timeline modal shows all 3 steps with decisions, notes, and who approved at each stage
- Update status display to use `getDisplayStatus()` function that accounts for supporter_status

**Impact**: Three-step approval workflow becomes fully functional

---

## Current Commit Status

**Files modified (ready to commit)**:
```
✅ src/types/index.ts              - ModulePermissions + extended interfaces
✅ src/components/ProtectedRoute.tsx - Module permission checks + AccessDeniedPage
✅ src/App.tsx                     - Module guards on all routes
```

**Files NOT YET modified**:
```
🔄 src/components/Sidebar.tsx       - Navigation filtering (Step 6)
🔄 src/pages/admin/UserManagementPage.tsx - User permission toggles (Step 7)
🔄 src/pages/performance/supplement/SupplementPage.tsx - Workflow UI (Step 8)
```

---

## How to Proceed

### Option 1: Complete Implementation Now
I can finish Steps 6-8 to have the full feature ready for testing.

### Option 2: Client Review First (Recommended)
1. Share `CLIENT_SETUP_GUIDE.md` with your client
2. Let them review and confirm their user structure
3. Have them provide list of users to create (with roles and module assignments)
4. Then I implement Steps 6-8 and you immediately provision users

### Option 3: Phased Rollout
1. Implement Step 6 (Sidebar) so users can see what they have access to
2. Implement Step 7 (User Management) so you can start assigning permissions
3. Later implement Step 8 (Workflow UI) when ready for supplement testing

---

## Testing Checklist (Post-Implementation)

- [ ] Superadmin can create users and assign permissions
- [ ] User with module disabled gets "Akses Ditolak" when accessing that page
- [ ] Sidebar only shows modules user has access to
- [ ] Coordinator can see and approve pending supplement requests
- [ ] Supporter can see approved requests and support/object them
- [ ] Approver can see supporter-approved requests and give final approval
- [ ] Timeline view shows all 3 steps correctly
- [ ] Optional notes are saved and displayed
- [ ] Superadmin bypasses all module checks

---

## Recommendations

**Before implementing Steps 6-8**:
1. ✅ Run the SQL migration in Supabase (if not already done)
2. ✅ Review `CLIENT_SETUP_GUIDE.md` with your team
3. ✅ Create your team's user list with module assignments
4. Then proceed with implementation

**Next action**: Share the guide with your client for their input!
