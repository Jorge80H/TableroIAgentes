import { useState } from "react";
import { db } from "@/lib/instant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Bot, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateAgentDialog } from "@/components/create-agent-dialog";
import { EditAgentDialog } from "@/components/edit-agent-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Agent = {
  id: string;
  name: string;
  webhookUrl: string;
  apiToken: string;
  isActive: boolean;
};

export default function Agents() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query agents from InstantDB
  const { isLoading, error, data } = db.useQuery({ agents: {} });
  const agents = data?.agents || [];

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await db.transact([
        db.tx.agents[id].delete(),
      ]);

      toast({
        title: "Agent deleted",
        description: "The agent has been removed successfully.",
      });
      setDeletingAgent(null);
    } catch (error: any) {
      console.error("Delete agent error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete agent",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your AI agents and their WhatsApp integrations
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-agent">
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {agents && agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No agents yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first agent to start managing conversations
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-agent">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents?.map((agent) => (
            <Card key={agent.id} className="hover-elevate" data-testid={`card-agent-${agent.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-agent-name-${agent.id}`}>
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant={agent.isActive ? "default" : "secondary"} data-testid={`badge-agent-status-${agent.id}`}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardDescription>
                  </div>
                  <Bot className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
                  <p className="text-sm font-mono truncate" data-testid={`text-webhook-url-${agent.id}`}>
                    {agent.webhookUrl}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">API Token</p>
                  <p className="text-sm font-mono truncate" data-testid={`text-api-token-${agent.id}`}>
                    {agent.apiToken.substring(0, 20)}...
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingAgent(agent)}
                    data-testid={`button-edit-agent-${agent.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeletingAgent(agent)}
                    data-testid={`button-delete-agent-${agent.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAgentDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      
      {editingAgent && (
        <EditAgentDialog
          agent={editingAgent}
          open={!!editingAgent}
          onOpenChange={(open) => !open && setEditingAgent(null)}
        />
      )}

      <AlertDialog open={!!deletingAgent} onOpenChange={(open) => !open && setDeletingAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingAgent?.name}"? This action cannot be undone and will affect all associated conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAgent && handleDelete(deletingAgent.id)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
