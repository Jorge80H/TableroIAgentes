import { db } from "@/lib/instant";
import type { User } from "@shared/schema";

export function useCurrentUser() {
    const { user, isLoading: authLoading } = db.useAuth();

    // Only query the $users table if we have an authenticated user ID
    const { data, isLoading: queryLoading } = db.useQuery(
        user ? {
            $users: {
                $: {
                    where: {
                        id: user.id
                    }
                }
            }
        } : null
    );

    const record = data?.$users?.[0] as User & { type?: string };

    // InstantDB stores role in the `type` field (as seen in the dashboard)
    const userRole = record?.type || record?.role || null;
    const orgId = record?.organizationId || null;

    return {
        user,
        record,
        isLoading: authLoading || (!!user && queryLoading),
        isSuperAdmin: userRole === "SUPER_ADMIN",
        isAdmin: userRole === "ADMIN",
        organizationId: orgId
    };
}
