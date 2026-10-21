Action control; use primary (lapis) once per region for the main outcome, secondary/quiet beside it, danger only for destructive admin actions.

```jsx
<Button>درخواست مشاوره رایگان</Button>
<Button variant="secondary" href="#work">مشاهده نمونه‌کارها</Button>
<Button variant="quiet" iconEnd="arrow-left">مشاهده‌ی جزئیات پروژه</Button>
<Button variant="danger" size="sm" iconStart="trash-2">حذف پروژه</Button>
<Button variant="quiet" iconOnly="x" label="بستن" />
```

**You provide:** an outcome label (verb + result), href or onClick.
**Do:** keep the same primary label everywhere it repeats; one primary per region.
**Don't:** use two primaries side by side, put icons on primary CTAs for decoration, use sm on touch-first screens.
