# Paso a paso — cuentas nuevas y aisladas y puesta en producción

Objetivo: el MVP de Fanatics vive en **cuentas propias**, totalmente separadas de cualquier cuenta
personal o de otros clientes (GitHub, Supabase, Vercel). Creas un "kit" de cuentas nuevas con un
correo nuevo, publicas, se lo presentas a Fanatics y después **transfieres la propiedad** a TI de
Fanatics (ver [HANDOFF.md](HANDOFF.md)).

Tiempo estimado: 45–60 min. Todos los servicios empiezan en plan gratuito.

---

## 0. Primero mira el prototipo (sin cuentas)

```bash
cd fanatics-qc
npm install
npm run dev
```

Abre http://localhost:3000 → accesos demo de un clic (Digna Julia Herrera – administradora de QC,
Gabriel – técnico Fanatics, usuarios de los mills). Todos los resultados son **sintéticos**.

---

## 1. Correo del proyecto

1. Crea un correo exclusivo, p. ej. `fanatics.qclab@gmail.com` (mejor: una dirección del dominio
   de tu empresa, p. ej. `qclab@tuempresa.com`).
2. Activa la **verificación en dos pasos**.
3. Guarda la contraseña en un gestor (1Password, Bitwarden). **Todas** las cuentas siguientes se
   crean con este correo para que nada se mezcle con tus cuentas.

> Consejo: usa un **perfil de Chrome separado** para este correo y así nunca entras por error en
> tus cuentas personales.

## 2. GitHub (cuenta nueva + repositorio)

1. Regístrate en https://github.com/signup con el correo nuevo (p. ej. usuario `fanatics-qclab`).
2. Activa 2FA: Settings → Password and authentication → Two-factor authentication.
3. Crea un repositorio **privado** vacío `fanatics-qc-lab` (sin README).
4. Sube **solo la carpeta `fanatics-qc`** del repositorio actual, con su historial (en tu
   computadora, dentro del repo `website`):

   ```bash
   git fetch origin claude/fanatics-quality-control-mvp-nxdtll
   git checkout claude/fanatics-quality-control-mvp-nxdtll
   git subtree split --prefix=fanatics-qc -b fanatics-qc-export
   git push https://github.com/fanatics-qclab/fanatics-qc-lab.git fanatics-qc-export:main
   ```

   GitHub pedirá credenciales: usa el usuario nuevo y un *Personal Access Token*
   (Settings → Developer settings → Tokens) con permiso `repo`.
5. Protege `main`: Settings → Branches → Add rule → "Require a pull request before merging".

## 3. Supabase (base de datos, login, archivos)

1. Entra en https://supabase.com **con la cuenta GitHub nueva** (o con el correo nuevo).
2. Crea una **Organization** nueva: `Fanatics QC Lab`.
3. **New project**: `fanatics-qc-lab`, contraseña fuerte de base de datos (guárdala), región
   **East US (North Virginia)**.
4. **SQL Editor** → pega y ejecuta, en este orden:
   1. `supabase/schema.sql` — tablas, seguridad por fila (RLS), auditoría, storage, vistas de BI.
   2. `supabase/seed.sql` — protocolo (23 métodos de ensayo, 16 decoraciones, requisitos por fibra).
   3. `supabase/suppliers.sql` — los mills: Pride Performance Fabrics, Texpasa, Zumitex, Tegra.
5. **Authentication → Sign In / Providers → Email**: deja Email activo y **desactiva "Allow new
   users to sign up"** (solo el admin crea cuentas).
6. **Authentication → Multi-Factor**: activa **TOTP (App Authenticator)**.
7. **Authentication → Attack Protection / Passwords**: longitud mínima **12**, exigir
   mayúsculas, minúsculas, números y símbolos; activa **Leaked password protection** si el plan
   lo permite.
8. **Authentication → URL Configuration**: Site URL = la URL de Vercel (paso 5 — vuelve aquí
   después) y agrega `https://TU-DOMINIO/**` en Redirect URLs.
9. **Primer administrador**: Authentication → Users → *Add user* → *Create new user* (correo de
   Digna Julia Herrera, o el tuyo como admin temporal; marca *Auto Confirm User*). Luego edita el
   correo en `supabase/first-admin.sql` y ejecútalo en el SQL Editor.
10. **Project Settings → API**: copia `Project URL`, `anon public key` y `service_role key`
    (esta última es secreta — nunca en el código, nunca en una variable `NEXT_PUBLIC_`).

## 4. Resend (correos de notificación) — opcional, recomendado

1. https://resend.com → crea la cuenta con el correo nuevo.
2. **Domains → Add domain** (p. ej. `qclab.tuempresa.com`) y agrega los registros DNS indicados.
   Hasta verificar el dominio, Resend solo entrega al dueño de la cuenta.
3. **API Keys → Create** (*Sending access*). Guarda la llave.

## 5. Vercel (publicación)

1. https://vercel.com/signup → **Continue with GitHub** con la cuenta GitHub **nueva**.
2. **Add New → Project → Import** `fanatics-qc-lab` (Next.js se detecta solo).
3. **Environment Variables** (Production y Preview):

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**sensible**) |
   | `NEXT_PUBLIC_APP_URL` | `https://fanatics-qc-lab.vercel.app` (o tu dominio) |
   | `RESEND_API_KEY` | llave de Resend |
   | `RESEND_FROM_EMAIL` | `qc-lab@tu-dominio-verificado` |
   | `MFA_REQUIRED` | `true` |

   Para publicar **solo la demo** (sin base de datos) para la presentación, crea un segundo
   proyecto Vercel del mismo repositorio con solo `DEMO_MODE=true`.
4. **Deploy**; luego vuelve al paso 3.8 y pon la URL final en Supabase.
5. Activa 2FA en Vercel: Account Settings → Authentication.
6. (Opcional) **Settings → Domains**: p. ej. `qclab.tuempresa.com` o un subdominio de Fanatics.
7. (Recomendado) **Settings → Deployment Protection**: deja *Vercel Authentication* en los
   *preview deployments*.

## 6. Primer acceso y carga inicial

1. Entra en `/login` con el admin. El sistema obliga a **configurar 2FA** (escanea el QR con
   Google Authenticator / Microsoft Authenticator).
2. **Suppliers** → abre cada mill → **Edit** → sube el **logo** oficial y completa país/ciudad.
3. **Users & access** → crea:
   - **Gabriel** — rol *Fanatics technician* (métodos de ensayo / revisión técnica);
   - un usuario por cada correo de los mills, rol *Supplier*, vinculado al mill correcto.
   La contraseña temporal se muestra **una sola vez**: envíala por un canal distinto al correo
   (Teams/WhatsApp). En el primer ingreso el usuario la cambia y activa 2FA.
4. **Protocols → Requirements matrix**: revisa los mínimos por fibra con el equipo de Fanatics.
5. **BI & API**: genera una llave para Power BI (ver [POWER_BI.md](POWER_BI.md)).

## 7. Checklist final

- [ ] 2FA en todas las cuentas nuevas (correo, GitHub, Supabase, Vercel, Resend).
- [ ] `service_role key` solo en Vercel (nunca en GitHub).
- [ ] Registros públicos desactivados en Supabase.
- [ ] TOTP activo y `MFA_REQUIRED=true`.
- [ ] Logos y datos de los mills revisados (campos "TBC" completados).
- [ ] Respaldos: Supabase hace backup diario; en plan Pro activa *Point-in-Time Recovery*.
- [ ] Contraseña de `bi_reader` definida si Power BI se conecta directo a Postgres.
