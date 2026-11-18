import { describe, expect, it } from "vitest";
import { contenedorDePrueba } from "./ayudas";

async function iniciar(t: ReturnType<typeof contenedorDePrueba>) {
  await t.decir("hola");
  await t.decir("si");
}

describe("Chatbot — flujo CU02 Realizar pedido por WhatsApp", () => {
  it("se identifica como asistente y pide consentimiento (RN10, RN11)", async () => {
    const t = contenedorDePrueba();
    const r = await t.decir("hola");
    expect(r).toMatch(/asistente automático/);
    expect(r).toMatch(/29733/);
  });

  it("pedido para llevar completo hasta la confirmación (HU05–HU07, RN02)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    expect(await t.decir("quiero 2 arroz con pato y una chicha")).toMatch(/Subtotal: \*S\/ 79\.00\*/);
    expect(await t.decir("listo")).toMatch(/Cómo deseas tu pedido/);
    expect(await t.decir("2")).toMatch(/En qué sede/);
    expect(await t.decir("1")).toMatch(/A nombre de quién/);
    // Antes de confirmar no hay pedido registrado
    expect(await t.k.deps.pedidos.listar({})).toHaveLength(0);
    const resumen = await t.decir("Pilar");
    expect(resumen).toMatch(/Resumen de tu pedido/);
    expect(resumen).toMatch(/Total: S\/ 79\.00/);
    const conf = await t.decir("1");
    expect(conf).toMatch(/Pedido confirmado.*GP-0001/);
    const pedidos = await t.k.deps.pedidos.listar({});
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({ estado: "RECIBIDO", modalidad: "PARA_LLEVAR", total: 7900, clienteNombre: "Pilar" });
  });

  it("primer mensaje con pedido: lo procesa después del consentimiento", async () => {
    const t = contenedorDePrueba();
    await t.decir("buenas, quiero 2 ceviche mixto");
    expect(await t.decir("si")).toMatch(/2 × Ceviche mixto/);
  });

  it("cambia la cantidad de un plato del carrito (RF06)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    await t.decir("2 chicha y 1 lomo saltado");
    const r = await t.decir("mejor que sean 4 chichas");
    expect(r).toMatch(/4 × Chicha morada/);
    expect(r).toMatch(/Subtotal: \*S\/ 94\.00\*/);
  });

  it("cocina recibe aviso de pedidos cancelados (CU13 2a)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    await t.decir("1 lomo saltado");
    await t.decir("listo");
    await t.decir("2");
    await t.decir("1");
    await t.decir("Ana");
    await t.decir("1");
    await t.decir("cancelar mi pedido");
    expect(await t.decir("si")).toMatch(/fue cancelado/);
    expect(await t.k.pedidos.pendientesCocina("grocio-prado")).toHaveLength(0);
    expect(await t.k.pedidos.canceladosRecientes("grocio-prado")).toHaveLength(1);
  });

  it("pide aclaración ante un mensaje ambiguo (HU05 CA3)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    expect(await t.decir("un pescado")).toMatch(/Qué preparación/);
    expect(await t.decir("2")).toMatch(/Sudado de pescado|Pescado frito|Ceviche de pescado|Chicharrón/);
  });

  it("delivery: zona, mínimo, dirección, referencia y ubicación (HU06, HU15, HU24)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    await t.decir("1 papa a la huancaina");
    await t.decir("listo");
    expect(await t.decir("delivery")).toMatch(/A qué zona/);
    expect(await t.decir("chincha alta")).toMatch(/pedido mínimo.*Te faltan \*S\/ 18\.00\*/s);
    await t.decir("agrega 2 causas rellenas");
    await t.decir("listo");
    expect(await t.decir("Av. Benavides 456")).toMatch(/referencia/);
    expect(await t.decir("frente al parque")).toMatch(/ubicación/);
    const r = await t.k.chatbot.procesar({ telefono: "51999000111", ubicacion: { lat: -13.4, lng: -76.1 } });
    expect(r.join()).toMatch(/A nombre de quién/);
    const resumen = await t.decir("Emily");
    expect(resumen).toMatch(/Delivery: S\/ 6\.00/);
    await t.decir("confirmar");
    const [p] = await t.k.deps.pedidos.listar({});
    expect(p).toMatchObject({ modalidad: "DELIVERY", sedeId: "grocio-prado", costoDelivery: 600, total: 4800 });
    expect(p.entrega).toMatchObject({ direccion: "Av. Benavides 456", referencia: "frente al parque", ubicacion: { lat: -13.4 } });
  });

  it("no ofrece platos agotados y sugiere alternativas (HU16, RN07)", async () => {
    const t = contenedorDePrueba();
    await t.k.carta.marcarAgotado("arroz-pato", "grocio-prado", true);
    await t.k.carta.marcarAgotado("arroz-pato", "panamericana", true);
    await iniciar(t);
    const r = await t.decir("quiero un arroz con pato");
    expect(r).toMatch(/agotado/);
    expect(r).toMatch(/Te sugiero/);
    expect(await t.decir("carta")).not.toMatch(/Arroz con pato/);
  });

  it("deriva a una persona tras dos intentos fallidos y deja de responder (HU17, RN09)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    await t.decir("asdf qwerty");
    expect(await t.decir("zxcv bnm")).toMatch(/persona del restaurante/);
    expect(await t.decir("hola?")).toBe("");
    const [c] = await t.k.atencion.conversaciones(true);
    expect(c.derivada).toBe(true);
    await t.k.atencion.cerrar(c.telefono);
    expect(await t.decir("carta")).toMatch(/Carta del día/);
  });

  it("cancelar y modificar el pedido solo en 'Recibido' (HU23, RN03)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    await t.decir("1 lomo saltado");
    await t.decir("listo");
    await t.decir("1");
    await t.decir("2");
    await t.decir("Jordy");
    await t.decir("1");
    // Modificar
    expect(await t.decir("quiero modificar mi pedido")).toMatch(/Cargué tu pedido/);
    await t.decir("agrega una limonada");
    await t.decir("listo");
    await t.decir("1");
    await t.decir("2");
    await t.decir("1");
    const pedidos = await t.k.deps.pedidos.listar({});
    expect(pedidos.map((p) => p.estado).sort()).toEqual(["CANCELADO", "RECIBIDO"]);
    const nuevo = pedidos.find((p) => p.estado === "RECIBIDO")!;
    expect(nuevo.total).toBe(3400 + 1500);
    // En preparación ya no se puede cancelar por WhatsApp
    await t.k.pedidos.cambiarEstado(nuevo.id, "EN_PREPARACION", "cocina");
    expect(await t.decir("cancelar mi pedido")).toMatch(/ya está \*en preparación\*/);
  });

  it("notifica al cliente cada cambio de estado (HU11)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    await t.decir("1 aji de gallina");
    await t.decir("listo");
    await t.decir("2");
    await t.decir("1");
    await t.decir("Alex");
    await t.decir("1");
    const [p] = await t.k.deps.pedidos.listar({});
    t.enviados.length = 0;
    await t.k.pedidos.cambiarEstado(p.id, "EN_PREPARACION", "cocina");
    await t.k.pedidos.cambiarEstado(p.id, "LISTO", "cocina");
    expect(t.enviados.map((e) => e.texto)).toEqual([
      expect.stringMatching(/en preparación/),
      expect.stringMatching(/está listo.*recogerlo/),
    ]);
  });

  it("asocia el comprobante al pedido y caja registra el cobro y el cierre (HU12, HU13)", async () => {
    const t = contenedorDePrueba();
    await iniciar(t);
    await t.decir("2 chicha");
    await t.decir("listo");
    await t.decir("1");
    await t.decir("1");
    await t.decir("Xiomara");
    await t.decir("1");
    const r = await t.k.chatbot.procesar({ telefono: "51999000111", imagen: "comprobante.jpg" });
    expect(r.join()).toMatch(/Recibí tu comprobante/);
    const [p] = await t.k.pedidos.pendientesDeCobro("grocio-prado");
    expect(p.comprobante?.archivo).toBe("comprobante.jpg");
    await t.k.pedidos.registrarCobro(p.id, "YAPE", "caja", true);
    const cierre = await t.k.pedidos.cierreDeCaja("grocio-prado");
    expect(cierre.totalCobrado).toBe(3000);
    expect(cierre.porMedio.find((m) => m.medio === "YAPE")?.cantidad).toBe(1);
  });

  it("ignora mensajes duplicados del webhook (RNF05)", async () => {
    const t = contenedorDePrueba();
    await t.k.chatbot.procesar({ telefono: "1", texto: "hola", idMensaje: "wamid.1" });
    expect(await t.k.chatbot.procesar({ telefono: "1", texto: "hola", idMensaje: "wamid.1" })).toEqual([]);
  });

  it("RN08: fuera de horario no registra pedidos inmediatos", async () => {
    const t = contenedorDePrueba(new Date("2026-11-05T03:00:00Z")); // 22:00 en Lima
    const cfg = await t.k.deps.configuracion.obtener();
    await t.k.deps.configuracion.guardar({ ...cfg, ignorarHorario: false });
    await iniciar(t);
    await t.decir("1 lomo saltado");
    expect(await t.decir("listo")).toMatch(/estamos cerrados/);
  });
});
