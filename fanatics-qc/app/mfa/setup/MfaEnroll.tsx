"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/client";

export function MfaEnroll() {
  const { t } = useI18n();
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      // Remove stale unverified factors from abandoned enrolments.
      const { data } = await sb.auth.mfa.listFactors();
      for (const f of data?.all ?? []) if (f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
      const { data: enrolled, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `QC Lab ${new Date().toISOString().slice(0, 10)}` });
      if (error) return setError(error.message);
      if (enrolled.type !== "totp") return;
      setFactorId(enrolled.id);
      setQr(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    if (error) return setError(t.auth.mfaInvalid);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="space-y-4">
      <div className="flex justify-center rounded-xl bg-fx-mist p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr ? <img src={qr} alt="TOTP QR code" className="h-48 w-48" /> : <div className="h-48 w-48 animate-pulse rounded-lg bg-gray-200" />}
      </div>
      {secret && (
        <div className="text-center">
          <div className="label">{t.auth.mfaSecret}</div>
          <code className="break-all rounded bg-fx-mist px-2 py-1 text-xs">{secret}</code>
        </div>
      )}
      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="input text-center font-mono text-2xl tracking-[0.5em]" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={code.length !== 6}>
        {t.auth.verify}
      </button>
    </form>
  );
}
