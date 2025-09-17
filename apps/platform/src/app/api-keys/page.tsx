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

  const apiKeys = await auth.api.listApiKeys({
    headers: await headers(),
  });

  return (
    <DashboardLayout user={session.user}>
      <ApiKeysClient user={session.user} initialApiKeys={apiKeys || []} />
    </DashboardLayout>
  );
}