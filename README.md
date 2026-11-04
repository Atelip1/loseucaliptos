# Los Eucaliptos — Sistema conversacional de pedidos

Sistema conversacional con IA para la gestión de pedidos del Restaurante Los Eucaliptos (Chincha, 2026).
Arquitectura de Software · UPSJB 2026-II.

**Incremento actual: Sprints 1 a 6 (semanas 1–12).**

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. Los datos se guardan en `data/db.json` (se crea con datos de ejemplo).

```bash
npm test
```

## Qué incluye cada sprint

| Sprint | Historias | Dónde verlo |
|---|---|---|
| S1 Bases técnicas | HU01 carta (admin), arquitectura hexagonal, modelo de datos | `/admin`, `src/domain`, `supabase/migrations` |
| S2 El bot conversa | HU02 saludo y carta, HU03 preguntas frecuentes, HU04 preguntas sobre platos | `/simulador` |
| S3 Pedido completo | HU05 pedido en lenguaje natural, HU06 modalidad y datos, HU07 resumen y confirmación | `/simulador` |
| S4 Panel de cocina | HU08 pedidos en orden de llegada, HU09 pedidos de mesa, HU10 cambio de estado | `/cocina`, `/mozo` |
| S5 Control y caja | HU11 notificaciones, HU12 cobro y cierre, HU13 comprobante, HU23 modificar o cancelar | `/caja`, `/simulador` |
| S6 Delivery | HU14 repartidor, HU15 ubicación, HU16 agotados, HU17 atención humana, HU24 zonas | `/delivery`, `/atencion`, `/admin` |

Pendiente para S7–S8: reportes (HU18, HU19), usuarios y roles con Supabase Auth (HU20), mensajes no
comprendidos (HU27), pedidos programados (HU21), piloto (HU22), ticket (HU25), encuesta (HU26) y
repetir pedido (HU28). Hasta HU20, el panel pide el nombre del usuario en lugar de iniciar sesión.

## Arquitectura (hexagonal, monolito modular)

```
src/
  domain/          Núcleo: agregado Pedido, Dinero, servicio de delivery. Sin dependencias externas.
  application/     Casos de uso (comandos y consultas), puertos y gestor del diálogo del chatbot.
  infrastructure/  Adaptadores: persistencia JSON, intérprete por reglas, OpenAI, WhatsApp Cloud API.
  app/             Adaptadores de entrada: panel web (Next.js) y Route Handlers (API y webhook).
tests/             Pruebas unitarias y del flujo conversacional (Vitest).
supabase/          Esquema PostgreSQL con RLS por sede y rol para el despliegue en Supabase.
```

- **Intérprete de IA intercambiable (EC05):** sin `OPENAI_API_KEY` se usa el intérprete local por reglas
  (cantidades en letras, errores ortográficos, ambigüedad). Con la clave, se usa el modelo con salida JSON
  y, si falla, el sistema pasa al intérprete local (EC02).
- **RN01:** el modelo solo devuelve ids de platos; los precios siempre salen de la carta.
- **WhatsApp:** `/api/whatsapp/webhook` valida la firma de Meta (EC04), responde de inmediato y procesa en
  segundo plano (EC01), e ignora mensajes duplicados (RNF05). Sin credenciales, use `/simulador`.

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar lo que corresponda.

## Pendiente de la Definición de Terminado

- El adaptador de Supabase (las tablas ya están en `supabase/migrations`); hoy la persistencia es local.
- Desplegar en Vercel y probar con un número de WhatsApp Business real.
- Los precios, zonas y tarifas son de ejemplo y debe validarlos la propietaria (RN05).
