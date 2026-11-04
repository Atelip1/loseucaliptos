// Decorador con tiempo de espera y "circuit breaker" (EC02): si el modelo de IA falla, se usa el
// intérprete local y el circuito queda abierto un tiempo antes de volver a intentar.
import type { Intencion, PlatoCarta, ServicioDeInterpretacion } from "@/application/puertos";

export class InterpreteResiliente implements ServicioDeInterpretacion {
  private abiertoHasta = 0;

  constructor(
    private principal: ServicioDeInterpretacion,
    private respaldo: ServicioDeInterpretacion,
    private pausaMs = 60_000,
  ) {}

  async interpretar(texto: string, carta: PlatoCarta[]): Promise<Intencion> {
    if (Date.now() < this.abiertoHasta) return this.respaldo.interpretar(texto, carta);
    try {
      return await this.principal.interpretar(texto, carta);
    } catch (e) {
      console.warn("[ia] el servicio de IA no respondió; se usa el modo degradado", e);
      this.abiertoHasta = Date.now() + this.pausaMs;
      return this.respaldo.interpretar(texto, carta);
    }
  }
}
