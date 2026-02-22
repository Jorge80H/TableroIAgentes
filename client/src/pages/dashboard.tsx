import { db } from "@/lib/instant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, UserCheck, BotIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Agent, Conversation } from "@shared/schema";

export default function Dashboard() {
  const { data: agentsData } = db.useQuery({ agents: {} });
  const { data: conversationsData } = db.useQuery({ conversations: {} });

  const agents = (agentsData?.agents || []) as Agent[];
  const conversations = (conversationsData?.conversations || []) as Conversation[];

  const activeAgents = agents.filter((a: Agent) => a.isActive).length;
  const totalConversations = conversations.length;
  const aiActiveCount = conversations.filter((c: Conversation) => c.status === "AI_ACTIVE").length;
  const humanActiveCount = conversations.filter((c: Conversation) => c.status === "HUMAN_ACTIVE").length;
  const archivedCount = conversations.filter((c: Conversation) => c.status === "ARCHIVED").length;

  const stats = [
    {
      title: "Active Agents",
      value: activeAgents,
      description: `${agents.length} total agents`,
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

  // Chart data for conversation status distribution
  const chartData = [
    { name: "AI Active", value: aiActiveCount, color: "#16a34a" },
    { name: "Human Active", value: humanActiveCount, color: "#2563eb" },
    { name: "Archived", value: archivedCount, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your WhatsApp conversation management
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} data-testid={`stat-card-${stat.title.toLowerCase().replace(/ /g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-md ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-value-${stat.title.toLowerCase().replace(/ /g, "-")}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversation Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Conversation Status</CardTitle>
            <CardDescription>Distribution by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span style={{ fontSize: "12px" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Latest customer interactions</CardDescription>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-3">
                {conversations
                  .slice()
                  .sort((a: Conversation, b: Conversation) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
                  .slice(0, 5)
                  .map((conv: Conversation) => (
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
                        className={`text-xs px-2 py-1 rounded flex-shrink-0 ml-2 ${conv.status === "AI_ACTIVE"
                          ? "bg-green-600/10 text-green-700 dark:text-green-400"
                          : conv.status === "HUMAN_ACTIVE"
                            ? "bg-blue-600/10 text-blue-700 dark:text-blue-400"
                            : "bg-gray-600/10 text-gray-500"
                          }`}
                      >
                        {conv.status === "AI_ACTIVE" ? "AI" : conv.status === "HUMAN_ACTIVE" ? "Human" : "Archived"}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agents overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Agents</CardTitle>
          <CardDescription>Configured WhatsApp bots</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No agents configured yet
            </p>
          ) : (
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent: Agent) => (
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
                    className={`text-xs px-2 py-1 rounded flex-shrink-0 ml-2 ${agent.isActive
                      ? "bg-green-600/10 text-green-700 dark:text-green-400"
                      : "bg-gray-600/10 text-gray-700 dark:text-gray-400"
                      }`}
                  >
                    {agent.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
