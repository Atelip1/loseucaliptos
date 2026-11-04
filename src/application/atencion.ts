// Atención humana de conversaciones derivadas (HU17, RF09, RN09).
import { ErrorDeDominio } from "@/domain/dinero";
import type { Dependencias } from "./dependencias";
import { ServicioMensajes } from "./mensajes";

export class ServicioAtencion {
  private mensajes: ServicioMensajes;

  constructor(private d: Dependencias) {
    this.mensajes = new ServicioMensajes(d);
  }

  async conversaciones(soloDerivadas: boolean) {
    const todas = await this.d.conversaciones.listar();
    return todas
      .filter((c) => !soloDerivadas || c.derivada)
      .sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn));
  }

  async responder(telefono: string, texto: string, usuario: string) {
    const c = await this.d.conversaciones.obtener(telefono);
    if (!c) throw new ErrorDeDominio("La conversación no existe.");
    if (!texto.trim()) throw new ErrorDeDominio("Escriba un mensaje.");
    if (!c.derivada) {
      // Si el personal escribe, toma la conversación y el bot se pausa.
      c.derivada = true;
      c.motivoDerivacion = `Tomada por ${usuario}`;
      c.derivadaEn = this.d.reloj.ahora().toISOString();
      await this.d.conversaciones.guardar(c);
    }
    await this.mensajes.enviar(telefono, texto.trim(), "personal");
  }

  async cerrar(telefono: string) {
    const c = await this.d.conversaciones.obtener(telefono);
    if (!c) throw new ErrorDeDominio("La conversación no existe.");
    c.derivada = false;
    c.motivoDerivacion = undefined;
    c.derivadaEn = undefined;
    c.intentosFallidos = 0;
    c.paso = "LIBRE";
    await this.d.conversaciones.guardar(c);
    await this.mensajes.enviar(telefono, "🤖 Gracias por tu paciencia. Vuelvo a atenderte yo, el asistente automático. ¿En qué más te ayudo?");
  }
}
