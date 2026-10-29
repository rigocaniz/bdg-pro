import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.exceptions import BadRequestException, ConflictException
from app.core.security import (
    validate_password_strength,
    check_password_history,
    get_password_hash,
    generate_otp,
    hash_token
)
from app.core.state_machine import (
    validar_transicion,
    ESTADO_BORRADOR,
    ESTADO_ENVIADA,
    ESTADO_POR_ENTREGAR,
    ESTADO_ENTREGADA,
    ESTADO_ENTREGADA_PARCIAL,
    ESTADO_CERRADA_CON_FALTANTE,
    ESTADO_RECHAZADA,
    ESTADO_CANCELADA
)

class TestStateAndSecurity(unittest.TestCase):
    def test_password_policy(self):
        """Valida la política de contraseñas de RF-SEG-01."""
        # Menos de 8 caracteres
        with self.assertRaises(BadRequestException):
            validate_password_strength("Ab1!")

        # Sin mayúscula
        with self.assertRaises(BadRequestException):
            validate_password_strength("password123!")

        # Sin minúscula
        with self.assertRaises(BadRequestException):
            validate_password_strength("PASSWORD123!")

        # Sin número
        with self.assertRaises(BadRequestException):
            validate_password_strength("PasswordSpecial!")

        # Sin símbolo
        with self.assertRaises(BadRequestException):
            validate_password_strength("Password12345")

        # Contraseña válida
        validate_password_strength("Segura2026!#")

    def test_password_history(self):
        """Valida la regla de no repetir las últimas 3 contraseñas (RF-SEG-04)."""
        p1 = "Password123!"
        p2 = "Password456!"
        p3 = "Password789!"
        p4 = "NuevaPass2026!"

        h1 = get_password_hash(p1)
        h2 = get_password_hash(p2)
        h3 = get_password_hash(p3)

        historial = [h1, h2, h3]

        # No debe permitir reutilizar p2
        with self.assertRaises(BadRequestException):
            check_password_history(p2, historial)

        # Debe permitir una nueva que no esté en el historial
        check_password_history(p4, historial)

    def test_otp_generation(self):
        """Valida que el OTP tenga 6 dígitos numéricos y el hash sea consistente."""
        otp = generate_otp()
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

        h1 = hash_token(otp)
        h2 = hash_token(otp)
        self.assertEqual(h1, h2)

    def test_state_machine_valid_transitions(self):
        """Valida las transiciones válidas según la Sección 6."""
        self.assertTrue(validar_transicion(ESTADO_BORRADOR, ESTADO_ENVIADA))
        self.assertTrue(validar_transicion(ESTADO_BORRADOR, ESTADO_CANCELADA))
        self.assertTrue(validar_transicion(ESTADO_ENVIADA, ESTADO_POR_ENTREGAR))
        self.assertTrue(validar_transicion(ESTADO_ENVIADA, ESTADO_RECHAZADA))
        self.assertTrue(validar_transicion(ESTADO_POR_ENTREGAR, ESTADO_ENTREGADA))
        self.assertTrue(validar_transicion(ESTADO_POR_ENTREGAR, ESTADO_ENTREGADA_PARCIAL))
        self.assertTrue(validar_transicion(ESTADO_ENTREGADA_PARCIAL, ESTADO_ENTREGADA))
        self.assertTrue(validar_transicion(ESTADO_ENTREGADA_PARCIAL, ESTADO_CERRADA_CON_FALTANTE))

    def test_state_machine_invalid_transitions(self):
        """Valida que transiciones no permitidas lancen ConflictException (HTTP 409)."""
        with self.assertRaises(ConflictException):
            validar_transicion(ESTADO_BORRADOR, ESTADO_ENTREGADA)

        with self.assertRaises(ConflictException):
            validar_transicion(ESTADO_ENVIADA, ESTADO_ENTREGADA)

        with self.assertRaises(ConflictException):
            validar_transicion(ESTADO_ENTREGADA, ESTADO_BORRADOR)

        with self.assertRaises(ConflictException):
            validar_transicion(ESTADO_CANCELADA, ESTADO_ENVIADA)

        with self.assertRaises(ConflictException):
            validar_transicion(ESTADO_RECHAZADA, ESTADO_POR_ENTREGAR)

if __name__ == '__main__':
    unittest.main()
