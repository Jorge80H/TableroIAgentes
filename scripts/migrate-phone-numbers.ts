/**
 * Migration Script: Normalize Phone Numbers
 *
 * This script normalizes all phone numbers in existing conversations
 * to ensure consistent grouping by phone number.
 *
 * Run with: npx tsx scripts/migrate-phone-numbers.ts
 */

import { init } from "@instantdb/admin";

const APP_ID = process.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("ERROR: INSTANT_ADMIN_TOKEN environment variable is required!");
  console.error("Please set it in your .env file or pass it as an environment variable.");
  process.exit(1);
}

// Initialize InstantDB
const db = init({
  appId: APP_ID,
  adminToken: ADMIN_TOKEN
});

/**
 * Normalizes phone numbers to a consistent format for comparison and storage.
 * Removes all non-numeric characters except the leading '+' for international numbers.
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // Remove leading '=' from n8n expressions
  let normalized = phone.startsWith('=') ? phone.substring(1) : phone;

  // Check if number has international prefix
  const hasInternationalPrefix = normalized.trim().startsWith('+');

  // Remove all non-numeric characters
  normalized = normalized.replace(/\D/g, '');

  // Add back the '+' if it was present
  if (hasInternationalPrefix && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }

  return normalized;
}

async function migratePhoneNumbers() {
  console.log("Starting phone number migration...\n");

  try {
    // Get all conversations
    console.log("Fetching all conversations...");
    const result = await db.query({ conversations: {} });
    const conversations = result?.conversations || [];

    console.log(`Found ${conversations.length} conversations\n`);

    if (conversations.length === 0) {
      console.log("No conversations to migrate.");
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each conversation
    for (const conversation of conversations) {
      const originalPhone = conversation.clientPhone;
      const normalizedPhone = normalizePhoneNumber(originalPhone);

      if (originalPhone !== normalizedPhone) {
        console.log(`Updating conversation ${conversation.id}:`);
        console.log(`  Original:   "${originalPhone}"`);
        console.log(`  Normalized: "${normalizedPhone}"`);

        // Update the conversation with normalized phone
        await db.transact([
          db.tx.conversations[conversation.id].update({
            clientPhone: normalizedPhone
          })
        ]);

        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("Migration Complete!");
    console.log("=".repeat(50));
    console.log(`Total conversations: ${conversations.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Already normalized (skipped): ${skippedCount}`);

  } catch (error) {
    console.error("\nMigration failed with error:");
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migratePhoneNumbers()
  .then(() => {
    console.log("\n✅ Migration script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration script failed:");
    console.error(error);
    process.exit(1);
  });
