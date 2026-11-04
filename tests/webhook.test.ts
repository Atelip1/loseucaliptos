import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { extraerMensajes, firmaValida } from "@/infrastructure/whatsapp/cloudApi";

describe("Webhook de WhatsApp (EC04)", () => {
  const cuerpo = JSON.stringify({ hola: 1 });
  const firma = "sha256=" + createHmac("sha256", "secreto").update(cuerpo).digest("hex");

  it("acepta solo firmas válidas de Meta", () => {
    expect(firmaValida(cuerpo, firma, "secreto")).toBe(true);
    expect(firmaValida(cuerpo, firma, "otro")).toBe(false);
    expect(firmaValida(cuerpo + " ", firma, "secreto")).toBe(false);
    expect(firmaValida(cuerpo, null, "secreto")).toBe(false);
  });

  it("extrae texto, ubicación e imagen del payload", () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            contacts: [{ wa_id: "51999", profile: { name: "Ana" } }],
            messages: [
              { id: "m1", from: "51999", type: "text", text: { body: "hola" } },
              { id: "m2", from: "51999", type: "location", location: { latitude: -13.4, longitude: -76.1 } },
              { id: "m3", from: "51999", type: "image", image: { id: "MEDIA1" } },
            ],
          },
        }],
      }],
    };
    expect(extraerMensajes(payload)).toEqual([
      { id: "m1", telefono: "51999", nombrePerfil: "Ana", texto: "hola" },
      { id: "m2", telefono: "51999", nombrePerfil: "Ana", ubicacion: { lat: -13.4, lng: -76.1 } },
      { id: "m3", telefono: "51999", nombrePerfil: "Ana", imagen: "wa-media:MEDIA1", texto: undefined },
    ]);
  });
});
