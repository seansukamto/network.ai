import { supabaseAdmin } from '../config/supabase';
import { generateEmbedding } from '../config/openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Backfill vectors for existing users
 * Generates embeddings for all users who don't have vectors yet
 */

async function backfillVectors() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   BACKFILL VECTORS FOR EXISTING USERS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Get all users
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, company, job_title, bio, interests');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('ℹ️  No users found in database');
      return;
    }

    console.log(`📊 Found ${allUsers.length} total users\n`);

    // Get existing vectors
    const { data: existingVectors, error: vectorsError } = await supabaseAdmin
      .from('vectors')
      .select('owner_id')
      .eq('owner_type', 'person');

    if (vectorsError) {
      console.error('⚠️  Could not fetch existing vectors:', vectorsError.message);
    }

    const existingOwnerIds = new Set(
      existingVectors?.map(v => v.owner_id) || []
    );

    console.log(`✅ ${existingOwnerIds.size} users already have vectors\n`);

    // Find users without vectors
    const usersWithoutVectors = allUsers.filter(
      user => !existingOwnerIds.has(user.id)
    );

    if (usersWithoutVectors.length === 0) {
      console.log('✨ All users already have vectors! Nothing to do.\n');
      return;
    }

    console.log(`🔄 Generating vectors for ${usersWithoutVectors.length} users...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutVectors) {
      try {
        // Build embedding text from available profile data
        const parts = [
          user.name,
          user.job_title && user.company 
            ? `${user.job_title} at ${user.company}` 
            : user.job_title || user.company,
          user.bio,
          user.interests ? `Interests: ${user.interests}` : null,
        ].filter(Boolean);

        const embeddingText = parts.join('. ');

        // Skip if no meaningful content
        if (!embeddingText.trim() || embeddingText === user.name) {
          console.log(`⏭️  ${user.name} - Skipped (no profile data)`);
          skipCount++;
          continue;
        }

        // Generate embedding
        console.log(`🔄 ${user.name} - Generating embedding...`);
        const embedding = await generateEmbedding(embeddingText);

        // Insert vector
        const { error: insertError } = await supabaseAdmin
          .from('vectors')
          .insert({
            owner_type: 'person',
            owner_id: user.id,
            embedding: JSON.stringify(embedding),
            text_content: embeddingText,
          });

        if (insertError) {
          throw insertError;
        }

        console.log(`   ✅ Success! (${embeddingText.substring(0, 60)}...)\n`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errorCount++;
      }
    }

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('   BACKFILL COMPLETE!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`✅ Successfully generated: ${successCount}`);
    console.log(`⏭️  Skipped (no data): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n📊 Total vectors now: ${existingOwnerIds.size + successCount}\n`);

    // Verify final count
    const { count: finalCount } = await supabaseAdmin
      .from('vectors')
      .select('*', { count: 'exact', head: true })
      .eq('owner_type', 'person');

    console.log(`🔍 Verification: ${finalCount} person vectors in database\n`);

    if (successCount > 0) {
      console.log('💡 Your AI Assistant semantic search is now much more powerful!\n');
      console.log('Try these queries:');
      console.log('  npm run ai:test "Find people who work in tech"');
      console.log('  npm run ai:test "Show me engineers"');
      console.log('  npm run ai:test "People interested in startups"\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Run the backfill
backfillVectors()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

