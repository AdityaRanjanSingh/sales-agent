"use client";

import { useEffect, useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import { SettingsDrawer } from "@/components/SettingsDrawer";

export default function AgentsPage() {
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch custom instructions on mount
  useEffect(() => {
    const fetchInstructions = async () => {
      try {
        const response = await fetch("/api/user-preferences");
        if (response.ok) {
          const data = await response.json();
          setCustomInstructions(data.customInstructions || "");
        }
      } catch (error) {
        console.error("Error fetching custom instructions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstructions();
  }, []);

  // Make custom instructions readable to the agent
  useCopilotReadable({
    description: "User's custom instructions for the sales assistant",
    value: customInstructions,
  });

  return (
    <div className="relative h-full">
      <CopilotChat
        className="h-full"
        labels={{
          title: "Sales Assistant",
          initial:
            "Hi! I'm your AI sales assistant. I can help you manage customer emails and brochure requests. Try asking me to 'check for brochure requests' or 'search for unread emails'.",
        }}
      />
      <div className="absolute top-4 right-4 z-10">
        <SettingsDrawer
          initialInstructions={customInstructions}
          onInstructionsChange={setCustomInstructions}
        />
      </div>
    </div>
  );
}
