// Adaptador de persistencia local en un archivo JSON (o solo en memoria, para pruebas).
// Implementa los mismos puertos que implementará el adaptador de Supabase (ver supabase/migrations),
// por lo que cambiar de almacenamiento no modifica el dominio ni la aplicación (RNF14).
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Configuracion,
  Conversacion,
  FiltroPedidos,
  RepositorioCarta,
  RepositorioConfiguracion,
  RepositorioConversaciones,
  RepositorioDePedidos,
  RepositorioZonas,
} from "@/application/puertos";
import type { PedidoProps } from "@/domain/pedido";
import type { Plato, Sede, Zona } from "@/domain/tipos";
import { CONFIGURACION, PLATOS, SEDES, ZONAS } from "./semilla";

interface Esquema {
  version: number;
  sedes: Sede[];
  platos: Plato[];
  agotados: { platoId: string; sedeId: string }[];
  zonas: Zona[];
  pedidos: PedidoProps[];
  conversaciones: Conversacion[];
  configuracion: Configuracion;
  contadores: Record<string, number>;
  procesados: string[];
}

function semilla(): Esquema {
  return structuredClone({
    version: 1,
    sedes: SEDES,
    platos: PLATOS,
    agotados: [],
    zonas: ZONAS,
    pedidos: [],
    conversaciones: [],
    configuracion: CONFIGURACION,
    contadores: {},
    procesados: [],
  });
}

export class AlmacenJson implements RepositorioCarta {
  private datos: Esquema | null = null;
  private cola: Promise<unknown> = Promise.resolve();
  readonly pedidos: RepositorioDePedidos;
  readonly conversaciones: RepositorioConversaciones;

  /** @param archivo ruta del JSON; null = solo memoria (pruebas). */
  constructor(private archivo: string | null) {
    this.pedidos = new RepoPedidos(this);
    this.conversaciones = new RepoConversaciones(this);
  }

  /** Lectura consistente. */
  async leer<T>(fn: (db: Esquema) => T): Promise<T> {
    return this.enCola(async () => structuredClone(fn(await this.cargar())));
  }

  /** Escritura serializada (evita condiciones de carrera entre peticiones). */
  async escribir<T>(fn: (db: Esquema) => T): Promise<T> {
    return this.enCola(async () => {
      const db = await this.cargar();
      const r = fn(db);
      await this.persistir(db);
      return structuredClone(r);
    });
  }

  async reiniciar(): Promise<void> {
    await this.enCola(async () => {
      this.datos = semilla();
      await this.persistir(this.datos);
    });
  }

  private enCola<T>(fn: () => Promise<T>): Promise<T> {
    const r = this.cola.then(fn, fn);
    this.cola = r.catch(() => undefined);
    return r;
  }

  private async cargar(): Promise<Esquema> {
    if (this.datos) return this.datos;
    if (!this.archivo) return (this.datos = semilla());
    try {
      this.datos = JSON.parse(await fs.readFile(this.archivo, "utf8")) as Esquema;
    } catch {
      this.datos = semilla();
      await this.persistir(this.datos);
    }
    return this.datos;
  }

  private async persistir(db: Esquema) {
    if (!this.archivo) return;
    await fs.mkdir(path.dirname(this.archivo), { recursive: true });
    const tmp = `${this.archivo}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, this.archivo);
  }

  // ---------------- RepositorioCarta ----------------
  listarSedes() {
    return this.leer((db) => db.sedes);
  }
  obtenerSede(id: string) {
    return this.leer((db) => db.sedes.find((s) => s.id === id) ?? null);
  }
  listarPlatos() {
    return this.leer((db) => db.platos);
  }
  obtenerPlato(id: string) {
    return this.leer((db) => db.platos.find((p) => p.id === id) ?? null);
  }
  async guardarPlato(plato: Plato) {
    await this.escribir((db) => {
      const i = db.platos.findIndex((p) => p.id === plato.id);
      if (i >= 0) db.platos[i] = plato;
      else db.platos.push(plato);
    });
  }
  async agotados(sedeId: string) {
    const ids = await this.leer((db) => db.agotados.filter((a) => a.sedeId === sedeId).map((a) => a.platoId));
    return new Set(ids);
  }
  async marcarAgotado(platoId: string, sedeId: string, agotado: boolean) {
    await this.escribir((db) => {
      db.agotados = db.agotados.filter((a) => !(a.platoId === platoId && a.sedeId === sedeId));
      if (agotado) db.agotados.push({ platoId, sedeId });
    });
  }

  // ---------------- RepositorioZonas ----------------
  listar(sedeId?: string) {
    return this.leer((db) => db.zonas.filter((z) => !sedeId || z.sedeId === sedeId));
  }
  obtener(id: string) {
    return this.leer((db) => db.zonas.find((z) => z.id === id) ?? null);
  }
  async guardar(zona: Zona) {
    await this.escribir((db) => {
      const i = db.zonas.findIndex((z) => z.id === zona.id);
      if (i >= 0) db.zonas[i] = zona;
      else db.zonas.push(zona);
    });
  }
  async eliminar(id: string) {
    await this.escribir((db) => {
      db.zonas = db.zonas.filter((z) => z.id !== id);
    });
  }

  // ---------------- RepositorioConfiguracion ----------------
  obtenerConfiguracion() {
    return this.leer((db) => ({ ...CONFIGURACION, ...db.configuracion }));
  }
  async guardarConfiguracion(c: Configuracion) {
    await this.escribir((db) => {
      db.configuracion = c;
    });
  }
}

/** Vista de AlmacenJson como RepositorioConfiguracion (nombres de método del puerto). */
export function repoConfiguracion(a: AlmacenJson): RepositorioConfiguracion {
  return { obtener: () => a.obtenerConfiguracion(), guardar: (c) => a.guardarConfiguracion(c) };
}

/** Vista de AlmacenJson como RepositorioZonas. */
export function repoZonas(a: AlmacenJson): RepositorioZonas {
  return {
    listar: (s) => a.listar(s),
    obtener: (id) => a.obtener(id),
    guardar: (z) => a.guardar(z),
    eliminar: (id) => a.eliminar(id),
  };
}

class RepoPedidos implements RepositorioDePedidos {
  constructor(private a: AlmacenJson) {}

  async guardar(pedido: PedidoProps) {
    await this.a.escribir((db) => {
      const i = db.pedidos.findIndex((p) => p.id === pedido.id);
      if (i >= 0) db.pedidos[i] = pedido;
      else db.pedidos.push(pedido);
    });
  }
  obtener(id: string) {
    return this.a.leer((db) => db.pedidos.find((p) => p.id === id) ?? null);
  }
  listar(f: FiltroPedidos) {
    return this.a.leer((db) =>
      db.pedidos.filter(
        (p) =>
          (!f.sedeId || p.sedeId === f.sedeId) &&
          (!f.estados || f.estados.includes(p.estado)) &&
          (!f.modalidad || p.modalidad === f.modalidad) &&
          (!f.clienteTelefono || p.clienteTelefono === f.clienteTelefono) &&
          (!f.desde || p.creadoEn >= f.desde.toISOString()) &&
          (!f.hasta || p.creadoEn < f.hasta.toISOString()),
      ),
    );
  }
  siguienteCodigo(sede: Sede) {
    return this.a.escribir((db) => {
      const n = (db.contadores[sede.id] ?? 0) + 1;
      db.contadores[sede.id] = n;
      return `${sede.prefijo}-${String(n).padStart(4, "0")}`;
    });
  }
}

class RepoConversaciones implements RepositorioConversaciones {
  constructor(private a: AlmacenJson) {}

  obtener(telefono: string) {
    return this.a.leer((db) => db.conversaciones.find((c) => c.telefono === telefono) ?? null);
  }
  async guardar(c: Conversacion) {
    await this.a.escribir((db) => {
      const i = db.conversaciones.findIndex((x) => x.telefono === c.telefono);
      if (i >= 0) db.conversaciones[i] = c;
      else db.conversaciones.push(c);
    });
  }
  listar() {
    return this.a.leer((db) => db.conversaciones);
  }
  async eliminar(telefono: string) {
    await this.a.escribir((db) => {
      db.conversaciones = db.conversaciones.filter((c) => c.telefono !== telefono);
    });
  }
  marcarProcesado(idMensaje: string) {
    return this.a.escribir((db) => {
      if (db.procesados.includes(idMensaje)) return true;
      db.procesados.push(idMensaje);
      if (db.procesados.length > 1000) db.procesados.splice(0, db.procesados.length - 1000);
      return false;
    });
  }
}
