import { ErrorDeDominio } from "@/domain/dinero";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar, type Params } from "../../_util";

// POST /api/conversaciones/:telefono { accion: "responder", texto } | { accion: "cerrar" }
export async function POST(req: Request, { params }: Params<"telefono">) {
  const { telefono } = await params;
  return manejar(async () => {
    const b = await cuerpo<{ accion: string; texto?: string; usuario?: string }>(req);
    const atencion = contenedor().atencion;
    if (b.accion === "responder") return atencion.responder(decodeURIComponent(telefono), b.texto ?? "", b.usuario?.trim() || "personal");
    if (b.accion === "cerrar") return atencion.cerrar(decodeURIComponent(telefono));
    throw new ErrorDeDominio("Acción no válida.");
  });
}
