import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "auth_success") {
          console.log("WebSocket authenticated");
        } else if (data.type === "new_message") {
          // Invalidate messages query for the conversation
          queryClient.invalidateQueries({
            queryKey: ["/api/conversations", data.conversationId, "messages"],
          });
          // Also invalidate conversations list to update last message time
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        } else if (data.type === "conversation_updated") {
          // Invalidate conversations list
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        }
      } catch (error) {
        console.error("WebSocket message parse error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  return wsRef;
}
