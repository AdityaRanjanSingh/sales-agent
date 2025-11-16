"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { useCustomInstructions } from "@/contexts/CustomInstructionsContext";

export function SettingsDrawer() {
  const { customInstructions, setCustomInstructions } = useCustomInstructions();
  const [localInstructions, setLocalInstructions] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // When opening, sync local state with context
      setLocalInstructions(customInstructions);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customInstructions: localInstructions }),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      const data = await response.json();
      const savedInstructions = data.customInstructions || "";
      setCustomInstructions(savedInstructions);
      toast.success("Settings saved successfully!");
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <SidebarMenuButton size="lg" tooltip="Agent Settings">
          <Settings className="size-4" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Agent Settings</span>
            <span className="truncate text-xs">Customize behavior</span>
          </div>
        </SidebarMenuButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Agent Settings</DialogTitle>
          <DialogDescription>
            Customize how the sales assistant behaves in conversations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="custom-instructions">Custom Instructions</Label>
            <Textarea
              id="custom-instructions"
              placeholder="E.g., Always be concise, use a formal tone, prioritize brevity..."
              value={localInstructions}
              onChange={(e) => setLocalInstructions(e.target.value)}
              className="min-h-[200px]"
            />
            <p className="text-sm text-muted-foreground">
              These instructions will be added to the agent&apos;s system
              prompt. They help customize the agent&apos;s behavior to match
              your preferences.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setLocalInstructions(customInstructions);
              setIsOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
