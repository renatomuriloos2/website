import "server-only";
import webpush from "web-push";
import type { NotificationInput, Repo } from "@/lib/data/repo";

// Web Push (VAPID). Works on Android/desktop Chrome, Edge, Firefox and on iOS 16.4+
// when the app is installed to the home screen. Generate keys once with:
//   npx web-push generate-vapid-keys
export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function setup() {
  if (configured) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:qc-lab@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  configured = true;
}

/** Sends a push to every registered device of the given users. Expired subscriptions are removed. Never throws. */
export async function sendPush(repo: Repo, userIds: string[], n: NotificationInput) {
  if (!pushConfigured() || !userIds.length) return;
  try {
    setup();
    const subs = await repo.pushSubscriptions(userIds);
    const payload = JSON.stringify({ title: n.title, body: n.body, url: n.href });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await repo.dropPushSubscription(s.endpoint);
        }
      })
    );
  } catch (err) {
    console.error("push failed", err);
  }
}
