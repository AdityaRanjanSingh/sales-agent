"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useCustomInstructions } from "@/contexts/CustomInstructionsContext";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import { ThreadView } from "@/components/chat/ThreadView";

export default function AgentsPage() {
  const { customInstructions } = useCustomInstructions();
  const { currentThreadId, threads, setCurrentThreadId } = useChatHistory();

  // Make custom instructions readable to the agent
  useCopilotReadable({
    description: "User's custom instructions for the sales assistant",
    value: customInstructions,
  });

  // Get current thread data for ThreadView
  const currentThread = threads.find((t) => t.id === currentThreadId);

  // Show thread view if a thread is selected
  if (currentThreadId && currentThread) {
    return (
      <ThreadView
        title={currentThread.title}
        messages={currentThread.messages}
        onBack={() => setCurrentThreadId(null)}
      />
    );
  }

  // Show CopilotChat by default
  return (
    <CopilotChat
      className="h-full"
      labels={{
        title: "Sales Assistant",
        initial:
          "Hi! I'm your AI sales assistant. I can help you manage customer emails and draft professional responses. Try asking me to 'check for unread emails' or 'reply to a customer inquiry'.",
      }}
    />
  );
}
