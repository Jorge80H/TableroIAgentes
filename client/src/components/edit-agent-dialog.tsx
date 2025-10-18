import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgentSchema, type InsertAgent, type Agent } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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

  const updateMutation = useMutation({
    mutationFn: async (data: InsertAgent) => {
      return await apiRequest("PUT", `/api/agents/${agent.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent updated",
        description: "Your agent has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
            onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
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
                disabled={updateMutation.isPending}
                className="flex-1"
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending ? "Updating..." : "Update Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
