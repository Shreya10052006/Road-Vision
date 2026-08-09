import { AppShell } from "@/components/layout/AppShell";
import { SidebarProvider } from "@/contexts/SidebarContext";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  );
}
