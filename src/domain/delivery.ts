// Servicio de dominio: cálculo del total con recargo de delivery y validación de pedido mínimo (RN05).
import type { Zona } from "./tipos";

export interface LineaValorizada {
  precioUnitario: number;
  cantidad: number;
}

export interface Totales {
  subtotal: number;
  costoDelivery: number;
  total: number;
}

export function calcularSubtotal(lineas: LineaValorizada[]): number {
  return lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
}

export function calcularTotales(lineas: LineaValorizada[], zona?: Zona | null): Totales {
  const subtotal = calcularSubtotal(lineas);
  const costoDelivery = zona ? zona.tarifa : 0;
  return { subtotal, costoDelivery, total: subtotal + costoDelivery };
}

/** Devuelve cuánto falta para llegar al pedido mínimo de la zona (0 si ya lo cumple). */
export function faltanteParaMinimo(subtotal: number, zona: Zona): number {
  return Math.max(0, zona.pedidoMinimo - subtotal);
}
