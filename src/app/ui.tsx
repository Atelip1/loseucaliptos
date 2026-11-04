"use client";
// Utilidades compartidas del panel web (adaptador de entrada para el personal).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface SedeUI {
  id: string;
  nombre: string;
  direccion: string;
}

const ENLACES = [
  ["/", "Inicio"],
  ["/simulador", "WhatsApp (simulador)"],
  ["/cocina", "Cocina"],
  ["/mozo", "Mozo"],
  ["/caja", "Caja"],
  ["/delivery", "Delivery"],
  ["/atencion", "Atención"],
  ["/admin", "Administración"],
] as const;

export function Navegacion() {
  const ruta = usePathname();
  const derivadas = useDatos<unknown[]>("/api/conversaciones?derivadas=1", 4000);
  return (
    <nav className="barra">
      <span className="marca">🌿 Los Eucaliptos</span>
      {ENLACES.map(([href, txt]) => (
        <Link key={href} href={href} className={ruta === href ? "activo" : ""}>
          {txt}
          {href === "/atencion" && derivadas.datos?.length ? (
            <span className="etiqueta alerta" style={{ marginLeft: 6 }}>{derivadas.datos.length}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}

export function soles(c: number) {
  return `S/ ${(c / 100).toFixed(2)}`;
}

export function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });
}

export function minutosDesde(iso: string, ahora = Date.now()) {
  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000));
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
    if (!actual.current) return;
    try {
      const r = await fetch(actual.current, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error");
      setDatos(j as T);
      setError(null);
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

/** Nombre del usuario que realiza las acciones (hasta HU20, autenticación en el Sprint 7). */
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
    <label style={{ display: "inline-grid" }}>
      Sede
      <select value={sedeId ?? ""} onChange={(e) => cambiar(e.target.value)}>
        {sedes.map((s) => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
        ))}
      </select>
    </label>
  );
}

export function CampoUsuario({ usuario, cambiar }: { usuario: string; cambiar: (u: string) => void }) {
  return (
    <label style={{ display: "inline-grid" }}>
      Usuario
      <input value={usuario} onChange={(e) => cambiar(e.target.value)} style={{ width: 140 }} />
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

export const MODALIDADES: Record<string, string> = {
  EN_LOCAL: "En local",
  PARA_LLEVAR: "Para llevar",
  DELIVERY: "Delivery",
};

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
  pago?: { medio: string; monto: number; fecha: string };
  comprobante?: { archivo: string; recibidoEn: string; verificado: boolean };
  repartidor?: string;
  motivoCancelacion?: string;
}

export function Origen({ p }: { p: PedidoUI }) {
  return (
    <span className="suave">
      {p.canal === "WHATSAPP" ? "📱 WhatsApp" : "🧑‍🍳 Presencial"} · {MODALIDADES[p.modalidad]}
      {p.mesa ? ` · Mesa ${p.mesa}` : ""}
      {p.clienteNombre ? ` · ${p.clienteNombre}` : ""}
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
