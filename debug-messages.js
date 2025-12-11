// Debug script to check InstantDB messages
import { init } from '@instantdb/admin';
import 'dotenv/config';

const APP_ID = process.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!ADMIN_TOKEN || ADMIN_TOKEN === 'your-instant-admin-token-here') {
  console.error('❌ INSTANT_ADMIN_TOKEN not set in .env file');
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function debugMessages() {
  try {
    console.log('🔍 Fetching all conversations and messages...\n');

    const { data } = await db.query({
      conversations: {
        messages: {},
        agent: {}
      }
    });

    const conversations = data?.conversations || [];

    console.log(`📊 Found ${conversations.length} conversation(s)\n`);

    conversations.forEach((conv, index) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Conversation #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID: ${conv.id}`);
      console.log(`Client: ${conv.clientName || conv.clientPhone}`);
      console.log(`Phone: ${conv.clientPhone}`);
      console.log(`Status: ${conv.status}`);
      console.log(`Agent: ${conv.agent?.[0]?.name || 'None'}`);
      console.log(`\n💬 Messages (${conv.messages?.length || 0}):`);

      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach((msg, msgIndex) => {
          console.log(`\n  Message #${msgIndex + 1}:`);
          console.log(`    ID: ${msg.id}`);
          console.log(`    From: ${msg.senderType} (${msg.senderName || 'Unknown'})`);
          console.log(`    Content: ${msg.content?.substring(0, 100)}${msg.content?.length > 100 ? '...' : ''}`);
          console.log(`    Created: ${msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'Unknown'}`);
        });
      } else {
        console.log('  No messages found');
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugMessages();
