# AGENTS

## Proyecto

PWA de gestión de liga de pádel entre amigos.

## Stack

- Vite + React + TypeScript
- Tailwind CSS 4
- Supabase
- Vercel

## Reglas del dominio

- Siempre hay 8 titulares por liga
- Las parejas se sortean una vez y quedan fijas hasta cerrar la liga
- La liga son 3 jornadas de todos contra todos entre 4 parejas
- Solo se registra el ganador de cada partido
- Los puntos individuales van al jugador que realmente jugó
- Los sustitutos no alteran la pareja oficial
- Las pelotas se asignan por partido
- Solo puede existir una liga activa

## Convenciones útiles

- `src/lib/db/*` contiene acceso a Supabase
- `src/lib/*` contiene lógica pura de negocio (sorteo, calendario, standings, pelotas)
- `src/pages/*` son pantallas
- `src/components/*` son bloques reutilizables

## Verificación mínima

Antes de dar por cerrados cambios funcionales:

```bash
npm run test
npm run build
```
