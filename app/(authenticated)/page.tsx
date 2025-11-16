"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useCustomInstructions } from "@/contexts/CustomInstructionsContext";

export default function AgentsPage() {
  const { customInstructions } = useCustomInstructions();

  // Make custom instructions readable to the agent
  useCopilotReadable({
    description: "User's custom instructions for the sales assistant",
    value: customInstructions,
  });

  return (
    <CopilotChat
      className="h-full"
      labels={{
        title: "Sales Assistant",
        initial:
          "Hi! I'm your AI sales assistant. I can help you manage customer emails and brochure requests. Try asking me to 'check for brochure requests' or 'search for unread emails'.",
      }}
    />
  );
}
