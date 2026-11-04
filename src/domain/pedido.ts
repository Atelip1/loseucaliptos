// Agregado Pedido (raíz) con sus líneas, eventos y pago.
// Aplica RN02, RN03, RN04 y RN06. El estado actual se guarda junto con el historial de eventos
// (EVENTO_PEDIDO), inspirado en Event Sourcing pero sin reconstruir el estado solo desde eventos.
import { calcularTotales } from "./delivery";
import { ErrorDeDominio, validarCantidad, validarPrecio } from "./dinero";
import type {
  Canal,
  EstadoPedido,
  MedioPago,
  Modalidad,
  Ubicacion,
  Zona,
} from "./tipos";
import { MEDIOS_DIGITALES } from "./tipos";

export interface LineaPedido {
  platoId: string;
  nombre: string;
  precioUnitario: number; // céntimos, tomado siempre de la carta (RN01)
  cantidad: number;
  observacion?: string;
}

export interface DatosEntrega {
  zonaId: string;
  zonaNombre: string;
  direccion: string;
  referencia: string;
  ubicacion?: Ubicacion;
}

export type TipoEvento =
  | "PedidoRegistrado"
  | "PedidoEnPreparacion"
  | "PedidoListo"
  | "PedidoEnCamino"
  | "PedidoEntregado"
  | "PedidoCancelado"
  | "CobroRegistrado"
  | "ComprobanteRecibido"
  | "RepartidorAsignado";

export interface EventoPedido {
  tipo: TipoEvento;
  fecha: string; // ISO
  usuario: string;
  detalle?: string;
}

export interface Pago {
  medio: MedioPago;
  monto: number;
  fecha: string;
  usuario: string;
}

export interface Comprobante {
  archivo: string; // ruta local o id de media de WhatsApp
  recibidoEn: string;
  verificado: boolean;
}

export interface PedidoProps {
  id: string;
  codigo: string;
  sedeId: string;
  canal: Canal;
  modalidad: Modalidad;
  clienteTelefono?: string;
  clienteNombre?: string;
  mesa?: string;
  lineas: LineaPedido[];
  entrega?: DatosEntrega;
  subtotal: number;
  costoDelivery: number;
  total: number;
  estado: EstadoPedido;
  creadoEn: string;
  actualizadoEn: string;
  eventos: EventoPedido[];
  pago?: Pago;
  comprobante?: Comprobante;
  repartidor?: string;
  motivoCancelacion?: string;
}

export interface DatosNuevoPedido {
  id: string;
  codigo: string;
  sedeId: string;
  canal: Canal;
  modalidad: Modalidad;
  lineas: LineaPedido[];
  clienteTelefono?: string;
  clienteNombre?: string;
  mesa?: string;
  entrega?: DatosEntrega;
  zona?: Zona | null;
  usuario: string;
  ahora: Date;
}

/** Ciclo de estados (RN04). "Cancelado" se maneja aparte. */
const TRANSICIONES: Record<EstadoPedido, EstadoPedido[]> = {
  RECIBIDO: ["EN_PREPARACION"],
  EN_PREPARACION: ["LISTO"],
  LISTO: ["EN_CAMINO", "ENTREGADO"],
  EN_CAMINO: ["ENTREGADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

const EVENTO_DE_ESTADO: Partial<Record<EstadoPedido, TipoEvento>> = {
  EN_PREPARACION: "PedidoEnPreparacion",
  LISTO: "PedidoListo",
  EN_CAMINO: "PedidoEnCamino",
  ENTREGADO: "PedidoEntregado",
};

export class Pedido {
  private constructor(private p: PedidoProps) {}

  static crear(d: DatosNuevoPedido): Pedido {
    if (d.lineas.length === 0) throw new ErrorDeDominio("El pedido no tiene platos.");
    for (const l of d.lineas) {
      validarCantidad(l.cantidad);
      validarPrecio(l.precioUnitario);
    }
    if (d.modalidad === "DELIVERY") {
      if (!d.entrega || !d.zona) throw new ErrorDeDominio("El delivery requiere zona y dirección.");
      if (d.zona.sedeId !== d.sedeId) throw new ErrorDeDominio("La zona no pertenece a la sede.");
      if (!d.entrega.direccion.trim()) throw new ErrorDeDominio("Falta la dirección de entrega.");
    }
    const totales = calcularTotales(d.lineas, d.modalidad === "DELIVERY" ? d.zona : null);
    if (d.modalidad === "DELIVERY" && d.zona && totales.subtotal < d.zona.pedidoMinimo) {
      throw new ErrorDeDominio("El pedido no alcanza el mínimo de la zona.");
    }
    const fecha = d.ahora.toISOString();
    return new Pedido({
      id: d.id,
      codigo: d.codigo,
      sedeId: d.sedeId,
      canal: d.canal,
      modalidad: d.modalidad,
      clienteTelefono: d.clienteTelefono,
      clienteNombre: d.clienteNombre,
      mesa: d.mesa,
      lineas: d.lineas.map((l) => ({ ...l })),
      entrega: d.modalidad === "DELIVERY" ? d.entrega : undefined,
      ...totales,
      estado: "RECIBIDO",
      creadoEn: fecha,
      actualizadoEn: fecha,
      eventos: [{ tipo: "PedidoRegistrado", fecha, usuario: d.usuario }],
    });
  }

  static desdeDatos(props: PedidoProps): Pedido {
    return new Pedido(structuredClone(props));
  }

  get datos(): PedidoProps {
    return structuredClone(this.p);
  }
  get id() {
    return this.p.id;
  }
  get estado() {
    return this.p.estado;
  }
  get modalidad() {
    return this.p.modalidad;
  }

  /** Un pedido está cerrado cuando fue entregado y cobrado (RN06). */
  get cerrado(): boolean {
    return this.p.estado === "ENTREGADO" && !!this.p.pago;
  }

  puedeCambiarA(nuevo: EstadoPedido): boolean {
    if (nuevo === "EN_CAMINO" && this.p.modalidad !== "DELIVERY") return false;
    if (nuevo === "ENTREGADO" && this.p.estado === "LISTO" && this.p.modalidad === "DELIVERY") {
      return false; // el delivery pasa antes por "En camino"
    }
    return TRANSICIONES[this.p.estado].includes(nuevo);
  }

  cambiarEstado(nuevo: EstadoPedido, usuario: string, ahora: Date): void {
    if (nuevo === "CANCELADO") throw new ErrorDeDominio("Use cancelar() indicando el motivo.");
    if (!this.puedeCambiarA(nuevo)) {
      throw new ErrorDeDominio(`No se puede pasar de ${this.p.estado} a ${nuevo}.`);
    }
    this.p.estado = nuevo;
    this.registrar(EVENTO_DE_ESTADO[nuevo]!, usuario, ahora);
  }

  /** RN03: el cliente solo cancela en "Recibido"; el personal puede hacerlo antes de "Entregado" con motivo. */
  cancelar(motivo: string, usuario: string, ahora: Date, porCliente: boolean): void {
    if (this.p.estado === "CANCELADO") throw new ErrorDeDominio("El pedido ya está cancelado.");
    if (this.p.estado === "ENTREGADO") throw new ErrorDeDominio("Un pedido entregado no se puede cancelar.");
    if (porCliente && this.p.estado !== "RECIBIDO") {
      throw new ErrorDeDominio("El pedido ya entró en preparación; solo el personal puede cancelarlo.");
    }
    if (!motivo.trim()) throw new ErrorDeDominio("Indique el motivo de la cancelación.");
    this.p.estado = "CANCELADO";
    this.p.motivoCancelacion = motivo.trim();
    this.registrar("PedidoCancelado", usuario, ahora, motivo.trim());
  }

  asignarRepartidor(nombre: string, usuario: string, ahora: Date): void {
    if (this.p.modalidad !== "DELIVERY") throw new ErrorDeDominio("Solo los pedidos de delivery tienen repartidor.");
    if (["ENTREGADO", "CANCELADO"].includes(this.p.estado)) throw new ErrorDeDominio("El pedido ya está cerrado.");
    if (!nombre.trim()) throw new ErrorDeDominio("Indique el nombre del repartidor.");
    this.p.repartidor = nombre.trim();
    this.registrar("RepartidorAsignado", usuario, ahora, nombre.trim());
  }

  adjuntarComprobante(archivo: string, ahora: Date): void {
    if (this.p.estado === "CANCELADO") throw new ErrorDeDominio("El pedido está cancelado.");
    if (this.p.pago) throw new ErrorDeDominio("El pedido ya fue cobrado.");
    this.p.comprobante = { archivo, recibidoEn: ahora.toISOString(), verificado: false };
    this.registrar("ComprobanteRecibido", "cliente", ahora);
  }

  /** RN06: el pago digital solo es válido si caja verifica el comprobante. */
  registrarCobro(medio: MedioPago, usuario: string, ahora: Date, comprobanteVerificado = false): void {
    if (this.p.estado === "CANCELADO") throw new ErrorDeDominio("No se puede cobrar un pedido cancelado.");
    if (this.p.pago) throw new ErrorDeDominio("El pedido ya fue cobrado.");
    if (MEDIOS_DIGITALES.includes(medio) && !comprobanteVerificado) {
      throw new ErrorDeDominio("Verifique el comprobante del pago digital antes de registrar el cobro.");
    }
    if (this.p.comprobante && MEDIOS_DIGITALES.includes(medio)) this.p.comprobante.verificado = true;
    this.p.pago = { medio, monto: this.p.total, fecha: ahora.toISOString(), usuario };
    this.registrar("CobroRegistrado", usuario, ahora, medio);
  }

  private registrar(tipo: TipoEvento, usuario: string, ahora: Date, detalle?: string) {
    const fecha = ahora.toISOString();
    this.p.actualizadoEn = fecha;
    this.p.eventos.push({ tipo, fecha, usuario, detalle });
  }
}
