import type { DatosZona } from "@/application/zonas";
import { contenedor } from "@/infrastructure/contenedor";
import { cuerpo, manejar, type Params } from "../../_util";

export async function PUT(req: Request, { params }: Params<"id">) {
  const { id } = await params;
  return manejar(async () => contenedor().zonas.actualizar(id, await cuerpo<Partial<DatosZona>>(req)));
}

export async function DELETE(_req: Request, { params }: Params<"id">) {
  const { id } = await params;
  return manejar(() => contenedor().zonas.eliminar(id));
}
