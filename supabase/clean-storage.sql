-- Clean Storage Buckets Script
-- Removes all objects from blog-images and profile-images buckets
-- while preserving the bucket configurations.
--
-- Usage: supabase db query --file supabase/clean-storage.sql --linked
-- Or paste into Supabase SQL Editor
--
-- Note: Requires storage admin privileges. The service_role key can do this.
-- If running from SQL Editor, you may need to use the Supabase Dashboard
-- Storage UI instead for bulk deletion.

-- ============================================================================
-- PREVIEW: What will be deleted
-- ============================================================================

-- Preview blog-images objects
-- SELECT id, name, bucket_id, owner, created_at, updated_at, metadata
-- FROM storage.objects
-- WHERE bucket_id = 'blog-images'
-- ORDER BY created_at DESC;

-- Preview profile-images objects
-- SELECT id, name, bucket_id, owner, created_at, updated_at, metadata
-- FROM storage.objects
-- WHERE bucket_id = 'profile-images'
-- ORDER BY created_at DESC;

-- ============================================================================
-- ACTUAL DELETION
-- ============================================================================

BEGIN;

-- Delete all objects from blog-images bucket
DELETE FROM storage.objects
WHERE bucket_id = 'blog-images';

-- Delete all objects from profile-images bucket
DELETE FROM storage.objects
WHERE bucket_id = 'profile-images';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify buckets are empty
SELECT
    bucket_id,
    COUNT(*) as remaining_objects
FROM storage.objects
WHERE bucket_id IN ('blog-images', 'profile-images')
GROUP BY bucket_id;

-- Verify bucket configurations are preserved
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id IN ('blog-images', 'profile-images');

-- ============================================================================
-- ALTERNATIVE: Using Supabase Dashboard (if SQL DELETE fails)
-- ============================================================================
-- If the above DELETE statements fail due to permissions, use the Dashboard:
--
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click on 'blog-images' bucket
-- 3. Click "Select all" → "Delete" (or use the bulk delete option)
-- 4. Repeat for 'profile-images' bucket
--
-- This preserves bucket settings (public, file size limits, MIME types)
-- while removing all uploaded files.