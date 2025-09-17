"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export interface ApiKey {
  id: string;
  name?: string | null;
  start?: string | null;
  prefix?: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date | null;
  lastRequest?: Date | null;
  remaining?: number | null;
  rateLimitEnabled: boolean;
  rateLimitMax?: number | null;
  metadata?: any;
}

export interface CreateApiKeyInput {
  name?: string;
  prefix?: string;
  expiresIn?: number;
  metadata?: any;
  remaining?: number;
  rateLimitEnabled?: boolean;
  rateLimitMax?: number;
}

export interface UpdateApiKeyInput {
  keyId: string;
  name?: string;
  enabled?: boolean;
  remaining?: number;
  refillAmount?: number;
  refillInterval?: number;
  metadata?: any;
}

export interface ApiKeyWithSecret extends ApiKey {
  key?: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function listApiKeys(): Promise<ActionResponse<ApiKey[]>> {
  try {
    const session = await getSession();

    const apiKeys = await auth.api.listApiKeys({
      headers: await headers(),
    });

    return {
      success: true,
      data: apiKeys || [],
    };
  } catch (error) {
    console.error("Failed to list API keys:", error);
    return {
      success: false,
      error: "Failed to fetch API keys. Please try again.",
      data: [],
    };
  }
}

export async function createApiKey(input: CreateApiKeyInput): Promise<ActionResponse<ApiKeyWithSecret>> {
  try {
    const session = await getSession();

    // Validate input
    if (input.metadata && typeof input.metadata === "string") {
      try {
        input.metadata = JSON.parse(input.metadata);
      } catch (e) {
        return {
          success: false,
          error: "Invalid metadata format. Must be valid JSON.",
        };
      }
    }

    // Create API key using Better Auth server-side API
    const result = await auth.api.createApiKey({
      body: {
        userId: session.user.id,
        name: input.name || `API Key ${new Date().toLocaleDateString()}`,
        prefix: input.prefix || "sk_",
        expiresIn: input.expiresIn,
        remaining: input.remaining || null,
        metadata: input.metadata,
        rateLimitEnabled: input.rateLimitEnabled ?? true,
        rateLimitMax: input.rateLimitMax || 100,
        rateLimitTimeWindow: 1000 * 60 * 60 * 24, // 24 hours
      },
      headers: await headers(),
    });

    if (!result) {
      throw new Error("Failed to create API key");
    }

    return {
      success: true,
      data: result as ApiKeyWithSecret,
    };
  } catch (error) {
    console.error("Failed to create API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create API key. Please try again.",
    };
  }
}

export async function updateApiKey(input: UpdateApiKeyInput): Promise<ActionResponse<ApiKey>> {
  try {
    const session = await getSession();

    // Validate metadata if provided
    if (input.metadata && typeof input.metadata === "string") {
      try {
        input.metadata = JSON.parse(input.metadata);
      } catch (e) {
        return {
          success: false,
          error: "Invalid metadata format. Must be valid JSON.",
        };
      }
    }

    // Update API key using Better Auth server-side API
    const result = await auth.api.updateApiKey({
      body: {
        keyId: input.keyId,
        userId: session.user.id,
        name: input.name,
        enabled: input.enabled,
        remaining: input.remaining,
        refillAmount: input.refillAmount,
        refillInterval: input.refillInterval,
        metadata: input.metadata,
      },
      headers: await headers(),
    });

    if (!result) {
      throw new Error("Failed to update API key");
    }

    return {
      success: true,
      data: result as ApiKey,
    };
  } catch (error) {
    console.error("Failed to update API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update API key. Please try again.",
    };
  }
}

export async function deleteApiKey(keyId: string): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const session = await getSession();

    // Delete API key using Better Auth server-side API
    await auth.api.deleteApiKey({
      body: {
        keyId,
      },
      headers: await headers(),
    });

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete API key. Please try again.",
    };
  }
}

export async function verifyApiKey(key: string, permissions?: Record<string, string[]>): Promise<ActionResponse<{ valid: boolean; key?: ApiKey }>> {
  try {
    // Verify API key using Better Auth server-side API
    const result = await auth.api.verifyApiKey({
      body: {
        key,
        permissions,
      },
    });

    return {
      success: true,
      data: {
        valid: result.valid,
        key: result.key as ApiKey,
      },
    };
  } catch (error) {
    console.error("Failed to verify API key:", error);
    return {
      success: false,
      error: "Failed to verify API key.",
      data: { valid: false },
    };
  }
}