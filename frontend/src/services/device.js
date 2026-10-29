// Servicio de identificación de dispositivo y huella de navegador (RF-SEG-06)

export function getDeviceId() {
  const STORAGE_KEY = 'bdg_dispositivo_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generar UUID v4
    if (crypto && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  // Asegurar presencia en cookie
  document.cookie = `dispositivo_id=${deviceId}; path=/; max-age=31536000; SameSite=Lax`;
  
  return deviceId;
}
