"use client";

import { MessageSquare, Archive } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { formatDistanceToNow } from "date-fns";

interface ThreadItemProps {
  id: string;
  title: string;
  updatedAt: string;
  isActive: boolean;
  onSelect: () => void;
  onArchive: () => void;
}

export function ThreadItem({
  id,
  title,
  updatedAt,
  isActive,
  onSelect,
  onArchive,
}: ThreadItemProps) {
  const timeAgo = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  return (
    <div className="group relative">
      <SidebarMenuButton
        onClick={onSelect}
        isActive={isActive}
        className="w-full justify-start"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <div className="flex-1 truncate text-left">
          <div className="truncate font-medium">{title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {timeAgo}
          </div>
        </div>
      </SidebarMenuButton>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onArchive();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
        title="Archive thread"
      >
        <Archive className="h-3 w-3" />
      </button>
    </div>
  );
}
