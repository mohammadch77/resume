Form field with a visible label, optional hint and an invalid state that pairs a danger colour with an icon and words.

```jsx
<Field label="نام و نام خانوادگی" name="name" autoComplete="name" />
<Field label="شماره تماس" type="tel" dir="ltr" inputMode="tel" hint="فقط برای هماهنگی جلسه تماس می‌گیریم." />
<Field label="شماره تماس" error="شماره را با ۰۹ شروع کنید." />
<Field label="درباره‌ی پروژه" multiline optional />
```

**You provide:** label, name, and an error sentence that says how to fix it.
**Do:** set `dir="ltr"` on phone/email/URL inputs; write errors as instructions.
**Don't:** hide labels, rely on red alone, show errors before the user leaves the field.
