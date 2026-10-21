Small pill label for topics, technologies, filters and status; wrap groups in `.gw-chip-row`.

```jsx
<div className="gw-chip-row">
  <Chip>فروشگاه اینترنتی</Chip>
  <Chip variant="outline">Next.js</Chip>
  <Chip variant="filter" selected>همه</Chip>
  <Chip variant="success">منتشر شده</Chip>
</div>
```

**You provide:** one or two words per chip.
**Do:** use filter chips as a single-select group with aria-pressed; keep status chips paired with their icon.
**Don't:** use chips as buttons for actions, or put more than 4 tags on a card.
