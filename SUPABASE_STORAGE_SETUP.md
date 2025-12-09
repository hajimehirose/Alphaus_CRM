# Supabase Storage Bucket Setup Guide

This guide will help you create the `customer-attachments` storage bucket in Supabase.

## Step 1: Access Supabase Storage

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar (under "Database")

## Step 2: Create the Bucket

1. Click the **"New bucket"** button (or **"Create bucket"**)
2. Fill in the bucket details:
   - **Name**: `customer-attachments`
   - **Public bucket**: ✅ **Checked** (this allows authenticated users to access files)
   - **File size limit**: `10485760` (10MB in bytes) - optional but recommended
   - **Allowed MIME types**: Leave empty to allow all types, OR specify:
     - `image/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`, `text/*`, `video/*`, `audio/*`
3. Click **"Create bucket"**

## Step 3: Set Up Row Level Security (RLS) Policies

After creating the bucket, you need to set up policies so users can upload and access files.

### Option A: Using Supabase Dashboard

1. In the Storage section, click on your `customer-attachments` bucket
2. Go to the **"Policies"** tab
3. Click **"New Policy"** and create the following policies:

#### Policy 1: Allow authenticated users to upload files
- **Policy name**: `Allow authenticated uploads`
- **Allowed operation**: `INSERT`
- **Policy definition**:
  ```sql
  (bucket_id = 'customer-attachments'::text) AND (auth.role() = 'authenticated'::text)
  ```

#### Policy 2: Allow authenticated users to view files
- **Policy name**: `Allow authenticated view`
- **Allowed operation**: `SELECT`
- **Policy definition**:
  ```sql
  (bucket_id = 'customer-attachments'::text) AND (auth.role() = 'authenticated'::text)
  ```

#### Policy 3: Allow file owners to delete files
- **Policy name**: `Allow owner delete`
- **Allowed operation**: `DELETE`
- **Policy definition**:
  ```sql
  (bucket_id = 'customer-attachments'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
  ```
  Note: This assumes files are stored in folders named with user IDs. For simpler access, you can use:
  ```sql
  (bucket_id = 'customer-attachments'::text) AND (auth.role() = 'authenticated'::text)
  ```

### Option B: Using SQL Editor (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New query"**
3. Copy and paste the following SQL:

```sql
-- Create storage policies for customer-attachments bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-attachments'
);

-- Allow authenticated users to view files
CREATE POLICY "Allow authenticated view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-attachments'
);

-- Allow authenticated users to delete their own files
-- This uses a simpler approach - users can delete any file in the bucket
-- For stricter control, you'd need to store user_id in file metadata
CREATE POLICY "Allow authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'customer-attachments'
);
```

4. Click **"Run"** to execute the SQL

## Step 4: Verify the Setup

To verify everything is working:

1. **Check bucket exists**: In Storage, you should see `customer-attachments` bucket
2. **Check policies**: Click on the bucket and go to "Policies" tab - you should see 3 policies
3. **Test upload**: Try uploading a file through the CRM interface

## Troubleshooting

### Issue: "Permission denied" when uploading
- **Solution**: Check that RLS policies are correctly set up
- Verify the bucket is set to "Public bucket"
- Ensure the user is authenticated

### Issue: Files upload but can't be accessed
- **Solution**: Check that the SELECT policy is in place
- Verify the bucket is public or policies allow access

### Issue: "Bucket not found" error
- **Solution**: Double-check the bucket name is exactly `customer-attachments` (case-sensitive)

## Alternative: Simpler Policy (Less Secure)

If you want a simpler setup with less granular control, you can use this single policy:

```sql
-- Allow all authenticated operations on customer-attachments bucket
CREATE POLICY "Allow all authenticated operations"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'customer-attachments')
WITH CHECK (bucket_id = 'customer-attachments');
```

⚠️ **Note**: This gives all authenticated users full access to all files in the bucket. Use with caution.

## Next Steps

After setting up the bucket:
1. Test file upload from the Customer Detail page
2. Verify files appear in Supabase Storage dashboard
3. Test file deletion
4. Check that file URLs work correctly


