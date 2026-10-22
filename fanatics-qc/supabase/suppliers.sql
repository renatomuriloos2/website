-- Fanatics mills to start with (no test data). Logos are uploaded from the app:
-- Suppliers → open the supplier → Edit → Logo. Fill the TBC fields there too.
insert into public.suppliers (name, code, country, city, status, tier) values
  ('Pride Performance Fabrics', 'PRIDE',   '', '', 'active', 'strategic'),
  ('Texpasa',                   'TEXPASA', 'USA', 'Charlotte, NC', 'active', 'strategic'),
  ('Zumitex',                   'ZUMITEX', '', '', 'active', 'approved'),
  ('Tegra',                     'TEGRA',   'Honduras', 'San Pedro Sula', 'active', 'strategic')
on conflict (code) do nothing;
