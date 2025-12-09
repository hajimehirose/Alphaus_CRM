-- Migration script to enhance attachments table for file uploads
-- Run this in Supabase SQL Editor

-- Add columns for file upload support
ALTER TABLE attachments 
  ADD COLUMN IF NOT EXISTS filename TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS is_file_upload BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN attachments.filename IS 'Original filename for uploaded files';
COMMENT ON COLUMN attachments.file_size IS 'File size in bytes';
COMMENT ON COLUMN attachments.file_type IS 'MIME type of the file';
COMMENT ON COLUMN attachments.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN attachments.is_file_upload IS 'True if file is uploaded to storage, false if external URL';

-- Note: Existing records will have is_file_upload = false and use url/storage_type
-- New file uploads will have is_file_upload = true and use storage_path

