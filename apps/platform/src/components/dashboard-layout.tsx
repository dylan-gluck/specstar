import { DashboardNav } from "./dashboard-nav";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Shuffle from "./Shuffle";

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

export function DashboardLayout({
  children,
  user,
  organizations,
  activeOrganizationId,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardNav
        user={user}
        organizations={organizations}
        activeOrganizationId={activeOrganizationId}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Shuffle
            tag="span"
            className="mx-auto"
            text="spec/star"
            shuffleDirection="right"
            duration={0.35}
            animationMode="evenodd"
            shuffleTimes={1}
            ease="power3.out"
            stagger={0.03}
            threshold={0.1}
            triggerOnce={true}
            triggerOnHover={true}
            respectReducedMotion={true}
          />
        </header>
        <main className="container mx-auto py-6 px-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
