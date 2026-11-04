// Servicio de mensajes salientes: registra cada mensaje en la conversación (historial visible en el
// panel de atención y en el simulador) y lo envía por el adaptador de mensajería (WhatsApp).
import type { Dependencias } from "./dependencias";
import type { Conversacion, MensajeChat } from "./puertos";

export const LIMITE_HISTORIAL = 200;

export function conversacionNueva(telefono: string, ahora: Date, nombre?: string): Conversacion {
  const fecha = ahora.toISOString();
  return {
    telefono,
    nombre,
    consentimiento: false,
    paso: "LIBRE",
    carrito: [],
    intentosFallidos: 0,
    derivada: false,
    mensajes: [],
    creadaEn: fecha,
    actualizadaEn: fecha,
  };
}

export function agregarAlHistorial(c: Conversacion, m: MensajeChat) {
  c.mensajes.push(m);
  if (c.mensajes.length > LIMITE_HISTORIAL) c.mensajes.splice(0, c.mensajes.length - LIMITE_HISTORIAL);
  c.actualizadaEn = m.fecha;
}

export class ServicioMensajes {
  constructor(private d: Dependencias) {}

  /** Envía un mensaje fuera del flujo de conversación (notificaciones o respuesta del personal). */
  async enviar(telefono: string, texto: string, de: "bot" | "personal" = "bot"): Promise<void> {
    const ahora = this.d.reloj.ahora();
    const c = (await this.d.conversaciones.obtener(telefono)) ?? conversacionNueva(telefono, ahora);
    agregarAlHistorial(c, { de, texto, fecha: ahora.toISOString() });
    await this.d.conversaciones.guardar(c);
    await this.enviarSinRegistrar(telefono, texto);
  }

  async enviarSinRegistrar(telefono: string, texto: string): Promise<void> {
    try {
      await this.d.mensajeria.enviarTexto(telefono, texto);
    } catch (e) {
      // Un fallo de WhatsApp no debe perder el pedido ni romper el flujo (RNF05).
      console.error("[mensajeria] no se pudo enviar el mensaje", e);
    }
  }
}
