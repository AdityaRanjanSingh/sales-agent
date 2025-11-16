"use client";

import { Plus, RefreshCw } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ThreadItem } from "./ThreadItem";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import { Skeleton } from "@/components/ui/skeleton";

export function ThreadList() {
  const {
    threads,
    currentThreadId,
    isLoading,
    loadThread,
    archiveThread,
    refreshThreads,
    setCurrentThreadId,
  } = useChatHistory();

  const handleArchive = async (threadId: string) => {
    if (confirm("Are you sure you want to archive this conversation?")) {
      await archiveThread(threadId);
    }
  };

  const handleNewChat = () => {
    setCurrentThreadId(null);
  };

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between px-2">
        <SidebarGroupLabel>Conversations</SidebarGroupLabel>
        <div className="flex gap-1">
          <button
            onClick={refreshThreads}
            className="p-1 hover:bg-accent rounded"
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={handleNewChat}
            className="p-1 hover:bg-accent rounded"
            title="New Chat"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading ? (
            // Loading skeleton
            <>
              {[1, 2, 3].map((i) => (
                <SidebarMenuItem key={i}>
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </SidebarMenuItem>
              ))}
            </>
          ) : threads.length === 0 ? (
            // Empty state
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <p>No conversations yet</p>
              <p className="text-xs mt-2">Start a new chat to begin</p>
            </div>
          ) : (
            // Thread list
            threads.map((thread) => (
              <SidebarMenuItem key={thread.id}>
                <ThreadItem
                  id={thread.id}
                  title={thread.title}
                  updatedAt={thread.updatedAt}
                  isActive={currentThreadId === thread.id}
                  onSelect={() => loadThread(thread.id)}
                  onArchive={() => handleArchive(thread.id)}
                />
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
