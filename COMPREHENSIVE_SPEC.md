# Comprehensive Feature Specification - Archera CRM
## Based on Actual Implementation

**Last Updated**: 2025-01-15  
**Version**: 1.0

---

## Table of Contents
1. [Authentication & Authorization](#1-authentication--authorization)
2. [Customer Management](#2-customer-management)
3. [Customer Detail Page](#3-customer-detail-page)
4. [User Management](#4-user-management)
5. [Activity Log Viewer](#5-activity-log-viewer)
6. [CSV/Excel Import](#6-csvexcel-import)
7. [API Endpoints](#7-api-endpoints)
8. [UI/UX Standards](#8-uiux-standards)

---

## 1. Authentication & Authorization

### 1.1 Google OAuth Login
**Implementation Status**: ✅ Complete

**Features**:
- Login page at `/login`
- Google OAuth button integration
- Supabase Auth session management
- Redirect to `/` after successful login
- OAuth callback handler at `/auth/callback`
- Middleware redirects unauthenticated users to `/login`
- Session persists across page refreshes

**API Routes**:
- `GET /api/auth/session` - Get current session
- `GET /api/auth/me` - Get current user with role
- `POST /api/auth/logout` - Sign out

**Test Cases**:
- [x] User can click "Continue with Google" button
- [x] OAuth flow redirects correctly
- [x] Session persists after page refresh
- [x] Unauthenticated users redirected to login
- [x] Authenticated users redirected away from login page

---

### 1.2 Role-Based Access Control (RBAC)
**Implementation Status**: ✅ Complete

**Roles**:
1. **Admin**: Full access to everything
2. **Manager**: CRUD customers, view team logs, export all, import
3. **Sales**: CRUD own customers, view own logs, export own
4. **Viewer**: Read-only customers

**Permission Matrix**:
```
Customer Operations:
  - Create: Admin, Manager, Sales
  - Read: Admin, Manager, Sales, Viewer
  - Update: Admin, Manager, Sales
  - Delete: Admin, Manager

Export:
  - All: Admin, Manager
  - Own: Sales

Import:
  - Customers: Admin, Manager only

User Management:
  - Read: Admin only
  - Update Role: Admin only

Activity Logs:
  - All: Admin
  - Team: Manager
  - Own: Sales
```

**Implementation**:
- Permission checks in `lib/permissions.ts`
- Middleware enforces route protection
- UI elements hidden/shown based on role
- API routes check permissions before operations

**Test Cases**:
- [x] Admin can access all features
- [x] Manager cannot access user management
- [x] Sales cannot delete customers
- [x] Sales cannot import
- [x] Viewer cannot create/update/delete customers
- [x] Viewer cannot view activity logs

---

## 2. Customer Management

### 2.1 Customer List Page (`/`)
**Implementation Status**: ✅ Complete

**View Modes**:
- ✅ **Kanban View** (default)
- ✅ **Table View**
- ❌ **Grid View** (removed per user request)

**Features**:
- View mode toggle buttons
- Edit mode toggle (View/Edit)
- Global search functionality (name_en, name_jp, company_site)
- Quick filters: All, High Priority, AWS Premier
- Pipeline metrics dashboard (Kanban view only)
- Create customer button (Admin/Manager/Sales)
- Responsive design
- Column configuration for Table view
- Table density controls (compact, comfortable, spacious)

**Pipeline Metrics** (Kanban only):
- Total Pipeline Value
- Weighted Pipeline Value
- Win Rate
- Average Deal Size

**Test Cases**:
- [x] Kanban view displays 8 columns (deal stages)
- [x] Table view shows sortable columns
- [x] Search filters customers correctly
- [x] Priority filter works
- [x] Pipeline metrics calculate correctly
- [x] Create button opens dialog
- [x] View/Edit mode toggle works
- [x] Column configuration persists
- [x] Table density controls work

---

### 2.2 Kanban Board View
**Implementation Status**: ✅ Complete

**Features**:
- 8 columns for deal stages: Lead, Qualified, Meeting Scheduled, Demo Completed, Proposal Sent, Negotiation, Closed Won, Closed Lost
- Customer cards display:
  - Customer name (name_en)
  - Deal value (USD)
  - Priority badge (if High)
  - Additional tags (if any)
- Arrow buttons to move customers between stages
- Stage value totals displayed
- Customer count per stage
- Click card to navigate to detail page
- Stage navigation updates deal_stage and updates stage_updated_at

**Test Cases**:
- [x] All 8 stages displayed
- [x] Customers appear in correct stage
- [x] Left/right arrows move customers
- [x] Stage totals calculate correctly
- [x] Priority badges display correctly
- [x] Click navigates to detail page

---

### 2.3 Table View
**Implementation Status**: ✅ Complete

**Features**:
- Sortable columns (click header to sort)
- Inline editing in Edit Mode
- Checkbox selection for bulk operations
- Column management (show/hide columns via dialog)
- Density controls (compact, comfortable, spacious)
- Click cell to edit in Edit Mode
- External link button to detail page
- Delete button in Edit Mode (Admin/Manager only)
- Column configuration persists per user

**Test Cases**:
- [x] Columns are sortable
- [x] Inline editing works in Edit Mode
- [x] Edit Mode disabled in View Mode
- [x] Cell editing saves correctly
- [x] Delete button only in Edit Mode
- [x] Delete only for Admin/Manager
- [x] Navigation to detail works
- [x] Column visibility controls work
- [x] Density changes apply immediately

---

### 2.4 Customer CRUD Operations
**Implementation Status**: ✅ Complete

**Create**:
- Modal form dialog
- Only `name_en` field required
- All other fields optional
- Validates required fields
- Creates activity log entry

**Read**:
- Available in all views (Kanban, Table)
- Filtering and search supported
- Permission-based access (all roles can read)

**Update**:
- Inline editing in Table view (Edit Mode)
- Modal form in Kanban view
- Inline editing in Customer Detail page Overview tab
- Updates activity log with field changes
- Tracks old/new values

**Delete**:
- Confirmation dialog required
- Admin and Manager only
- Creates activity log entry
- Cascades to related records (notes, attachments, activities)

**Test Cases**:
- [x] Create customer with required field only
- [x] Create customer with all fields
- [x] Update customer inline
- [x] Update customer via modal
- [x] Delete requires confirmation
- [x] Delete only for Admin/Manager
- [x] All operations logged to activity

---

### 2.5 Search & Filtering
**Implementation Status**: ✅ Complete

**Global Search**:
- Searches across: name_en, name_jp, company_site
- Updates URL query parameters
- Search persists on navigation
- Real-time filtering

**Quick Filters**:
- All (default)
- High Priority
- AWS Premier

**Advanced Filters** (Future):
- Advanced filter dialog structure exists
- Filter conditions can be added
- Full implementation pending

**Test Cases**:
- [x] Search works across name_en, name_jp, company_site
- [x] Quick filters apply correctly
- [x] Search persists in URL
- [x] Clear search works

---

### 2.6 Export Functionality
**Implementation Status**: ✅ Complete

**Features**:
- Export to CSV
- Export to JSON
- Permission-based:
  - Admin/Manager: Export all customers
  - Sales: Export own customers only
- Toast notifications on success/error

**Test Cases**:
- [x] CSV export works
- [x] JSON export works
- [x] Permission checks work
- [x] Sales can only export own customers

---

## 3. Customer Detail Page (`/customer/[id]`)

### 3.1 Overview Tab
**Implementation Status**: ✅ Complete

**Features**:
- Customer information display
- Quick stats cards:
  - Deal Stage
  - Deal Value (USD)
  - Probability
  - Priority
  - Total Interactions (calculated)
  - Relationship Duration (days since creation)
  - Weighted Deal Value
- Inline editing mode (toggle Edit button)
- Edit button opens modal form (alternative)
- All customer fields displayed in grid

**Inline Editing**:
- Toggle Edit mode
- Edit fields directly on page
- Save/Cancel buttons
- Loading states during save

**Test Cases**:
- [x] All customer info displays
- [x] Quick stats calculate correctly
- [x] Inline edit mode works
- [x] Modal edit form works
- [x] Update saves correctly
- [x] Cancel reverts changes

---

### 3.2 Notes Tab
**Implementation Status**: ✅ Complete

**Features**:
- Add notes with @mention support
- @mention dropdown with user search
- Keyboard navigation (arrow keys, Enter, Escape)
- Mention highlighting in displayed notes
- Edit own notes (inline editing)
- Delete own notes
- Display: user name, timestamp, edited indicator
- Notes display in reverse chronological order (newest first)
- Mention parsing and storage (mentions stored as JSON array of user IDs)

**Test Cases**:
- [x] Add note works
- [x] @mention dropdown appears when typing @
- [x] User selection inserts mention
- [x] Mentions highlighted in display
- [x] Notes display in chronological order (newest first)
- [x] Edit own note works
- [x] Delete own note works
- [x] Cannot edit/delete others' notes
- [x] Edited indicator shows with timestamp

---

### 3.3 Attachments Tab
**Implementation Status**: ✅ Complete (Google Drive Only)

**Features**:
- Add Google Drive links only
- Google Drive URL validation
- Display as cards with:
  - Google Drive icon (📁)
  - File name (parsed from URL or user-entered)
  - Link to open in Google Drive
  - Metadata: Uploader name, date added
- Delete attachments (own only, Admin can delete any)
- Activity log entry on add/delete

**URL Validation**:
- Validates Google Drive URL format
- Supports both shareable link formats
- Extracts file ID from URL
- Parses file name when possible

**Test Cases**:
- [x] Google Drive URL validation works
- [x] Invalid URLs show error
- [x] Cards display correctly
- [x] Links open in new tab
- [x] Delete own attachment works
- [x] Cannot delete others' attachments (non-admin)
- [x] Admin can delete any attachment

---

### 3.4 Activities Tab
**Implementation Status**: ✅ Complete

**Features**:
- Chronological timeline (newest first)
- Displays all activity types:
  - Customer created/updated/deleted
  - Notes added/updated/deleted
  - Attachments added/deleted
- Shows: user name, action, timestamp, details
- Field changes show old/new values
- Color-coded by activity type (via icons)

**Test Cases**:
- [x] Activities display chronologically
- [x] All activity types show
- [x] User info displays correctly
- [x] Timestamps format correctly
- [x] Field changes show old/new values

---

### 3.5 Tab Navigation
**Implementation Status**: ✅ Complete

**Features**:
- Tabs: Overview, Notes, Attachments, Activities
- URL hash navigation (`#notes`, `#attachments`, etc.)
- Active tab persists in URL
- Deep linking support
- Tab counts displayed (badges)

**Test Cases**:
- [x] Tabs switch correctly
- [x] URL hash updates
- [x] Page load with hash activates correct tab
- [x] Tab counts update correctly

---

## 4. User Management (`/users`)

### 4.1 User List
**Implementation Status**: ✅ Complete

**Features**:
- Admin-only page access
- Lists all authenticated users
- Display:
  - User email
  - User name
  - Avatar (Google OAuth or initials)
  - Role (if assigned)
  - Status: Active, Pending, No Role
  - Last login timestamp
- Search users by email or name
- Filter tabs: All, With Roles, Without Roles
- Bulk selection (checkboxes)
- Bulk role assignment/removal

**Statistics Cards**:
- Total Users
- With Roles
- Without Roles
- Active
- Pending

**Test Cases**:
- [x] Page only accessible to Admin
- [x] All users listed
- [x] Search works
- [x] Filters work correctly
- [x] Statistics calculate correctly
- [x] Bulk operations work

---

### 4.2 Add/Invite User
**Implementation Status**: ✅ Complete

**Features**:
- Add User dialog
- Email input with validation
- Role selection dropdown with descriptions
- Permission preview (shows what permissions the role grants)
- Role descriptions and icons
- Pre-assign role (user gets role on first login)
- Handles existing vs new users

**Permission Preview**:
- Shows permission breakdown for selected role
- Visual indicators (✓/✗) for each permission
- Organized by resource type

**Test Cases**:
- [x] Add user dialog opens
- [x] Email validation works
- [x] Role selection shows descriptions
- [x] Permission preview displays correctly
- [x] Role assignment works
- [x] Handles new users (pre-assignment)

---

### 4.3 Role Management
**Implementation Status**: ✅ Complete

**Features**:
- Role dropdown per user
- Change user role
- Remove role (sets to No Role)
- Safety checks:
  - Cannot remove last Admin
  - Cannot change own role
- Bulk role assignment
- Bulk role removal
- Activity logging for role changes

**User Details Drawer**:
- Click user row to view details
- Shows:
  - User information
  - Role information
  - Status
  - Last login
  - Permission breakdown

**Permission Matrix View**:
- View all roles and their permissions
- Matrix format showing all resource/action combinations

**Test Cases**:
- [x] Role dropdown works
- [x] Role change requires confirmation
- [x] Safety checks prevent errors
- [x] Activity log created for role changes
- [x] Bulk operations work
- [x] User details drawer displays correctly
- [x] Permission matrix displays correctly

---

## 5. Activity Log Viewer (`/activity`)

### 5.1 Activity List
**Implementation Status**: ✅ Complete

**Features**:
- Role-based access:
  - Admin: All activities
  - Manager: Team activities
  - Sales: Own activities only
- Filters:
  - Date range (future)
  - Action type
  - User
  - Customer
- Export to CSV
- Pagination (default: all, can be paginated)
- Displays:
  - Timestamp
  - User
  - Action
  - Entity type
  - Details (field changes, etc.)
  - Customer link (if applicable)

**Test Cases**:
- [x] Admin sees all activities
- [x] Manager sees team activities
- [x] Sales sees only own activities
- [x] Export CSV works
- [x] Filters work correctly

---

## 6. CSV/Excel Import (`/import`)

### 6.1 Import Process
**Implementation Status**: ✅ Complete

**Features**:
- Admin/Manager only access
- Multi-step wizard:
  1. Upload (CSV or Excel)
  2. Field Mapping
  3. Preview & Validation
  4. Duplicate Detection
  5. Import Execution
  6. Results

**File Upload**:
- Drag-and-drop support
- File picker
- Supports CSV (.csv) and Excel (.xlsx, .xls)
- File size validation (10MB limit)
- File type validation

**Field Mapping**:
- Auto-detection of column mappings
- Manual override
- Required field validation (name_en)
- Dropdown value validation
- Deal stage validation

**Preview & Validation**:
- Preview first rows
- Validation errors highlighted
- Error messages per row/field

**Duplicate Detection**:
- Check against existing customers (by name_en)
- Show duplicate candidates
- Options: Skip, Update, Create New
- Batch duplicate checking

**Import Execution**:
- Batch processing (configurable batch size)
- Progress indicator
- Dry run mode (preview without saving)
- Error reporting
- Success/failure counts

**Import Results**:
- Summary statistics
- Success count
- Failure count
- Error report download (CSV)
- Detailed results display

**Test Cases**:
- [x] Page only accessible to Admin/Manager
- [x] File upload works (CSV and Excel)
- [x] File validation works
- [x] CSV/Excel parsing works
- [x] Field mapping auto-detection works
- [x] Preview shows first rows
- [x] Validation errors display
- [x] Duplicate detection works
- [x] Duplicate handling options work
- [x] Dry run mode works
- [x] Import executes correctly
- [x] Batch processing works
- [x] Progress indicator works
- [x] Error reporting works
- [x] Results display correctly

---

### 6.2 Import Template
**Implementation Status**: ✅ Complete

**Features**:
- Download CSV template
- Template includes:
  - All field headers
  - Example row
  - Comments explaining requirements

**API Route**: `GET /api/import/template`

**Test Cases**:
- [x] Template download works
- [x] Template includes all fields
- [x] Example row included

---

## 7. API Endpoints

### 7.1 Authentication Routes
- ✅ `GET /api/auth/session` - Get current session
- ✅ `GET /api/auth/me` - Get current user with role
- ✅ `POST /api/auth/logout` - Sign out user

### 7.2 Customer Routes
- ✅ `GET /api/customers` - List customers with filters/search
- ✅ `GET /api/customers/[id]` - Get customer details
- ✅ `POST /api/customers` - Create customer
- ✅ `PUT /api/customers/[id]` - Update customer
- ✅ `DELETE /api/customers/[id]` - Delete customer

### 7.3 Customer Detail Routes
- ✅ `GET /api/customers/[id]/notes` - Get notes
- ✅ `POST /api/customers/[id]/notes` - Add note (with mentions)
- ✅ `GET /api/customers/[id]/attachments` - Get attachments
- ✅ `POST /api/customers/[id]/attachments` - Add Google Drive attachment
- ✅ `GET /api/customers/[id]/activities` - Get activities

### 7.4 Note Routes
- ✅ `PUT /api/notes/[id]` - Update note (with mentions)
- ✅ `DELETE /api/notes/[id]` - Delete note

### 7.5 Attachment Routes
- ✅ `DELETE /api/attachments/[id]` - Delete attachment

### 7.6 User Routes
- ✅ `GET /api/users/all` - List all users (Admin only)
- ✅ `GET /api/users/list` - List users for mentions
- ✅ `POST /api/users/invite` - Assign role to user
- ✅ `PUT /api/users/[id]/role` - Update user role
- ✅ `DELETE /api/users/[id]/role` - Remove user role
- ✅ `POST /api/users/bulk-role` - Bulk role operations
- ✅ `GET /api/users/[id]/permissions` - Get user permissions
- ✅ `GET /api/users/permissions-matrix` - Get permission matrix

### 7.7 Activity Log Routes
- ✅ `GET /api/activity-logs` - Get logs with role-based filtering

### 7.8 Import Routes
- ✅ `POST /api/import/upload` - Upload CSV/Excel file
- ✅ `POST /api/import/check-duplicates` - Check for duplicates
- ✅ `POST /api/import/execute` - Execute import
- ✅ `GET /api/import/template` - Download CSV template

### 7.9 Settings Routes
- ✅ `GET /api/user/settings` - Get user settings
- ✅ `POST /api/user/settings` - Save user setting

### 7.10 Utility Routes
- ✅ `GET /api/health` - Health check
- ✅ `GET /api/favicon.ico` - Favicon handler

---

## 8. UI/UX Standards

### 8.1 Design System
**Implementation Status**: ✅ Complete

- Primary color: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Orange (#F59E0B)
- Error: Red (#EF4444)
- Font: Inter (Google Fonts)
- Smooth transitions (200-300ms)
- shadcn/ui component library

### 8.2 Responsive Design
**Implementation Status**: ✅ Complete

- Mobile: Stack columns, responsive tables
- Tablet: 2-column layouts where appropriate
- Desktop: Full layout

### 8.3 Accessibility
**Implementation Status**: ⚠️ Partial

- ✅ Keyboard navigation support
- ✅ Focus indicators
- ⚠️ ARIA labels (some missing)
- ⚠️ Screen reader optimization (needs improvement)
- ⚠️ Color contrast (needs verification)

---

## Implementation Status Summary

### ✅ Fully Implemented
- Authentication & Authorization
- Customer Management (Kanban, Table views)
- Customer Detail Page (all tabs)
- User Management
- Activity Log Viewer
- CSV/Excel Import
- RBAC with permissions
- Notes with @mentions
- Google Drive attachments
- Export functionality

### ⚠️ Partially Implemented
- Advanced Filters (structure exists, needs completion)
- Accessibility features (needs enhancement)

### ❌ Not Implemented
- Grid View (intentionally removed)
- File uploads (replaced with Google Drive links)
- Real-time updates
- Notification panel
- Theme switching
- Desktop notifications

---

## Known Issues & Future Improvements

1. **Accessibility**: Needs ARIA label audit and screen reader testing
2. **Error Handling**: Some error messages could be more user-friendly
3. **Loading States**: Some operations could benefit from better loading indicators
4. **Mobile Experience**: Some dialogs could be optimized for mobile
5. **Performance**: Large datasets may need pagination improvements

---

**End of Specification**

