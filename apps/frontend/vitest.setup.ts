import '@testing-library/jest-dom/vitest';

// Vitest doesn't load .env.local the way Next.js's own dev/build server
// does, and shared/lib/env.ts's Zod validation fails fast on a missing
// var by design (Phase 2's own architecture) -- any test that imports the
// MSW handlers (which build request URLs from `env.apiBaseUrl`) needs this
// set. A fixed, obviously-fake value, never a real backend URL.
process.env.NEXT_PUBLIC_API_BASE_URL ??= 'http://localhost:4000';

// jsdom has no ResizeObserver — Radix primitives (e.g. Checkbox's
// react-use-size) call it unconditionally on mount, so any test that
// renders one needs at least a no-op stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom has no scrollIntoView — cmdk (the Command Palette's list) calls it
// on the active item unconditionally, so any test rendering a Command
// needs at least a no-op stub.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

// jsdom has no pointer-capture APIs — Radix Select calls
// hasPointerCapture/setPointerCapture/releasePointerCapture unconditionally
// on its trigger's pointer events, so any test that opens a Select needs at
// least a no-op/false stub for each.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};

// jsdom has no matchMedia — shared/hooks/use-media-query.ts (and anything
// checking prefers-reduced-motion) calls window.matchMedia unconditionally,
// so any test rendering a component that uses it needs at least a stub.
// Always reports "no match" (never the mobile/reduced-motion breakpoint),
// which is the correct default for jsdom's fixed, desktop-sized viewport.
window.matchMedia ??=
  ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

// jsdom never actually loads an <img>'s network resource, so Radix's
// Avatar.Image (which tracks a real `new Image()`'s load/error events to
// decide when to swap from AvatarFallback to the real photo) never leaves
// its initial "loading" status in tests -- any test asserting the real
// image renders would hang/always see the fallback instead. Stubbing `src`
// to synchronously fire `onload` (any non-empty src "succeeds") mirrors
// how every other jsdom-networking gap in this file is patched: the
// minimum needed to make already-correct component code testable, not a
// behavior change.
class ImageLoadStub extends EventTarget {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  // Radix's Avatar.Image derives "loaded" vs "error" from `complete` +
  // `naturalWidth` on the *load* event's own target, not just the event
  // firing (`getImageLoadingStatus`: `image.complete ? naturalWidth > 0 ?
  // 'loaded' : 'error' : 'loading'`) -- both need to already be set by the
  // time the listener reads them.
  complete = false;
  naturalWidth = 0;
  private _src = '';
  get src(): string {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    if (value) {
      queueMicrotask(() => {
        this.complete = true;
        this.naturalWidth = 1;
        this.onload?.();
        this.dispatchEvent(new Event('load'));
      });
    }
  }
}
// Direct assignment, not `??=` -- jsdom already defines a real `Image`
// constructor (unlike ResizeObserver/matchMedia above, which are truly
// absent), it just never fires load/error events, so the usual "only
// polyfill if missing" guard would leave the broken one in place.
globalThis.Image = ImageLoadStub as unknown as typeof Image;
