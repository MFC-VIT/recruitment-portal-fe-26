import { useCallback, useEffect, useState } from "react";
import { getPushKey, savePushSubscription } from "../api/candidate";

export type PushState = "loading" | "unsupported" | "off" | "prompt" | "denied" | "on";

const toKey = (base64: string) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const supported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// Opt-in browser notifications for status changes, offers and interview
// reminders. "off" means the server has push disabled (no VAPID keys).
export const usePush = () => {
  const [state, setState] = useState<PushState>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (!supported()) {
      setState("unsupported");
      return;
    }
    getPushKey()
      .then(async ({ enabled, publicKey: key }) => {
        if (!enabled || !key) return setState("off");
        setPublicKey(key);
        if (Notification.permission === "denied") return setState("denied");
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        setState(sub && Notification.permission === "granted" ? "on" : "prompt");
      })
      .catch(() => setState("off"));
  }, []);

  const enable = useCallback(async () => {
    if (!publicKey) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "prompt");
      return;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
    await savePushSubscription(sub.toJSON());
    setState("on");
  }, [publicKey]);

  return { state, enable };
};
