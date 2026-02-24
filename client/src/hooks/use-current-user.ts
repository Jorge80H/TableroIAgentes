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

    const currentUserRecord = data?.$users?.[0] as User | undefined;

    return {
        user,
        record: currentUserRecord,
        isLoading: authLoading || (!!user && queryLoading),
        isSuperAdmin: currentUserRecord?.role === "SUPER_ADMIN",
        isAdmin: currentUserRecord?.role === "ADMIN",
        organizationId: currentUserRecord?.organizationId
    };
}
