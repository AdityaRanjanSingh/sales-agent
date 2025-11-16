"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Message {
  role: string;
  content: string;
  [key: string]: unknown;
}

interface ThreadViewProps {
  title: string;
  messages: Message[];
  onBack: () => void;
}

export function ThreadView({ title, messages, onBack }: ThreadViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-xs font-semibold mb-1 opacity-70">
                  {message.role === "user" ? "You" : "Assistant"}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              No messages in this conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
