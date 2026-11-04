import type { Configuracion } from "@/application/puertos";
import { ErrorDeDominio } from "@/domain/dinero";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar } from "../_util";

export const dynamic = "force-dynamic";

export function GET() {
  return manejar(() => contenedor().deps.configuracion.obtener());
}

// PUT /api/config → horario, mensajes y textos del chatbot sin modificar código (RF26)
export function PUT(req: Request) {
  return manejar(async () => {
    const repo = contenedor().deps.configuracion;
    const nueva = { ...(await repo.obtener()), ...(await cuerpo<Partial<Configuracion>>(req)) };
    if (!/^\d{2}:\d{2}$/.test(nueva.apertura) || !/^\d{2}:\d{2}$/.test(nueva.cierre)) {
      throw new ErrorDeDominio("El horario debe tener el formato HH:MM.");
    }
    await repo.guardar(nueva);
    return nueva;
  });
}
