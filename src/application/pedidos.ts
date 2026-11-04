// Casos de uso de pedidos (CQRS): los comandos pasan por el agregado Pedido; las consultas leen
// vistas simples para cada panel (cocina, caja, delivery).
import { ErrorDeDominio } from "@/domain/dinero";
import { Pedido, type DatosEntrega, type LineaPedido, type PedidoProps } from "@/domain/pedido";
import type { Canal, EstadoPedido, MedioPago, Modalidad } from "@/domain/tipos";
import { ETIQUETA_MEDIO, MEDIOS_PAGO } from "@/domain/tipos";
import type { Dependencias } from "./dependencias";
import { fechaLocal } from "./horario";
import { ServicioMensajes } from "./mensajes";
import { textoNotificacion } from "./notificaciones";
import type { LineaCarrito } from "./puertos";

export interface ComandoRegistrarPedido {
  sedeId: string;
  canal: Canal;
  modalidad: Modalidad;
  lineas: LineaCarrito[];
  clienteTelefono?: string;
  clienteNombre?: string;
  mesa?: string;
  zonaId?: string;
  entrega?: Omit<DatosEntrega, "zonaId" | "zonaNombre">;
  usuario: string;
}

export interface CierreDeCaja {
  sedeId: string;
  fecha: string;
  porMedio: { medio: MedioPago; etiqueta: string; cantidad: number; total: number }[];
  totalCobrado: number;
  pedidosCobrados: number;
  pendientesDeCobro: number;
  cancelados: number;
}

export class ServicioPedidos {
  private mensajes: ServicioMensajes;

  constructor(private d: Dependencias) {
    this.mensajes = new ServicioMensajes(d);
  }

  // ================= Comandos =================

  /**
   * RegistrarPedido: valoriza las líneas SIEMPRE con los precios de la base de datos (RN01) y
   * rechaza platos inexistentes, inactivos o agotados en la sede (RN07, RN13).
   */
  async registrar(cmd: ComandoRegistrarPedido): Promise<PedidoProps> {
    const sede = await this.d.carta.obtenerSede(cmd.sedeId);
    if (!sede) throw new ErrorDeDominio("La sede no existe.");
    const lineas = await this.valorizar(cmd.lineas, cmd.sedeId);

    let zona = null;
    let entrega: DatosEntrega | undefined;
    if (cmd.modalidad === "DELIVERY") {
      zona = cmd.zonaId ? await this.d.zonas.obtener(cmd.zonaId) : null;
      if (!zona || !zona.activa) throw new ErrorDeDominio("La zona de delivery no es válida.");
      if (!cmd.entrega) throw new ErrorDeDominio("Faltan los datos de entrega.");
      entrega = { ...cmd.entrega, zonaId: zona.id, zonaNombre: zona.nombre };
    }

    const pedido = Pedido.crear({
      id: this.d.ids.nuevo(),
      codigo: await this.d.pedidos.siguienteCodigo(sede),
      sedeId: sede.id,
      canal: cmd.canal,
      modalidad: cmd.modalidad,
      lineas,
      clienteTelefono: cmd.clienteTelefono,
      clienteNombre: cmd.clienteNombre,
      mesa: cmd.mesa,
      entrega,
      zona,
      usuario: cmd.usuario,
      ahora: this.d.reloj.ahora(),
    });
    await this.d.pedidos.guardar(pedido.datos);
    return pedido.datos;
  }

  async valorizar(carrito: LineaCarrito[], sedeId: string): Promise<LineaPedido[]> {
    const agotados = await this.d.carta.agotados(sedeId);
    const lineas: LineaPedido[] = [];
    for (const item of carrito) {
      const plato = await this.d.carta.obtenerPlato(item.platoId);
      if (!plato || !plato.activo) throw new ErrorDeDominio("Uno de los platos no existe en la carta.");
      if (agotados.has(plato.id)) throw new ErrorDeDominio(`"${plato.nombre}" está agotado en esta sede.`);
      lineas.push({
        platoId: plato.id,
        nombre: plato.nombre,
        precioUnitario: plato.precio,
        cantidad: item.cantidad,
        observacion: item.observacion?.trim() || undefined,
      });
    }
    return lineas;
  }

  /** CambiarEstado (CU13) y notificación automática al cliente (HU11). */
  async cambiarEstado(id: string, nuevo: EstadoPedido, usuario: string): Promise<PedidoProps> {
    const pedido = await this.cargar(id);
    pedido.cambiarEstado(nuevo, usuario, this.d.reloj.ahora());
    await this.d.pedidos.guardar(pedido.datos);
    await this.notificar(pedido.datos);
    return pedido.datos;
  }

  async cancelar(id: string, motivo: string, usuario: string, porCliente = false): Promise<PedidoProps> {
    const pedido = await this.cargar(id);
    pedido.cancelar(motivo, usuario, this.d.reloj.ahora(), porCliente);
    await this.d.pedidos.guardar(pedido.datos);
    if (!porCliente) await this.notificar(pedido.datos);
    return pedido.datos;
  }

  async asignarRepartidor(id: string, repartidor: string, usuario: string): Promise<PedidoProps> {
    const pedido = await this.cargar(id);
    pedido.asignarRepartidor(repartidor, usuario, this.d.reloj.ahora());
    await this.d.pedidos.guardar(pedido.datos);
    return pedido.datos;
  }

  async adjuntarComprobante(id: string, archivo: string): Promise<PedidoProps> {
    const pedido = await this.cargar(id);
    pedido.adjuntarComprobante(archivo, this.d.reloj.ahora());
    await this.d.pedidos.guardar(pedido.datos);
    return pedido.datos;
  }

  /** RegistrarCobro (HU12). Para Yape/Plin/transferencia, caja declara haber verificado el comprobante. */
  async registrarCobro(id: string, medio: MedioPago, usuario: string, comprobanteVerificado: boolean) {
    if (!MEDIOS_PAGO.includes(medio)) throw new ErrorDeDominio("Medio de pago no válido.");
    const pedido = await this.cargar(id);
    pedido.registrarCobro(medio, usuario, this.d.reloj.ahora(), comprobanteVerificado);
    await this.d.pedidos.guardar(pedido.datos);
    return pedido.datos;
  }

  // ================= Consultas =================

  async obtener(id: string) {
    return this.d.pedidos.obtener(id);
  }

  /** ListarPendientesPorSede para cocina: confirmados aún no listos, en orden de llegada. */
  async pendientesCocina(sedeId: string) {
    const lista = await this.d.pedidos.listar({ sedeId, estados: ["RECIBIDO", "EN_PREPARACION"] });
    return lista.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  }

  /** Pedidos de la sede sin cobrar y no cancelados (HU12). */
  async pendientesDeCobro(sedeId: string) {
    const lista = await this.d.pedidos.listar({ sedeId });
    return lista
      .filter((p) => !p.pago && p.estado !== "CANCELADO")
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  }

  /** Pedidos de delivery de la sede que aún no se entregan (HU14). */
  async deliveryActivos(sedeId: string) {
    const lista = await this.d.pedidos.listar({
      sedeId,
      modalidad: "DELIVERY",
      estados: ["RECIBIDO", "EN_PREPARACION", "LISTO", "EN_CAMINO"],
    });
    return lista.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  }

  async delDia(sedeId: string, fecha?: string) {
    const config = await this.d.configuracion.obtener();
    const dia = fecha ?? fechaLocal(this.d.reloj.ahora(), config.zonaHoraria);
    const lista = await this.d.pedidos.listar({ sedeId });
    return lista.filter((p) => fechaLocal(new Date(p.creadoEn), config.zonaHoraria) === dia);
  }

  /** Cierre de caja diario por sede con totales por medio de pago (RF22). */
  async cierreDeCaja(sedeId: string, fecha?: string): Promise<CierreDeCaja> {
    const config = await this.d.configuracion.obtener();
    const dia = fecha ?? fechaLocal(this.d.reloj.ahora(), config.zonaHoraria);
    const todos = await this.d.pedidos.listar({ sedeId });
    const cobradosHoy = todos.filter(
      (p) => p.pago && fechaLocal(new Date(p.pago.fecha), config.zonaHoraria) === dia,
    );
    const delDia = todos.filter((p) => fechaLocal(new Date(p.creadoEn), config.zonaHoraria) === dia);
    const porMedio = MEDIOS_PAGO.map((medio) => {
      const ps = cobradosHoy.filter((p) => p.pago!.medio === medio);
      return {
        medio,
        etiqueta: ETIQUETA_MEDIO[medio],
        cantidad: ps.length,
        total: ps.reduce((s, p) => s + p.pago!.monto, 0),
      };
    });
    return {
      sedeId,
      fecha: dia,
      porMedio,
      totalCobrado: porMedio.reduce((s, m) => s + m.total, 0),
      pedidosCobrados: cobradosHoy.length,
      pendientesDeCobro: delDia.filter((p) => !p.pago && p.estado !== "CANCELADO").length,
      cancelados: delDia.filter((p) => p.estado === "CANCELADO").length,
    };
  }

  // ================= Auxiliares =================

  private async cargar(id: string): Promise<Pedido> {
    const datos = await this.d.pedidos.obtener(id);
    if (!datos) throw new ErrorDeDominio("El pedido no existe.");
    return Pedido.desdeDatos(datos);
  }

  private async notificar(p: PedidoProps) {
    if (p.canal !== "WHATSAPP" || !p.clienteTelefono) return;
    const texto = textoNotificacion(p);
    if (texto) await this.mensajes.enviar(p.clienteTelefono, texto);
  }
}
