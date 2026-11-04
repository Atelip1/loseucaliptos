// Puertos (interfaces) que necesita la capa de aplicación. Los adaptadores de infraestructura
// los implementan (inversión de dependencias, RNF14 / EC05).
import type { PedidoProps } from "@/domain/pedido";
import type { EstadoPedido, Modalidad, Plato, Sede, Ubicacion, Zona } from "@/domain/tipos";

// ---------- Modelos de la aplicación ----------

export interface Configuracion {
  nombreRestaurante: string;
  apertura: string; // "10:00"
  cierre: string; // "17:00"
  zonaHoraria: string; // "America/Lima"
  /** Solo para pruebas: acepta pedidos fuera de horario. */
  ignorarHorario: boolean;
  mensajeBienvenida: string;
  textoPagos: string;
  textoHorario: string;
  tiempoObjetivoCocinaMin: number;
  tiempoEstimadoMin: Record<Modalidad, number>;
}

export interface LineaCarrito {
  platoId: string;
  cantidad: number;
  observacion?: string;
}

export interface MensajeChat {
  de: "cliente" | "bot" | "personal";
  texto: string;
  fecha: string;
  ubicacion?: Ubicacion;
  imagen?: string;
}

export type Paso =
  | "CONSENTIMIENTO"
  | "LIBRE"
  | "ACLARACION"
  | "MODALIDAD"
  | "SEDE"
  | "ZONA"
  | "DIRECCION"
  | "REFERENCIA"
  | "UBICACION"
  | "NOMBRE"
  | "RESUMEN"
  | "CONFIRMAR_CANCELACION";

export interface AclaracionPendiente {
  cantidad: number;
  observacion?: string;
  candidatos: string[]; // ids de platos
}

export interface Conversacion {
  telefono: string;
  nombre?: string;
  consentimiento: boolean;
  paso: Paso;
  carrito: LineaCarrito[];
  modalidad?: Modalidad;
  sedeId?: string;
  zonaId?: string;
  direccion?: string;
  referencia?: string;
  ubicacion?: Ubicacion;
  ubicacionOmitida?: boolean;
  aclaracion?: AclaracionPendiente;
  /** Primer mensaje con un pedido, recibido antes del consentimiento; se procesa al aceptarlo. */
  textoPendiente?: string;
  pedidoACancelar?: string;
  intentosFallidos: number;
  derivada: boolean;
  motivoDerivacion?: string;
  derivadaEn?: string;
  /** Pedido en curso de modificación (HU23): se cancela al confirmar el nuevo. */
  pedidoAReemplazar?: string;
  mensajes: MensajeChat[];
  creadaEn: string;
  actualizadaEn: string;
}

export interface FiltroPedidos {
  sedeId?: string;
  estados?: EstadoPedido[];
  modalidad?: Modalidad;
  desde?: Date;
  hasta?: Date;
  clienteTelefono?: string;
}

// ---------- Puertos de salida (persistencia) ----------

export interface RepositorioCarta {
  listarSedes(): Promise<Sede[]>;
  obtenerSede(id: string): Promise<Sede | null>;
  listarPlatos(): Promise<Plato[]>;
  obtenerPlato(id: string): Promise<Plato | null>;
  guardarPlato(plato: Plato): Promise<void>;
  /** Ids de platos agotados en la sede (RN07, RN13). */
  agotados(sedeId: string): Promise<Set<string>>;
  marcarAgotado(platoId: string, sedeId: string, agotado: boolean): Promise<void>;
}

export interface RepositorioZonas {
  listar(sedeId?: string): Promise<Zona[]>;
  obtener(id: string): Promise<Zona | null>;
  guardar(zona: Zona): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export interface RepositorioDePedidos {
  guardar(pedido: PedidoProps): Promise<void>;
  obtener(id: string): Promise<PedidoProps | null>;
  listar(filtro: FiltroPedidos): Promise<PedidoProps[]>;
  siguienteCodigo(sede: Sede): Promise<string>;
}

export interface RepositorioConversaciones {
  obtener(telefono: string): Promise<Conversacion | null>;
  guardar(c: Conversacion): Promise<void>;
  listar(): Promise<Conversacion[]>;
  eliminar(telefono: string): Promise<void>;
  /** Idempotencia del webhook (RNF05): devuelve true si el id ya fue procesado. */
  marcarProcesado(idMensaje: string): Promise<boolean>;
}

export interface RepositorioConfiguracion {
  obtener(): Promise<Configuracion>;
  guardar(c: Configuracion): Promise<void>;
}

// ---------- Puertos de salida (servicios externos) ----------

export interface Mensajeria {
  enviarTexto(telefono: string, texto: string): Promise<void>;
}

export interface Reloj {
  ahora(): Date;
}

export interface GeneradorIds {
  nuevo(): string;
}

// ---------- Puerto del servicio de interpretación (IA) ----------

export interface PlatoCarta {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  alias: string[];
}

export interface ItemInterpretado {
  texto: string;
  cantidad: number;
  observacion?: string;
  cantidadExplicita?: boolean;
  platoId?: string; // si se identificó un único plato
  candidatos?: string[]; // si el mensaje es ambiguo
}

export type TemaFaq = "HORARIO" | "UBICACION" | "DELIVERY" | "PAGOS";

export type Intencion =
  | { tipo: "SALUDO" }
  | { tipo: "VER_CARTA" }
  | { tipo: "FAQ"; tema: TemaFaq }
  | { tipo: "PREGUNTA_PLATO"; platoId?: string; consulta: string }
  | { tipo: "PEDIR"; items: ItemInterpretado[] }
  | { tipo: "QUITAR"; items: ItemInterpretado[] }
  | { tipo: "VER_CARRITO" }
  | { tipo: "TERMINAR" } // "eso es todo", "listo"
  | { tipo: "CONFIRMAR" }
  | { tipo: "NEGAR" }
  | { tipo: "HUMANO" }
  | { tipo: "ESTADO_PEDIDO" }
  | { tipo: "CANCELAR_PEDIDO" }
  | { tipo: "MODIFICAR_PEDIDO" }
  | { tipo: "GRACIAS" }
  | { tipo: "NO_ENTENDIDO" };

export interface ServicioDeInterpretacion {
  interpretar(texto: string, carta: PlatoCarta[]): Promise<Intencion>;
}
