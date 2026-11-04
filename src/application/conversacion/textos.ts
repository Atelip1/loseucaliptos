// Mensajes y tono del chatbot (español peruano, cordial). RN10: siempre se identifica como asistente.
import { formatoSoles } from "@/domain/dinero";
import type { PedidoProps } from "@/domain/pedido";
import { ETIQUETA_ESTADO, ETIQUETA_MODALIDAD, type Plato, type Sede, type Zona } from "@/domain/tipos";
import type { Configuracion, LineaCarrito } from "../puertos";

export function bienvenida(config: Configuracion, nombre?: string): string {
  const saludo = nombre ? `¡Hola, ${nombre}! 👋` : "¡Hola! 👋";
  return `${saludo} ${config.mensajeBienvenida}\nSoy el *asistente automático* del ${config.nombreRestaurante}.`;
}

export const PEDIR_CONSENTIMIENTO =
  "Para tomar tu pedido necesito usar tu nombre, número y, si es delivery, tu dirección, solo para gestionar el pedido (Ley N.° 29733).\n¿Aceptas? Responde *SÍ* o *NO*.";

export const AYUDA =
  "Puedes escribirme cosas como:\n• *carta* para ver los platos\n• *2 arroz con pato y una chicha* para pedir\n• *¿qué lleva la carapulcra?*\n• *horario*, *ubicación*, *delivery* o *pagos*\n• *persona* para hablar con alguien del restaurante";

export function textoCarta(platos: Plato[]): string {
  if (!platos.length) return "Por ahora no tenemos platos disponibles. 🙏";
  const porCategoria = new Map<string, Plato[]>();
  for (const p of platos) {
    if (!porCategoria.has(p.categoria)) porCategoria.set(p.categoria, []);
    porCategoria.get(p.categoria)!.push(p);
  }
  const bloques = [...porCategoria.entries()].map(
    ([cat, ps]) => `*${cat}*\n${ps.map((p) => `• ${p.nombre} — ${formatoSoles(p.precio)}`).join("\n")}`,
  );
  return `📋 *Carta del día*\n\n${bloques.join("\n\n")}\n\nEscríbeme tu pedido, por ejemplo: *2 arroz con pato y una chicha*.`;
}

export function lineasCarrito(carrito: LineaCarrito[], platos: Map<string, Plato>): string {
  return carrito
    .map((l) => {
      const p = platos.get(l.platoId);
      const nombre = p?.nombre ?? "¿?";
      const sub = p ? ` — ${formatoSoles(p.precio * l.cantidad)}` : "";
      return `• ${l.cantidad} × ${nombre}${l.observacion ? ` (${l.observacion})` : ""}${sub}`;
    })
    .join("\n");
}

export function textoCarrito(carrito: LineaCarrito[], platos: Map<string, Plato>): string {
  if (!carrito.length) return "Tu carrito está vacío. Escribe *carta* para ver los platos.";
  const subtotal = carrito.reduce((s, l) => s + (platos.get(l.platoId)?.precio ?? 0) * l.cantidad, 0);
  return `🛒 *Tu pedido*\n${lineasCarrito(carrito, platos)}\nSubtotal: *${formatoSoles(subtotal)}*`;
}

export const PREGUNTA_ALGO_MAS = "¿Deseas algo más? Si ya es todo, escribe *listo*.";

export const PREGUNTA_MODALIDAD =
  "¿Cómo deseas tu pedido?\n1️⃣ Comer en el local\n2️⃣ Para llevar (recoges tú)\n3️⃣ Delivery";

export function preguntaSede(sedes: Sede[]): string {
  return `¿En qué sede?\n${sedes.map((s, i) => `${i + 1}️⃣ ${s.nombre} — ${s.direccion}`).join("\n")}`;
}

export function preguntaZona(zonas: Zona[], sedes: Map<string, Sede>): string {
  return `¿A qué zona enviamos tu pedido?\n${zonas
    .map(
      (z, i) =>
        `${i + 1}. ${z.nombre} — envío ${formatoSoles(z.tarifa)} (mínimo ${formatoSoles(z.pedidoMinimo)}) · sale de ${sedes.get(z.sedeId)?.nombre ?? ""}`,
    )
    .join("\n")}\nSi tu zona no aparece, escribe *otra*.`;
}

export interface DatosResumen {
  carrito: LineaCarrito[];
  platos: Map<string, Plato>;
  modalidad: keyof typeof ETIQUETA_MODALIDAD;
  sede: Sede;
  zona?: Zona | null;
  direccion?: string;
  referencia?: string;
  nombre?: string;
}

export function textoResumen(d: DatosResumen): string {
  const subtotal = d.carrito.reduce((s, l) => s + (d.platos.get(l.platoId)?.precio ?? 0) * l.cantidad, 0);
  const envio = d.modalidad === "DELIVERY" && d.zona ? d.zona.tarifa : 0;
  const partes = [
    "🧾 *Resumen de tu pedido*",
    lineasCarrito(d.carrito, d.platos),
    "",
    `Modalidad: ${ETIQUETA_MODALIDAD[d.modalidad]}`,
    `Sede: ${d.sede.nombre}`,
  ];
  if (d.modalidad === "DELIVERY") {
    partes.push(`Entrega: ${d.direccion} (${d.zona?.nombre})`, `Referencia: ${d.referencia || "—"}`);
  }
  if (d.nombre) partes.push(`A nombre de: ${d.nombre}`);
  partes.push("", `Subtotal: ${formatoSoles(subtotal)}`);
  if (envio) partes.push(`Delivery: ${formatoSoles(envio)}`);
  partes.push(`*Total: ${formatoSoles(subtotal + envio)}*`, "", "1️⃣ Confirmar\n2️⃣ Corregir\n3️⃣ Cancelar");
  return partes.join("\n");
}

export function textoConfirmado(p: PedidoProps, config: Configuracion): string {
  const min = config.tiempoEstimadoMin[p.modalidad];
  return [
    `✅ ¡Pedido confirmado! Tu código es *${p.codigo}*.`,
    `Total: *${formatoSoles(p.total)}* · Tiempo estimado: ${min}–${min + 10} min.`,
    "",
    `💳 ${config.textoPagos}`,
    "Si pagas con Yape o Plin, envíame aquí la *foto del comprobante*.",
    "",
    "Te avisaré cuando tu pedido cambie de estado. Mientras no entre a preparación puedes escribir *cancelar mi pedido* o *modificar mi pedido*.",
  ].join("\n");
}

export function textoEstado(p: PedidoProps): string {
  return `Tu pedido *${p.codigo}* está: *${ETIQUETA_ESTADO[p.estado]}* (${ETIQUETA_MODALIDAD[p.modalidad]}, ${formatoSoles(p.total)}).`;
}

export function textoUbicacion(sedes: Sede[]): string {
  return `📍 *Nuestras sedes*\n${sedes.map((s) => `• ${s.nombre}: ${s.direccion}`).join("\n")}`;
}

export function textoDelivery(zonas: Zona[], sedes: Map<string, Sede>): string {
  if (!zonas.length) return "Por ahora no tenemos zonas de delivery configuradas. Puedes pedir *para llevar*.";
  return `🛵 *Delivery*\n${zonas
    .map((z) => `• ${z.nombre}: ${formatoSoles(z.tarifa)} (pedido mínimo ${formatoSoles(z.pedidoMinimo)}) — desde ${sedes.get(z.sedeId)?.nombre ?? ""}`)
    .join("\n")}`;
}

export const DERIVACION =
  "🙋 Te comunico con una persona del restaurante. En breve te responderán por este mismo chat.";
