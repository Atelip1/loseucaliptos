// Adaptadores de salida de mensajería y utilidades del webhook de WhatsApp Business Platform.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Mensajeria } from "@/application/puertos";

/** Envía mensajes de texto con la Cloud API de Meta. */
export class MensajeriaWhatsApp implements Mensajeria {
  constructor(
    private token: string,
    private phoneNumberId: string,
    private version = "v21.0",
  ) {}

  async enviarTexto(telefono: string, texto: string): Promise<void> {
    const resp = await fetch(`https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: { body: texto.slice(0, 4096) },
      }),
    });
    if (!resp.ok) throw new Error(`WhatsApp respondió ${resp.status}: ${await resp.text()}`);
  }
}

/** Sin credenciales: los mensajes solo quedan en el historial (visible en /simulador). */
export class MensajeriaSimulada implements Mensajeria {
  async enviarTexto(): Promise<void> {}
}

/** EC04: valida la cabecera X-Hub-Signature-256 con el App Secret de Meta. */
export function firmaValida(cuerpo: string, firma: string | null, appSecret: string): boolean {
  if (!firma?.startsWith("sha256=")) return false;
  const esperada = createHmac("sha256", appSecret).update(cuerpo, "utf8").digest("hex");
  const a = Buffer.from(firma.slice(7), "hex");
  const b = Buffer.from(esperada, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface MensajeWebhook {
  id: string;
  telefono: string;
  nombrePerfil?: string;
  texto?: string;
  ubicacion?: { lat: number; lng: number };
  imagen?: string; // "wa-media:<id>"
}

/** Extrae los mensajes del payload del webhook de WhatsApp Cloud API. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extraerMensajes(payload: any): MensajeWebhook[] {
  const salida: MensajeWebhook[] = [];
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const nombres = new Map<string, string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (value?.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name]),
      );
      for (const m of value?.messages ?? []) {
        const base = { id: m.id, telefono: m.from, nombrePerfil: nombres.get(m.from) };
        if (m.type === "text") salida.push({ ...base, texto: m.text?.body ?? "" });
        else if (m.type === "location") salida.push({ ...base, ubicacion: { lat: m.location.latitude, lng: m.location.longitude } });
        else if (m.type === "image") salida.push({ ...base, imagen: `wa-media:${m.image?.id}`, texto: m.image?.caption });
        else if (m.type === "interactive") salida.push({ ...base, texto: m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "" });
        else if (m.type === "button") salida.push({ ...base, texto: m.button?.text ?? "" });
        else salida.push({ ...base, texto: "" });
      }
    }
  }
  return salida;
}
