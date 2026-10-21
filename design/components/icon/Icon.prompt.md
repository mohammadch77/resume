Lucide line icon at 1.5px stroke that inherits text colour; use inside buttons, chips and status text — never alone as a status signal.

```jsx
<Icon name="arrow-left" />
<Icon name="circle-alert" size={16} label="خطا" />
```

- `size` px (default 20, or inherited `--gw-icon-size`).
- `label` makes it meaningful (role="img"); omit for decorative.
- In RTL, "forward" is `arrow-left`. Use `mirror` only for non-directional glyphs that must flip.
