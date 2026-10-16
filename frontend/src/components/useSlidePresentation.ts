import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Pure presentation is independent of browser fullscreen (which can be refused). */
export function useSlidePresentation(root: RefObject<HTMLDivElement | null>, pinned: boolean) {
  const [active, setActive] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [notice, setNotice] = useState("");
  const activeRef = useRef(false);
  const pinnedRef = useRef(pinned); pinnedRef.current = pinned;
  const hovered = useRef(false);
  const ownsFullscreen = useRef(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const timer = useRef<number | undefined>(undefined);
  const ignoreEscapeUntil = useRef(0);

  const reveal = useCallback(() => {
    if (!activeRef.current) return;
    setControlsVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const controls = root.current?.querySelector("[data-slide-presentation-controls]");
      if (!pinnedRef.current && !hovered.current && !controls?.contains(document.activeElement)) setControlsVisible(false);
    }, 3000);
  }, [root]);

  const leave = useCallback(() => {
    generation.current++;
    activeRef.current = false;
    setActive(false);
    window.clearTimeout(timer.current);
    // Preserve workspace fullscreen if it was already active before presentation.
    if (ownsFullscreen.current && document.fullscreenElement === root.current) {
      void document.exitFullscreen().catch(() => undefined);
    }
    ownsFullscreen.current = false;
    root.current?.focus({ preventScroll: true });
  }, [root]);

  const enter = async () => {
    const node = root.current;
    if (!node || pending.current || activeRef.current) return;
    const request = ++generation.current;
    activeRef.current = true;
    hovered.current = false;
    ownsFullscreen.current = false;
    setActive(true);
    setNotice("");
    node.focus({ preventScroll: true });
    reveal();
    if (document.fullscreenElement === node) return;
    if (!node.requestFullscreen) {
      setNotice("此浏览器不支持全屏，已切换为页面内纯放映。");
      return;
    }
    pending.current = true;
    try {
      // Call directly from the click, before yielding the user activation.
      await node.requestFullscreen();
      if (!mounted.current || generation.current !== request) {
        if (document.fullscreenElement === node) await document.exitFullscreen().catch(() => undefined);
      } else ownsFullscreen.current = document.fullscreenElement === node;
    } catch {
      if (mounted.current && generation.current === request) setNotice("浏览器未允许全屏，已切换为页面内纯放映。");
    } finally { pending.current = false; }
  };

  useEffect(() => {
    mounted.current = true;
    const node = root.current;
    const changed = () => {
      if (activeRef.current && document.fullscreenElement !== node) {
        // Native Esc may bypass React's key handler. Never let that same Esc close the viewer.
        ignoreEscapeUntil.current = Date.now() + 300;
        ownsFullscreen.current = false;
        leave();
      }
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      mounted.current = false;
      generation.current++;
      window.clearTimeout(timer.current);
      document.removeEventListener("fullscreenchange", changed);
      if (ownsFullscreen.current && document.fullscreenElement === node) void document.exitFullscreen().catch(() => undefined);
    };
  }, [leave, root]);

  useEffect(() => { if (active) reveal(); }, [active, pinned, reveal]);

  return {
    active, controlsVisible, notice, enter, leave, reveal,
    escape: () => {
      if (activeRef.current) { leave(); return true; }
      return Date.now() < ignoreEscapeUntil.current;
    },
    hover: (value: boolean) => { hovered.current = value; reveal(); },
  };
}
