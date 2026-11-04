import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar, requerido, type Params } from "../../../_util";

// POST /api/carta/:id/agotado { sedeId, agotado } → HU16 (efecto inmediato en el chatbot)
export async function POST(req: Request, { params }: Params<"id">) {
  const { id } = await params;
  return manejar(async () => {
    const b = await cuerpo<{ sedeId: string; agotado: boolean }>(req);
    await contenedor().carta.marcarAgotado(id, requerido(b.sedeId, "la sede"), !!b.agotado);
  });
}
