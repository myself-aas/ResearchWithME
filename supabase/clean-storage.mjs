#!/usr/bin/env node
/**
 * Clean Storage Buckets - Node.js Script
 *
 * Uses the Supabase JS client to delete all objects from
 * blog-images and profile-images buckets.
 *
 * Usage:
 *   1. Set environment variables:
 *      export SUPABASE_URL="https://your-project.supabase.co"
 *      export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *   2. Run: node supabase/clean-storage.mjs
 *
 * The service_role key is required for storage admin operations.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nGet the service_role key from Supabase Dashboard → Settings → API');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = ['blog-images', 'profile-images'];

async function listObjects(bucket) {
  const allObjects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit, offset });

    if (error) throw error;
    if (!data || data.length === 0) break;

    allObjects.push(...data.map(obj => obj.name));
    offset += limit;

    if (data.length < limit) break;
  }

  return allObjects;
}

async function deleteObjects(bucket, objects) {
  if (objects.length === 0) return 0;

  // Delete in batches of 100 (Supabase limit)
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < objects.length; i += batchSize) {
    const batch = objects.slice(i, i + batchSize);
    const { error } = await supabase.storage.from(bucket).remove(batch);

    if (error) {
      console.error(`  ⚠️  Batch delete failed: ${error.message}`);
      // Try individual deletes as fallback
      for (const name of batch) {
        const { error: singleError } = await supabase.storage.from(bucket).remove([name]);
        if (!singleError) deleted++;
      }
    } else {
      deleted += batch.length;
    }
  }

  return deleted;
}

async function main() {
  console.log('🧹 Cleaning Supabase Storage Buckets\n');
  console.log(`Project: ${SUPABASE_URL}`);
  console.log(`Buckets: ${BUCKETS.join(', ')}\n`);

  for (const bucket of BUCKETS) {
    console.log(`📦 Processing bucket: ${bucket}`);

    try {
      // List all objects
      const objects = await listObjects(bucket);
      console.log(`   Found ${objects.length} objects`);

      if (objects.length === 0) {
        console.log(`   ✅ Already empty\n`);
        continue;
      }

      // Delete all objects
      console.log(`   Deleting...`);
      const deleted = await deleteObjects(bucket, objects);
      console.log(`   ✅ Deleted ${deleted}/${objects.length} objects\n`);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Verify buckets still exist with correct config
  console.log('🔍 Verifying bucket configurations...');
  for (const bucket of BUCKETS) {
    const { data, error } = await supabase.storage.getBucket(bucket);
    if (error) {
      console.error(`   ❌ ${bucket}: ${error.message}`);
    } else {
      console.log(`   ✅ ${bucket}: public=${data.public}, limit=${data.file_size_limit} bytes, MIME=${data.allowed_mime_types?.join(', ')}`);
    }
  }

  console.log('\n✨ Storage cleanup complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});