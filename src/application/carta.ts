// Casos de uso de la carta (HU01, HU16): comandos y consultas.
import { ErrorDeDominio, validarPrecio } from "@/domain/dinero";
import type { Plato } from "@/domain/tipos";
import type { Dependencias } from "./dependencias";

export interface PlatoConDisponibilidad extends Plato {
  agotado: boolean;
}

export interface DatosPlato {
  nombre: string;
  categoria: string;
  descripcion?: string;
  precio: number; // céntimos
  alias?: string[];
  activo?: boolean;
  foto?: string;
}

export class ServicioCarta {
  constructor(private d: Dependencias) {}

  // ----- Consultas -----

  /** VerCarta: platos activos con su disponibilidad en la sede. */
  async verCarta(sedeId?: string, incluirInactivos = false): Promise<PlatoConDisponibilidad[]> {
    const platos = await this.d.carta.listarPlatos();
    const agotados = sedeId ? await this.d.carta.agotados(sedeId) : new Set<string>();
    return platos
      .filter((p) => incluirInactivos || p.activo)
      .map((p) => ({ ...p, agotado: agotados.has(p.id) }));
  }

  /**
   * Platos que se pueden ofrecer: activos y no agotados (RN07). Sin sede, un plato se ofrece
   * si está disponible en al menos una sede.
   */
  async disponibles(sedeId?: string): Promise<Plato[]> {
    const platos = (await this.d.carta.listarPlatos()).filter((p) => p.activo);
    if (sedeId) {
      const agotados = await this.d.carta.agotados(sedeId);
      return platos.filter((p) => !agotados.has(p.id));
    }
    const sedes = await this.d.carta.listarSedes();
    const agotadosPorSede = await Promise.all(sedes.map((s) => this.d.carta.agotados(s.id)));
    return platos.filter((p) => agotadosPorSede.some((a) => !a.has(p.id)));
  }

  // ----- Comandos -----

  async crearPlato(datos: DatosPlato): Promise<Plato> {
    const plato: Plato = { id: this.d.ids.nuevo(), ...this.normalizar(datos) };
    await this.d.carta.guardarPlato(plato);
    return plato;
  }

  async actualizarPlato(id: string, datos: Partial<DatosPlato>): Promise<Plato> {
    const actual = await this.d.carta.obtenerPlato(id);
    if (!actual) throw new ErrorDeDominio("El plato no existe.");
    const plato: Plato = { ...actual, ...this.normalizar({ ...actual, ...datos }) };
    await this.d.carta.guardarPlato(plato);
    return plato;
  }

  async marcarAgotado(platoId: string, sedeId: string, agotado: boolean): Promise<void> {
    if (!(await this.d.carta.obtenerPlato(platoId))) throw new ErrorDeDominio("El plato no existe.");
    if (!(await this.d.carta.obtenerSede(sedeId))) throw new ErrorDeDominio("La sede no existe.");
    await this.d.carta.marcarAgotado(platoId, sedeId, agotado);
  }

  private normalizar(d: DatosPlato) {
    const nombre = d.nombre?.trim();
    if (!nombre) throw new ErrorDeDominio("El nombre del plato es obligatorio.");
    validarPrecio(d.precio);
    return {
      nombre,
      categoria: d.categoria?.trim() || "Otros",
      descripcion: d.descripcion?.trim() ?? "",
      precio: d.precio,
      alias: (d.alias ?? []).map((a) => a.trim()).filter(Boolean),
      activo: d.activo ?? true,
      foto: d.foto,
    };
  }
}
