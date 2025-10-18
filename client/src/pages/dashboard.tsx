import { useQuery } from "@tanstack/react-query";
import type { Agent, Conversation } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, UserCheck, BotIcon } from "lucide-react";

export default function Dashboard() {
  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const activeAgents = agents?.filter((a) => a.isActive === "true").length || 0;
  const totalConversations = conversations?.length || 0;
  const aiActiveCount = conversations?.filter((c) => c.status === "AI_ACTIVE").length || 0;
  const humanActiveCount = conversations?.filter((c) => c.status === "HUMAN_ACTIVE").length || 0;

  const stats = [
    {
      title: "Active Agents",
      value: activeAgents,
      description: `${agents?.length || 0} total agents`,
      icon: Bot,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-600/10",
    },
    {
      title: "Total Conversations",
      value: totalConversations,
      description: "Across all agents",
      icon: MessageSquare,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-600/10",
    },
    {
      title: "AI Active",
      value: aiActiveCount,
      description: "Handled by AI agents",
      icon: BotIcon,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-600/10",
    },
    {
      title: "Human Active",
      value: humanActiveCount,
      description: "Handled by agents",
      icon: UserCheck,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-600/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your WhatsApp conversation management
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} data-testid={`stat-card-${stat.title.toLowerCase().replace(" ", "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-md ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-value-${stat.title.toLowerCase().replace(" ", "-")}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Latest customer interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {conversations && conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-3">
                {conversations?.slice(0, 5).map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`recent-conversation-${conv.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {conv.clientName || conv.clientPhone}
                      </p>
                      <p className="text-xs text-muted-foreground">{conv.clientPhone}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        conv.status === "AI_ACTIVE"
                          ? "bg-green-600/10 text-green-700 dark:text-green-400"
                          : "bg-blue-600/10 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {conv.status === "AI_ACTIVE" ? "AI" : "Human"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Agents</CardTitle>
            <CardDescription>Configured WhatsApp bots</CardDescription>
          </CardHeader>
          <CardContent>
            {agents && agents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No agents configured yet
              </p>
            ) : (
              <div className="space-y-3">
                {agents?.slice(0, 5).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`recent-agent-${agent.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Bot className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground truncate font-mono">
                          {agent.webhookUrl}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                        agent.isActive === "true"
                          ? "bg-green-600/10 text-green-700 dark:text-green-400"
                          : "bg-gray-600/10 text-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {agent.isActive === "true" ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
