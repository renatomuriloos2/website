"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changePasswordAction } from "@/lib/actions/session";
import { initialState } from "@/lib/actions/state";
import { useI18n } from "@/lib/i18n/client";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn-primary" disabled={pending}>{label}</button>;
}

export function PasswordForm() {
  const { t } = useI18n();
  const [state, action] = useFormState(changePasswordAction, initialState);
  const msg = state.error === "mismatch" ? t.auth.passwordMismatch : state.error?.startsWith("weak") ? `${t.auth.weakPassword} (${state.error.slice(6)})` : state.error;
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">{t.auth.newPassword}</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={12} className="input" />
      </label>
      <label className="block">
        <span className="label">{t.auth.confirmPassword}</span>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={12} className="input" />
      </label>
      <p className="text-xs text-gray-500">{t.auth.passwordRules}</p>
      {msg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}
      {state.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{t.common.saved}</p>}
      <Submit label={t.auth.changePassword} />
    </form>
  );
}
