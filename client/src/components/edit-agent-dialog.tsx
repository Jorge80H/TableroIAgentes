import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgentSchema, type InsertAgent, type Agent } from "@shared/schema";
import { db } from "@/lib/instant";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface EditAgentDialogProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAgentDialog({ agent, open, onOpenChange }: EditAgentDialogProps) {
  const { toast } = useToast();
  const { isSuperAdmin } = useCurrentUser();
  const { data: orgsData } = db.useQuery(isSuperAdmin ? { organizations: {} } : null);
  const organizations = orgsData?.organizations || [];

  const form = useForm<InsertAgent>({
    resolver: zodResolver(insertAgentSchema),
    defaultValues: {
      name: agent.name,
      webhookUrl: agent.webhookUrl,
      apiToken: agent.apiToken,
      organizationId: agent.organizationId,
    },
  });

  useEffect(() => {
    form.reset({
      name: agent.name,
      webhookUrl: agent.webhookUrl,
      apiToken: agent.apiToken,
      organizationId: agent.organizationId,
    });
  }, [agent, form]);

  const updateAgent = async (data: InsertAgent) => {
    try {
      const txs = [
        db.tx.agents[agent.id].update({
          name: data.name,
          webhookUrl: data.webhookUrl,
          apiToken: data.apiToken,
          organizationId: isSuperAdmin ? data.organizationId : agent.organizationId
        })
      ];

      if (isSuperAdmin && data.organizationId && data.organizationId !== agent.organizationId) {
        txs.push(db.tx.agents[agent.id].link({ organization: data.organizationId }));
      }

      await db.transact(txs);
      toast({
        title: "Agent updated",
        description: "Your agent has been updated successfully.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update the configuration for this agent
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(updateAgent)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Customer Support Bot"
                      data-testid="input-edit-agent-name"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this agent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://n8n.example.com/webhook/..."
                      className="font-mono text-sm"
                      data-testid="input-edit-webhook-url"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The n8n webhook URL to send messages to WhatsApp
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Token</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter secure API token"
                      className="font-mono text-sm"
                      data-testid="input-edit-api-token"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Secret token for authenticating webhook requests
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSuperAdmin && (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization (Client)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map((org: any) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The client this agent handles conversations for.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                data-testid="button-submit-edit"
              >
                Update Agent
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
