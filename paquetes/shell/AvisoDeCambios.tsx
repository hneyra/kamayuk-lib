import {
  Cancelar,
  Confirmacion,
  Confirmar,
  Descartar,
  HuecoDeConfirmacion,
  NotaDeConfirmacion,
  PanelDeConfirmacion,
  SalidasDeConfirmacion,
  TituloDeConfirmacion,
} from '../ui/index.ts';

/**
 * El aviso de salir de una hoja con cambios sin guardar (#13, AC6).
 *
 * <h2>Es lo que V8 pone EN LUGAR de la tira de pestañas</h2>
 *
 * V6 tenía una tira de pestañas y una marca de «sin guardar» en la pestaña; V8 retira la tira, y lo
 * que queda para no perder trabajo son dos cosas: la marca en la hoja del árbol y esta pregunta. Sin
 * la pregunta, la marca sola es un adorno: quien no mira el árbol al salir pierde lo escrito sin
 * enterarse, y no hay nada que lo deshaga.
 *
 * <h2>Tres salidas, y cada una hace exactamente lo que dice</h2>
 *
 * <table>
 *   <tr><td>«Guardar y cerrar»</td><td>guarda por el sistema, y entonces sale</td></tr>
 *   <tr><td>«Salir y perder los cambios»</td><td>sale sin guardar, y la hoja deja de estar sucia</td></tr>
 *   <tr><td>«Seguir editando»</td><td>no sale, y la hoja SIGUE sucia</td></tr>
 * </table>
 *
 * La tercera fila es la que se rompe sin que se note: un «cancelar» que limpiara la marca dejaría la
 * siguiente salida sin preguntar nada, y el trabajo se perdería **en la segunda** salida.
 */

export interface AvisoDeCambiosProps {
  /** El rótulo de la hoja sucia. `null`: no hay nada que preguntar y el aviso no se monta. */
  readonly rotulo: string | null;
  readonly alGuardarYCerrar: () => void;
  readonly alSalirSinGuardar: () => void;
  readonly alSeguirEditando: () => void;
}

export function AvisoDeCambios({
  rotulo,
  alGuardarYCerrar,
  alSalirSinGuardar,
  alSeguirEditando,
}: AvisoDeCambiosProps) {
  return (
    <Confirmacion
      open={rotulo !== null}
      onOpenChange={(quiere) => {
        if (!quiere) alSeguirEditando();
      }}
    >
      <PanelDeConfirmacion>
        <TituloDeConfirmacion>{rotulo} tiene cambios sin guardar</TituloDeConfirmacion>
        <NotaDeConfirmacion>
          Si cierra la pantalla se pierden. Guardelos primero o cierrela descartandolos: eso no se
          puede deshacer.
        </NotaDeConfirmacion>
        <SalidasDeConfirmacion>
          <Descartar onClick={alSalirSinGuardar}>Salir y perder los cambios</Descartar>
          <HuecoDeConfirmacion />
          <Cancelar onClick={alSeguirEditando}>Seguir editando</Cancelar>
          <Confirmar onClick={alGuardarYCerrar}>Guardar y cerrar</Confirmar>
        </SalidasDeConfirmacion>
      </PanelDeConfirmacion>
    </Confirmacion>
  );
}
