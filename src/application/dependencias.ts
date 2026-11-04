import type {
  GeneradorIds,
  Mensajeria,
  Reloj,
  RepositorioCarta,
  RepositorioConfiguracion,
  RepositorioConversaciones,
  RepositorioDePedidos,
  RepositorioZonas,
  ServicioDeInterpretacion,
} from "./puertos";

/** Todo lo que la capa de aplicación necesita del exterior, inyectado desde el contenedor. */
export interface Dependencias {
  carta: RepositorioCarta;
  zonas: RepositorioZonas;
  pedidos: RepositorioDePedidos;
  conversaciones: RepositorioConversaciones;
  configuracion: RepositorioConfiguracion;
  mensajeria: Mensajeria;
  interprete: ServicioDeInterpretacion;
  reloj: Reloj;
  ids: GeneradorIds;
}
