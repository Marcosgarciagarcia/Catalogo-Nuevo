/**
 * Subida de imágenes a Cloudinary desde el navegador (unsigned upload).
 * Requiere VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.
 * El preset debe ser "unsigned" en el dashboard de Cloudinary.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const UPLOAD_URL = CLOUD_NAME
  ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
  : null;

/**
 * Sube un archivo (File) o una URL remota a Cloudinary.
 * @param {File | string} fileOrUrl - Archivo seleccionado por el usuario o URL de la imagen (p. ej. Open Library)
 * @returns {Promise<string>} URL segura de la imagen en Cloudinary (secure_url)
 */
export async function uploadToCloudinary(fileOrUrl) {
  if (!UPLOAD_URL || !UPLOAD_PRESET) {
    throw new Error('Falta configuración de Cloudinary (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET)');
  }

  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);
  if (typeof fileOrUrl === 'string') {
    formData.append('file', fileOrUrl);
  } else if (fileOrUrl instanceof File) {
    formData.append('file', fileOrUrl);
  } else {
    throw new Error('Se necesita un archivo (File) o una URL de imagen');
  }

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error al subir: ${response.status}`);
  }

  const data = await response.json();
  const url = data.secure_url;
  if (!url) throw new Error('Cloudinary no devolvió la URL de la imagen');
  return url;
}

/** Indica si la subida a Cloudinary está configurada */
export function isCloudinaryConfigured() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}
