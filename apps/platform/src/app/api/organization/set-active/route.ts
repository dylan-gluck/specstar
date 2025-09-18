import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = await req.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const result = await auth.api.setActiveOrganization({
      body: {
        organizationId,
      },
      headers: await headers(),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Failed to set active organization:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set active organization" },
      { status: 500 }
    );
  }
}