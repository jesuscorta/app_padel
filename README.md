# Liga de Pádel

PWA mobile-first para gestionar una liga de pádel entre amigos.

## Stack

- Vite + React + TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL + `supabase-js`)
- Vercel
- `vite-plugin-pwa`

## Requisitos funcionales implementados

- 8 jugadores titulares
- Sorteo aleatorio de 4 parejas con vista previa y repetición antes de confirmar
- Parejas fijas durante toda la liga
- Calendario automático round-robin: 3 jornadas, 2 partidos por jornada
- Pantalla principal mostrando solo la jornada actual
- Registrar únicamente el ganador
- Corregir resultados
- Ausencias con sustitutos sin modificar las parejas
- Clasificación individual:
  - solo titulares
  - incluyendo sustitutos
- Reparto automático y editable de pelotas por partido
- Historial de jornadas
- Cierre de liga y archivo histórico en solo lectura
- PWA instalable en iOS y Android
- PIN simple por dispositivo

## Desarrollo local

```bash
npm install
npm run icons
npm run dev
```

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. En el SQL Editor ejecuta, en este orden:
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed.sql`
3. Copia `.env.example` a `.env`.
4. Rellena:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
VITE_ADMIN_PIN=1234
```

## Scripts

- `npm run dev` - desarrollo local
- `npm run build` - typecheck + build producción
- `npm run preview` - servir build local
- `npm run test` - tests unitarios
- `npm run icons` - regenerar iconos PWA

## Despliegue en Vercel

1. Sube el repo a GitHub.
2. Importa el proyecto en Vercel.
3. Añade las mismas variables de entorno que en `.env`.
4. Build command: `npm run build`
5. Output directory: `dist`

`vercel.json` ya incluye la reescritura SPA.

## PWA

- Manifest generado por `vite-plugin-pwa`
- Service Worker con precache del shell
- Iconos `192`, `512`, `maskable` y `apple-touch-icon`
- Metadatos iOS (`apple-mobile-web-app-capable`, `viewport-fit=cover`)

## Seguridad

La app usa un PIN simple en cliente. Es suficiente para un grupo de amigos, pero no sustituye a una autenticación real. La `anon key` de Supabase es pública; si quisieras endurecerla, el siguiente paso natural sería mover las escrituras a una Edge Function con validación de PIN.

## Offline

- El shell de la app queda cacheado por el Service Worker.
- La app guarda una instantánea local del último estado cargado para poder mostrar la última información conocida si no hay conexión.
- Las escrituras (resultados, sustituciones, pelotas...) requieren red.

## Verificación realizada

- `npm run test`
- `npm run build`

## Pendiente manual

- Probar instalación real en iPhone (Añadir a pantalla de inicio)
- Probar instalación real en Android
- Crear el proyecto Supabase y ejecutar la migración/seed
- Configurar el despliegue real en Vercel
