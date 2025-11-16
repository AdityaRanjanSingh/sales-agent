"use client";

import { CopilotChat } from "@copilotkit/react-ui";

export default function AgentsPage() {
  return (
    <CopilotChat
      className="h-full"
      labels={{
        title: "Sales Assistant",
        initial: "Hi! I'm your AI sales assistant. I can help you manage customer emails and brochure requests. Try asking me to 'check for brochure requests' or 'search for unread emails'.",
      }}
    />
  );
}
