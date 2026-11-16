-- Clean Database Script
-- Run this against your Supabase project to remove all mock/test data
-- while preserving the editor account and essential configuration.
--
-- Usage: supabase db query --file supabase/clean-database.sql --linked
-- Or paste into Supabase SQL Editor

-- ============================================================================
-- SAFETY: Verify what will be deleted before running
-- ============================================================================
-- Uncomment the SELECT statements below to preview what will be deleted
-- ============================================================================

-- Preview posts to be deleted
-- SELECT id, title, slug, status, author_name, inserted_at FROM public.posts ORDER BY inserted_at DESC;

-- Preview comments to be deleted
-- SELECT id, post_id, author_name, content, inserted_at FROM public.comments ORDER BY inserted_at DESC;

-- Preview author applications to be deleted
-- SELECT id, user_id, provider, handle, display_name, status, created_at FROM public.author_applications ORDER BY created_at DESC;

-- Preview profiles to be deleted (excluding editor)
-- SELECT p.user_id, p.slug, p.display_name, p.published, p.created_at
-- FROM public.profiles p
-- LEFT JOIN public.editors e ON e.user_id = p.user_id
-- WHERE e.user_id IS NULL
-- ORDER BY p.created_at DESC;

-- Preview billing data to be deleted
-- SELECT * FROM public.billing_orders ORDER BY occurred_at DESC;
-- SELECT * FROM public.billing_subscriptions ORDER BY updated_at DESC;
-- SELECT * FROM public.billing_events ORDER BY received_at DESC;
-- SELECT * FROM public.billing_customers;

-- Preview API keys to be deleted
-- SELECT id, user_id, name, prefix, created_at, revoked_at FROM public.api_keys;

-- Preview LinkedIn data to be deleted
-- SELECT * FROM public.linkedin_events ORDER BY created_at DESC;
-- SELECT * FROM public.linkedin_tokens;

-- ============================================================================
-- ACTUAL DELETION - Run these statements to clean the database
-- ============================================================================

BEGIN;

-- 1. Delete all comments (cascades from posts, but explicit is clearer)
DELETE FROM public.comments;

-- 2. Delete all posts (articles/reviews)
DELETE FROM public.posts;

-- 3. Delete all author applications
DELETE FROM public.author_applications;

-- 4. Delete all profiles EXCEPT the editor (Ashif Ahmed Shuvo)
-- The editor is identified by email in auth.users
DELETE FROM public.profiles
WHERE user_id NOT IN (
    SELECT id FROM auth.users
    WHERE email IN ('ashif@researchwith.me', 'hello@researchwith.me')
);

-- 5. Delete billing data (orders, subscriptions, events, customers)
DELETE FROM public.billing_orders;
DELETE FROM public.billing_subscriptions;
DELETE FROM public.billing_events;
DELETE FROM public.billing_customers;

-- 6. Delete API keys and related data
DELETE FROM public.api_requests;
DELETE FROM public.api_usage_periods;
DELETE FROM public.api_keys;

-- 7. Delete LinkedIn data
DELETE FROM public.linkedin_events;
DELETE FROM public.linkedin_tokens;

-- 8. Clean storage buckets (remove all objects but keep buckets)
-- Note: This requires storage admin privileges
-- DELETE FROM storage.objects WHERE bucket_id IN ('blog-images', 'profile-images');

-- 9. Verify editor is preserved
-- The editor row in public.editors should remain
-- If it was accidentally deleted, re-create it:
-- INSERT INTO public.editors (user_id, role, display_name, note)
-- SELECT id, 'editor-in-chief', 'Ashif Ahmed Shuvo', 'Preserved during cleanup'
-- FROM auth.users
-- WHERE email IN ('ashif@researchwith.me', 'hello@researchwith.me')
-- ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES - Run after cleanup to confirm
-- ============================================================================

-- Verify posts are empty
SELECT 'posts' as table_name, COUNT(*) as remaining_rows FROM public.posts
UNION ALL
SELECT 'comments', COUNT(*) FROM public.comments
UNION ALL
SELECT 'author_applications', COUNT(*) FROM public.author_applications
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles
UNION ALL
SELECT 'editors', COUNT(*) FROM public.editors
UNION ALL
SELECT 'billing_orders', COUNT(*) FROM public.billing_orders
UNION ALL
SELECT 'billing_subscriptions', COUNT(*) FROM public.billing_subscriptions
UNION ALL
SELECT 'billing_events', COUNT(*) FROM public.billing_events
UNION ALL
SELECT 'billing_customers', COUNT(*) FROM public.billing_customers
UNION ALL
SELECT 'api_keys', COUNT(*) FROM public.api_keys
UNION ALL
SELECT 'api_requests', COUNT(*) FROM public.api_requests
UNION ALL
SELECT 'api_usage_periods', COUNT(*) FROM public.api_usage_periods
UNION ALL
SELECT 'linkedin_events', COUNT(*) FROM public.linkedin_events
UNION ALL
SELECT 'linkedin_tokens', COUNT(*) FROM public.linkedin_tokens;

-- Verify editor is preserved
SELECT e.user_id, e.role, e.display_name, e.added_at, u.email
FROM public.editors e
JOIN auth.users u ON u.id = e.user_id;

-- Verify storage buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('blog-images', 'profile-images');