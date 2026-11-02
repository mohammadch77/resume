-- 0009: the marketing copy that was still fixed in code becomes editable (phase 4b): the clients section heading, the partners strip label,
-- and the contact dialog / page title, lead and the consent note under the form. Structural labels (footer column headings, case-study
-- headings, menu labels) stay in code. Every column is NOT NULL with a length CHECK and a DEFAULT equal to the copy the page showed until now,
-- so the existing singleton keeps exactly what it displayed. tests/unit/migrations.test.ts keeps these literals equal to HOME_TEXT_DEFAULTS.
ALTER TABLE home_content
  ADD COLUMN clients_eyebrow text NOT NULL DEFAULT 'مشتریان',
  ADD COLUMN clients_title text NOT NULL DEFAULT 'برندهایی که با ما کار کرده‌اند',
  ADD COLUMN partners_label text NOT NULL DEFAULT 'مورد اعتماد',
  ADD COLUMN contact_title text NOT NULL DEFAULT 'درباره‌ی پروژه‌تان بگویید',
  ADD COLUMN contact_lead text NOT NULL DEFAULT 'نیازتان را بنویسید؛ مسیر پیشنهادی را با هم بررسی می‌کنیم.',
  ADD COLUMN contact_note text NOT NULL DEFAULT 'با ارسال این فرم، با تماس ما برای هماهنگی جلسه موافقت می‌کنید.',
  ADD CONSTRAINT home_content_clients_len CHECK (char_length(clients_eyebrow) BETWEEN 1 AND 60 AND char_length(clients_title) BETWEEN 1 AND 80),
  ADD CONSTRAINT home_content_partners_label_len CHECK (char_length(partners_label) BETWEEN 1 AND 40),
  ADD CONSTRAINT home_content_contact_len CHECK (
    char_length(contact_title) BETWEEN 1 AND 80 AND char_length(contact_lead) BETWEEN 1 AND 200 AND char_length(contact_note) BETWEEN 1 AND 200
  );
