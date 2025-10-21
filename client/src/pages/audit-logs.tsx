import { db } from "@/lib/instant";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList } from "lucide-react";

export default function AuditLogs() {
  const { isLoading, data } = db.useQuery({ auditLogs: {} });
  const logs = data?.auditLogs || [];

  const getActionBadge = (action: string) => {
    const variants: Record<string, string> = {
      TAKE_CONTROL: "bg-blue-600/10 text-blue-700 dark:text-blue-400",
      RETURN_TO_AI: "bg-green-600/10 text-green-700 dark:text-green-400",
      CREATE_AGENT: "bg-purple-600/10 text-purple-700 dark:text-purple-400",
      UPDATE_AGENT: "bg-amber-600/10 text-amber-700 dark:text-amber-400",
      DELETE_AGENT: "bg-red-600/10 text-red-700 dark:text-red-400",
    };
    return (
      <Badge variant="secondary" className={variants[action] || ""}>
        {action.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Track all actions performed in the system
        </p>
      </div>

      {logs && logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No audit logs yet</h3>
            <p className="text-sm text-muted-foreground">
              Actions will appear here as they are performed
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              A complete history of all system actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id} data-testid={`audit-log-${log.id}`} className="hover-elevate">
                    <TableCell className="text-sm" data-testid={`audit-timestamp-${log.id}`}>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm font-medium" data-testid={`audit-user-${log.id}`}>
                      {log.userId}
                    </TableCell>
                    <TableCell data-testid={`audit-action-${log.id}`}>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`audit-details-${log.id}`}>
                      {log.details || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
