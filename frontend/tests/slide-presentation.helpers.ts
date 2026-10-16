import { expect, type Page } from "@playwright/test";

export async function mockPresentationFullscreen(page: Page, mode: "allowed" | "denied" | "unsupported" | "pending" = "allowed") {
  await page.evaluate(mode => {
    let element: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => element });
    const state = { requests: 0, exits: 0, resolve: () => {} };
    (window as any).presentationFullscreen = state;
    Object.defineProperty(Element.prototype, "requestFullscreen", { configurable: true, value: mode === "unsupported" ? undefined : function(this: Element) {
      state.requests++;
      if (mode === "denied") return Promise.reject(new Error("denied"));
      const enter = () => { element = this; document.dispatchEvent(new Event("fullscreenchange")); };
      if (mode === "pending") return new Promise<void>(resolve => { state.resolve = () => { enter(); resolve(); }; });
      enter(); return Promise.resolve();
    } });
    document.exitFullscreen = async () => { state.exits++; element = null; document.dispatchEvent(new Event("fullscreenchange")); };
  }, mode);
}

export async function presentationLayout(page: Page) {
  await expect(page.locator(".slide-header")).toBeHidden();
  await expect(page.locator(".slide-footer")).toBeHidden();
  expect(await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".slide-presenting")!;
    const errors: string[] = [];
    if (root.scrollWidth > root.clientWidth + 2 || root.scrollHeight > root.clientHeight + 2) errors.push("screen overflow");
    for (const node of root.querySelectorAll<HTMLElement>(".slide-presentation-controls button, .office-canvas")) {
      const rect = node.getBoundingClientRect();
      if (rect.left < -1 || rect.top < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1) errors.push(`unreachable: ${node.textContent}`);
      if (node.matches(".office-canvas") && Math.abs(rect.width / rect.height - 16 / 9) > .01) errors.push("distorted canvas");
    }
    return errors;
  })).toEqual([]);
}
