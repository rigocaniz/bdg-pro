
// Servicio de identificación de dispositivo (RF-SEG-06)

// ======================================================
// CONFIGURACIÓN
// ======================================================

const STORAGE_KEY = 'bdg_dispositivo_id';
const COOKIE_KEY = 'dispositivo_id';

const DEVICE_ID_MAX_AGE = 31536000; // 1 año
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Identificador temporal si localStorage no está disponible.
let memoryDeviceId = null;

// ======================================================
// GENERACIÓN DE IDENTIFICADOR
// ======================================================

const generateDeviceId = () => {
  // Preferir UUID nativo del navegador.
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  // Alternativa criptográficamente segura.
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);

    crypto.getRandomValues(bytes);

    // Establecer versión 4.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;

    // Establecer variante RFC 4122.
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }

  // No utilizar Math.random() para identificadores.
  throw new Error(
    'El navegador no dispone de un generador criptográfico seguro.'
  );
};

// ======================================================
// VALIDACIÓN
// ======================================================

const isValidDeviceId = (deviceId) => {
  return (
    typeof deviceId === 'string' &&
    deviceId.length === 36 &&
    UUID_V4_REGEX.test(deviceId)
  );
};

// ======================================================
// ALMACENAMIENTO LOCAL
// ======================================================

const getStoredDeviceId = () => {
  try {
    const deviceId = localStorage.getItem(STORAGE_KEY);

    return isValidDeviceId(deviceId)
      ? deviceId
      : null;

  } catch {
    // localStorage puede estar bloqueado.
    return null;
  }
};

const saveDeviceId = (deviceId) => {
  try {
    localStorage.setItem(STORAGE_KEY, deviceId);
    return true;

  } catch {
    // Se conservará el identificador en memoria.
    return false;
  }
};

// ======================================================
// COOKIE DE DISPOSITIVO
// ======================================================

const setDeviceCookie = (deviceId) => {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    const secureFlag =
      window.location.protocol === 'https:'
        ? '; Secure'
        : '';

    document.cookie =
      `${COOKIE_KEY}=${encodeURIComponent(deviceId)}` +
      `; Path=/` +
      `; Max-Age=${DEVICE_ID_MAX_AGE}` +
      `; SameSite=Lax` +
      secureFlag;

  } catch {
    // La cookie es complementaria.
    // Su fallo no debe interrumpir las solicitudes.
  }
};

// ======================================================
// IDENTIFICACIÓN DEL DISPOSITIVO
// ======================================================

export function getDeviceId() {

  // Evitar generar identificadores diferentes
  // durante la misma ejecución de la aplicación.
  if (isValidDeviceId(memoryDeviceId)) {
    setDeviceCookie(memoryDeviceId);
    return memoryDeviceId;
  }

  // Recuperar identificador persistido.
  let deviceId = getStoredDeviceId();

  // Si no existe o es inválido, generar uno nuevo.
  if (!deviceId) {
    deviceId = generateDeviceId();

    saveDeviceId(deviceId);
  }

  // Mantener identificador disponible en memoria.
  memoryDeviceId = deviceId;

  // Mantener compatibilidad con el mecanismo de cookie existente.
  setDeviceCookie(deviceId);

  return deviceId;
}
