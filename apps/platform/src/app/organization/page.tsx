import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { OrganizationClient } from "./organization-client";

export default async function OrganizationPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });

  const activeOrganization = session.session.activeOrganizationId
    ? organizations?.find(org => org.id === session.session.activeOrganizationId)
    : null;

  return (
    <DashboardLayout user={session.user}>
      <OrganizationClient
        user={session.user}
        organizations={organizations || []}
        activeOrganization={activeOrganization || null}
      />
    </DashboardLayout>
  );
}