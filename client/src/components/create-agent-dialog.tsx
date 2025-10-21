import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/instant";
import { id } from "@instantdb/react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  webhookUrl: z.string().url("Must be a valid URL"),
  apiToken: z.string().min(1, "API token is required"),
  isActive: z.boolean().default(true),
});

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreateAgentInput = z.infer<typeof createAgentSchema>;

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      webhookUrl: "",
      apiToken: "",
      isActive: true,
    },
  });

  const onSubmit = async (data: CreateAgentInput) => {
    setIsCreating(true);
    try {
      const agentId = id();

      await db.transact([
        db.tx.agents[agentId].update({
          name: data.name,
          webhookUrl: data.webhookUrl,
          apiToken: data.apiToken,
          isActive: data.isActive,
        }),
      ]);

      toast({
        title: "Agent created",
        description: "Your new agent has been created successfully.",
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Create agent error:", error);
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create agent",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

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
            onSubmit={form.handleSubmit(onSubmit)}
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
                disabled={isCreating}
                className="flex-1"
                data-testid="button-submit-create"
              >
                {isCreating ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
