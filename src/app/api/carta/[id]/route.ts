import type { DatosPlato } from "@/application/carta";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar, type Params } from "../../_util";

// PUT /api/carta/:id → modificar o desactivar plato (HU01)
export async function PUT(req: Request, { params }: Params<"id">) {
  const { id } = await params;
  return manejar(async () => contenedor().carta.actualizarPlato(id, await cuerpo<Partial<DatosPlato>>(req)));
}
