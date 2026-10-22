"use client";

import { useEffect, useState } from "react";
import { removePushSubscriptionAction, savePushSubscriptionAction, testPushAction } from "@/lib/actions/push";
import { useI18n } from "@/lib/i18n/client";
import { Icon } from "./icons";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Settings card: enable web push on this device + install the app (PWA). */
export function AppSetup({ vapidKey }: { vapidKey: string | null }) {
  const { locale } = useI18n();
  const es = locale === "es";
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    navigator.serviceWorker?.ready.then((reg) => reg.pushManager.getSubscription()).then((s) => setEnabled(Boolean(s))).catch(() => undefined);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function enable() {
    setMsg(null);
    if (!vapidKey) return setMsg(es ? "El servidor aún no tiene las llaves VAPID configuradas." : "VAPID keys are not configured on the server yet.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return setMsg(es ? "Permiso denegado en el navegador." : "Permission denied in the browser.");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
    const res = await savePushSubscriptionAction(JSON.parse(JSON.stringify(sub)));
    if (!res.ok) return setMsg(res.error ?? "error");
    setEnabled(true);
    setMsg(es ? "Notificaciones activadas en este dispositivo ✓" : "Notifications enabled on this device ✓");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await removePushSubscriptionAction(sub.endpoint);
      await sub.unsubscribe();
    }
    setEnabled(false);
  }

  async function test() {
    const r = await testPushAction();
    setMsg(r.ok ? (es ? "Notificación de prueba enviada." : "Test notification sent.") : r.error ?? "error");
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl bg-fx-mist p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-bold"><Icon name="bell" className="h-4 w-4 text-fx-red" /> {es ? "Notificaciones push" : "Push notifications"}</div>
        <p className="mb-3 text-xs text-gray-500">
          {es ? "Recibe en el celular o en la computadora: nuevos lotes, decisiones, re-tests y CAPA." : "Get new lots, decisions, retests and CAPA updates on your phone or computer."}
          {ios && !standalone ? (es ? " En iPhone: primero instala la app (Compartir → Agregar a inicio)." : " On iPhone: install the app first (Share → Add to Home Screen).") : ""}
        </p>
        {!supported ? (
          <p className="text-xs text-gray-500">{es ? "Este navegador no soporta push." : "This browser does not support push."}</p>
        ) : enabled ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={test} className="btn-primary py-2">{es ? "Enviar prueba" : "Send test"}</button>
            <button onClick={disable} className="btn-ghost py-2">{es ? "Desactivar" : "Disable"}</button>
          </div>
        ) : (
          <button onClick={enable} className="btn-primary py-2">{es ? "Activar en este dispositivo" : "Enable on this device"}</button>
        )}
      </div>
      <div className="rounded-xl bg-fx-mist p-4">
        <div className="mb-1 flex items-center gap-2 text-sm font-bold"><Icon name="download" className="h-4 w-4 text-fx-red" /> {es ? "Instalar la app" : "Install the app"}</div>
        {standalone ? (
          <p className="text-xs text-emerald-700">{es ? "Ya estás usando la app instalada ✓" : "You are using the installed app ✓"}</p>
        ) : installEvt ? (
          <button onClick={async () => { await installEvt.prompt(); setInstallEvt(null); }} className="btn-dark py-2">{es ? "Instalar QC Lab" : "Install QC Lab"}</button>
        ) : (
          <p className="text-xs text-gray-500">
            {ios
              ? es ? "iPhone / iPad: botón Compartir → “Agregar a pantalla de inicio”." : "iPhone / iPad: Share button → “Add to Home Screen”."
              : es ? "Android / Chrome / Edge: menú ⋮ → “Instalar app”." : "Android / Chrome / Edge: menu ⋮ → “Install app”."}
          </p>
        )}
      </div>
      {msg && <p className="text-sm text-gray-700 md:col-span-2">{msg}</p>}
    </div>
  );
}
