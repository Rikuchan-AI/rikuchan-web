"use server";

import { revalidatePath } from "next/cache";
import { createApiKey, revokeApiKey, rotateApiKey, connectProvider, disconnectProvider } from "@/lib/gateway";

export async function createApiKeyAction(formData: FormData) {
  const name = formData.get("name") as string;
  const scopes = (formData.get("scopes") as string || "gateway:read,gateway:write").split(",").map(s => s.trim());
  const rateLimit = parseInt(formData.get("rate_limit_rpm") as string || "60", 10);

  const result = await createApiKey({ name, scopes, rate_limit_rpm: rateLimit });
  revalidatePath("/dashboard/api-keys");
  return result;
}

export async function revokeApiKeyAction(keyPrefix: string) {
  await revokeApiKey(keyPrefix);
  revalidatePath("/dashboard/api-keys");
}

export async function rotateApiKeyAction(keyPrefix: string) {
  const result = await rotateApiKey(keyPrefix);
  revalidatePath("/dashboard/api-keys");
  return result;
}

export async function connectProviderAction(provider: string, apiKey: string) {
  await connectProvider(provider, apiKey);
  revalidatePath("/dashboard/settings");
}

export async function disconnectProviderAction(provider: string) {
  await disconnectProvider(provider);
  revalidatePath("/dashboard/settings");
}
