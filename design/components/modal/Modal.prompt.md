Case-study dialog opened from a ProjectCard; the only element that may use shadow-overlay.

```jsx
<Modal open={open} onClose={() => setOpen(false)} title="فروشگاه آنلاین لوازم خانگی" tags={["فروشگاه","Next.js"]} art={2} sample
  challenge="…" solution="…" outcome="…" primaryHref="#contact" />
```

**You provide:** a title, three short paragraphs (≤ 3 sentences each), tags, a cover.
**Do:** keep the primary label identical to the site CTA; return focus to the card on close.
**Don't:** nest modals, put forms inside, or animate anything but opacity/transform.
