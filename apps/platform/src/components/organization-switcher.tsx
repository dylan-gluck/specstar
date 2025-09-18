"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Plus, ChevronsUpDown, Check } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

interface OrganizationSwitcherProps {
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  }>;
  activeOrganizationId?: string | null;
}

export function OrganizationSwitcher({
  organizations = [],
  activeOrganizationId,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [activeOrg, setActiveOrg] = useState(
    organizations.find((org) => org.id === activeOrganizationId) ||
      organizations[0],
  );

  useEffect(() => {
    const active = organizations.find((org) => org.id === activeOrganizationId);
    if (active) {
      setActiveOrg(active);
    }
  }, [activeOrganizationId, organizations]);

  const handleSetActiveOrganization = async (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;

    try {
      // Use better-auth organizationClient function
      const { data, error } = await authClient.organization.setActive({
        organizationId: orgId,
      });

      if (!error) {
        setActiveOrg(org);
        router.refresh();
      } else {
        console.error("Failed to set active organization:", error);
      }
    } catch (error) {
      console.error("Failed to set active organization:", error);
    }
  };

  if (organizations.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            asChild
          >
            <Link href="/organization">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">No Organization</span>
                <span className="truncate text-xs text-muted-foreground">
                  Click to create
                </span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeOrg?.logo ? (
                  <img src={activeOrg.logo} alt="" className="size-4" />
                ) : (
                  <Building2 className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeOrg?.name || "Select Organization"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeOrg?.slug || "No active organization"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-[220px] rounded-lg"
            align="center"
            side="bottom"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org, index) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSetActiveOrganization(org.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {org.logo ? (
                    <img src={org.logo} alt="" className="size-3.5" />
                  ) : (
                    <Building2 className="size-3.5 shrink-0" />
                  )}
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === activeOrg?.id && <Check className="size-4" />}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <Link href="/organization">
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <span className="text-muted-foreground">Add organization</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}