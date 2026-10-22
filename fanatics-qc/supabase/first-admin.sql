-- Creates the first administrator profile.
-- 1) Supabase → Authentication → Users → "Add user" → Create new user
--    (e-mail + strong password, tick "Auto Confirm User").
-- 2) Replace the e-mail below and run this in SQL Editor.
-- 3) Sign in at /login — you will be asked to enrol 2FA (Google/Microsoft Authenticator).
insert into public.profiles (id, email, full_name, role, must_change_password)
select id, lower(email), 'Digna Julia Herrera', 'admin', false
from auth.users
where lower(email) = lower('REPLACE-WITH-ADMIN-EMAIL@example.com')
on conflict (id) do update set role = 'admin', active = true;

-- Optional: Gabriel as Fanatics technician (test methods / reviewer). Create the auth user
-- first, or better: create him from the app (Users & access) once you are signed in.
-- insert into public.profiles (id, email, full_name, role)
-- select id, lower(email), 'Gabriel', 'reviewer' from auth.users where lower(email) = lower('gabriel@…');
