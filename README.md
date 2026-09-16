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

## 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con los valores del paso anterior.

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

1. En la app, como admin, ve a **Clientes → Nuevo cliente**. Esto crea el cliente y le
   genera automáticamente los rangos óptimos por defecto para los 4 sistemas (Calderas,
   Enfriamiento, Vapor, PTAR), listos para editar en **Rangos óptimos**.
2. En Supabase, crea el usuario del cliente en **Authentication → Users** y copia su UUID.
3. En la app, entra a **Clientes → [el cliente] → Editar**, y en "Cuentas de cliente
   vinculadas" pega el UUID y el correo para vincularlo. Ese usuario ya puede iniciar sesión
   y solo verá los datos de ese cliente (aplicado por las políticas RLS de Supabase).
4. Registra una visita desde **Registrar visita** para ver datos reales en el portal del
   cliente.

## 6. Desplegar en Vercel

1. Sube este repositorio a GitHub (ya está en el repo `website`, rama de trabajo actual).
2. En [vercel.com](https://vercel.com), **Add New Project** → importa el repositorio.
3. En **Environment Variables** agrega `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los mismos valores de `.env.local`.
4. Despliega. Vercel construye y publica automáticamente en cada push.

## 7. Conectar el dominio propio

1. En el proyecto de Vercel, ve a **Settings → Domains** y agrega, por ejemplo,
   `portal.tudominio.com`.
2. Vercel te da los registros DNS (CNAME o A) a agregar en el proveedor de dominio de
   Rethink. Una vez propagados, el portal queda disponible en ese dominio con HTTPS
   automático.

## Estructura del proyecto

```
app/
  login/                  Login (Supabase Auth)
  portal/                 Vista cliente: resumen, historial, dosificación,
                           recomendaciones, calendario
  admin/                  Vista administrador: registrar visita, clientes, rangos
lib/
  supabase/               Clientes de Supabase (browser, server, middleware)
  actions/admin.ts        Server actions de administración (mutaciones con RLS)
  portal-data.ts          Consultas de solo lectura para la vista cliente
  admin-data.ts           Consultas de solo lectura para la vista admin
  constants.ts            Catálogo de parámetros por defecto por sistema
supabase/schema.sql       Esquema completo + políticas RLS
middleware.ts             Protege rutas por sesión y por rol (admin/client)
```

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
según la guía de marca del brief. El isotipo de círculos + wordmark en `components/Logo.tsx`
es un placeholder: reemplázalo por el archivo oficial de Rethink cuando esté disponible
(versión blanca para fondos oscuros).

## Notas de producción

- El proyecto usa Next.js 14.2.35 (el último parche disponible en la serie 14.x). Antes de
  operar con datos reales de clientes, evalúa migrar a Next.js 15/16 para quedar al día con
  parches de seguridad futuros.
- Las cuentas de usuario (Supabase Auth) se crean manualmente desde el dashboard de
  Supabase y se vinculan desde la app; no hay una API pública de registro, por diseño.
