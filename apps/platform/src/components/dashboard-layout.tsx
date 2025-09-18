import { DashboardNav } from "./dashboard-nav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  }>;
  activeOrganizationId?: string | null;
}

export function DashboardLayout({ children, user, organizations, activeOrganizationId }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardNav
        user={user}
        organizations={organizations}
        activeOrganizationId={activeOrganizationId}
      />
      <SidebarInset>
        <main className="container mx-auto py-6 px-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}