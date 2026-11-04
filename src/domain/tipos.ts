// Lenguaje ubicuo del dominio de pedidos (Restaurante Los Eucaliptos).
// Este módulo no importa nada de Next.js, Supabase, WhatsApp ni del proveedor de IA (RNF14).

export type EstadoPedido =
  | "RECIBIDO"
  | "EN_PREPARACION"
  | "LISTO"
  | "EN_CAMINO"
  | "ENTREGADO"
  | "CANCELADO";

export type Modalidad = "EN_LOCAL" | "PARA_LLEVAR" | "DELIVERY";

export type Canal = "WHATSAPP" | "PRESENCIAL";

export type MedioPago = "EFECTIVO" | "TARJETA" | "YAPE" | "PLIN" | "TRANSFERENCIA";

export const MEDIOS_PAGO: MedioPago[] = ["EFECTIVO", "TARJETA", "YAPE", "PLIN", "TRANSFERENCIA"];

/** Medios que requieren verificación del comprobante por caja (RN06). */
export const MEDIOS_DIGITALES: MedioPago[] = ["YAPE", "PLIN", "TRANSFERENCIA"];

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  RECIBIDO: "Recibido",
  EN_PREPARACION: "En preparación",
  LISTO: "Listo",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  EN_LOCAL: "En local",
  PARA_LLEVAR: "Para llevar",
  DELIVERY: "Delivery",
};

export const ETIQUETA_MEDIO: Record<MedioPago, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  YAPE: "Yape",
  PLIN: "Plin",
  TRANSFERENCIA: "Transferencia",
};

export interface Sede {
  id: string;
  nombre: string;
  direccion: string;
  prefijo: string; // prefijo del código de pedido, p. ej. "GP"
}

export interface Plato {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number; // en céntimos (S/ 1.00 = 100)
  alias: string[]; // otras formas en que los clientes lo piden ("chicha", "pato")
  activo: boolean;
  foto?: string;
}

/** Zona de delivery de una sede, con su tarifa y pedido mínimo (RN05, HU24). */
export interface Zona {
  id: string;
  sedeId: string;
  nombre: string;
  tarifa: number; // céntimos
  pedidoMinimo: number; // céntimos
  activa: boolean;
}

export interface Ubicacion {
  lat: number;
  lng: number;
}
