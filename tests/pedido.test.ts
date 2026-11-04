import { describe, expect, it } from "vitest";
import { Pedido } from "@/domain/pedido";
import type { Zona } from "@/domain/tipos";

const ahora = new Date("2026-11-04T17:00:00Z");
const linea = { platoId: "arroz-pato", nombre: "Arroz con pato", precioUnitario: 3200, cantidad: 2 };
const zona: Zona = { id: "z1", sedeId: "gp", nombre: "Centro", tarifa: 300, pedidoMinimo: 2000, activa: true };

function nuevo(modalidad: "EN_LOCAL" | "DELIVERY" = "EN_LOCAL") {
  return Pedido.crear({
    id: "p1",
    codigo: "GP-0001",
    sedeId: "gp",
    canal: "WHATSAPP",
    modalidad,
    lineas: [linea],
    zona: modalidad === "DELIVERY" ? zona : null,
    entrega: modalidad === "DELIVERY" ? { zonaId: "z1", zonaNombre: "Centro", direccion: "Av. Principal 123", referencia: "" } : undefined,
    usuario: "chatbot",
    ahora,
  });
}

describe("Agregado Pedido", () => {
  it("calcula subtotal, delivery y total en céntimos", () => {
    const p = nuevo("DELIVERY").datos;
    expect(p.subtotal).toBe(6400);
    expect(p.costoDelivery).toBe(300);
    expect(p.total).toBe(6700);
    expect(p.estado).toBe("RECIBIDO");
    expect(p.eventos[0].tipo).toBe("PedidoRegistrado");
  });

  it("rechaza pedidos sin platos o con cantidades no válidas", () => {
    expect(() => Pedido.crear({ ...base(), lineas: [] })).toThrow();
    expect(() => Pedido.crear({ ...base(), lineas: [{ ...linea, cantidad: 0 }] })).toThrow();
  });

  it("rechaza delivery por debajo del pedido mínimo (RN05)", () => {
    expect(() =>
      Pedido.crear({
        ...base(),
        modalidad: "DELIVERY",
        lineas: [{ ...linea, cantidad: 1, precioUnitario: 1000 }],
        zona,
        entrega: { zonaId: "z1", zonaNombre: "Centro", direccion: "Av. Principal 123", referencia: "" },
      }),
    ).toThrow(/mínimo/);
  });

  it("sigue el ciclo de estados RN04 y registra eventos", () => {
    const p = nuevo();
    expect(() => p.cambiarEstado("LISTO", "cocina", ahora)).toThrow();
    p.cambiarEstado("EN_PREPARACION", "cocina", ahora);
    p.cambiarEstado("LISTO", "cocina", ahora);
    expect(p.puedeCambiarA("EN_CAMINO")).toBe(false); // solo delivery
    p.cambiarEstado("ENTREGADO", "mozo", ahora);
    expect(p.datos.eventos.map((e) => e.tipo)).toEqual([
      "PedidoRegistrado", "PedidoEnPreparacion", "PedidoListo", "PedidoEntregado",
    ]);
  });

  it("el delivery pasa por 'En camino' antes de 'Entregado'", () => {
    const p = nuevo("DELIVERY");
    p.cambiarEstado("EN_PREPARACION", "cocina", ahora);
    p.cambiarEstado("LISTO", "cocina", ahora);
    expect(() => p.cambiarEstado("ENTREGADO", "rep", ahora)).toThrow();
    p.cambiarEstado("EN_CAMINO", "rep", ahora);
    p.cambiarEstado("ENTREGADO", "rep", ahora);
    expect(p.estado).toBe("ENTREGADO");
  });

  it("RN03: el cliente solo cancela en 'Recibido'; el personal con motivo", () => {
    const p = nuevo();
    p.cambiarEstado("EN_PREPARACION", "cocina", ahora);
    expect(() => p.cancelar("me equivoqué", "cliente", ahora, true)).toThrow();
    expect(() => p.cancelar("  ", "caja", ahora, false)).toThrow();
    p.cancelar("Cliente no recogió", "caja", ahora, false);
    expect(p.estado).toBe("CANCELADO");
  });

  it("RN06: el cobro digital exige verificar el comprobante; cierre = entregado y cobrado", () => {
    const p = nuevo();
    expect(() => p.registrarCobro("YAPE", "caja", ahora)).toThrow(/comprobante/);
    p.adjuntarComprobante("img.jpg", ahora);
    p.registrarCobro("YAPE", "caja", ahora, true);
    expect(p.datos.comprobante?.verificado).toBe(true);
    expect(() => p.registrarCobro("EFECTIVO", "caja", ahora)).toThrow(/ya fue cobrado/);
    expect(p.cerrado).toBe(false);
    p.cambiarEstado("EN_PREPARACION", "c", ahora);
    p.cambiarEstado("LISTO", "c", ahora);
    p.cambiarEstado("ENTREGADO", "c", ahora);
    expect(p.cerrado).toBe(true);
  });
});

function base() {
  return {
    id: "p2",
    codigo: "GP-0002",
    sedeId: "gp",
    canal: "PRESENCIAL" as const,
    modalidad: "EN_LOCAL" as const,
    lineas: [linea],
    usuario: "mozo",
    ahora,
  };
}
