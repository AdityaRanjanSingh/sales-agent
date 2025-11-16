"use client";

import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useCustomInstructions } from "@/contexts/CustomInstructionsContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function AgentsPage() {
  const { customInstructions } = useCustomInstructions();

  // Make custom instructions readable to the agent
  useCopilotReadable({
    description: "User's custom instructions for the sales assistant",
    value: customInstructions,
  });

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Sales Assistant</h1>
      </header>
      <div className="flex-1">
        <CopilotChat
          className="h-full"
          labels={{
            title: "Sales Assistant",
            initial:
              "Hi! I'm your AI sales assistant. I can help you manage customer emails and brochure requests. Try asking me to 'check for brochure requests' or 'search for unread emails'.",
          }}
        />
      </div>
    </div>
  );
}
