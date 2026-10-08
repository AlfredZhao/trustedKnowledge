import { API_KEY_STORAGE_KEY, AUTH_USER_STORAGE_KEY } from "../api/auth";

export interface SlideSnapshot {
  markdown: string;
  sourceLine: number;
  title: string;
}

export const SLIDES_QUERY_KEY = "markdown_slides";
const MESSAGE_TYPE = "trusted-knowledge:markdown-slides";

function sessionIdentity() {
  try {
    return `${localStorage.getItem(API_KEY_STORAGE_KEY) ?? ""}\n${JSON.parse(localStorage.getItem(AUTH_USER_STORAGE_KEY) ?? "null")?.username ?? ""}`;
  } catch { return ""; }
}

/** Observe existing session state; no auth API/credential persistence changes. */
export function watchSlideSession(onInvalidate: () => void) {
  const original = sessionIdentity();
  let invalidated = false;
  const invalidate = () => {
    if (invalidated) return;
    invalidated = true;
    onInvalidate();
  };
  const check = () => { if (sessionIdentity() !== original) invalidate(); };
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === API_KEY_STORAGE_KEY) invalidate();
    else if (event.key === AUTH_USER_STORAGE_KEY) check();
  };
  const timer = window.setInterval(check, 1000);
  window.addEventListener("storage", storage);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  window.addEventListener("trusted-knowledge:unauthorized", invalidate);
  window.addEventListener("trusted-knowledge:slides-expired", invalidate);
  return () => {
    clearInterval(timer);
    window.removeEventListener("storage", storage);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    window.removeEventListener("trusted-knowledge:unauthorized", invalidate);
    window.removeEventListener("trusted-knowledge:slides-expired", invalidate);
  };
}

export function preferInlineSlides() {
  return window.matchMedia("(max-width: 767px)").matches
    || window.matchMedia("(pointer: coarse)").matches
    || window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

/** Keep drafts only in memory. The URL contains a random, window-bound ID, never content. */
export function openSlideWindow(snapshot: SlideSnapshot): boolean {
  const id = Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join("");
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(SLIDES_QUERY_KEY, id);
  let child: Window | null;
  try { child = window.open(url.href, "_blank"); } catch { return false; }
  if (!child) return false;
  let current: SlideSnapshot | null = snapshot;
  const originalIdentity = sessionIdentity();
  const receive = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== child
      || event.data?.type !== MESSAGE_TYPE || event.data.id !== id || event.data.action !== "request") return;
    if (sessionIdentity() !== originalIdentity) current = null;
    child.postMessage({ type: MESSAGE_TYPE, id, action: current ? "snapshot" : "expired", snapshot: current }, window.location.origin);
  };
  const stopWatching = watchSlideSession(() => {
    current = null;
    try { child.postMessage({ type: MESSAGE_TYPE, id, action: "expired" }, window.location.origin); } catch { /* Tab already closed. */ }
  });
  const timer = window.setInterval(() => {
    if (!child.closed) return;
    current = null;
    window.removeEventListener("message", receive);
    stopWatching();
    clearInterval(timer);
  }, 1000);
  window.addEventListener("message", receive);
  return true;
}

export function receiveSlideSnapshot(
  id: string,
  onSnapshot: (snapshot: SlideSnapshot) => void,
  onError: (message: string) => void,
) {
  const opener = window.opener as Window | null;
  let received = false;
  let expired = false;
  const error = () => {
    expired = true;
    onError("放映快照已失效。请回到编辑器重新打开幻灯片。");
  };
  const receive = (event: MessageEvent) => {
    if (expired || event.origin !== window.location.origin || event.source !== opener
      || event.data?.type !== MESSAGE_TYPE || event.data.id !== id) return;
    if (event.data.action === "expired") { received = true; error(); return; }
    const snapshot = event.data.snapshot as Partial<SlideSnapshot> | undefined;
    if (event.data.action !== "snapshot" || typeof snapshot?.markdown !== "string"
      || typeof snapshot.title !== "string" || !Number.isFinite(snapshot.sourceLine)) return;
    received = true;
    onSnapshot(snapshot as SlideSnapshot);
  };
  window.addEventListener("message", receive);
  const request = () => {
    if (received || expired) return;
    if (!opener || opener.closed) { received = true; error(); return; }
    try { opener.postMessage({ type: MESSAGE_TYPE, id, action: "request" }, window.location.origin); } catch { error(); }
  };
  request();
  const retry = window.setInterval(request, 500);
  const timeout = window.setTimeout(() => { if (!received) error(); }, 10_000);
  const stopWatching = watchSlideSession(error);
  return () => {
    clearInterval(retry);
    clearTimeout(timeout);
    stopWatching();
    window.removeEventListener("message", receive);
  };
}
