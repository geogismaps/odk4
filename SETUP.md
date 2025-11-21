# Data Collection Platform - Setup Guide

## Quick Start

### 1. Initial Setup
Visit `/setup` to create your first company and admin account:
- Enter your company name
- Create an admin account (email, username, password)
- This step only needs to be done once

### 2. Login
After setup, go to `/login` and sign in with your admin credentials.

### 3. Add Users (Admin Only)
Navigate to **User Management** from the dashboard:
- Click "Add User"
- Enter email, username, password, and role (Admin or Field Worker)
- Share credentials with users via email or WhatsApp
- Users can be assigned to specific projects

### 4. Create a Project (Admin Only)
Navigate to **Projects** from the dashboard:
- Click "Create Project"
- Enter project name and optional description
- Optionally configure Teable integration:
  - Teable Base URL
  - Space ID
  - API Token
- The system will automatically create a Teable table when you upload a form

### 5. Upload Forms (Admin Only)
From the Projects list, click on a project, then "Upload Form":
- Upload an ODK XForm XML file
- The system will parse the form structure
- If Teable is configured, a table will be created automatically
- Forms become available for data collection immediately

### 6. Collect Data
Field workers can:
- Navigate to **Forms** from the dashboard
- Select a form to start collecting data
- Use built-in sensors:
  - GPS location capture
  - Camera for photos
  - Audio recording
  - Video recording
  - Text and numeric inputs
  - Select dropdowns
- Submit data (automatically syncs to Teable if configured)

### 7. View Submissions
Navigate to a project and click "Data" to view submissions:
- See all collected data in a table
- Click on any submission to view details
- Update submission status (pending, in review, approved, rejected)
- Check Teable sync status
- Admins can delete submissions

## Features

### Authentication & User Management
- Supabase Auth integration
- Role-based access control (Admin, Field Worker)
- Company-based data isolation
- Session management

### Project Management
- Multi-project support
- Project-level Teable configuration
- Form organization per project
- Active/inactive project status

### Form Collection
- ODK XForm XML support
- Mobile-optimized interface
- Offline-capable (PWA)
- Real-time validation
- GPS, camera, audio, video support

### Data Management
- Submission viewing and editing
- Status workflow management
- Automatic Teable synchronization
- Submission filtering and search
- Data export capabilities

### Security
- Row Level Security (RLS) in Supabase
- Company data isolation
- Encrypted Teable API tokens
- Audit logging for all actions
- Session timeout management

## Database Schema

The platform uses the following tables:
- `companies` - Organization/company data
- `users` - User accounts linked to companies
- `projects` - Data collection projects
- `forms` - ODK form definitions
- `submissions` - Collected form data
- `user_project_access` - User-project assignments
- `attachments` - File attachments from submissions
- `audit_logs` - Security and compliance audit trail

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **PWA**: Service Worker + Web Manifest
- **XML Parsing**: fast-xml-parser
- **Icons**: lucide-react

## Environment Variables

Required environment variables (already configured):
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to your hosting provider

3. Ensure the service worker (`sw.js`) and manifest (`manifest.json`) are accessible

## Mobile Usage

### Install as PWA
1. Visit the application in a mobile browser
2. Tap "Add to Home Screen" (Android) or "Add to Home Screen" (iOS)
3. The app will be installed as a standalone application
4. Works offline with automatic sync when connection is restored

### Best Practices
- Use the mobile app for field data collection
- Ensure GPS permissions are granted for location capture
- Allow camera and microphone access for media capture
- Submit data regularly when connected to sync to Teable

## Teable Integration

When Teable is configured for a project:
1. Upon form upload, a table is automatically created in Teable
2. Table columns are mapped from form fields
3. Each submission is automatically synced to Teable
4. Sync status is tracked per submission
5. Failed syncs can be retried manually

## Troubleshooting

### Can't login after setup
- Ensure you used the correct email and password
- Check that Supabase Auth is properly configured
- Try the `/setup` page again if needed

### Form upload fails
- Verify the XML file is a valid ODK XForm
- Check that you have admin permissions
- Review browser console for detailed errors

### Teable sync fails
- Verify Teable credentials are correct
- Check that the API token has proper permissions
- Review the sync error message in submission details
- Manually retry sync from the submissions page

### GPS not working
- Grant location permissions to the browser
- Ensure HTTPS is enabled (required for geolocation)
- Try in a different browser if issues persist

### Camera not working
- Grant camera permissions to the browser
- Ensure HTTPS is enabled (required for media devices)
- Check that your device has a working camera

## Support

For issues or questions:
1. Check this setup guide
2. Review the browser console for errors
3. Check Supabase logs for backend issues
4. Review audit logs for security-related issues
