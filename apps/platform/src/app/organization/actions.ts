"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * Create a new organization
 */
export async function createOrganization(data: {
  name: string;
  slug: string;
  logo?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.createOrganization({
      body: {
        name: data.name,
        slug: data.slug,
        logo: data.logo,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to create organization:", error);
    return { error: error.message || "Failed to create organization" };
  }
}

/**
 * Set the active organization for the current session
 */
export async function setActiveOrganization(organizationId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.setActiveOrganization({
      body: {
        organizationId,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    revalidatePath("/dashboard");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to set active organization:", error);
    return { error: error.message || "Failed to set active organization" };
  }
}

/**
 * Delete an organization
 */
export async function deleteOrganization(organizationId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.deleteOrganization({
      body: {
        organizationId,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to delete organization:", error);
    return { error: error.message || "Failed to delete organization" };
  }
}

/**
 * Invite a member to an organization
 */
export async function inviteMember(data: {
  email: string;
  role: "member" | "admin" | "owner" | ("member" | "admin" | "owner")[];
  organizationId?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.createInvitation({
      body: {
        email: data.email,
        role: data.role,
        organizationId: data.organizationId,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to invite member:", error);
    return { error: error.message || "Failed to send invitation" };
  }
}

/**
 * Remove a member from an organization
 */
export async function removeMember(data: {
  memberIdOrEmail: string;
  organizationId?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.removeMember({
      body: {
        memberIdOrEmail: data.memberIdOrEmail,
        organizationId: data.organizationId,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to remove member:", error);
    return { error: error.message || "Failed to remove member" };
  }
}

/**
 * Update a member's role in an organization
 */
export async function updateMemberRole(data: {
  memberId: string;
  role: string | string[];
  organizationId?: string;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.updateMemberRole({
      body: {
        memberId: data.memberId,
        role: data.role,
        organizationId: data.organizationId,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to update member role:", error);
    return { error: error.message || "Failed to update role" };
  }
}

/**
 * List all organizations for the current user
 */
export async function listOrganizations() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized", data: [] };
    }

    const organizations = await auth.api.listOrganizations({
      headers: await headers(),
    });

    return { data: organizations || [] };
  } catch (error: any) {
    console.error("Failed to list organizations:", error);
    return { error: error.message || "Failed to list organizations", data: [] };
  }
}

/**
 * Get full organization details
 */
export async function getFullOrganization(data?: {
  organizationId?: string;
  organizationSlug?: string;
  membersLimit?: number;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.getFullOrganization({
      query: {
        organizationId: data?.organizationId,
        organizationSlug: data?.organizationSlug,
        membersLimit: data?.membersLimit,
      },
      headers: await headers(),
    });

    return { data: result };
  } catch (error: any) {
    console.error("Failed to get organization details:", error);
    return { error: error.message || "Failed to get organization details" };
  }
}

/**
 * List members of an organization
 */
export async function listMembers(data?: {
  organizationId?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized", data: [] };
    }

    const members = await auth.api.listMembers({
      query: {
        organizationId: data?.organizationId,
        limit: data?.limit,
        offset: data?.offset,
      },
      headers: await headers(),
    });

    return { data: members || [] };
  } catch (error: any) {
    console.error("Failed to list members:", error);
    return { error: error.message || "Failed to list members", data: [] };
  }
}

/**
 * List invitations for an organization
 */
export async function listInvitations(organizationId?: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized", data: [] };
    }

    const invitations = await auth.api.listInvitations({
      query: {
        organizationId,
      },
      headers: await headers(),
    });

    return { data: invitations || [] };
  } catch (error: any) {
    console.error("Failed to list invitations:", error);
    return { error: error.message || "Failed to list invitations", data: [] };
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const result = await auth.api.cancelInvitation({
      body: {
        invitationId,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to cancel invitation:", error);
    return { error: error.message || "Failed to cancel invitation" };
  }
}

/**
 * Update organization details
 */
export async function updateOrganization(data: {
  organizationId: string;
  name?: string;
  slug?: string;
  logo?: string;
  metadata?: Record<string, any>;
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.logo) updateData.logo = data.logo;
    if (data.metadata) updateData.metadata = data.metadata;

    const result = await auth.api.updateOrganization({
      body: {
        data: updateData,
        organizationId: data.organizationId,
      },
      headers: await headers(),
    });

    revalidatePath("/organization");
    return { data: result };
  } catch (error: any) {
    console.error("Failed to update organization:", error);
    return { error: error.message || "Failed to update organization" };
  }
}