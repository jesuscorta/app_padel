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
- La liga se compone de 7 rondas
- Cada ronda se divide en 3 jornadas
- En cada ronda se generan 4 parejas temporales
- Ninguna pareja puede repetirse dentro de la misma liga
- En cada ronda, las 4 parejas juegan todos contra todos: 6 partidos
- Cada jornada tiene 2 partidos
- Cada partido puede registrar hasta 3 sets
- El tercer set puede quedar incompleto
- En un tercer set incompleto nunca habrá empate en juegos
- El ganador del partido se calcula automáticamente a partir del marcador
- Los puntos individuales van al jugador que realmente jugó
- Los sustitutos deben existir previamente en la app
- Los sustitutos no alteran la pareja temporal de la ronda
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
