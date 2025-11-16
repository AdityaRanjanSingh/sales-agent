import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bot, Settings2 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { CustomInstructionsProvider } from "@/contexts/CustomInstructionsContext";
import { ChatHistoryProvider } from "@/contexts/ChatHistoryContext";
import { ThreadList } from "@/components/chat/ThreadList";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CustomInstructionsProvider>
      <ChatHistoryProvider>
        <SidebarProvider>
          <Sidebar collapsible="icon">
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarTrigger />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
              <ThreadList />
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SettingsDrawer />
                </SidebarMenuItem>
                <SidebarSeparator />
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg">
                    <UserButton />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">Account</span>
                      <span className="truncate text-xs">Manage profile</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </ChatHistoryProvider>
    </CustomInstructionsProvider>
  );
}
