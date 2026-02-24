import "dotenv/config";
import { init } from "@instantdb/admin";

const APP_ID = process.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
    console.error("INSTANT_ADMIN_TOKEN is missing in the environment");
    process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function main() {
    console.log("Fetching all conversations...");
    // Query conversations
    const { data } = await db.query({
        conversations: {
            messages: {}
        }
    });

    const allConversations = data?.conversations || [];

    // Filter for 'Jorge Henao' or 'Jorge H'
    const targetConversations = allConversations.filter((c: any) => {
        const name = (c.clientName || "").toLowerCase();
        return name.includes("jorge henao") || name.includes("jorge h");
    });

    console.log(`Found ${targetConversations.length} conversation(s) matching 'Jorge Henao'.`);

    if (targetConversations.length === 0) {
        console.log("Nothing to delete.");
        return;
    }

    const transactions = [];

    for (const conv of targetConversations) {
        // Delete all linked messages
        if (conv.messages && conv.messages.length > 0) {
            for (const msg of conv.messages) {
                transactions.push(db.tx.messages[msg.id].delete());
            }
        }
        // Delete the conversation itself
        transactions.push(db.tx.conversations[conv.id].delete());
    }

    console.log(`Executing ${transactions.length} deletion transactions...`);

    // InstantDB accepts transactions in an array
    await db.transact(transactions);

    console.log("Successfully deleted targeted conversations and their messages.");
}

main().catch(console.error);
