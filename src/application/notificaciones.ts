// Textos de las notificaciones automáticas al cliente en cada cambio de estado (HU11, RF19).
import type { PedidoProps } from "@/domain/pedido";

export function textoNotificacion(p: PedidoProps): string | null {
  const cod = `*${p.codigo}*`;
  switch (p.estado) {
    case "EN_PREPARACION":
      return `👩‍🍳 Tu pedido ${cod} ya está en preparación.`;
    case "LISTO":
      if (p.modalidad === "DELIVERY") return `✅ Tu pedido ${cod} está listo y pronto saldrá a reparto.`;
      if (p.modalidad === "PARA_LLEVAR") return `✅ Tu pedido ${cod} está listo. ¡Puedes pasar a recogerlo!`;
      return `✅ Tu pedido ${cod} está listo. En un momento te lo servimos.`;
    case "EN_CAMINO":
      return `🛵 Tu pedido ${cod} va en camino${p.repartidor ? ` con ${p.repartidor}` : ""}.`;
    case "ENTREGADO":
      return `🙌 Tu pedido ${cod} fue entregado. ¡Gracias por preferir Los Eucaliptos!`;
    case "CANCELADO":
      return `❌ Tu pedido ${cod} fue cancelado por el restaurante. Motivo: ${p.motivoCancelacion ?? "—"}. Si tienes dudas, escribe *persona*.`;
    default:
      return null;
  }
}
