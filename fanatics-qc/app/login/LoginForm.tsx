"use client";

import { useFormState, useFormStatus } from "react-dom";
import { signInAction } from "@/lib/actions/session";
import { initialState } from "@/lib/actions/state";
import { useI18n } from "@/lib/i18n/client";
import { Icon } from "@/components/icons";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full py-3" disabled={pending}>
      {pending ? "…" : label}
      <Icon name="arrowRight" className="h-4 w-4" />
    </button>
  );
}

export function LoginForm() {
  const { t } = useI18n();
  const [state, action] = useFormState(signInAction, initialState);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">{t.auth.email}</span>
        <input name="email" type="email" autoComplete="username" required className="input" />
      </label>
      <label className="block">
        <span className="label">{t.auth.password}</span>
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error === "invalid" ? t.auth.invalid : state.error}</p>}
      <Submit label={t.auth.signIn} />
    </form>
  );
}
