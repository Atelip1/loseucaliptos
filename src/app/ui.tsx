"use client";
// Componentes y utilidades compartidas del panel web (adaptador de entrada para el personal).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icono, Rama, type NombreIcono } from "./iconos";

export interface SedeUI {
  id: string;
  nombre: string;
  direccion: string;
}

// ------------------------------------------------------------------ navegación

const ENLACES: [string, string, NombreIcono, string?][] = [
  ["/", "Inicio", "inicio"],
  ["/simulador", "WhatsApp", "chat", "(simulador)"],
  ["/cocina", "Cocina", "gorro"],
  ["/mozo", "Mozo", "campana"],
  ["/caja", "Caja", "caja"],
  ["/delivery", "Delivery", "moto"],
  ["/atencion", "Atención", "auricular"],
  ["/admin", "Administración", "ajustes"],
];

export function Navegacion() {
  const ruta = usePathname();
  const derivadas = useDerivadas();
  return (
    <aside className="lateral">
      <Rama size={150} className="lateral-rama arriba" color="#7fb069" />
      <Link href="/" className="marca">
        <span className="sello"><Icono n="hoja" size={30} grosor={1.6} /></span>
        <small>Restaurante Campestre</small>
        <strong>LOS EUCALIPTOS</strong>
        <span className="filete" />
      </Link>
      <nav className="menu">
        {ENLACES.map(([href, txt, ico, sub]) => (
          <Link key={href} href={href} className={`enlace-nav ${ruta === href ? "activo" : ""}`}>
            <Icono n={ico} size={22} />
            <span className="texto">
              {txt}
              {sub && <small>{sub}</small>}
            </span>
            {href === "/atencion" && derivadas > 0 && <span className="contador">{derivadas}</span>}
          </Link>
        ))}
      </nav>
      <Rama size={190} className="lateral-rama abajo" color="#7fb069" />
    </aside>
  );
}

function useDerivadas() {
  const { datos } = useDatos<unknown[]>("/api/conversaciones?derivadas=1", 4000);
  return datos?.length ?? 0;
}

/** Encabezado de cada pantalla: icono, título, subtítulo, controles y avisos de atención humana. */
export function Encabezado({
  icono,
  titulo,
  subtitulo,
  usuario,
  children,
}: {
  icono: NombreIcono | "whatsapp";
  titulo: ReactNode;
  subtitulo: ReactNode;
  usuario?: string;
  children?: ReactNode;
}) {
  const derivadas = useDerivadas();
  return (
    <header className="encabezado">
      <div className="titulo-pagina">
        <span className={`icono-pagina ${icono === "whatsapp" ? "wa" : ""}`}>
          <Icono n={icono === "whatsapp" ? "chat" : icono} size={30} />
        </span>
        <div>
          <h1>{titulo}</h1>
          <p className="subtitulo">{subtitulo}</p>
        </div>
        <Rama size={64} className="rama-titulo" color="var(--verde-500)" />
      </div>
      <div className="controles">
        {children}
        <Link href="/atencion" className="timbre" title={derivadas ? `${derivadas} conversación(es) esperan atención` : "Sin conversaciones derivadas"}>
          <Icono n="timbre" size={22} />
          {derivadas > 0 && <span className="punto">{derivadas}</span>}
        </Link>
        {usuario !== undefined && (
          <span className="perfil">
            <span className="avatar">{iniciales(usuario)}</span>
            <span>
              <b>{usuario || "Sin nombre"}</b>
              <small>Usuario del panel</small>
            </span>
          </span>
        )}
      </div>
    </header>
  );
}

export function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

// ------------------------------------------------------------------ bloques visuales

export function Kpi({ icono, nombre, valor, nota, tono }: { icono: NombreIcono; nombre: string; valor: ReactNode; nota?: ReactNode; tono?: "terracota" | "ambar" | "azul" }) {
  return (
    <div className="kpi">
      <span className={`ico ${tono ?? ""}`}><Icono n={icono} size={26} /></span>
      <div>
        <div className="nombre">{nombre}</div>
        <div className="valor">{valor}</div>
        {nota && <div className="nota">{nota}</div>}
      </div>
    </div>
  );
}

export function Vacio({ icono, titulo, texto, children }: { icono: NombreIcono; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="ilustracion">
        <Rama size={70} className="v-rama izq" color="var(--verde-500)" />
        <span className="circulo"><Icono n={icono} size={44} grosor={1.5} /></span>
        <Rama size={70} className="v-rama der" color="var(--verde-500)" />
      </div>
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

/** Franja verde con título (como en los diseños), con ilustración opcional a la derecha. */
export function Franja({ icono, titulo, texto, children }: { icono: NombreIcono; titulo: ReactNode; texto?: ReactNode; children?: ReactNode }) {
  return (
    <div className="franja">
      <span className="franja-ico"><Icono n={icono} size={28} /></span>
      <div>
        <h2>{titulo}</h2>
        {texto && <p>{texto}</p>}
      </div>
      <Rama size={110} className="franja-rama" color="#9ccc7f" />
      {children && <div className="franja-extra">{children}</div>}
    </div>
  );
}

export function TituloTarjeta({ icono, children, extra }: { icono: NombreIcono; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="tarjeta-titulo">
      <h2><Icono n={icono} size={22} /> {children}</h2>
      {extra}
    </div>
  );
}

// ------------------------------------------------------------------ datos

export function soles(c: number) {
  return `S/ ${(c / 100).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
}

export function minutosDesde(iso: string, ahora = Date.now()) {
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000));
}

export function hoyLima() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

function leerLocal(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}
function guardarLocal(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Lee datos de la API y los refresca cada `ms` milisegundos (panel "en tiempo real", RNF02). */
export function useDatos<T>(url: string | null, ms = 0) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actual = useRef(url);
  actual.current = url;

  const recargar = useCallback(async () => {
    const u = actual.current;
    if (!u) return;
    try {
      const r = await fetch(u, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      if (actual.current === u) {
        setDatos(j as T);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sin conexión");
    }
  }, []);

  useEffect(() => {
    setDatos(null);
    recargar();
    if (!ms) return;
    const t = setInterval(recargar, ms);
    return () => clearInterval(t);
  }, [url, ms, recargar]);

  return { datos, error, recargar };
}

export async function enviar<T = unknown>(url: string, cuerpo?: unknown, metodo = "POST"): Promise<T> {
  const r = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "No se pudo completar la acción.");
  return j as T;
}

/** Sede de trabajo del panel (RN13: cada área ve solo los pedidos de su sede). Se recuerda por navegador. */
export function useSede() {
  const { datos } = useDatos<{ sedes: SedeUI[]; modoIA: string; modoWhatsApp: string }>("/api/sedes");
  const [sedeId, setSedeId] = useState<string | null>(null);
  useEffect(() => {
    if (!datos) return;
    const guardada = leerLocal("sede");
    setSedeId(datos.sedes.some((s) => s.id === guardada) ? guardada : datos.sedes[0]?.id ?? null);
  }, [datos]);
  const cambiar = (id: string) => {
    setSedeId(id);
    guardarLocal("sede", id);
  };
  return { sedes: datos?.sedes ?? [], sedeId, cambiar, info: datos };
}

/** Nombre del usuario que realiza las acciones (la autenticación por roles llega con HU20, Sprint 7). */
export function useUsuario(porDefecto: string) {
  const [usuario, setUsuario] = useState(porDefecto);
  useEffect(() => {
    const u = leerLocal(`usuario:${porDefecto}`);
    if (u) setUsuario(u);
  }, [porDefecto]);
  const cambiar = (u: string) => {
    setUsuario(u);
    guardarLocal(`usuario:${porDefecto}`, u);
  };
  return [usuario, cambiar] as const;
}

export function SelectorSede({ sedes, sedeId, cambiar }: { sedes: SedeUI[]; sedeId: string | null; cambiar: (id: string) => void }) {
  return (
    <label className="control">
      <span>Sede:</span>
      <span className="caja-control">
        <Icono n="pin" size={18} />
        <select value={sedeId ?? ""} onChange={(e) => cambiar(e.target.value)} aria-label="Sede">
          {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </span>
    </label>
  );
}

export function CampoUsuario({ usuario, cambiar }: { usuario: string; cambiar: (u: string) => void }) {
  return (
    <label className="control">
      <span>Usuario:</span>
      <span className="caja-control">
        <Icono n="usuario" size={18} />
        <input value={usuario} onChange={(e) => cambiar(e.target.value)} aria-label="Usuario" style={{ width: 110 }} />
      </span>
    </label>
  );
}

export const ESTADOS: Record<string, string> = {
  RECIBIDO: "Recibido",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const ICONO_ESTADO: Record<string, NombreIcono> = {
  RECIBIDO: "reloj",
  EN_PREPARACION: "gorro",
  LISTO: "check",
  EN_CAMINO: "moto",
  ENTREGADO: "check",
  CANCELADO: "prohibido",
};

export function Estado({ estado }: { estado: string }) {
  return (
    <span className={`insignia e-${estado}`}>
      <Icono n={ICONO_ESTADO[estado] ?? "reloj"} size={14} grosor={2.2} /> {ESTADOS[estado] ?? estado}
    </span>
  );
}

export const MODALIDADES: Record<string, string> = {
  EN_LOCAL: "En local",
  PARA_LLEVAR: "Para llevar",
  DELIVERY: "Delivery",
};

export interface EventoUI {
  tipo: string;
  fecha: string;
  usuario: string;
  detalle?: string;
}

export interface PedidoUI {
  id: string;
  codigo: string;
  sedeId: string;
  canal: "WHATSAPP" | "PRESENCIAL";
  modalidad: "EN_LOCAL" | "PARA_LLEVAR" | "DELIVERY";
  clienteTelefono?: string;
  clienteNombre?: string;
  mesa?: string;
  lineas: { platoId: string; nombre: string; precioUnitario: number; cantidad: number; observacion?: string }[];
  entrega?: { zonaNombre: string; direccion: string; referencia: string; ubicacion?: { lat: number; lng: number } };
  subtotal: number;
  costoDelivery: number;
  total: number;
  estado: keyof typeof ESTADOS;
  creadoEn: string;
  actualizadoEn: string;
  eventos: EventoUI[];
  pago?: { medio: string; monto: number; fecha: string };
  comprobante?: { archivo: string; recibidoEn: string; verificado: boolean };
  repartidor?: string;
  motivoCancelacion?: string;
}

const NOMBRE_EVENTO: Record<string, string> = {
  PedidoRegistrado: "Pedido registrado",
  PedidoEnPreparacion: "En preparación",
  PedidoListo: "Listo",
  PedidoEnCamino: "En camino",
  PedidoEntregado: "Entregado",
  PedidoCancelado: "Cancelado",
  CobroRegistrado: "Cobro registrado",
  ComprobanteRecibido: "Comprobante recibido",
  RepartidorAsignado: "Repartidor asignado",
};

/** Historial de estados del pedido con fecha, hora y usuario (RF15). */
export function Historial({ eventos }: { eventos: EventoUI[] }) {
  return (
    <ol className="linea-tiempo">
      {eventos.map((e, i) => (
        <li key={i} className={e.tipo === "PedidoCancelado" ? "cancelado" : ""}>
          <b>{NOMBRE_EVENTO[e.tipo] ?? e.tipo}</b>
          {e.detalle ? ` · ${e.detalle}` : ""}
          <div className="quien">{hora(e.fecha)} · {e.usuario}</div>
        </li>
      ))}
    </ol>
  );
}

export function Origen({ p }: { p: PedidoUI }) {
  return (
    <span className="meta">
      <span className="etiqueta">{p.canal === "WHATSAPP" ? "WhatsApp" : "Presencial"}</span>
      <span className="etiqueta">{MODALIDADES[p.modalidad]}</span>
      {p.mesa && <span className="etiqueta">Mesa {p.mesa}</span>}
      {p.clienteNombre && <span>{p.clienteNombre}</span>}
    </span>
  );
}

export function useAccion() {
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ejecutar = async (fn: () => Promise<unknown>) => {
    setOcupado(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setOcupado(false);
    }
  };
  return { error, ocupado, ejecutar };
}

/** Menú de acciones de una fila (⋮) que despliega contenido, p. ej. el historial. */
export function Desplegable({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <span className="desplegable">
      <button className="fantasma icono" title={etiqueta} aria-label={etiqueta} aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
      </button>
      {abierto && (
        <span className="desplegable-panel" onMouseLeave={() => setAbierto(false)}>
          {children}
        </span>
      )}
    </span>
  );
}
