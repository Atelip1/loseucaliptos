// Configuración de zonas de delivery por sede (HU24, RF24).
import { ErrorDeDominio } from "@/domain/dinero";
import type { Zona } from "@/domain/tipos";
import type { Dependencias } from "./dependencias";

export interface DatosZona {
  sedeId: string;
  nombre: string;
  tarifa: number;
  pedidoMinimo: number;
  activa?: boolean;
}

export class ServicioZonas {
  constructor(private d: Dependencias) {}

  listar(sedeId?: string) {
    return this.d.zonas.listar(sedeId);
  }

  async crear(datos: DatosZona): Promise<Zona> {
    const zona: Zona = { id: this.d.ids.nuevo(), ...(await this.validar(datos)) };
    await this.d.zonas.guardar(zona);
    return zona;
  }

  async actualizar(id: string, datos: Partial<DatosZona>): Promise<Zona> {
    const actual = await this.d.zonas.obtener(id);
    if (!actual) throw new ErrorDeDominio("La zona no existe.");
    const zona: Zona = { id, ...(await this.validar({ ...actual, ...datos })) };
    await this.d.zonas.guardar(zona);
    return zona;
  }

  eliminar(id: string) {
    return this.d.zonas.eliminar(id);
  }

  private async validar(d: DatosZona) {
    if (!(await this.d.carta.obtenerSede(d.sedeId))) throw new ErrorDeDominio("La sede no existe.");
    const nombre = d.nombre?.trim();
    if (!nombre) throw new ErrorDeDominio("El nombre de la zona es obligatorio.");
    if (!Number.isInteger(d.tarifa) || d.tarifa < 0) throw new ErrorDeDominio("Tarifa no válida.");
    if (!Number.isInteger(d.pedidoMinimo) || d.pedidoMinimo < 0) throw new ErrorDeDominio("Pedido mínimo no válido.");
    return { sedeId: d.sedeId, nombre, tarifa: d.tarifa, pedidoMinimo: d.pedidoMinimo, activa: d.activa ?? true };
  }
}
