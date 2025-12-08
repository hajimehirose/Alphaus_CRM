# Archera CRM - Complete Feature Specifications

## 1. Authentication & Authorization

### 1.1 Google OAuth Login
**Spec:**
- Login page at `/login`
- Google OAuth button with proper styling
- Redirect to `/` after successful login
- Store session in Supabase (not localStorage)
- Handle OAuth callback at `/auth/callback`
- Redirect unauthenticated users to `/login`

**Test Cases:**
- [ ] User can click "Continue with Google" button
- [ ] OAuth flow redirects correctly
- [ ] Session persists after page refresh
- [ ] Unauthenticated users redirected to login
- [ ] Authenticated users redirected away from login page

### 1.2 Role-Based Access Control (RBAC)
**Spec:**
- Four roles: Admin, Manager, Sales, Viewer
- Permissions enforced on all API routes
- UI elements hidden/shown based on role
- Default role assignment for new users

**Permission Matrix:**
```
Admin:     Full access to everything
Manager:   CRUD customers, view team logs, export all, import
Sales:     CRUD own customers, view own logs, export own
Viewer:    Read-only customers, no logs, no export, no import
```

**Test Cases:**
- [ ] Admin can access all features
- [ ] Manager cannot access user management
- [ ] Sales cannot delete customers
- [ ] Sales cannot import
- [ ] Viewer cannot create/update/delete customers
- [ ] Viewer cannot view activity logs

## 2. Customer Management

### 2.1 Customer List Page (`/`)
**Spec:**
- Three view modes: Kanban, Table, Grid
- View mode toggle buttons
- Edit mode toggle (View/Edit)
- Global search functionality
- Quick filters (All, High Priority, AWS Premier)
- Pipeline metrics dashboard (Kanban only)
- Create customer button
- Responsive design

**Test Cases:**
- [ ] Kanban view displays 8 columns (deal stages)
- [ ] Table view shows sortable columns
- [ ] Grid view shows card layout
- [ ] Search filters customers correctly
- [ ] Priority filter works
- [ ] Pipeline metrics calculate correctly
- [ ] Create button opens dialog
- [ ] View/Edit mode toggle works

### 2.2 Kanban Board View
**Spec:**
- 8 columns for deal stages
- Customer cards show: name, deal value, priority badge
- Arrow buttons to move between stages
- Stage value totals displayed
- Customer count per stage
- Click card to navigate to detail page

**Test Cases:**
- [ ] All 8 stages displayed
- [ ] Customers appear in correct stage
- [ ] Left/right arrows move customers
- [ ] Stage totals calculate correctly
- [ ] Priority badges display correctly
- [ ] Click navigates to detail page

### 2.3 Table View
**Spec:**
- Sortable columns (click header)
- Inline editing in Edit Mode
- Checkbox selection (future: bulk actions)
- Column management (show/hide)
- Density controls (future)
- Click cell to edit in Edit Mode
- External link button to detail page
- Delete button in Edit Mode

**Test Cases:**
- [ ] Columns are sortable
- [ ] Inline editing works in Edit Mode
- [ ] Edit Mode disabled in View Mode
- [ ] Cell editing saves correctly
- [ ] Delete button only in Edit Mode
- [ ] Navigation to detail works

### 2.4 Grid View
**Spec:**
- Card-based layout
- Responsive grid (1-4 columns)
- Quick actions on each card
- Priority badges
- Deal value display
- Click to navigate to detail

**Test Cases:**
- [ ] Grid displays correctly
- [ ] Responsive columns work
- [ ] Cards show all key info
- [ ] Navigation works

### 2.5 Customer CRUD Operations
**Spec:**
- Create: Modal form, only `name_en` required
- Read: View in all views
- Update: Inline or modal form
- Delete: Confirmation dialog, Admin/Manager only
- Activity logging for all operations

**Test Cases:**
- [ ] Create customer with required field only
- [ ] Create customer with all fields
- [ ] Update customer inline
- [ ] Update customer via modal
- [ ] Delete requires confirmation
- [ ] Delete only for Admin/Manager
- [ ] All operations logged to activity

### 2.6 Search & Filtering
**Spec:**
- Global search across all customer fields
- Quick filters: All, High Priority, AWS Premier
- Search updates URL params
- Search persists on navigation

**Test Cases:**
- [ ] Search works across name_en, name_jp, company_site
- [ ] Quick filters apply correctly
- [ ] Search persists in URL
- [ ] Clear search works

## 3. Customer Detail Page (`/customer/[id]`)

### 3.1 Overview Tab
**Spec:**
- Customer information card
- Deal stage, value, probability, priority
- All customer fields displayed
- Edit button opens modal

**Test Cases:**
- [ ] All customer info displays
- [ ] Edit button opens form
- [ ] Form pre-fills with current data
- [ ] Update saves correctly

### 3.2 Notes Tab
**Spec:**
- Rich text editor (basic textarea for now)
- @mentions support (future)
- Edit/delete own notes
- Display user, timestamp, edited indicator
- Real-time updates (future)

**Test Cases:**
- [ ] Add note works
- [ ] Notes display in chronological order
- [ ] Edit own note works
- [ ] Delete own note works
- [ ] Cannot edit/delete others' notes
- [ ] Edited indicator shows

### 3.3 Attachments Tab
**Spec:**
- Add links to external files
- Support: Google Drive, Dropbox, OneDrive, Box, Other
- Display storage type icon
- Open in new tab
- Delete attachments (own only)

**Test Cases:**
- [ ] Add attachment link works
- [ ] Storage type icons display
- [ ] Links open in new tab
- [ ] Delete own attachment works
- [ ] Cannot delete others' attachments

### 3.4 Activities Tab
**Spec:**
- Chronological timeline
- Filter by: All, Notes, Updates, Files
- Show: user, action, timestamp, details
- Color-coded by activity type

**Test Cases:**
- [ ] Activities display chronologically
- [ ] All activity types show
- [ ] User info displays correctly
- [ ] Timestamps format correctly

## 4. User Management (`/users`)

### 4.1 User List
**Spec:**
- Admin only page
- List all users with roles
- Search users by email
- Role dropdown for each user
- Role change confirmation
- Activity log of role changes

**Test Cases:**
- [ ] Page only accessible to Admin
- [ ] All users listed
- [ ] Search works
- [ ] Role dropdown works
- [ ] Role change requires confirmation
- [ ] Role change logged to activity

## 5. Activity Log Viewer (`/activity`)

### 5.1 Activity List
**Spec:**
- Role-based access:
  - Admin: All activities
  - Manager: Team activities
  - Sales: Own activities
- Filters: Date range, action type, user, customer
- Export to CSV
- Pagination (50 per page)

**Test Cases:**
- [ ] Admin sees all activities
- [ ] Manager sees team activities
- [ ] Sales sees only own activities
- [ ] Filters work correctly
- [ ] Export CSV works
- [ ] Pagination works

## 6. CSV Import Feature (`/import`)

### 6.1 Import Process
**Spec:**
- Admin/Manager only
- Upload CSV file (drag-and-drop or file picker)
- Preview data with validation
- Field mapping (CSV columns → database fields)
- Duplicate handling: Skip, Update, or Create New
- Dry run mode (preview without saving)
- Progress indicator
- Error report download
- Import history

**Test Cases:**
- [ ] Page only accessible to Admin/Manager
- [ ] File upload works
- [ ] CSV parsing works
- [ ] Preview shows first 10 rows
- [ ] Field mapping works
- [ ] Duplicate handling options work
- [ ] Dry run mode works
- [ ] Import executes correctly
- [ ] Error reporting works

## 7. Settings & Preferences

### 7.1 User Settings
**Spec:**
- Theme: Light/Dark/Auto (future)
- Default View: Kanban/Table/Grid (future)
- Default Density: Comfortable/Standard/Compact (future)
- Email notifications toggle (future)
- Desktop notifications toggle (future)

**Status:** Not yet implemented

## 8. Notifications System

### 8.1 Toast Notifications
**Spec:**
- Success: Green with checkmark
- Error: Red with X
- Warning: Orange with alert
- Info: Blue with info icon
- Auto-dismiss after 4-7 seconds
- Hover to pause auto-dismiss
- Progress bar animation

**Status:** Not yet implemented

### 8.2 Notification Panel
**Spec:**
- Bell icon with badge count
- Dropdown panel with recent notifications
- Mark as read/unread
- Mark all as read
- Notification types: Deal won/lost, Stage changes, New notes/attachments, Role changes, Import completed

**Status:** Not yet implemented

## 9. API Routes

### 9.1 Authentication Routes
- [ ] `GET /api/auth/session` - Returns user session
- [ ] `GET /api/auth/me` - Returns user with role
- [ ] `POST /api/auth/logout` - Signs out user

### 9.2 Customer Routes
- [ ] `GET /api/customers` - Lists customers with filters
- [ ] `GET /api/customers/[id]` - Gets customer details
- [ ] `POST /api/customers` - Creates customer
- [ ] `PUT /api/customers/[id]` - Updates customer
- [ ] `DELETE /api/customers/[id]` - Deletes customer

### 9.3 Customer Detail Routes
- [ ] `GET /api/customers/[id]/notes` - Gets notes
- [ ] `POST /api/customers/[id]/notes` - Adds note
- [ ] `PUT /api/notes/[id]` - Updates note
- [ ] `DELETE /api/notes/[id]` - Deletes note
- [ ] `GET /api/customers/[id]/attachments` - Gets attachments
- [ ] `POST /api/customers/[id]/attachments` - Adds attachment
- [ ] `DELETE /api/attachments/[id]` - Deletes attachment
- [ ] `GET /api/customers/[id]/activities` - Gets activities

### 9.4 User Routes
- [ ] `GET /api/users` - Lists users (Admin only)
- [ ] `PUT /api/users/[id]/role` - Updates role (Admin only)

### 9.5 Activity Log Routes
- [ ] `GET /api/activity-logs` - Gets logs with role-based filtering

### 9.6 Import Routes
- [ ] `POST /api/import/upload` - Uploads CSV
- [ ] `POST /api/import/execute` - Executes import

## 10. UI/UX Requirements

### 10.1 Design System
- [ ] Primary color: Blue (#3B82F6)
- [ ] Success: Green (#10B981)
- [ ] Warning: Orange (#F59E0B)
- [ ] Error: Red (#EF4444)
- [ ] Inter font family
- [ ] Smooth transitions (200-300ms)

### 10.2 Responsive Design
- [ ] Mobile: Stack columns, hamburger menu
- [ ] Tablet: 2-column layouts
- [ ] Desktop: Full layout

### 10.3 Accessibility
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation support
- [ ] Focus indicators
- [ ] Screen reader friendly
- [ ] Color contrast WCAG AA compliant

