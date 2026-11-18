// Gestor del diálogo (CU02 Realizar pedido por WhatsApp). Mantiene el contexto de la conversación,
// usa el servicio de interpretación (IA) para entender mensajes libres y aplica las reglas del negocio
// antes de registrar: RN01, RN02, RN03, RN05, RN07, RN08, RN09, RN10, RN11, RN13.
import { faltanteParaMinimo } from "@/domain/delivery";
import { ErrorDeDominio, formatoSoles } from "@/domain/dinero";
import type { PedidoProps } from "@/domain/pedido";
import type { Modalidad, Plato, Sede, Ubicacion, Zona } from "@/domain/tipos";
import { ServicioCarta } from "../carta";
import type { Dependencias } from "../dependencias";
import { estaAbierto } from "../horario";
import { agregarAlHistorial, conversacionNueva } from "../mensajes";
import { ServicioPedidos } from "../pedidos";
import type { Configuracion, Conversacion, Intencion, ItemInterpretado, PlatoCarta } from "../puertos";
import { leerCantidad, normalizar, palabrasParecidas } from "./texto";
import * as T from "./textos";

export interface MensajeEntrante {
  telefono: string;
  nombrePerfil?: string;
  texto?: string;
  ubicacion?: Ubicacion;
  imagen?: string; // ruta o id del archivo recibido
  idMensaje?: string;
}

const MAX_INTENTOS = 2; // RN09

interface Contexto {
  c: Conversacion;
  r: string[]; // respuestas a enviar
  config: Configuracion;
  platos: Map<string, Plato>; // carta completa (activos)
}

export class GestorConversacion {
  private carta: ServicioCarta;
  private pedidos: ServicioPedidos;

  constructor(private d: Dependencias) {
    this.carta = new ServicioCarta(d);
    this.pedidos = new ServicioPedidos(d);
  }

  /** Procesa un mensaje entrante y devuelve las respuestas enviadas al cliente. */
  async procesar(e: MensajeEntrante): Promise<string[]> {
    if (e.idMensaje && (await this.d.conversaciones.marcarProcesado(e.idMensaje))) return []; // RNF05
    const ahora = this.d.reloj.ahora();
    const existente = await this.d.conversaciones.obtener(e.telefono);
    const c = existente ?? conversacionNueva(e.telefono, ahora);
    const config = await this.d.configuracion.obtener();
    const platos = new Map((await this.d.carta.listarPlatos()).filter((p) => p.activo).map((p) => [p.id, p]));
    const ctx: Contexto = { c, r: [], config, platos };

    agregarAlHistorial(c, {
      de: "cliente",
      texto: e.texto ?? (e.ubicacion ? "📍 Ubicación compartida" : e.imagen ? "🖼️ Imagen" : ""),
      fecha: ahora.toISOString(),
      ubicacion: e.ubicacion,
      imagen: e.imagen,
    });

    if (c.derivada) {
      // RN09: el chatbot no responde mientras un trabajador atiende la conversación.
      await this.d.conversaciones.guardar(c);
      return [];
    }

    try {
      if (!existente || c.mensajes.filter((m) => m.de === "cliente").length === 1) {
        await this.primerMensaje(ctx, e);
      } else {
        await this.manejar(ctx, e);
      }
    } catch (err) {
      console.error("[chatbot] error procesando mensaje", err);
      ctx.r.push("Uy, tuve un problema procesando tu mensaje. 🙏 Intenta de nuevo o escribe *persona*.");
    }

    for (const texto of ctx.r) agregarAlHistorial(c, { de: "bot", texto, fecha: this.d.reloj.ahora().toISOString() });
    await this.d.conversaciones.guardar(c);
    for (const texto of ctx.r) {
      try {
        await this.d.mensajeria.enviarTexto(c.telefono, texto);
      } catch (err) {
        console.error("[mensajeria] no se pudo enviar", err);
      }
    }
    return ctx.r;
  }

  // ---------------------------------------------------------------------------------------------

  private async primerMensaje(ctx: Contexto, e: MensajeEntrante) {
    const { c, r, config } = ctx;
    if (e.nombrePerfil && !c.nombre) c.nombre = e.nombrePerfil;
    r.push(T.bienvenida(config, c.nombre)); // RN10
    if (e.texto) {
      const intencion = await this.interpretar(ctx, e.texto);
      if (intencion.tipo === "PEDIR" || intencion.tipo === "VER_CARTA") c.textoPendiente = e.texto;
      if (intencion.tipo !== "PEDIR" && intencion.tipo !== "SALUDO" && intencion.tipo !== "NO_ENTENDIDO" && intencion.tipo !== "VER_CARTA") {
        // Responde primero la consulta (FAQ, pregunta de plato) y luego pide el consentimiento.
        await this.libre(ctx, intencion);
      }
    }
    c.paso = "CONSENTIMIENTO";
    r.push(T.PEDIR_CONSENTIMIENTO); // RN11
  }

  private async manejar(ctx: Contexto, e: MensajeEntrante) {
    const { c, r } = ctx;

    if (e.imagen) return this.recibirComprobante(ctx, e.imagen);
    if (e.ubicacion) {
      c.ubicacion = e.ubicacion;
      c.ubicacionOmitida = false;
      if (c.paso === "UBICACION") return this.avanzarCheckout(ctx);
      if (!["DIRECCION", "REFERENCIA"].includes(c.paso)) r.push("📍 Guardé tu ubicación; la usaré para tu delivery.");
      else r.push("📍 Guardé tu ubicación.");
      return;
    }

    const texto = (e.texto ?? "").trim();
    const n = normalizar(texto);
    if (!n) return;

    // Atajos globales en los pasos guiados
    if (c.paso !== "LIBRE" && /^(persona|humano|asesor|hablar con (una )?persona)$/.test(n)) {
      return this.derivar(ctx, "Solicitado por el cliente");
    }

    switch (c.paso) {
      case "CONSENTIMIENTO":
        return this.pasoConsentimiento(ctx, n);
      case "ACLARACION":
        return this.pasoAclaracion(ctx, n);
      case "MODALIDAD":
        return this.pasoModalidad(ctx, n);
      case "SEDE":
        return this.pasoSede(ctx, n);
      case "ZONA":
        return this.pasoZona(ctx, n);
      case "DIRECCION":
        if (this.esCancelacion(n)) return this.salirDelCheckout(ctx);
        if (texto.length < 5) return void r.push("Por favor, escribe tu dirección completa (calle, número, sector).");
        c.direccion = texto;
        return this.avanzarCheckout(ctx);
      case "REFERENCIA":
        if (this.esCancelacion(n)) return this.salirDelCheckout(ctx);
        c.referencia = texto;
        return this.avanzarCheckout(ctx);
      case "UBICACION":
        if (/^(omitir|no|saltar|no tengo|despues|sin ubicacion)$/.test(n)) {
          c.ubicacionOmitida = true;
          return this.avanzarCheckout(ctx);
        }
        return void r.push("Comparte tu ubicación con el clip 📎 → *Ubicación*, o escribe *omitir*.");
      case "NOMBRE":
        if (this.esCancelacion(n)) return this.salirDelCheckout(ctx);
        if (texto.length < 2) return void r.push("¿A nombre de quién registro el pedido?");
        c.nombre = texto.slice(0, 60);
        return this.avanzarCheckout(ctx);
      case "RESUMEN":
        return this.pasoResumen(ctx, n);
      case "CONFIRMAR_CANCELACION":
        return this.pasoConfirmarCancelacion(ctx, n);
      default:
        return this.libre(ctx, await this.interpretar(ctx, texto));
    }
  }

  // ------------------------------------ Paso libre (IA) ----------------------------------------

  private async interpretar(ctx: Contexto, texto: string): Promise<Intencion> {
    const carta: PlatoCarta[] = [...ctx.platos.values()].map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      descripcion: p.descripcion,
      alias: p.alias,
    }));
    return this.d.interprete.interpretar(texto, carta);
  }

  private async libre(ctx: Contexto, it: Intencion) {
    const { c, r, config } = ctx;
    if (it.tipo !== "NO_ENTENDIDO") c.intentosFallidos = 0;

    switch (it.tipo) {
      case "SALUDO":
        r.push(`¡Hola${c.nombre ? `, ${c.nombre}` : ""}! 😊 ¿Qué se te antoja hoy? Escribe *carta* para ver los platos.`);
        return;
      case "VER_CARTA":
        r.push(T.textoCarta(await this.carta.disponibles(c.sedeId)));
        return;
      case "FAQ":
        return this.responderFaq(ctx, it.tema);
      case "PREGUNTA_PLATO":
        return this.responderPlato(ctx, it.platoId);
      case "PEDIR":
        return this.agregarItems(ctx, it.items);
      case "QUITAR":
        return this.quitarItems(ctx, it.items);
      case "CAMBIAR_CANTIDAD":
        return this.cambiarCantidad(ctx, it.items);
      case "RECOMENDAR":
        return this.recomendar(ctx);
      case "VER_CARRITO":
        r.push(T.textoCarrito(c.carrito, ctx.platos));
        return;
      case "TERMINAR":
      case "CONFIRMAR":
      case "NEGAR":
        if (c.carrito.length) return this.avanzarCheckout(ctx);
        if (it.tipo === "CONFIRMAR") r.push("¡Genial! Escribe *carta* para ver los platos o dime directamente qué deseas.");
        else r.push("¡Gracias por escribirnos! Cuando quieras pedir, aquí estaré. 🌿");
        return;
      case "GRACIAS":
        r.push("¡Con gusto! 😊 Si necesitas algo más, aquí estoy.");
        return;
      case "HUMANO":
        return this.derivar(ctx, "Solicitado por el cliente");
      case "ESTADO_PEDIDO": {
        const p = await this.ultimoPedidoActivo(c.telefono);
        r.push(p ? T.textoEstado(p) : "No encuentro pedidos activos a tu nombre. ¿Deseas hacer uno? Escribe *carta*.");
        return;
      }
      case "CANCELAR_PEDIDO":
        return this.solicitarCancelacion(ctx);
      case "MODIFICAR_PEDIDO":
        return this.modificarPedido(ctx);
      case "NO_ENTENDIDO":
      default:
        c.intentosFallidos += 1;
        if (c.intentosFallidos >= MAX_INTENTOS) return this.derivar(ctx, "El chatbot no comprendió al cliente");
        r.push(`Disculpa, no te entendí bien. 🤔\n${T.AYUDA}`);
        void config;
    }
  }

  private async responderFaq(ctx: Contexto, tema: "HORARIO" | "UBICACION" | "DELIVERY" | "PAGOS") {
    const { r, config } = ctx;
    const sedes = await this.d.carta.listarSedes();
    if (tema === "HORARIO") r.push(`🕙 ${config.textoHorario}`);
    if (tema === "UBICACION") r.push(T.textoUbicacion(sedes));
    if (tema === "PAGOS") r.push(`💳 ${config.textoPagos}`);
    if (tema === "DELIVERY") {
      const zonas = (await this.d.zonas.listar()).filter((z) => z.activa);
      r.push(T.textoDelivery(zonas, new Map(sedes.map((s) => [s.id, s]))));
    }
  }

  private async responderPlato(ctx: Contexto, platoId?: string) {
    const { r, c } = ctx;
    const plato = platoId ? ctx.platos.get(platoId) : undefined;
    if (!plato) {
      r.push("¿Sobre qué plato quieres saber? Escribe *carta* para ver todos. 🍽️");
      return;
    }
    const disponibles = new Set((await this.carta.disponibles(c.sedeId)).map((p) => p.id));
    const estado = disponibles.has(plato.id) ? "" : "\n⚠️ Hoy está agotado.";
    r.push(`*${plato.nombre}* — ${formatoSoles(plato.precio)}\n${plato.descripcion || "Uno de nuestros platos de la casa."}${estado}\n\n¿Te animas? Escribe por ejemplo: *1 ${plato.nombre.toLowerCase()}*.`);
  }

  // ------------------------------------- Carrito -----------------------------------------------

  private async agregarItems(ctx: Contexto, items: ItemInterpretado[]) {
    const { c, r } = ctx;
    const disponibles = await this.carta.disponibles(c.sedeId);
    const idsDisponibles = new Set(disponibles.map((p) => p.id));
    const agregados: string[] = [];
    const avisos: string[] = [];
    let ambiguo: ItemInterpretado | null = null;

    for (const item of items) {
      if (item.platoId && ctx.platos.has(item.platoId)) {
        const plato = ctx.platos.get(item.platoId)!;
        if (!idsDisponibles.has(plato.id)) {
          avisos.push(`😔 *${plato.nombre}* está agotado por hoy. ${this.alternativas(plato, disponibles)}`);
          continue;
        }
        this.sumarAlCarrito(c, plato.id, item.cantidad, item.observacion);
        agregados.push(`${item.cantidad} × ${plato.nombre}${item.observacion ? ` (${item.observacion})` : ""}`);
      } else if (item.candidatos?.length) {
        const validos = item.candidatos.filter((id) => idsDisponibles.has(id));
        if (validos.length === 1) {
          const plato = ctx.platos.get(validos[0])!;
          this.sumarAlCarrito(c, plato.id, item.cantidad, item.observacion);
          agregados.push(`${item.cantidad} × ${plato.nombre}`);
        } else if (validos.length > 1 && !ambiguo) {
          ambiguo = { ...item, candidatos: validos };
        } else if (!validos.length) {
          avisos.push(`😔 No tenemos disponible "${item.texto}" por hoy.`);
        }
      } else {
        avisos.push(`😔 No encontré "${item.texto}" en nuestra carta. ${this.sugerencias(item.texto, disponibles)}`);
      }
    }

    if (agregados.length) r.push(`Anotado ✍️\n${agregados.map((a) => `• ${a}`).join("\n")}`);
    r.push(...avisos);

    if (ambiguo) {
      c.aclaracion = { cantidad: ambiguo.cantidad, observacion: ambiguo.observacion, candidatos: ambiguo.candidatos! };
      c.paso = "ACLARACION";
      r.push(this.preguntaAclaracion(ctx, ambiguo.texto));
      return;
    }
    if (agregados.length) r.push(`${T.textoCarrito(c.carrito, ctx.platos)}\n\n${T.PREGUNTA_ALGO_MAS}`);
  }

  private preguntaAclaracion(ctx: Contexto, texto: string): string {
    const ops = ctx.c.aclaracion!.candidatos.map((id, i) => `${i + 1}. ${ctx.platos.get(id)?.nombre} — ${formatoSoles(ctx.platos.get(id)?.precio ?? 0)}`);
    return `¿Qué preparación de "${texto}" deseas?\n${ops.join("\n")}\nResponde con el número.`;
  }

  private sumarAlCarrito(c: Conversacion, platoId: string, cantidad: number, observacion?: string) {
    const existente = c.carrito.find((l) => l.platoId === platoId && (l.observacion ?? "") === (observacion ?? ""));
    if (existente) existente.cantidad = Math.min(50, existente.cantidad + cantidad);
    else c.carrito.push({ platoId, cantidad: Math.min(50, cantidad), observacion });
  }

  private quitarItems(ctx: Contexto, items: ItemInterpretado[]) {
    const { c, r } = ctx;
    const quitados: string[] = [];
    for (const item of items) {
      const ids = item.platoId ? [item.platoId] : item.candidatos ?? [];
      const linea = c.carrito.find((l) => ids.includes(l.platoId));
      if (!linea) continue;
      const nombre = ctx.platos.get(linea.platoId)?.nombre ?? "";
      if (item.cantidadExplicita && item.cantidad < linea.cantidad) {
        linea.cantidad -= item.cantidad;
        quitados.push(`${item.cantidad} × ${nombre}`);
      } else {
        c.carrito = c.carrito.filter((l) => l !== linea);
        quitados.push(nombre);
      }
    }
    if (!quitados.length) r.push("No encontré ese plato en tu pedido.");
    else r.push(`Listo, quité: ${quitados.join(", ")}.`);
    r.push(T.textoCarrito(c.carrito, ctx.platos));
  }

  /** RF06: fija la cantidad de un plato del carrito ("que sean 3 chichas"); si no está, lo agrega. */
  private async cambiarCantidad(ctx: Contexto, items: ItemInterpretado[]) {
    const { c, r } = ctx;
    const nuevos: ItemInterpretado[] = [];
    const cambios: string[] = [];
    for (const item of items) {
      const ids = item.platoId ? [item.platoId] : item.candidatos ?? [];
      const linea = c.carrito.find((l) => ids.includes(l.platoId));
      if (!linea) {
        nuevos.push(item);
        continue;
      }
      linea.cantidad = Math.min(50, Math.max(1, item.cantidad));
      cambios.push(`${linea.cantidad} × ${ctx.platos.get(linea.platoId)?.nombre}`);
    }
    if (cambios.length) r.push(`Cambiado ✍️ ${cambios.join(", ")}.`);
    if (nuevos.length) return this.agregarItems(ctx, nuevos);
    r.push(`${T.textoCarrito(c.carrito, ctx.platos)}\n\n${T.PREGUNTA_ALGO_MAS}`);
  }

  private async recomendar(ctx: Contexto) {
    const disponibles = await this.carta.disponibles(ctx.c.sedeId);
    const casa = ["carapulcra", "arroz-pato", "pachamanca", "ceviche-pescado"]
      .map((id) => disponibles.find((p) => p.id === id))
      .filter((p): p is Plato => !!p);
    const lista = (casa.length ? casa : disponibles.slice(0, 4)).map((p) => `• *${p.nombre}* — ${formatoSoles(p.precio)}`);
    ctx.r.push(`⭐ Nuestras especialidades de la casa:\n${lista.join("\n")}\n\nAcompáñalo con una *chicha morada* bien helada. ¿Qué te provoca?`);
  }

  private alternativas(plato: Plato, disponibles: Plato[]): string {
    const misma = disponibles.filter((p) => p.categoria === plato.categoria && p.id !== plato.id).slice(0, 3);
    return misma.length ? `Te sugiero: ${misma.map((p) => p.nombre).join(", ")}.` : "Escribe *carta* para ver otras opciones.";
  }

  private sugerencias(texto: string, disponibles: Plato[]): string {
    const palabras = normalizar(texto).split(" ").filter((w) => w.length > 3);
    const parecidos = disponibles
      .filter((p) => normalizar(p.nombre).split(" ").some((w) => palabras.some((x) => palabrasParecidas(w, x) || w.startsWith(x.slice(0, 4)))))
      .slice(0, 3);
    return parecidos.length
      ? `¿Quizás quisiste decir: ${parecidos.map((p) => p.nombre).join(", ")}?`
      : "Escribe *carta* para ver lo que tenemos hoy.";
  }

  private async pasoAclaracion(ctx: Contexto, n: string) {
    const { c, r } = ctx;
    const acl = c.aclaracion!;
    if (this.esCancelacion(n) || n === "ninguno") {
      c.aclaracion = undefined;
      c.paso = "LIBRE";
      r.push(`Está bien. ${c.carrito.length ? T.textoCarrito(c.carrito, ctx.platos) : "¿Qué más deseas?"}`);
      return;
    }
    let elegido: string | undefined;
    const num = leerCantidad(n.split(" ")[0]);
    if (num && num >= 1 && num <= acl.candidatos.length) elegido = acl.candidatos[num - 1];
    if (!elegido) {
      const palabras = n.split(" ");
      elegido = acl.candidatos.find((id) => {
        const tokens = normalizar(ctx.platos.get(id)?.nombre ?? "").split(" ").filter((t) => t.length > 3);
        return tokens.some((t) => palabras.some((p) => palabrasParecidas(p, t))) &&
          !acl.candidatos.every((otro) => normalizar(ctx.platos.get(otro)?.nombre ?? "").split(" ").some((t) => tokens.includes(t) && palabras.includes(t)));
      });
    }
    if (!elegido) {
      c.intentosFallidos += 1;
      if (c.intentosFallidos >= MAX_INTENTOS) return this.derivar(ctx, "El chatbot no comprendió al cliente");
      r.push(`No te entendí. Responde con el número de la opción:\n${acl.candidatos.map((id, i) => `${i + 1}. ${ctx.platos.get(id)?.nombre}`).join("\n")}`);
      return;
    }
    c.intentosFallidos = 0;
    this.sumarAlCarrito(c, elegido, acl.cantidad, acl.observacion);
    c.aclaracion = undefined;
    c.paso = "LIBRE";
    r.push(`Anotado ✍️ ${acl.cantidad} × ${ctx.platos.get(elegido)?.nombre}\n\n${T.textoCarrito(c.carrito, ctx.platos)}\n\n${T.PREGUNTA_ALGO_MAS}`);
  }

  // ------------------------------------- Checkout ----------------------------------------------

  /** Pide el siguiente dato que falta para el pedido y, cuando está todo, muestra el resumen. */
  private async avanzarCheckout(ctx: Contexto) {
    const { c, r, config } = ctx;
    if (!c.carrito.length) {
      c.paso = "LIBRE";
      r.push("Tu carrito está vacío. Escribe *carta* para ver los platos.");
      return;
    }
    if (!estaAbierto(config, this.d.reloj.ahora())) {
      // RN08 (la programación de pedidos llega en el Sprint 8, HU21)
      c.paso = "LIBRE";
      r.push(`🌙 En este momento estamos cerrados. ${config.textoHorario}\nGuardé tu carrito: escríbenos dentro del horario y escribe *listo* para continuar.`);
      return;
    }
    if (!c.consentimiento) {
      c.paso = "CONSENTIMIENTO";
      r.push(T.PEDIR_CONSENTIMIENTO);
      return;
    }
    if (!c.modalidad) {
      c.paso = "MODALIDAD";
      r.push(T.PREGUNTA_MODALIDAD);
      return;
    }
    const sedes = await this.d.carta.listarSedes();

    if (c.modalidad === "DELIVERY") {
      const zona = c.zonaId ? await this.d.zonas.obtener(c.zonaId) : null;
      if (!zona || !zona.activa) {
        const zonas = (await this.d.zonas.listar()).filter((z) => z.activa);
        if (!zonas.length) {
          c.modalidad = undefined;
          c.paso = "MODALIDAD";
          r.push("Por ahora no tenemos delivery disponible. 😔 ¿Deseas *para llevar* o *comer en el local*?");
          r.push(T.PREGUNTA_MODALIDAD);
          return;
        }
        c.paso = "ZONA";
        r.push(T.preguntaZona(zonas, new Map(sedes.map((s) => [s.id, s]))));
        return;
      }
      c.sedeId = zona.sedeId; // la zona determina la sede que atiende (RF07)
      if (!(await this.verificarDisponibilidad(ctx))) return;
      const subtotal = c.carrito.reduce((s, l) => s + (ctx.platos.get(l.platoId)?.precio ?? 0) * l.cantidad, 0);
      const falta = faltanteParaMinimo(subtotal, zona); // RN05 / 8b
      if (falta > 0) {
        c.paso = "LIBRE";
        r.push(`El pedido mínimo para ${zona.nombre} es ${formatoSoles(zona.pedidoMinimo)}. Te faltan *${formatoSoles(falta)}*. ¿Agregas algo más? Luego escribe *listo*.`);
        return;
      }
      if (!c.direccion) {
        c.paso = "DIRECCION";
        r.push("📝 Escribe tu *dirección* de entrega (calle, número, sector).");
        return;
      }
      if (c.referencia === undefined) {
        c.paso = "REFERENCIA";
        r.push("¿Alguna *referencia* para encontrarte? (p. ej., frente al parque, portón verde)");
        return;
      }
      if (!c.ubicacion && !c.ubicacionOmitida) {
        c.paso = "UBICACION";
        r.push("📍 Si puedes, comparte tu *ubicación* (clip 📎 → Ubicación) para que el repartidor llegue sin problemas. O escribe *omitir*.");
        return;
      }
    } else {
      if (!c.sedeId) {
        if (sedes.length === 1) c.sedeId = sedes[0].id;
        else {
          c.paso = "SEDE";
          r.push(T.preguntaSede(sedes));
          return;
        }
      }
      if (!(await this.verificarDisponibilidad(ctx))) return;
    }

    if (!c.nombre) {
      c.paso = "NOMBRE";
      r.push("¿A nombre de quién registro el pedido?");
      return;
    }
    const sede = sedes.find((s) => s.id === c.sedeId)!;
    const zona = c.zonaId ? await this.d.zonas.obtener(c.zonaId) : null;
    c.paso = "RESUMEN";
    r.push(
      T.textoResumen({
        carrito: c.carrito,
        platos: ctx.platos,
        modalidad: c.modalidad,
        sede,
        zona,
        direccion: c.direccion,
        referencia: c.referencia,
        nombre: c.nombre,
      }),
    );
  }

  /** RN07 / RN13: quita del carrito los platos agotados en la sede elegida. */
  private async verificarDisponibilidad(ctx: Contexto): Promise<boolean> {
    const { c, r } = ctx;
    const agotados = await this.d.carta.agotados(c.sedeId!);
    const fuera = c.carrito.filter((l) => agotados.has(l.platoId) || !ctx.platos.has(l.platoId));
    if (!fuera.length) return true;
    c.carrito = c.carrito.filter((l) => !fuera.includes(l));
    c.paso = "LIBRE";
    const sede = await this.d.carta.obtenerSede(c.sedeId!);
    r.push(`😔 En ${sede?.nombre} se agotó: ${fuera.map((l) => ctx.platos.get(l.platoId)?.nombre ?? "un plato").join(", ")}. Lo quité de tu pedido.`);
    r.push(c.carrito.length ? `${T.textoCarrito(c.carrito, ctx.platos)}\n\n${T.PREGUNTA_ALGO_MAS}` : "¿Deseas elegir otro plato? Escribe *carta*.");
    return false;
  }

  private pasoConsentimiento(ctx: Contexto, n: string) {
    const { c, r } = ctx;
    if (/^(si|sii+|acepto|ok|dale|claro|de acuerdo|ya|bueno|si acepto)\b/.test(n)) {
      c.consentimiento = true;
      c.paso = "LIBRE";
      r.push("¡Gracias! 🙌");
      const pendiente = c.textoPendiente;
      c.textoPendiente = undefined;
      if (pendiente) return this.interpretar(ctx, pendiente).then((it) => this.libre(ctx, it));
      if (c.carrito.length) return this.avanzarCheckout(ctx);
      r.push("¿Qué deseas pedir hoy? Escribe *carta* para ver los platos o dime directamente tu pedido. 🍽️");
      return;
    }
    if (/^(no|nop|no acepto)\b/.test(n)) {
      c.consentimiento = false;
      c.paso = "LIBRE";
      c.textoPendiente = undefined;
      r.push("Entendido. Puedo darte información de la carta, horarios y delivery, pero para registrar un pedido necesito tu consentimiento. Si cambias de opinión, escribe *listo* cuando quieras pedir.");
      return;
    }
    r.push(`Para continuar, responde *SÍ* o *NO*.\n${T.PEDIR_CONSENTIMIENTO}`);
  }

  private pasoModalidad(ctx: Contexto, n: string) {
    const { c, r } = ctx;
    if (this.esCancelacion(n)) return this.salirDelCheckout(ctx);
    let m: Modalidad | undefined;
    if (/^1\b|local|comer (aqui|alla|en el)|mesa/.test(n)) m = "EN_LOCAL";
    else if (/^2\b|llevar|recog|paso a|pasar/.test(n)) m = "PARA_LLEVAR";
    else if (/^3\b|delivery|domicilio|envi|reparto|traigan/.test(n)) m = "DELIVERY";
    if (!m) {
      r.push(`Elige una opción con el número:\n${T.PREGUNTA_MODALIDAD}`);
      return;
    }
    c.modalidad = m;
    if (m !== "DELIVERY") c.zonaId = undefined;
    return this.avanzarCheckout(ctx);
  }

  private async pasoSede(ctx: Contexto, n: string) {
    const { c, r } = ctx;
    if (this.esCancelacion(n)) return this.salirDelCheckout(ctx);
    const sedes = await this.d.carta.listarSedes();
    const sede = this.elegirOpcion(n, sedes, (s) => s.nombre);
    if (!sede) {
      r.push(T.preguntaSede(sedes));
      return;
    }
    c.sedeId = sede.id;
    return this.avanzarCheckout(ctx);
  }

  private async pasoZona(ctx: Contexto, n: string) {
    const { c, r } = ctx;
    if (this.esCancelacion(n)) return this.salirDelCheckout(ctx);
    const zonas = (await this.d.zonas.listar()).filter((z) => z.activa);
    if (/^(otra|ninguna|no esta|no aparece)/.test(n)) {
      // 8a: dirección fuera de las zonas → se ofrece para llevar
      c.modalidad = undefined;
      c.zonaId = undefined;
      c.paso = "MODALIDAD";
      r.push("Lo siento, por ahora no llegamos a esa zona. 😔 Puedes pedir *para llevar* o *comer en el local*.");
      r.push(T.PREGUNTA_MODALIDAD);
      return;
    }
    const zona = this.elegirOpcion(n, zonas, (z) => z.nombre);
    if (!zona) {
      const sedes = await this.d.carta.listarSedes();
      r.push(T.preguntaZona(zonas, new Map(sedes.map((s) => [s.id, s]))));
      return;
    }
    c.zonaId = zona.id;
    c.sedeId = zona.sedeId;
    return this.avanzarCheckout(ctx);
  }

  private async pasoResumen(ctx: Contexto, n: string) {
    const { c, r } = ctx;
    if (/^(1|si|confirm\w*|ok|dale|correcto|de acuerdo|listo|ya)\b/.test(n)) return this.confirmar(ctx);
    if (/^(2|corregir|correccion|cambiar|modificar|no)\b/.test(n)) {
      c.paso = "LIBRE";
      c.modalidad = undefined;
      c.zonaId = undefined;
      c.sedeId = undefined;
      c.direccion = undefined;
      c.referencia = undefined;
      r.push(`Claro, corrijamos. ${T.textoCarrito(c.carrito, ctx.platos)}\n\nPuedes *agregar* platos, escribir *quita 1 chicha*, o *listo* para continuar.`);
      return;
    }
    if (/^(3|cancelar|cancela|anular)\b/.test(n)) {
      this.limpiarPedidoEnCurso(c);
      r.push("Listo, cancelé el pedido en curso. Si deseas algo más, aquí estoy. 🌿");
      return;
    }
    r.push("Responde *1* para confirmar, *2* para corregir o *3* para cancelar.");
  }

  /** CU03: el pedido se registra solo tras la confirmación explícita (RN02). */
  private async confirmar(ctx: Contexto) {
    const { c, r, config } = ctx;
    if (!estaAbierto(config, this.d.reloj.ahora())) return this.avanzarCheckout(ctx);

    // HU23: si se está modificando un pedido, debe seguir en "Recibido".
    let anterior: PedidoProps | null = null;
    if (c.pedidoAReemplazar) {
      anterior = await this.d.pedidos.obtener(c.pedidoAReemplazar);
      if (!anterior || anterior.estado !== "RECIBIDO") {
        c.pedidoAReemplazar = undefined;
        r.push(`⚠️ Tu pedido anterior ya entró en preparación, así que no se pudo reemplazar. ${anterior ? T.textoEstado(anterior) : ""}\nSi deseas, este se registrará como un pedido adicional: responde *1* para confirmarlo o *3* para cancelarlo.`);
        return;
      }
    }

    let pedido: PedidoProps;
    try {
      pedido = await this.pedidos.registrar({
        sedeId: c.sedeId!,
        canal: "WHATSAPP",
        modalidad: c.modalidad!,
        lineas: c.carrito,
        clienteTelefono: c.telefono,
        clienteNombre: c.nombre,
        zonaId: c.zonaId,
        entrega:
          c.modalidad === "DELIVERY"
            ? { direccion: c.direccion ?? "", referencia: c.referencia ?? "", ubicacion: c.ubicacion }
            : undefined,
        usuario: "chatbot",
      });
    } catch (e) {
      if (e instanceof ErrorDeDominio) {
        c.paso = "LIBRE";
        r.push(`No pude registrar el pedido: ${e.message} Revisa tu carrito y escribe *listo* para intentarlo de nuevo.`);
        return;
      }
      throw e;
    }

    if (anterior) {
      try {
        await this.pedidos.cancelar(anterior.id, `Reemplazado por ${pedido.codigo} (modificado por el cliente)`, "cliente", true);
        r.push(`🔁 Tu pedido ${anterior.codigo} fue reemplazado por el nuevo.`);
      } catch {
        await this.pedidos.cancelar(pedido.id, "No se pudo reemplazar el pedido anterior", "chatbot", true);
        this.limpiarPedidoEnCurso(c);
        r.push(`⚠️ Tu pedido ${anterior.codigo} ya entró en preparación y no se pudo modificar. Escribe *persona* si necesitas ayuda.`);
        return;
      }
    }

    this.limpiarPedidoEnCurso(c);
    r.push(T.textoConfirmado(pedido, config));
  }

  private limpiarPedidoEnCurso(c: Conversacion) {
    c.paso = "LIBRE";
    c.carrito = [];
    c.modalidad = undefined;
    c.sedeId = undefined;
    c.zonaId = undefined;
    c.direccion = undefined;
    c.referencia = undefined;
    c.ubicacion = undefined;
    c.ubicacionOmitida = undefined;
    c.aclaracion = undefined;
    c.pedidoAReemplazar = undefined;
  }

  private salirDelCheckout(ctx: Contexto) {
    ctx.c.paso = "LIBRE";
    ctx.r.push(`De acuerdo. Tu carrito sigue guardado.\n${T.textoCarrito(ctx.c.carrito, ctx.platos)}\nEscribe *listo* cuando quieras continuar o *cancelar* para vaciarlo.`);
  }

  private esCancelacion(n: string) {
    return /^(cancelar|cancela|salir|atras|volver)$/.test(n);
  }

  private elegirOpcion<X>(n: string, opciones: X[], nombre: (x: X) => string): X | undefined {
    const num = leerCantidad(n.split(" ")[0]);
    if (num && num >= 1 && num <= opciones.length) return opciones[num - 1];
    const palabras = n.split(" ").filter((w) => w.length > 3);
    const encontradas = opciones.filter((o) =>
      normalizar(nombre(o)).split(" ").some((t) => t.length > 3 && palabras.some((p) => palabrasParecidas(p, t))),
    );
    return encontradas.length === 1 ? encontradas[0] : undefined;
  }

  // ---------------------------- Modificar / cancelar (HU23) ------------------------------------

  private async ultimoPedidoActivo(telefono: string): Promise<PedidoProps | null> {
    const lista = await this.d.pedidos.listar({ clienteTelefono: telefono });
    const activos = lista
      .filter((p) => p.estado !== "CANCELADO" && !(p.estado === "ENTREGADO" && p.pago))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
    return activos[0] ?? null;
  }

  private async solicitarCancelacion(ctx: Contexto) {
    const { c, r } = ctx;
    const p = await this.ultimoPedidoActivo(c.telefono);
    if (!p || p.estado === "ENTREGADO") {
      if (c.carrito.length) {
        this.limpiarPedidoEnCurso(c);
        r.push("Vacié tu carrito. No tienes pedidos confirmados por cancelar.");
      } else r.push("No encuentro pedidos activos para cancelar.");
      return;
    }
    if (p.estado !== "RECIBIDO") {
      r.push(`Tu pedido *${p.codigo}* ya está *en preparación*, así que no puedo cancelarlo por aquí. Escribe *persona* para hablar con alguien del restaurante.`);
      return;
    }
    c.pedidoACancelar = p.id;
    c.paso = "CONFIRMAR_CANCELACION";
    r.push(`¿Seguro que deseas cancelar tu pedido *${p.codigo}* (${formatoSoles(p.total)})? Responde *SÍ* o *NO*.`);
  }

  private async pasoConfirmarCancelacion(ctx: Contexto, n: string) {
    const { c, r } = ctx;
    const id = c.pedidoACancelar;
    c.pedidoACancelar = undefined;
    c.paso = "LIBRE";
    if (!id || !/^(si|sii+|confirmo|ok|dale|claro|ya)\b/.test(n)) {
      r.push("Perfecto, tu pedido sigue en pie. 👍");
      return;
    }
    try {
      const p = await this.pedidos.cancelar(id, "Cancelado por el cliente por WhatsApp", "cliente", true);
      r.push(`❌ Tu pedido *${p.codigo}* fue cancelado. ¡Esperamos atenderte pronto!`);
    } catch (e) {
      if (!(e instanceof ErrorDeDominio)) throw e;
      r.push(`No se pudo cancelar: ${e.message} Escribe *persona* si necesitas ayuda.`);
    }
  }

  private async modificarPedido(ctx: Contexto) {
    const { c, r } = ctx;
    const p = await this.ultimoPedidoActivo(c.telefono);
    if (!p || p.estado !== "RECIBIDO") {
      r.push(p ? `Tu pedido *${p.codigo}* ya está en preparación y no se puede modificar. Escribe *persona* si necesitas ayuda.` : "No encuentro pedidos que puedas modificar.");
      return;
    }
    this.limpiarPedidoEnCurso(c);
    c.carrito = p.lineas.map((l) => ({ platoId: l.platoId, cantidad: l.cantidad, observacion: l.observacion }));
    c.pedidoAReemplazar = p.id;
    r.push(`Cargué tu pedido *${p.codigo}* para modificarlo:\n${T.textoCarrito(c.carrito, ctx.platos)}\n\nAgrega platos, escribe *quita ...* o *listo* para continuar. El pedido original se reemplaza cuando confirmes el nuevo.`);
  }

  // ------------------------------- Comprobantes (HU13) -----------------------------------------

  private async recibirComprobante(ctx: Contexto, archivo: string) {
    const { c, r } = ctx;
    const lista = await this.d.pedidos.listar({ clienteTelefono: c.telefono });
    const p = lista.filter((x) => x.estado !== "CANCELADO" && !x.pago).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))[0];
    if (!p) {
      r.push("Gracias por la imagen 🙏, pero no encuentro un pedido pendiente de pago a tu nombre.");
      return;
    }
    await this.pedidos.adjuntarComprobante(p.id, archivo);
    r.push(`🧾 Recibí tu comprobante para el pedido *${p.codigo}* (${formatoSoles(p.total)}). Caja lo verificará en breve.`);
  }

  // ------------------------------- Derivación (HU17) -------------------------------------------

  private derivar(ctx: Contexto, motivo: string) {
    const { c, r } = ctx;
    c.derivada = true;
    c.motivoDerivacion = motivo;
    c.derivadaEn = this.d.reloj.ahora().toISOString();
    c.intentosFallidos = 0;
    r.push(T.DERIVACION);
  }
}

export type { Sede, Zona };
