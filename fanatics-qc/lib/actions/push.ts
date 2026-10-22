"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { pushConfigured, sendPush } from "@/lib/push";

const subSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscriptionAction(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireUser();
  const parsed = subSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid subscription" };
  await getRepo().savePushSubscription(ctx, { endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth }, headers().get("user-agent") ?? "");
  return { ok: true };
}

export async function removePushSubscriptionAction(endpoint: string) {
  const ctx = await requireUser();
  await getRepo().removePushSubscription(ctx, String(endpoint).slice(0, 1000));
}

export async function testPushAction(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "VAPID keys are not configured on the server." };
  await sendPush(getRepo(), [ctx.user.id], { title: "Fanatics QC Lab", body: "Push notifications are working on this device ✓", href: "/notifications" });
  return { ok: true };
}
