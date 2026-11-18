import { describe, expect, it } from "vitest";
import type { Intencion, PlatoCarta } from "@/application/puertos";
import { interpretarConReglas } from "@/infrastructure/ia/interpreteReglas";
import { PLATOS } from "@/infrastructure/persistencia/semilla";

const carta: PlatoCarta[] = PLATOS.map((p) => ({ id: p.id, nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion, alias: p.alias }));
const i = (t: string) => interpretarConReglas(t, carta);
const items = (x: Intencion) => (x.tipo === "PEDIR" || x.tipo === "QUITAR" ? x.items : []);

describe("Intérprete por reglas — criterios de aceptación HU05", () => {
  it("CA1: '2 arroz con pato y una chicha'", () => {
    const r = i("quiero 2 arroz con pato y una chicha");
    expect(r.tipo).toBe("PEDIR");
    expect(items(r).map((x) => [x.platoId, x.cantidad])).toEqual([
      ["arroz-pato", 2],
      ["chicha-morada", 1],
    ]);
  });

  it("CA2: plato que no existe queda sin platoId", () => {
    const r = i("quiero un cuy chactado");
    expect(r.tipo).toBe("PEDIR");
    expect(items(r)[0].platoId).toBeUndefined();
    expect(items(r)[0].candidatos ?? []).toHaveLength(0);
  });

  it("CA3: 'un pescado' es ambiguo y devuelve candidatos", () => {
    const r = i("quiero un pescado");
    const it0 = items(r)[0];
    expect(it0.platoId).toBeUndefined();
    expect(it0.candidatos).toEqual(expect.arrayContaining(["pescado-frito", "sudado-pescado", "ceviche-pescado", "chicharron-pescado"]));
  });

  it("CA4: cantidades en letras y errores ortográficos", () => {
    expect(items(i("dos carapulcras")).map((x) => [x.platoId, x.cantidad])).toEqual([["carapulcra", 2]]);
    expect(items(i("tres seviche mixto")).map((x) => [x.platoId, x.cantidad])).toEqual([["ceviche-mixto", 3]]);
    expect(items(i("una papa a la huancaina y 2 lomos saltados")).map((x) => [x.platoId, x.cantidad])).toEqual([
      ["papa-huancaina", 1],
      ["lomo-saltado", 2],
    ]);
  });

  it("extrae observaciones por plato", () => {
    const r = items(i("2 ceviche de pescado sin aji"));
    expect(r[0]).toMatchObject({ platoId: "ceviche-pescado", cantidad: 2, observacion: "sin aji" });
  });

  it("reconoce intenciones de consulta (HU02–HU04)", () => {
    expect(i("hola").tipo).toBe("SALUDO");
    expect(i("me pasas la carta?").tipo).toBe("VER_CARTA");
    expect(i("¿a qué hora abren?")).toEqual({ tipo: "FAQ", tema: "HORARIO" });
    expect(i("donde quedan?")).toEqual({ tipo: "FAQ", tema: "UBICACION" });
    expect(i("hacen delivery a sunampe?")).toEqual({ tipo: "FAQ", tema: "DELIVERY" });
    expect(i("aceptan yape?")).toEqual({ tipo: "FAQ", tema: "PAGOS" });
    expect(i("¿qué lleva la carapulcra?")).toMatchObject({ tipo: "PREGUNTA_PLATO", platoId: "carapulcra" });
  });

  it("entiende expresiones coloquiales peruanas", () => {
    expect(items(i("me mandas 2 ceviches mixtos pe")).map((x) => [x.platoId, x.cantidad])).toEqual([["ceviche-mixto", 2]]);
    expect(items(i("dos lomos y una inca kola")).map((x) => x.platoId)).toEqual(["lomo-saltado", "gaseosa"]);
    expect(items(i("el arros con pato")).map((x) => x.platoId)).toEqual(["arroz-pato"]);
    expect(i("una carapulcra bien picante")).toMatchObject({ tipo: "PEDIR", items: [{ platoId: "carapulcra", observacion: "bien picante" }] });
    expect(i("¿la carapulcra pica?")).toMatchObject({ tipo: "PREGUNTA_PLATO", platoId: "carapulcra" });
    expect(i("que me recomiendas").tipo).toBe("RECOMENDAR");
    expect(i("cambia a 3 chichas")).toMatchObject({ tipo: "CAMBIAR_CANTIDAD", items: [{ platoId: "chicha-morada", cantidad: 3 }] });
  });

  it("reconoce comandos de control", () => {
    expect(i("quiero hablar con una persona").tipo).toBe("HUMANO");
    expect(i("quiero cancelar mi pedido").tipo).toBe("CANCELAR_PEDIDO");
    expect(i("quiero modificar mi pedido").tipo).toBe("MODIFICAR_PEDIDO");
    expect(i("como va mi pedido").tipo).toBe("ESTADO_PEDIDO");
    expect(i("eso es todo").tipo).toBe("TERMINAR");
    expect(i("quita la chicha").tipo).toBe("QUITAR");
    expect(i("asdf qwerty").tipo).toBe("NO_ENTENDIDO");
  });
});
