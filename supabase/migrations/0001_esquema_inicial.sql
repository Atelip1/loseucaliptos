-- Esquema de datos del sistema de pedidos (Figura 8 del documento) para Supabase PostgreSQL.
-- Equivale a los puertos que hoy implementa el adaptador local (src/infrastructure/persistencia).
-- Los montos se guardan en céntimos (integer).

create table sede (
  id text primary key,
  nombre text not null,
  direccion text not null,
  prefijo text not null unique
);

create table plato (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null,
  descripcion text not null default '',
  precio integer not null check (precio > 0),
  alias text[] not null default '{}',
  activo boolean not null default true,
  foto text
);

-- RN07 / RN13: disponibilidad por sede (fila presente = agotado)
create table disponibilidad (
  plato_id uuid references plato(id) on delete cascade,
  sede_id text references sede(id) on delete cascade,
  agotado boolean not null default true,
  primary key (plato_id, sede_id)
);

-- RN05 / HU24
create table zona_delivery (
  id uuid primary key default gen_random_uuid(),
  sede_id text not null references sede(id),
  nombre text not null,
  tarifa integer not null check (tarifa >= 0),
  pedido_minimo integer not null check (pedido_minimo >= 0),
  activa boolean not null default true
);

create table cliente (
  telefono text primary key,
  nombre text,
  consentimiento boolean not null default false, -- RN11 / Ley 29733
  creado_en timestamptz not null default now()
);

create type estado_pedido as enum ('RECIBIDO','EN_PREPARACION','LISTO','EN_CAMINO','ENTREGADO','CANCELADO');
create type modalidad as enum ('EN_LOCAL','PARA_LLEVAR','DELIVERY');
create type canal as enum ('WHATSAPP','PRESENCIAL');
create type medio_pago as enum ('EFECTIVO','TARJETA','YAPE','PLIN','TRANSFERENCIA');

create table pedido (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  sede_id text not null references sede(id),
  canal canal not null,
  modalidad modalidad not null,
  cliente_telefono text references cliente(telefono),
  cliente_nombre text,
  mesa text,
  zona_id uuid references zona_delivery(id),
  direccion text,
  referencia text,
  latitud double precision,
  longitud double precision,
  subtotal integer not null,
  costo_delivery integer not null default 0,
  total integer not null,
  estado estado_pedido not null default 'RECIBIDO',
  repartidor text,
  motivo_cancelacion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index pedido_sede_estado on pedido (sede_id, estado, creado_en);

create table linea_pedido (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references pedido(id) on delete cascade,
  plato_id uuid not null references plato(id),
  nombre text not null,
  precio_unitario integer not null check (precio_unitario > 0), -- RN01: copiado de la carta
  cantidad integer not null check (cantidad between 1 and 50),
  observacion text
);

-- Historial inmutable de estados (EVENTO_PEDIDO)
create table evento_pedido (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references pedido(id) on delete cascade,
  tipo text not null,
  usuario text not null,
  detalle text,
  fecha timestamptz not null default now()
);

create table pago (
  pedido_id uuid primary key references pedido(id),
  medio medio_pago not null,
  monto integer not null,
  usuario text not null,
  fecha timestamptz not null default now()
);

create table comprobante (
  pedido_id uuid primary key references pedido(id),
  archivo text not null, -- ruta en Supabase Storage
  verificado boolean not null default false,
  recibido_en timestamptz not null default now()
);

-- Estado de cada conversación del chatbot (EC01)
create table conversacion (
  telefono text primary key references cliente(telefono),
  estado jsonb not null,
  derivada boolean not null default false,
  actualizada_en timestamptz not null default now()
);

-- Idempotencia del webhook (RNF05)
create table mensaje_procesado (
  id text primary key,
  recibido_en timestamptz not null default now()
);

create table configuracion (
  id smallint primary key default 1 check (id = 1),
  datos jsonb not null
);

-- Usuarios del panel y su sede (RF32 — se completa en el Sprint 7, HU20)
create type rol as enum ('ADMINISTRADOR','MOZO','COCINA','CAJA','REPARTIDOR');
create table usuario_panel (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol not null,
  sede_id text references sede(id) -- null = ambas sedes (administrador)
);

-- ---------- Seguridad a nivel de fila (RN12, RN13, RNF12) ----------
alter table pedido enable row level security;
alter table linea_pedido enable row level security;
alter table evento_pedido enable row level security;
alter table pago enable row level security;
alter table comprobante enable row level security;
alter table conversacion enable row level security;
alter table usuario_panel enable row level security;

create function mi_sede() returns text language sql stable security definer as
  $$ select sede_id from usuario_panel where id = auth.uid() $$;
create function mi_rol() returns rol language sql stable security definer as
  $$ select rol from usuario_panel where id = auth.uid() $$;

-- El personal ve solo los pedidos de su sede; el administrador ve ambas.
create policy pedidos_por_sede on pedido for select
  using (mi_rol() = 'ADMINISTRADOR' or sede_id = mi_sede());
create policy lineas_por_sede on linea_pedido for select
  using (exists (select 1 from pedido p where p.id = pedido_id and (mi_rol() = 'ADMINISTRADOR' or p.sede_id = mi_sede())));
create policy eventos_por_sede on evento_pedido for select
  using (exists (select 1 from pedido p where p.id = pedido_id and (mi_rol() = 'ADMINISTRADOR' or p.sede_id = mi_sede())));
create policy pagos_caja on pago for select
  using (mi_rol() in ('ADMINISTRADOR','CAJA'));
create policy comprobantes_caja on comprobante for select
  using (mi_rol() in ('ADMINISTRADOR','CAJA'));
create policy mi_usuario on usuario_panel for select using (id = auth.uid() or mi_rol() = 'ADMINISTRADOR');
-- Las escrituras se hacen desde los Route Handlers con la clave de servicio (RNF11),
-- nunca desde el navegador.

-- Vista de lectura para el panel de cocina (CQRS: ListarPendientesPorSede)
create view pendientes_cocina as
  select p.*, extract(epoch from now() - p.creado_en) / 60 as minutos
  from pedido p
  where p.estado in ('RECIBIDO','EN_PREPARACION')
  order by p.creado_en;
