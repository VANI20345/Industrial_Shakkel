-- ============================================================
--  • Admin-managed Saudi cities (used in registration)
--  • Admin-managed contact settings (email / phone / WhatsApp)
-- ============================================================

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create unique index if not exists cities_name_en_uniq on public.cities(name_en);

alter table public.cities enable row level security;

drop policy if exists "Cities readable by all" on public.cities;
create policy "Cities readable by all" on public.cities for select using (is_active = true);

drop policy if exists "Admins manage cities" on public.cities;
create policy "Admins manage cities" on public.cities for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.cities (name_ar, name_en, sort_order) values
  ('الرياض','Riyadh',1),('جدة','Jeddah',2),('مكة المكرمة','Makkah',3),('المدينة المنورة','Madinah',4),
  ('الدمام','Dammam',5),('الخبر','Al Khobar',6),('الظهران','Dhahran',7),('الطائف','Taif',8),
  ('بريدة','Buraidah',9),('تبوك','Tabuk',10),('خميس مشيط','Khamis Mushait',11),('أبها','Abha',12),
  ('حائل','Hail',13),('نجران','Najran',14),('ينبع','Yanbu',15),('الجبيل','Jubail',16),
  ('الأحساء','Al Ahsa',17),('الهفوف','Hofuf',18),('المبرز','Mubarraz',19),('القطيف','Qatif',20),
  ('عرعر','Arar',21),('سكاكا','Sakaka',22),('جازان','Jazan',23),('الباحة','Al Baha',24),
  ('عنيزة','Unaizah',25),('الرس','Ar Rass',26),('الخرج','Al Kharj',27),('المجمعة','Al Majmaah',28),
  ('الدوادمي','Ad Dawadmi',29),('وادي الدواسر','Wadi ad-Dawasir',30),('شرورة','Sharurah',31),
  ('بيشة','Bisha',32),('رفحاء','Rafha',33),('طريف','Turaif',34),('القريات','Al Qurayyat',35),
  ('ضباء','Duba',36),('أملج','Umluj',37),('بدر','Badr',38),('رابغ','Rabigh',39),
  ('ثول','Thuwal',40),('بلجرشي','Baljurashi',41),('المخواة','Al Mikhwah',42),('محايل عسير','Mahayil Asir',43),
  ('سراة عبيدة','Sarat Abida',44),('النماص','An Namas',45),('تنومة','Tanumah',46),('صبيا','Sabya',47),
  ('أبو عريش','Abu Arish',48),('صامطة','Samtah',49),('فرسان','Farasan',50),('بقيق','Buqayq',51),
  ('رأس تنورة','Ras Tanura',52),('سيهات','Saihat',53),('صفوى','Safwa',54),('العيون','Al Uyun',55),
  ('حفر الباطن','Hafar Al-Batin',56),('النعيرية','An Nuayriyah',57),('قرية العليا','Qaryat al-Ulya',58),
  ('الزلفي','Az Zulfi',59),('شقراء','Shaqra',60),('ثادق','Thadiq',61),('حوطة بني تميم','Hawtat Bani Tamim',62),
  ('أحد رفيدة','Ahad Rufaidah',63),('العلا','Al Ula',64)
on conflict (name_en) do nothing;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Settings readable by all" on public.site_settings;
create policy "Settings readable by all" on public.site_settings for select using (true);

drop policy if exists "Admins manage settings" on public.site_settings;
create policy "Admins manage settings" on public.site_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.site_settings (key, value) values
  ('contact', jsonb_build_object(
    'email','sales@shakkel.com',
    'phone','+966 11 200 1100',
    'whatsapp','+966 50 100 2200',
    'address_ar','الرياض • جدة • الدمام',
    'address_en','Riyadh • Jeddah • Dammam',
    'show_email_footer', true,
    'show_phone_footer', true,
    'show_whatsapp_footer', true,
    'show_email_contact', true,
    'show_phone_contact', true,
    'show_whatsapp_contact', true
  ))
on conflict (key) do nothing;
