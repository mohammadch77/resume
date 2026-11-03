# RUNBOOK — Scene Studio (سن استودیو)

آدرس: https://www.scenestudio.ir (دامنه‌ی بدون www به آن ریدایرکت می‌شود). این سرور مشترک است؛ همه‌چیز ما فقط در `/opt/scenestudio` است.

## چه چیزی روی سرور از ماست (و فقط همین‌ها)
| چیز | مقدار |
|---|---|
| پوشه | `/opt/scenestudio` (`releases/`، `current`، `data/uploads/`، `backups/`، `env/`، `bin/`) |
| کاربر سیستم | `scenestudio` (بدون ورود) |
| برنامه | `scenestudio.service` روی `127.0.0.1:3190`، سقف حافظه ۶۰۰MB و CPU ۱۰۰٪ |
| دیتابیس | کلاستر جداگانه‌ی PostgreSQL 16 با نام `scenestudio` روی `127.0.0.1:5442` (واحد `postgresql@16-scenestudio`، سقف ۴۵۰MB). کلاستر `16/main` مال پروژه‌های دیگر است و لمس نمی‌شود. |
| پشتیبان | `scenestudio-backup.timer` (روزانه ۰۰:۳۰ UTC) |
| Nginx | فقط `conf.d/scenestudio-limits.conf`، `snippets/scenestudio-proxy.conf`، `sites-available/scenestudio` و لینکش |
| گواهی | `www.scenestudio.ir` + `scenestudio.ir`، تمدید با `certbot.timer` موجود |

رمزها فقط در `/opt/scenestudio/env/*.env` (فقط root) هستند. هرگز در چت، لاگ یا گیت نگذارید.

## آپدیت (روی لپ‌تاپ ساخته می‌شود، چون سرور RAM کم دارد)
۱. روی لپ‌تاپ (Docker Desktop روشن): `bash deploy/build-release.sh` → فایل `scenestudio-release.tar.gz`
۲. ارسال: `scp scenestudio-release.tar.gz root@<server>:/tmp/`
۳. روی سرور: `/opt/scenestudio/bin/release.sh /tmp/scenestudio-release.tar.gz`

اسکریپت: بسته را باز می‌کند، مهاجرت دیتابیس را اجرا می‌کند، `current` را عوض می‌کند، فقط `scenestudio` را ری‌استارت می‌کند و `/` و `/admin/login` را چک می‌کند. اگر ۲۰۰ نداد، خودش release قبلی را برمی‌گرداند. پنج release آخر نگه داشته می‌شود.

## برگشت (rollback)
`/opt/scenestudio/bin/rollback.sh` (release قبلی را برمی‌گرداند). مهاجرت‌ها فقط‌اضافه‌شونده‌اند، پس کد قدیمی روی دیتابیس جدید کار می‌کند. برای برگشت داده، بخش «بازیابی» را ببینید.

## وضعیت و لاگ
```bash
/opt/scenestudio/bin/setup-server.sh status     # وضعیت ما + پروژه‌های دیگر
journalctl -u scenestudio -n 100 --no-pager      # لاگ برنامه
journalctl -u postgresql@16-scenestudio -n 50 --no-pager
tail -n 50 /var/log/nginx/scenestudio.error.log
```

## پشتیبان و بازیابی
- پشتیبان دستی: `/opt/scenestudio/bin/backup.sh` (در `backups/<تاریخ>/`: `db.dump` و `uploads.tar.gz`، ۷ روز نگه‌داری).
- تست بازیابی (روی دیتابیس موقت، به دیتابیس واقعی دست نمی‌زند): `/opt/scenestudio/bin/restore-test.sh`
- بازیابی واقعی (فقط اگر داده خراب شد): `systemctl stop scenestudio`، سپس `runuser -u postgres -- pg_restore -p 5442 -d scenestudio --clean --if-exists --no-owner <backup>/db.dump`، uploads را با `tar -xzf <backup>/uploads.tar.gz -C /opt/scenestudio/data` برگردانید، `systemctl start scenestudio`.
- **بعد از هر بازیابی یا دست‌کاری مستقیم SQL:** کش next را پاک کنید: `systemctl restart scenestudio` کافی است (کش ISR داخل پوشه‌ی release است و با ری‌استارت و release جدید خالی می‌شود؛ اگر release را عوض نکرده‌اید: `rm -rf /opt/scenestudio/current/.next/cache /opt/scenestudio/current/.next/server/route-cache` و بعد ری‌استارت).

## ساخت ادمین / تغییر رمز
- ادمین اول: `/opt/scenestudio/bin/setup-server.sh owner` (ایمیل را می‌پرسد، رمز تصادفی در `env/owner-initial.txt` با دسترسی root؛ بعد از ورود رمز را عوض کنید و فایل را `shred -u` کنید).
- کاربر جدید و تغییر رمز از پنل: «کاربران». ایمیل، تلفن و نشانی هم از «تنظیمات».

## HTTPS / HSTS
ترتیب راه‌اندازی اولیه: `base` ← ارسال اولین release ← `http` ← DNS ← `tls` ← `https` ← بررسی ← `hsts`. گواهی خودکار تمدید می‌شود (`certbot renew --dry-run` برای آزمایش).

## نکات
- بدون Docker، نه prune و نه دست‌زدن به فایروال/cron/vhostهای دیگر. Nginx فقط `reload` می‌شود، بعد از `nginx -t` و پشتیبان `/etc/nginx` (در `backups/nginx-before-*.tar.gz`).
- هنگام release، مرورگری که صفحه‌ی قدیمی را باز دارد ممکن است برای چند ثانیه فایل js قدیمی را نیابد؛ با رفرش درست می‌شود.
- تصویرهای هیرو (بدون مجوز و با متن انگلیسی) روی سرور نیستند: هیرو تایپوگرافیک است تا دو تصویر خودتان را از ادمین بگذارید.
