import { ErrorDeDominio } from "@/domain/dinero";
import { contenedor } from "@/infrastructure/contenedor";
import { manejar } from "../../_util";

// POST /api/datos/reiniciar → vuelve a los datos de ejemplo (solo en desarrollo)
export function POST() {
  return manejar(async () => {
    if (process.env.NODE_ENV === "production") throw new ErrorDeDominio("No disponible en producción.");
    await contenedor().almacen.reiniciar();
  });
}
