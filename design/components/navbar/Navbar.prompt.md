Sticky capsule navigation for the landing page: wordmark at inline-start, anchors, and the one primary CTA at inline-end.

```jsx
<Navbar
  links={[{label:"نمونه‌کارها",href:"#work"},{label:"خدمات",href:"#services"},{label:"روش کار",href:"#process"},{label:"مشتریان",href:"#clients"}]}
  current="#work"
/>
```

**You provide:** 4–5 anchor links whose targets exist on the page.
**Do:** keep `ctaLabel` identical to the hero and contact CTA; update `current` from an IntersectionObserver.
**Don't:** add dropdowns, a logo image, or a second CTA.
