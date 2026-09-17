# Portal de clientes Rethink

Aplicación web para que los clientes de Rethink vean su historial de tratamiento de agua
(resultados, dosificación, recomendaciones, próximos análisis) y para que los administradores
registren visitas, gestionen clientes y ajusten rangos óptimos.

Construida según el brief `Portal Rethink (versión de producción)`: Next.js 14 (App Router) +
Supabase (Postgres + Auth) + Tailwind CSS + Recharts, lista para desplegar en Vercel.

## 1. Crear el proyecto en Supabase

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo.
2. Ve a **SQL Editor** y ejecuta el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql).
   Esto crea las tablas (`clients`, `parameter_ranges`, `visits`, `visit_readings`,
   `visit_dosing`, `users`), las funciones auxiliares y las políticas de Row Level Security
   que hacen que cada cliente solo vea sus propios datos.
3. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ esta clave salta todas las
     reglas de seguridad — nunca la pongas en una variable `NEXT_PUBLIC_`, ni la subas a
     git. Solo se usa server-side, en `lib/supabase/admin.ts`, para que **Gestionar
     usuarios** pueda crear cuentas y cambiar contraseñas sin pasar por el dashboard.)

> **¿Ya tenías este proyecto corriendo antes de esta versión?** Solo te falta una
> columna nueva. Ve a **SQL Editor** y corre:
> ```sql
> alter table clients add column if not exists active_systems text[] not null default '{}';
> update clients set active_systems = array['Calderas','Enfriamiento','Vapor','PTAR']
>   where active_systems = '{}';
> ```
> (En un proyecto nuevo no hace falta — ya está incluido en `schema.sql`.)

## 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con los tres valores del paso anterior.

## 3. Instalar y correr en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## 4. Crear la primera cuenta de administrador

1. En Supabase, ve a **Authentication → Users → Add user** y crea el usuario admin
   (correo + contraseña). Copia su UUID.
2. En **SQL Editor**, ejecuta:
   ```sql
   insert into users (id, email, role, client_id)
   values ('UUID-DEL-USUARIO', 'admin@rethink.com', 'admin', null);
   ```
3. Inicia sesión en `/login` con ese correo y contraseña. Debe llevarte a `/admin`.

## 5. Crear un cliente y su cuenta de prueba

1. En la app, como admin, ve a **Clientes → Nuevo cliente**. Marca los sistemas que
   aplican a ese cliente (Calderas, Enfriamiento, Vapor, PTAR — no todos los clientes
   tienen los 4) y se generan automáticamente los rangos óptimos por defecto para esos
   sistemas, listos para editar en **Rangos óptimos**.
2. Ve a **Usuarios → Nuevo usuario** (o el botón "Crear cuenta para este cliente" desde la
   ficha del cliente), pon correo + contraseña, rol "Cliente" y selecciona el cliente. Se
   crea la cuenta y queda vinculada en un solo paso — ya no hace falta pasar por el
   dashboard de Supabase para esto.
3. Registra una visita desde **Registrar visita** para ver datos reales en el portal del
   cliente.

## 6. Desplegar en Vercel

1. Sube este repositorio a GitHub (ya está en el repo `website`, rama de trabajo actual).
2. En [vercel.com](https://vercel.com), **Add New Project** → importa el repositorio.
3. En **Environment Variables** agrega `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` con los mismos valores
   de `.env.local`.
4. Despliega. Vercel construye y publica automáticamente en cada push.

## 7. Conectar el dominio propio

1. En el proyecto de Vercel, ve a **Settings → Domains** y agrega, por ejemplo,
   `portal.tudominio.com`.
2. Vercel te da los registros DNS (CNAME o A) a agregar en el proveedor de dominio de
   Rethink. Una vez propagados, el portal queda disponible en ese dominio con HTTPS
   automático.

## 8. Configurar los correos de Supabase (Site URL)

Por defecto, Supabase manda los links de sus correos (invitación, recuperación de
contraseña) al `Site URL` configurado en el proyecto, que empieza en
`http://localhost:3000`. Si no lo cambias, esos links llevan a la máquina de quien los
generó en vez de al sitio real. Para arreglarlo:

1. En Supabase, ve a **Authentication → URL Configuration**.
2. Cambia **Site URL** a tu dominio real (el de Vercel o el propio una vez conectado),
   por ejemplo `https://website-lime-one-96.vercel.app`.
3. En **Redirect URLs**, agrega ese mismo dominio (puedes usar `https://tu-dominio/**`
   para cubrir todas las rutas) y, si quieres seguir probando en local,
   `http://localhost:3000/**`.
4. Guarda. Los próximos correos de invitación/recuperación ya apuntarán al sitio
   correcto, y `app/auth/callback` recibe esos links, valida el token y deja al usuario
   crear su contraseña.

Si ya generaste un link de recuperación antes de este cambio, ese link específico sigue
apuntando a localhost — vuelve a mandarlo (**Send password recovery** desde
Authentication → Users) después de configurar el Site URL.

## Estructura del proyecto

```
app/
  login/                  Login (Supabase Auth)
  auth/callback/          Procesa links de invitación/recuperación de Supabase
  portal/                 Vista cliente: resumen, historial, dosificación,
                           recomendaciones, calendario, mi cuenta
  admin/                  Vista administrador: registrar visita, visitas (editar/
                           eliminar), clientes, rangos, mi cuenta
  admin/portal/[clientId] Admin navegando el portal de un cliente específico
                           (mismas vistas que /portal, de solo lectura)
  admin/usuarios/         Crear cuentas, cambiar contraseñas, reasignar rol/cliente
components/views/         Las 5 vistas del portal (Resumen, Historial, Dosificación,
                           Recomendaciones, Calendario), compartidas entre /portal
                           y /admin/portal/[clientId] para que nunca se desalineen
lib/
  supabase/               Clientes de Supabase (browser, server, middleware)
  supabase/admin.ts       Cliente con service_role key, solo server-side (crear/
                           eliminar cuentas y cambiar contraseñas)
  actions/admin.ts        Server actions de administración (mutaciones con RLS)
  actions/users.ts        Server actions de Gestionar usuarios (auth admin API)
  actions/demo.ts         Server actions para sembrar/borrar datos de demostración
  portal-data.ts          Consultas de solo lectura para la vista cliente
  admin-data.ts           Consultas de solo lectura para la vista admin
  constants.ts            Catálogo de parámetros por defecto por sistema
supabase/schema.sql       Esquema completo + políticas RLS
middleware.ts             Protege rutas por sesión y por rol (admin/client)
```

## Lo que puede hacer un administrador

Además de registrar visitas, gestionar clientes y rangos:

- **Ver como cliente** (nav lateral, o "Ver portal" en la fila de un cliente): navega el
  mismo Resumen, Historial, Dosificación, Recomendaciones y Calendario que ve ese cliente,
  sin necesidad de tener su contraseña. Es de solo lectura — los cambios se hacen desde
  Registrar visita / Rangos.
- **Visitas**: lista todas las visitas registradas; permite editar los datos generales
  (fecha, técnico, recomendación, prioridad, próxima visita) o eliminar una visita completa
  si hubo un error de captura. Las lecturas y dosificación de una visita no se editan en
  línea — si hay que corregirlas, se elimina la visita y se vuelve a registrar.
- **Enviar recuperación**: desde la ficha de un cliente, junto a cada cuenta vinculada, un
  botón "Enviar recuperación" dispara el correo de restablecimiento de contraseña de
  Supabase para ese usuario (requiere el Site URL / SMTP configurados, ver más abajo).
- **Gestionar usuarios**: crea cuentas (admin o cliente) con correo y contraseña directo
  desde la app, cambia la contraseña de cualquier usuario sin correo de por medio,
  reasigna una cuenta a otro cliente o cambia su rol, y elimina cuentas. Usa la
  `service_role key` de Supabase server-side (`lib/supabase/admin.ts`) — nunca se expone
  al navegador.
- **Sistemas por cliente**: en **Clientes → Nuevo/Editar**, marca qué sistemas tiene cada
  cliente (Calderas, Enfriamiento, Vapor, PTAR). Solo esos aparecen en su portal, en
  Registrar visita y en el selector de Rangos óptimos para ese cliente. Desmarcar un
  sistema lo oculta pero no borra su historial; se puede volver a marcar cuando sea.

## Cómo funciona el control de acceso

- La tabla `users` vincula cada cuenta de Supabase Auth con un `role` (`admin` o `client`)
  y, si es cliente, con su `client_id`.
- Las políticas de Row Level Security en Postgres son la barrera real: aunque el código
  del cliente tuviera un error, la base de datos nunca devuelve filas de otro `client_id`
  a una cuenta con rol `client`. Los admins tienen acceso completo.
- El `middleware.ts` de Next.js redirige por rol (`/admin` vs `/portal`) y protege las
  rutas de cada vista, como capa adicional de experiencia de usuario.

## Marca

Colores, tipografía (Poppins) y el pie de página "Chemistry by Design" están aplicados
según la guía de marca del brief. El logo oficial de Rethink (isotipo de círculos + wordmark,
versión blanca para fondos oscuros) vive en `public/brand/rethink-logo-wordmark-blanco.png`
y se usa desde `components/Logo.tsx`. El isotipo suelto está en
`public/brand/rethink-icon-puntos.png` por si se necesita en algún lugar sin el wordmark.

La app tiene un selector de tema claro/oscuro ("Cambiar apariencia", en la barra lateral)
implementado con variables CSS en `app/globals.css` — el sidebar y el logo se mantienen
siempre oscuros (el wordmark es blanco y necesita fondo oscuro), mientras el resto de la
app cambia. La preferencia se guarda por navegador.

## Datos de demostración

Desde **Panel de administrador → Datos de demostración** puedes crear 3 clientes de
ejemplo, cada uno con un juego distinto de sistemas activos (para mostrar justamente que
no todos los clientes tienen los 4): `[Demo] Textilera Elcatex` (Calderas + Enfriamiento),
`[Demo] Hotel Las Brisas` (Enfriamiento + PTAR) y `[Demo] Planta San Rafael` (Calderas +
Vapor). Cada uno con rangos, visitas, lecturas y dosificación reales en tu base de
datos — útil para explorar la app o hacer una demo sin usar datos de clientes reales. Se
identifican por el prefijo `[Demo]` y se pueden borrar con el botón de al lado en
cualquier momento, sin afectar otros clientes.

## Notas de producción

- El proyecto usa Next.js 14.2.35 (el último parche disponible en la serie 14.x). Antes de
  operar con datos reales de clientes, evalúa migrar a Next.js 15/16 para quedar al día con
  parches de seguridad futuros.
- Las cuentas de usuario se crean desde **Gestionar usuarios** en la app (o manualmente
  en el dashboard de Supabase si prefieres). No hay una API pública de registro — crear
  cuentas siempre requiere estar logueado como admin, por diseño.
- Guarda la `service_role key` con el mismo cuidado que una contraseña de base de datos:
  quien la tenga puede leer y escribir cualquier dato saltándose RLS. Solo debe existir
  en `.env.local` (nunca commiteado) y en las variables de entorno de Vercel.
