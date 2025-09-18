import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });

  const apiKeys = await auth.api.listApiKeys({
    headers: await headers(),
  });

  return (
    <DashboardLayout
      user={session.user}
      organizations={organizations || []}
      activeOrganizationId={session.session.activeOrganizationId}
    >
      <ApiKeysClient user={session.user} initialApiKeys={apiKeys || []} />
    </DashboardLayout>
  );
}