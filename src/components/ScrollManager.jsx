import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// index.css sets `scroll-behavior: smooth` on <html>, which would animate every
// programmatic scroll, so route changes jump with an explicit "instant".
function jumpTo(top) {
  window.scrollTo({ top, left: 0, behavior: "instant" });
}

/** Scroll to the element a #hash names. Returns false when there is no such element. */
function landOnHash(hash) {
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!target) return false;
  target.scrollIntoView({ behavior: "instant" });
  // Web fonts swapping in after first paint move everything below them, so re-aim
  // once they are ready, unless the reader has already scrolled.
  const landed = window.scrollY;
  document.fonts?.ready.then(() => {
    if (Math.abs(window.scrollY - landed) < 2) target.scrollIntoView({ behavior: "instant" });
  });
  return true;
}

/**
 * BrowserRouter does not touch scroll, so a new page used to open wherever the
 * previous one was scrolled. This resets to the top on a new in-app navigation,
 * scrolls to the #hash target when there is one, and puts back/forward at the
 * position the reader left. The first load and reloads stay with the browser.
 */
function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const positions = useRef(new Map());
  const keyRef = useRef(location.key);
  const pathRef = useRef(null);

  // `manual` is stored on the history entry, so hand control back before the page
  // goes away; otherwise a reload would lose its position.
  useEffect(() => {
    const release = () => {
      window.history.scrollRestoration = "auto";
    };
    window.addEventListener("pagehide", release);
    return () => {
      window.removeEventListener("pagehide", release);
      release();
    };
  }, []);

  // Remember where each history entry was left.
  useEffect(() => {
    const save = () => positions.current.set(keyRef.current, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  useLayoutEffect(() => {
    const previousPath = pathRef.current;
    pathRef.current = location.pathname;
    keyRef.current = location.key;

    // First load or reload: the browser restores the position; only a #hash needs help.
    if (previousPath === null) {
      if (location.hash) landOnHash(location.hash);
      return;
    }
    // Same page, only the #hash changed (in-page anchors): the browser scrolls to it.
    if (previousPath === location.pathname && navType === "POP") return;

    window.history.scrollRestoration = "manual";
    if (navType === "POP") {
      const saved = positions.current.get(location.key);
      if (saved !== undefined) {
        jumpTo(saved);
        return;
      }
    }
    if (location.hash && landOnHash(location.hash)) return;
    jumpTo(0);
  }, [location.key, location.pathname, location.hash, navType]);

  return null;
}

export default ScrollManager;
