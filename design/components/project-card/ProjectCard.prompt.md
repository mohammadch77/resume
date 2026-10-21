Project tile for the Selected Work strip (420px wide on desktop, full-width list on mobile); opens the case-study Modal.

```jsx
<ProjectCard
  art={2}
  tags={["فروشگاه اینترنتی","Next.js"]}
  title="فروشگاه آنلاین لوازم خانگی"
  summary="بازطراحی مسیر خرید و پنل مدیریت سفارش‌ها."
  onOpen={() => setOpen(true)}
/>
```

**You provide:** a real project title, one-sentence summary, ≤ 4 tags, a cover (or placeholder art).
**Do:** keep covers square-cornered; label demo entries «نمونه».
**Don't:** add shadows or rounded corners, invent client names or results.
