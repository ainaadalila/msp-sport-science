# MSP Sport Science - User Setup & Access Control Guide

## Overview

The MSP Sport Science system uses a **module-based access control** system combined with **workflow roles** to manage what each user can access and do in the system.

- **Modules**: Control which pages/features a user can access (e.g., Athletes, InBody, Supplement)
- **Workflow Roles**: Control who can perform specific actions in multi-step approval processes (e.g., Supplement approval)

---

## Part 1: Understanding Module Permissions

### Available Modules

| Module | Label | Description |
|--------|-------|-------------|
| `athletes` | Profil Atlet | View and manage athlete profiles |
| `inbody` | Penilaian InBody | Record and view InBody body composition data |
| `supplement` | Pengurusan Suplemen | Request and manage supplement distribution |
| `physio` | Fisioterapi | Record physiotherapy assessments and cases |
| `fitness` | Ujian Kecergasan | Record fitness test results and configuration |
| `strength` | Strength & Conditioning | Track strength training attendance |
| `reports` | Laporan | View system reports and analytics |

### Workflow Roles (for Supplement Approval)

| Role | Label | Responsibility |
|------|-------|-----------------|
| `supplement_coordinator` | Penyelaras Semak | Initial review and approval/rejection of supplement requests |
| `supplement_supporter` | Penyokong | Support/object the coordinator's decision with notes |
| `supplement_approver` | Pegawai Pelulus | Final approval after supporter's input |

**Note**: Superadmins and Admins automatically get ALL modules AND all workflow roles.

---

## Part 2: Common User Types & Recommended Setup

### 1. **Superadmin** (System Administrator)
Full access to everything including user management.

**Modules**: All enabled ✅
**Workflow Roles**: All enabled ✅
**Purpose**: System administration, configuration, user management

**Creation Steps**:
1. Only Superadmins can create Superadmins
2. Email, full name, password required
3. All permissions automatically granted

---

### 2. **Admin** (Department Manager)
Manages all modules and can approve/process workflows.

**Modules**: All enabled ✅
**Workflow Roles**: All enabled ✅
**Purpose**: Overall department management, back-office operations

**Example Permissions**:
- Can view all athlete profiles
- Can edit all test results
- Can approve supplements at any stage
- Can generate reports

---

### 3. **Program Coordinator** (Supplement Coordinator)
Focuses on supplement requests - does initial review and approval.

**Modules**:
- ✅ Athletes (view only, needed for context)
- ❌ InBody
- ✅ Supplement (full access)
- ❌ Physio
- ❌ Fitness
- ❌ Strength
- ❌ Reports

**Workflow Roles**:
- ✅ Penyelaras Semak (Coordinator) - can approve/reject initial requests
- ❌ Penyokong (Supporter)
- ❌ Pegawai Pelulus (Approver)

**Process**: 
1. Receives supplement requests from coaches
2. Reviews request details and athlete information
3. Accepts (Sahkan) or rejects (Tolak) the request
4. Can add notes explaining the decision

---

### 4. **Medical Officer / Nutritionist** (Supplement Supporter)
Reviews coordinator's decision and provides professional opinion.

**Modules**:
- ✅ Athletes (view only)
- ❌ InBody
- ✅ Supplement (view requests only)
- ❌ Physio
- ❌ Fitness
- ❌ Strength
- ❌ Reports

**Workflow Roles**:
- ❌ Penyelaras Semak (Coordinator)
- ✅ Penyokong (Supporter) - can support or object
- ❌ Pegawai Pelulus (Approver)

**Process**:
1. Reviews coordinator-approved requests
2. Provides professional support (Sokong) or raises concerns (Tidak Sokong)
3. Can add medical/nutritional notes
4. Decision moves to approver

---

### 5. **Approver / Authorizer** (Final Approver)
Gives final authorization for approved supplements.

**Modules**:
- ✅ Athletes (view only)
- ❌ InBody
- ✅ Supplement (view requests only)
- ❌ Physio
- ❌ Fitness
- ❌ Strength
- ❌ Reports

**Workflow Roles**:
- ❌ Penyelaras Semak (Coordinator)
- ❌ Penyokong (Supporter)
- ✅ Pegawai Pelulus (Approver) - can approve full or partial quantities

**Process**:
1. Reviews coordinator + supporter decisions
2. Approves full quantity or adjusts to partial quantity
3. No approval if supporter objected
4. Final sign-off before distribution

---

### 6. **Coach / Trainer** (Data Entry)
Records data for athletes but limited access.

**Modules**:
- ✅ Athletes (view only)
- ✅ InBody (can record)
- ✅ Supplement (can submit requests)
- ❌ Physio
- ✅ Fitness (can record results)
- ✅ Strength (can record attendance)
- ❌ Reports

**Workflow Roles**: None (cannot approve anything)

**Purpose**: Day-to-day data recording for athletes

---

### 7. **Physiotherapist** (Specialist)
Manages physiotherapy assessments and cases.

**Modules**:
- ✅ Athletes (view only)
- ❌ InBody
- ❌ Supplement
- ✅ Physio (full access)
- ❌ Fitness
- ❌ Strength
- ❌ Reports

**Workflow Roles**: None

**Purpose**: Record injuries, assessments, rehabilitation plans

---

### 8. **Analyst / Researcher** (Read-Only)
Views reports and data for analysis.

**Modules**:
- ✅ Athletes (view only)
- ✅ InBody (view only)
- ❌ Supplement
- ❌ Physio
- ✅ Fitness (view only)
- ❌ Strength
- ✅ Reports (full access)

**Workflow Roles**: None

---

## Part 3: Supplement Approval Workflow - Visual

```
┌─────────────────────────────────────────────────────────────────┐
│  1. COACH SUBMITS REQUEST                                       │
│     Status: "Menunggu Semakan" (Awaiting Review)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. PENYELARAS SEMAK (Coordinator) REVIEWS                      │
│     • Can: Accept (Sahkan) or Reject (Tolak)                    │
│     • Can: Add optional notes/ulasan                            │
│     Status: "Diluluskan" or "Ditolak (Penyelaras)"             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (if accepted)
┌─────────────────────────────────────────────────────────────────┐
│  3. PENYOKONG (Supporter) REVIEWS COORDINATOR'S DECISION        │
│     Status: "Menunggu Sokongan" (Awaiting Support)              │
│     • Can: Support (Sokong) or Object (Tidak Sokong)            │
│     • Can: Add optional notes/ulasan                            │
│     Status: "Disokong" or "Tidak Disokong"                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (if supported)
┌─────────────────────────────────────────────────────────────────┐
│  4. PEGAWAI PELULUS (Approver) GIVES FINAL AUTHORIZATION       │
│     Status: "Menunggu Kelulusan" (Awaiting Final Approval)      │
│     • Can: Approve full quantity (Diluluskan)                   │
│     • Can: Approve partial quantity (Diluluskan Sebahagian)    │
│     Status: "Diluluskan" or "Diluluskan Sebahagian"            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Step-by-Step: Creating a User

### Via Admin Dashboard

1. **Login as Superadmin or Admin**
   - Go to "Pengurusan Pengguna" (User Management) in sidebar

2. **Click "+ Buat Pengguna" button**

3. **Fill in Basic Information**:
   - **E-mel**: user@example.com
   - **Nama Penuh**: FULL NAME (will auto-uppercase)
   - **Kata Laluan**: Minimum 8 characters, user will use this to login
   - **Peranan**: Select role (Admin, Coach, Physio, Medical, Athlete)

4. **Configure Module Access**:

   **Section: Akses Modul** (Which pages can they access?)
   - ☐ Profil Atlet
   - ☐ InBody
   - ☐ Suplemen
   - ☐ Fisioterapi
   - ☐ Ujian Kecergasan
   - ☐ Strength & Conditioning
   - ☐ Laporan

   **Section: Kebenaran Aliran Suplemen** (Workflow approval steps)
   - ☐ Penyelaras Semak (Initial review)
   - ☐ Penyokong (Support/object)
   - ☐ Pegawai Pelulus (Final approval)

5. **Click "Buat Pengguna"**
   - System creates account immediately (no email verification needed)
   - User can login with email + password right away

---

## Part 5: Examples - Setting Up Your Team

### Example 1: Supplement Program Manager

```
Name: Ahmad Ibrahim
Email: ahmad.ibrahim@msp.gov.my
Role: Admin
Password: SecurePass123

Module Access:
✅ Profil Atlet
❌ InBody
✅ Suplemen
❌ Fisioterapi
❌ Ujian Kecergasan
❌ Strength & Conditioning
❌ Laporan

Workflow Roles:
✅ Penyelaras Semak
✅ Penyokong
✅ Pegawai Pelulus
```

→ Ahmad can review, support, and approve supplement requests. Can also view athlete profiles for context.

---

### Example 2: Fitness Test Coordinator

```
Name: Sarah Chen
Email: sarah.chen@msp.gov.my
Role: Coach
Password: FitnessCoord2024

Module Access:
✅ Profil Atlet
❌ InBody
❌ Suplemen
❌ Fisioterapi
✅ Ujian Kecergasan
✅ Strength & Conditioning
❌ Laporan

Workflow Roles:
❌ Penyelaras Semak
❌ Penyokong
❌ Pegawai Pelulus
```

→ Sarah records fitness test results and strength training data only. No approval workflows.

---

### Example 3: Medical Officer (Supplement Support)

```
Name: Dr. Ravi Kumar
Email: ravi.kumar@msp.gov.my
Role: Medical
Password: MedicalReview2024

Module Access:
✅ Profil Atlet
❌ InBody
✅ Suplemen
❌ Fisioterapi
❌ Ujian Kecergasan
❌ Strength & Conditioning
❌ Laporan

Workflow Roles:
❌ Penyelaras Semak
✅ Penyokong
❌ Pegawai Pelulus
```

→ Dr. Ravi reviews supplement requests that coordinators have approved and gives professional medical input.

---

## Part 6: FAQs for Your Client

**Q: What happens if a user's module is disabled?**
A: They'll see "Akses Ditolak" (Access Denied) if they try to access it, and the page won't show in their sidebar.

**Q: Can someone skip steps in the approval workflow?**
A: No. The workflow is sequential:
- Coordinator must approve first (or reject)
- Only then can Supporter see it
- Only then can Approver finalize

**Q: What if a Supporter objects (Tidak Sokong)?**
A: The request stays in "Tidak Disokong" status. Approver cannot approve it without Supporter's support.

**Q: Can I change permissions after creating a user?**
A: Yes! Click "Edit Peranan" on any user and adjust their modules and workflow roles.

**Q: Do I need to assign all three workflow roles to someone?**
A: No. Most teams split them:
- 1 Coordinator (reviews all requests)
- 1-2 Supporters (medical/nutritional input)
- 1 Approver (final sign-off)

**Q: What's the difference between a "Coach" and "Admin" role?**
A: 
- **Coach**: Limited to data entry. Can't approve anything.
- **Admin**: Full access to all modules and can approve any workflow step.

---

## Part 7: Recommended Team Setup for MSP

### Minimum Team (Small Program)
1. **Superadmin**: You (IT/System owner)
2. **Admin**: Program Manager (general access + approvals)
3. **Coaches**: 2-3 coaches (data entry only)

### Medium Team (Growing Program)
1. **Superadmin**: You
2. **Admin**: Program Manager
3. **Coordinator**: Supplement specialist (reviews requests)
4. **Supporter**: Medical officer (medical input)
5. **Approver**: Department head (final approval)
6. **Coaches**: 3-5 coaches (data entry)
7. **Physiotherapist**: Physio staff (injury management)

### Large Team (Full Operations)
1. **Superadmin**: IT Admin
2. **Admin**: Program Director
3. **Administrators**: 2-3 admins for different programs
4. **Coordinators**: 2-3 by program area
5. **Supporters**: 2-3 medical/nutrition staff
6. **Approvers**: 2 senior managers
7. **Coaches**: 5-10 coaches by sport/discipline
8. **Physiotherapists**: 2-3 physios
9. **Analysts**: 1-2 for reporting

---

## Next Steps

1. **Review this guide** with your stakeholders
2. **Create a user list** with roles and module assignments
3. **Prepare email accounts** for all users
4. **Set initial passwords** (change on first login recommended)
5. **Train users** on their specific modules

Once ready, I'll implement the UI for user management so you can easily create and manage these users in the system.

---

## Support

For technical questions, contact: [Your Support Email]
For system access issues, contact: [IT Support]
