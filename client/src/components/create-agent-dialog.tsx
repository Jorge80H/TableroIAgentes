import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAgentSchema, type InsertAgent } from "@shared/schema";
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

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const { toast } = useToast();

  const form = useForm<InsertAgent>({
    resolver: zodResolver(insertAgentSchema),
    defaultValues: {
      name: "",
      webhookUrl: "",
      apiToken: "",
      organizationId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAgent) => {
      return await apiRequest("POST", "/api/agents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent created",
        description: "Your new agent has been created successfully.",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Configure a new AI agent to handle WhatsApp conversations
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
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
                      data-testid="input-agent-name"
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
                      data-testid="input-webhook-url"
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
                      data-testid="input-api-token"
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
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
