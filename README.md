# Archera CRM

A modern Customer Relationship Management system built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Authentication**: Google OAuth login via Supabase Auth
- **Role-Based Access Control (RBAC)**: Admin, Manager, Sales, and Viewer roles with granular permissions
- **Customer Management**: 
  - Kanban board view for pipeline management
  - Table view with inline editing
  - Grid view for quick browsing
  - Full CRUD operations
- **Customer Details**: Notes, attachments, and activity timeline
- **User Management**: Admin-only user role management
- **Activity Logging**: Comprehensive audit trail of all system activities
- **CSV Import**: Bulk import customers from CSV files
- **Pipeline Metrics**: Real-time pipeline value, weighted value, win rate, and average deal size

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v3
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account with existing database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MyCRM
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://nihagqfbxxztuanoebrw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Time Setup

1. **Configure Google OAuth**:
   - Go to your Supabase dashboard
   - Navigate to Authentication > Providers
   - Enable Google provider
   - Add your OAuth credentials

2. **Set up Redirect URLs**:
   - In Supabase Auth settings, add `http://localhost:3000/auth/callback` for development
   - Add your production URL for production

3. **Assign Admin Role**:
   - After logging in, assign the Admin role to your user in the `user_roles` table:
   ```sql
   INSERT INTO user_roles (user_id, user_email, role, assigned_by, assigned_at)
   VALUES ('your-user-id', 'your-email@example.com', 'Admin', 'system', NOW());
   ```

## Project Structure

```
my-crm/
├── app/
│   ├── (auth)/
│   │   └── login/          # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Dashboard layout with header
│   │   ├── page.tsx        # Customer list (Kanban/Table/Grid)
│   │   ├── customer/[id]/  # Customer detail page
│   │   ├── users/          # User management (Admin only)
│   │   ├── activity/       # Activity log viewer
│   │   └── import/         # CSV import
│   ├── api/                # API routes
│   ├── auth/callback/      # OAuth callback handler
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── customers/          # Customer-related components
│   └── layout/             # Layout components (Header, etc.)
├── lib/
│   ├── supabase/           # Supabase client utilities
│   ├── permissions.ts      # RBAC logic
│   ├── activity-log.ts     # Activity logging
│   ├── constants.ts        # App constants
│   └── utils.ts            # Utility functions
├── types/
│   └── database.ts         # TypeScript types
└── middleware.ts           # Auth middleware
```

## Role Permissions

### Admin
- Full access to all features
- Manage users and assign roles
- View all activity logs
- Export all data
- Import customers

### Manager
- Create, read, update, delete customers
- View team activity logs
- Export all data
- Import customers

### Sales
- Create, read, update customers (own only)
- View own activity logs
- Export own customers
- Cannot delete customers
- Cannot import

### Viewer
- Read-only access to customers
- Cannot create, update, or delete
- Cannot view activity logs
- Cannot export or import

## API Routes

### Authentication
- `GET /api/auth/session` - Get current session
- `GET /api/auth/me` - Get current user with role
- `POST /api/auth/logout` - Sign out

### Customers
- `GET /api/customers` - List customers (with filters)
- `GET /api/customers/[id]` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

### Customer Details
- `GET /api/customers/[id]/notes` - Get notes
- `POST /api/customers/[id]/notes` - Add note
- `PUT /api/notes/[id]` - Update note
- `DELETE /api/notes/[id]` - Delete note
- `GET /api/customers/[id]/attachments` - Get attachments
- `POST /api/customers/[id]/attachments` - Add attachment
- `DELETE /api/attachments/[id]` - Delete attachment
- `GET /api/customers/[id]/activities` - Get activity timeline

### Users
- `GET /api/users` - List all users (Admin only)
- `PUT /api/users/[id]/role` - Update user role (Admin only)

### Activity Logs
- `GET /api/activity-logs` - Get activity logs (role-based filtering)

### Import
- `POST /api/import/upload` - Upload CSV file
- `POST /api/import/execute` - Execute import

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (your production URL)

### Supabase Configuration

1. Update redirect URLs in Supabase Auth settings:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`

2. Ensure Supabase Storage bucket `imports` exists (for CSV import feature)

## Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Database Schema

The application uses the existing Supabase database. Key tables:

- `customers` - Customer information and deal data
- `user_roles` - User role assignments (RBAC)
- `notes` - Customer notes with mentions
- `attachments` - External file links
- `activity_logs` - System activity audit trail
- `settings` - Application settings
- `import_sessions` - CSV import session tracking

See the project requirements document for full schema details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software.

## Support

For issues or questions, please contact the development team.

