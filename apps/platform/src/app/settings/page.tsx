import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });

  return (
    <DashboardLayout
      user={session.user}
      organizations={organizations || []}
      activeOrganizationId={session.session.activeOrganizationId}
    >
      <SettingsClient user={session.user} />
    </DashboardLayout>
  );
}