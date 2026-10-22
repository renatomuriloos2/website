# Reunión de entrega — dejar el proyecto funcionando en el Claude de Digna

Duración estimada: 45–60 min. Llevar: laptop de Digna, su celular (para 2FA) y acceso a su correo
`djherreralopez95@gmail.com`.

## 1. Cuenta de Claude de Digna (10 min)

1. Entrar a https://claude.ai con el correo de Digna. Plan **Pro o Max** (Claude Code viene incluido).
2. Activar 2FA / verificar el correo.
3. Abrir **Claude Code**: en la web https://claude.ai/code (o la app de escritorio).
4. **Conectar GitHub**: cuando lo pida, autorizar la cuenta `djherreralopez95-cmyk` y dar acceso al
   repositorio **`fanatics-qc-lab`**.
5. Crear una sesión nueva seleccionando el repo `djherreralopez95-cmyk/fanatics-qc-lab`.

## 2. Subir el archivo CLAUDE.md (2 min)

Es la "memoria" del proyecto: Claude lo lee automáticamente en cada sesión.

1. En GitHub (cuenta de Digna) → repo `fanatics-qc-lab` → **Add file → Upload files**.
2. Arrastrar `CLAUDE.md` (y `docs/KICKOFF_ES.md` si quieren) → **Commit changes**.

## 3. Primer mensaje para su Claude (copiar y pegar)

> Hola. Este repositorio es el MVP "Fanatics Decoration QC Lab". Lee CLAUDE.md, README.md y
> docs/SETUP_ES.md. Luego: (1) corre `npm install`, `npm run typecheck`, `npm test` y
> `npm run build` y dime si todo pasa; (2) explícame en español, en 10 líneas, cómo funciona el
> motor de decisión y la evaluación por color; (3) prepárame el plan para conectar el proyecto
> Supabase `sncoqimwajlzxqikcghj` siguiendo docs/SETUP_ES.md sin romper el demo público de
> Vercel. Trabaja en una rama nueva y no hagas push a main sin preguntarme.

## 4. Conectar Supabase (15–20 min)

Opción A — a mano (más simple):
1. https://supabase.com/dashboard/project/sncoqimwajlzxqikcghj → **SQL Editor**.
2. Ejecutar, en orden, el contenido de `supabase/schema.sql`, `supabase/seed.sql` y `supabase/suppliers.sql`
   (copiar desde GitHub → archivo → botón *Copy raw file*).
3. **Authentication**: desactivar *Allow new users to sign up*, activar **TOTP** en Multi-Factor, contraseña
   mínima 12.
4. **Authentication → Users → Add user** (correo de Digna, *Auto Confirm*), luego ejecutar
   `supabase/first-admin.sql` con su correo.

Opción B — con Claude: en claude.ai → *Settings → Connectors* agregar **Supabase** con la cuenta de Digna;
después pedirle a Claude que aplique los tres archivos SQL al proyecto `sncoqimwajlzxqikcghj`.

> Nunca pegar la `service_role key` en el chat. Se copia directo de Supabase a Vercel.

## 5. Segundo proyecto en Vercel con datos reales (10 min)

El link actual `fanatics-qc-lab.vercel.app` se queda como **demo pública**.

1. Vercel (cuenta de Digna) → **Add New → Project** → importar otra vez `fanatics-qc-lab` → nombre
   `fanatics-qc-app` → *Import single project* (Next.js).
2. **Environment Variables** (de Supabase → Project Settings → API):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_APP_URL` (= la URL del nuevo proyecto), `MFA_REQUIRED=true`.
3. **Deploy** → copiar la URL → en Supabase *Authentication → URL Configuration* poner esa URL como
   Site URL y `https://esa-url/**` en Redirect URLs.
4. Entrar con el admin → configurar 2FA con el celular de Digna → **Settings → Load sample data**
   para ver el potencial, o crear usuarios reales (Gabriel, mills) en **Users & access**.

## 6. Checklist de cierre

- [ ] Digna tiene sus contraseñas y 2FA en: correo, GitHub, Vercel, Supabase, Claude.
- [ ] CLAUDE.md subido al repo.
- [ ] Demo pública funcionando: https://fanatics-qc-lab.vercel.app
- [ ] Proyecto con Supabase funcionando y admin con 2FA.
- [ ] Logos oficiales de los mills subidos.
