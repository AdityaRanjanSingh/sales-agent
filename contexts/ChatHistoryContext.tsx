"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

interface ChatMessage {
  role: string;
  content: string;
  [key: string]: unknown;
}

interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryContextType {
  threads: ChatThread[];
  currentThreadId: string | null;
  isLoading: boolean;
  loadThread: (threadId: string) => Promise<void>;
  createThread: (title: string, messages?: ChatMessage[]) => Promise<string>;
  archiveThread: (threadId: string) => Promise<void>;
  updateThreadMessages: (threadId: string, messages: ChatMessage[]) => Promise<void>;
  refreshThreads: () => Promise<void>;
  setCurrentThreadId: (threadId: string | null) => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(
  undefined,
);

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all threads
  const fetchThreads = useCallback(async () => {
    try {
      const response = await fetch("/api/chat-threads");
      if (response.ok) {
        const data = await response.json();
        setThreads(data.threads || []);
      }
    } catch (error) {
      console.error("Error fetching chat threads:", error);
    }
  }, []);

  // Load threads on mount
  useEffect(() => {
    const loadThreads = async () => {
      setIsLoading(true);
      await fetchThreads();
      setIsLoading(false);
    };

    loadThreads();
  }, [fetchThreads]);

  // Load a specific thread
  const loadThread = useCallback(async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat-threads/${threadId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentThreadId(threadId);
        return data.thread;
      }
    } catch (error) {
      console.error("Error loading thread:", error);
      throw error;
    }
  }, []);

  // Create a new thread
  const createThread = useCallback(
    async (title: string, messages: ChatMessage[] = []) => {
      try {
        const response = await fetch("/api/chat-threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, messages }),
        });

        if (response.ok) {
          const data = await response.json();
          await fetchThreads(); // Refresh thread list
          setCurrentThreadId(data.thread.id);
          return data.thread.id;
        }
        throw new Error("Failed to create thread");
      } catch (error) {
        console.error("Error creating thread:", error);
        throw error;
      }
    },
    [fetchThreads],
  );

  // Archive a thread
  const archiveThread = useCallback(
    async (threadId: string) => {
      try {
        const response = await fetch(`/api/chat-threads/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        });

        if (response.ok) {
          await fetchThreads(); // Refresh thread list
          if (currentThreadId === threadId) {
            setCurrentThreadId(null);
          }
        }
      } catch (error) {
        console.error("Error archiving thread:", error);
        throw error;
      }
    },
    [fetchThreads, currentThreadId],
  );

  // Update thread messages
  const updateThreadMessages = useCallback(
    async (threadId: string, messages: ChatMessage[]) => {
      try {
        await fetch(`/api/chat-threads/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
        });
        // Optionally refresh threads to get updated timestamps
        await fetchThreads();
      } catch (error) {
        console.error("Error updating thread messages:", error);
      }
    },
    [fetchThreads],
  );

  // Refresh threads
  const refreshThreads = useCallback(async () => {
    await fetchThreads();
  }, [fetchThreads]);

  return (
    <ChatHistoryContext.Provider
      value={{
        threads,
        currentThreadId,
        isLoading,
        loadThread,
        createThread,
        archiveThread,
        updateThreadMessages,
        refreshThreads,
        setCurrentThreadId,
      }}
    >
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error(
      "useChatHistory must be used within a ChatHistoryProvider",
    );
  }
  return context;
}
