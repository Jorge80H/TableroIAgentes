import "dotenv/config";
import { init, id } from "@instantdb/admin";

const APP_ID = process.env.VITE_INSTANT_APP_ID || 'c089e2f5-a75d-427f-be1d-b059c6a0263d';
const ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN as string });

async function main() {
    console.log("Fetching users...");
    const { data } = await db.query({
        $users: {}
    });

    const users = data?.$users || [];
    console.log(`Found ${users.length} users.`);

    // Find Jorge and Claudia
    const jorge = users.find((u: any) => (u.email || "").toLowerCase().includes("jorge"));
    const claudia = users.find((u: any) => (u.email || "").toLowerCase() === "claudiamontenegroinversiones@gmail.com");

    const orgId = id();
    console.log(`Creating Organization 'Claudia Montenegro Inversiones' with ID: ${orgId}`);

    const txs: any[] = [
        db.tx.organizations[orgId].update({
            name: "Claudia Montenegro Inversiones",
            createdAt: Date.now()
        }),
        db.tx.agents["71aa5628-0611-4477-99c7-b2cf7aa4938c"].update({
            organizationId: orgId
        }),
        db.tx.agents["71aa5628-0611-4477-99c7-b2cf7aa4938c"].link({
            organization: orgId
        })
    ];

    if (jorge) {
        console.log(`Found Jorge (${jorge.email}), updating role to SUPER_ADMIN...`);
        txs.push(db.tx.$users[jorge.id].update({ role: "SUPER_ADMIN" }));
    } else {
        console.log("Jorge not found in $users yet. Please login once to create your record.");
    }

    if (claudia) {
        console.log(`Found Claudia (${claudia.email}), updating role to ADMIN and linking to organization...`);
        txs.push(db.tx.$users[claudia.id].update({
            role: "ADMIN",
            organizationId: orgId
        }));
        txs.push(db.tx.organizations[orgId].link({ users: claudia.id }));
    } else {
        console.log("Claudia not found in $users yet. Please have her register/login with 'claudiamontenegroinversiones@gmail.com', then a Super Admin can link her.");
    }

    console.log("Executing transaction...");
    await db.transact(txs);
    console.log("Migration complete!");
}

main().catch(console.error);
