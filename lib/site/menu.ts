import { lockScroll } from "@/lib/motion/scroll-lock";
import { MENU_HASH } from "./links";
import { trapFocus } from "./overlay";

/**
 * The full-screen menu's behaviour. The menu is in the HTML and opens with :target without JavaScript; this adds what CSS can not do: the
 * page scroll lock (counted, so the smooth-scroll engine stops too), the focus trap, Escape, and focus back on the button. It is loaded
 * by the first click on the Menu button (components/site/site-launcher.tsx), so the first load never contains it.
 */
let current: (() => void) | null = null;

export function openMenu(button: HTMLElement | null): void {
  const menu = document.getElementById("lm-menu");
  if (!menu || current) return;
  const unlock = lockScroll();
  menu.setAttribute("data-open", "true");
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  button?.setAttribute("aria-expanded", "true");
  // Close is a link to "#" so that it closes the menu without JavaScript. With JavaScript it becomes a button: a link to "#" would make the
  // smooth-scroll engine (Lenis' anchors option) scroll the page to the top, whatever we do with the click.
  const closeLink = menu.querySelector<HTMLAnchorElement>(".lm-menu__close");
  const closeHref = closeLink?.getAttribute("href") ?? null;
  closeLink?.removeAttribute("href");
  closeLink?.setAttribute("role", "button");
  closeLink?.setAttribute("tabindex", "0");
  const untrap = trapFocus(menu, close, closeLink);
  const onClick = (e: MouseEvent) => {
    // a link inside the menu (an item, the CTA, Close) closes it; the browser still follows an item's link. Close gets its href back while
    // closing, and a click that finds an href on its link follows it ("#" = the top of the page): so Close's own click is cancelled here.
    const link = e.target instanceof Element ? e.target.closest("a") : null;
    if (!link) return;
    if (link === closeLink) e.preventDefault();
    close();
  };
  const onCloseKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      close();
    }
  };
  menu.addEventListener("click", onClick);
  closeLink?.addEventListener("keydown", onCloseKey);

  function close() {
    menu!.removeEventListener("click", onClick);
    closeLink?.removeEventListener("keydown", onCloseKey);
    if (closeLink && closeHref !== null) {
      closeLink.setAttribute("href", closeHref);
      closeLink.removeAttribute("role");
      closeLink.removeAttribute("tabindex");
    }
    menu!.setAttribute("data-open", "false");
    menu!.removeAttribute("role");
    menu!.removeAttribute("aria-modal");
    button?.setAttribute("aria-expanded", "false");
    untrap();
    unlock();
    current = null;
    if (window.location.hash === MENU_HASH) history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  current = close;
}
