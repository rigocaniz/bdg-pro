from typing import List, Dict
from app.core.exceptions import ConflictException

ESTADO_BORRADOR = "Borrador"
ESTADO_ENVIADA = "Enviada"
ESTADO_POR_ENTREGAR = "Por entregar"
ESTADO_ENTREGADA = "Entregada"
ESTADO_ENTREGADA_PARCIAL = "Entregada parcial"
ESTADO_CERRADA_CON_FALTANTE = "Cerrada con faltante"
ESTADO_RECHAZADA = "Rechazada"
ESTADO_CANCELADA = "Cancelada"

ESTADOS_VALIDOS = [
    ESTADO_BORRADOR,
    ESTADO_ENVIADA,
    ESTADO_POR_ENTREGAR,
    ESTADO_ENTREGADA,
    ESTADO_ENTREGADA_PARCIAL,
    ESTADO_CERRADA_CON_FALTANTE,
    ESTADO_RECHAZADA,
    ESTADO_CANCELADA
]

ESTADOS_FINALES = {
    ESTADO_ENTREGADA,
    ESTADO_CERRADA_CON_FALTANTE,
    ESTADO_RECHAZADA,
    ESTADO_CANCELADA
}

# Mapa de transiciones permitidas según la Sección 6
TRANSICIONES_PERMITIDAS: Dict[str, List[str]] = {
    ESTADO_BORRADOR: [ESTADO_ENVIADA, ESTADO_CANCELADA],
    ESTADO_ENVIADA: [ESTADO_POR_ENTREGAR, ESTADO_RECHAZADA, ESTADO_CANCELADA],
    ESTADO_POR_ENTREGAR: [ESTADO_ENTREGADA, ESTADO_ENTREGADA_PARCIAL],
    ESTADO_ENTREGADA_PARCIAL: [ESTADO_ENTREGADA, ESTADO_CERRADA_CON_FALTANTE],
    ESTADO_ENTREGADA: [],
    ESTADO_CERRADA_CON_FALTANTE: [],
    ESTADO_RECHAZADA: [],
    ESTADO_CANCELADA: []
}

def validar_transicion(estado_actual: str, nuevo_estado: str):
    """
    Valida si una transición de estado es válida según la máquina de estados.
    Si no lo es, lanza HTTP 409 Conflict según la especificación.
    """
    if estado_actual in ESTADOS_FINALES:
        raise ConflictException(
            mensaje=f"La solicitud está en estado final '{estado_actual}' y no admite más cambios.",
            codigo="ESTADO_FINAL_NO_MODIFICABLE",
            detalles={"estado_actual": estado_actual, "nuevo_estado": nuevo_estado}
        )

    transiciones = TRANSICIONES_PERMITIDAS.get(estado_actual, [])
    if nuevo_estado not in transiciones:
        raise ConflictException(
            mensaje=f"Transición de estado no permitida: de '{estado_actual}' hacia '{nuevo_estado}'.",
            codigo="TRANSICION_ESTADO_INVALIDA",
            detalles={
                "estado_actual": estado_actual,
                "nuevo_estado_intentado": nuevo_estado,
                "transiciones_permitidas": transiciones
            }
        )
    return True
