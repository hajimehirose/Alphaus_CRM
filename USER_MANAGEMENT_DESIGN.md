# Enhanced User Management & RBAC Design

## Current Implementation Analysis

### What Works Now:
- ✅ View users with assigned roles
- ✅ Change user roles via dropdown
- ✅ Search users by email
- ✅ Role-based access control (Admin only)
- ✅ Activity logging for role changes

### What's Missing:
- ❌ Add/invite new users (assign roles by email)
- ❌ View all authenticated users (including those without roles)
- ❌ Permission matrix/visualization
- ❌ User details/permissions breakdown
- ❌ Bulk role assignment
- ❌ Remove user roles
- ❌ See which users exist but don't have roles

---

## Design Proposal

### 1. Enhanced User List View

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ User Management                                    [+ Add User] │
├─────────────────────────────────────────────────────────────┤
│ [All] [With Roles] [Without Roles]  [Search...]            │
├─────────────────────────────────────────────────────────────┤
│ Email                    │ Role      │ Status │ Actions     │
├─────────────────────────────────────────────────────────────┤
│ user@example.com         │ Admin ▼   │ Active │ [⋮ Menu]    │
│ Role: Assigned 12/8/2025 │            │        │             │
├─────────────────────────────────────────────────────────────┤
│ newuser@example.com      │ [Assign]  │ Pending│ [⋮ Menu]    │
│ No role assigned         │            │        │             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Filter tabs: All / With Roles / Without Roles
- Show users from both `auth.users` and `user_roles`
- Status indicators (Active, Pending, Inactive)
- Actions menu: View Details, Change Role, Remove Role, Resend Invite

---

### 2. Add User Dialog

**Two Options:**

**Option A: Invite by Email (Recommended)**
```
┌────────────────────────────────────────┐
│ Add User                        [×]    │
├────────────────────────────────────────┤
│ Email Address                          │
│ [user@example.com              ]       │
│                                        │
│ Role                                   │
│ [Admin ▼]                              │
│                                        │
│ [Cancel]  [Assign Role]                │
└────────────────────────────────────────┘
```
- Assign role to email address
- Role will be active when user logs in via Google OAuth
- If user doesn't exist yet, role is pre-assigned

**Option B: Select from Authenticated Users**
- Show list of users from `auth.users` without roles
- Select user and assign role

---

### 3. User Details & Permissions View

**Permission Breakdown Card:**
```
┌────────────────────────────────────────┐
│ User Details                           │
├────────────────────────────────────────┤
│ Email: user@example.com                │
│ Role: Manager                          │
│ Assigned: 12/8/2025 by Admin           │
├────────────────────────────────────────┤
│ Permissions                            │
│ ✓ Customers: Create, Read, Update      │
│ ✓ Export: Own data only                │
│ ✓ Import: Not allowed                  │
│ ✓ Users: Not allowed                   │
│ ✓ Activity Log: Team activities        │
└────────────────────────────────────────┘
```

**Permission Matrix Table:**
```
┌──────────────┬────────┬────────┬────────┬────────┐
│ Resource     │ Admin  │Manager │ Sales  │ Viewer │
├──────────────┼────────┼────────┼────────┼────────┤
│ Customers    │        │        │        │        │
│   Create     │   ✓    │   ✓    │   ✓    │   ✗    │
│   Read       │   ✓    │   ✓    │   ✓    │   ✓    │
│   Update     │   ✓    │   ✓    │   ✓    │   ✗    │
│   Delete     │   ✓    │   ✓    │   ✗    │   ✗    │
├──────────────┼────────┼────────┼────────┼────────┤
│ Export       │        │        │        │        │
│   All        │   ✓    │   ✓    │   ✗    │   ✗    │
│   Own        │   ✓    │   ✓    │   ✓    │   ✗    │
├──────────────┼────────┼────────┼────────┼────────┤
│ Import       │        │        │        │        │
│   Customers  │   ✓    │   ✓    │   ✗    │   ✗    │
├──────────────┼────────┼────────┼────────┼────────┤
│ Users        │        │        │        │        │
│   Read       │   ✓    │   ✗    │   ✗    │   ✗    │
│   Update     │   ✓    │   ✗    │   ✗    │   ✗    │
├──────────────┼────────┼────────┼────────┼────────┤
│ Activity Log │        │        │        │        │
│   All        │   ✓    │   ✗    │   ✗    │   ✗    │
│   Team       │   ✓    │   ✓    │   ✗    │   ✗    │
│   Own        │   ✓    │   ✓    │   ✓    │   ✗    │
└──────────────┴────────┴────────┴────────┴────────┘
```

---

### 4. Enhanced Features

**A. Bulk Operations:**
- Select multiple users (checkboxes)
- Bulk assign role
- Bulk remove roles

**B. User Status:**
- Active: User has logged in and has role
- Pending: Role assigned but user hasn't logged in yet
- No Role: User exists but no role assigned

**C. Role Assignment Validation:**
- Cannot remove last Admin
- Cannot change your own role (safety)
- Confirmation dialogs for role changes

**D. User Activity:**
- Last login time
- Role change history (from activity_logs)
- User creation date

---

## Implementation Plan

### Phase 1: Core Enhancements
1. ✅ Fetch all authenticated users (from `auth.users` via service client)
2. ✅ Merge with `user_roles` to show complete user list
3. ✅ Add "Add User" dialog (invite by email)
4. ✅ Show users without roles
5. ✅ Enhanced user status indicators

### Phase 2: Permissions Visualization
6. ✅ Permission breakdown component
7. ✅ Permission matrix table
8. ✅ User details modal/drawer

### Phase 3: Advanced Features
9. ✅ Bulk operations
10. ✅ Remove role functionality
11. ✅ User activity/last login display
12. ✅ Role change history

---

## API Endpoints Needed

### Existing:
- `GET /api/users` - Get all users with roles
- `PUT /api/users/[id]/role` - Update user role

### New:
- `GET /api/users/all` - Get all authenticated users + roles merged
- `POST /api/users/invite` - Assign role to email (invite user)
- `DELETE /api/users/[id]/role` - Remove user role
- `POST /api/users/bulk-role` - Bulk assign roles
- `GET /api/users/[id]/permissions` - Get user's permission breakdown
- `GET /api/users/permissions-matrix` - Get permission matrix for all roles

---

## UI Components Needed

1. **AddUserDialog** - Invite user by email
2. **UserDetailsDrawer** - Side drawer with user info and permissions
3. **PermissionMatrix** - Visual permission table
4. **PermissionBreakdown** - List of permissions for a role
5. **UserStatusBadge** - Status indicator (Active/Pending/No Role)
6. **BulkActionsToolbar** - Toolbar for bulk operations

---

## Database Considerations

- No schema changes needed
- Use existing `user_roles` table
- Query `auth.users` via service client to get all authenticated users
- When assigning role to email that doesn't exist in auth.users yet:
  - Store role assignment
  - Role becomes active when user logs in for first time

---

## User Flow

### Adding a New User:
1. Click "Add User" button
2. Enter email address
3. Select role
4. Click "Assign Role"
5. System checks if user exists in `auth.users`:
   - If exists: Assign role immediately
   - If not: Pre-assign role (becomes active on first login)
6. User receives notification (optional) or logs in via Google OAuth
7. Role is active

### Viewing Permissions:
1. Click user row or "View Details" action
2. Drawer opens showing:
   - User information
   - Current role
   - Permission breakdown
   - Role change history

---

## Security Considerations

- Admin-only access (already enforced)
- Validation:
  - Cannot remove last Admin
  - Cannot change own role (prevents lockout)
  - Email format validation
  - Role validation (must be valid role)
- Activity logging for all role changes
- Audit trail in activity_logs table

