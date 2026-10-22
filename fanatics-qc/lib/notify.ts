import "server-only";
import { Resend } from "resend";
import { APP_URL } from "@/lib/env";
import type { Repo, NotificationInput } from "@/lib/data/repo";
import { sendPush } from "@/lib/push";

function emailHtml(n: NotificationInput) {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden">
    <tr><td style="background:#09203F;padding:20px 28px;color:#fff;font-weight:700;font-size:20px">Fanatics <span style="color:#E53D2E;font-size:11px;letter-spacing:3px;text-transform:uppercase">Decoration QC Lab</span></td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#09203F">${esc(n.title)}</h1>
      <p style="margin:0 0 24px;color:#4b5060;font-size:14px;line-height:1.5">${esc(n.body)}</p>
      <a href="${APP_URL}${n.href}" style="background:#E53D2E;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;font-size:14px">Open in QC Lab</a>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f9fafb;color:#8a8f98;font-size:11px">Automated notification · Fanatics Decoration Quality Lab · Do not reply.</td></tr>
  </table></td></tr></table></body></html>`;
}

/** In-app notification + web push (if VAPID keys are set) + e-mail (if Resend is set). Never throws. */
export async function notify(repo: Repo, target: "staff" | { supplierId: string }, n: NotificationInput) {
  try {
    const users = await repo.recipients(target);
    await repo.pushNotifications(users.map((u) => u.id), n);
    await sendPush(repo, users.map((u) => u.id), n);
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (key && from && users.length && repo.mode === "supabase") {
      const resend = new Resend(key);
      await resend.batch.send(users.map((u) => ({ from, to: u.email, subject: n.title, html: emailHtml(n) })));
    }
  } catch (err) {
    console.error("notify failed", err);
  }
}
