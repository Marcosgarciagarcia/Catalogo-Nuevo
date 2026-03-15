/**
 * POST /api/upload-cover
 * Sube una imagen de portada a Cloudinary y devuelve la URL.
 * Body JSON:
 *   - { imageBase64: "<base64>", mimeType: "image/jpeg" } o { dataUrl: "data:image/jpeg;base64,..." }
 *   - o { url: "https://..." } para subir desde URL (p. ej. Open Library).
 * No requiere autenticación (el preset de Cloudinary debe ser unsigned).
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    return res.status(503).json({ error: 'Cloudinary no configurado (CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET)' });
  }
  let fileValue;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (body.url && typeof body.url === 'string' && (body.url.startsWith('http://') || body.url.startsWith('https://'))) {
      fileValue = body.url;
    } else if (body.dataUrl && typeof body.dataUrl === 'string') {
      if (!body.dataUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'El contenido debe ser una imagen (data URL o base64)' });
      }
      fileValue = body.dataUrl;
    } else if (body.imageBase64 && typeof body.imageBase64 === 'string') {
      const mime = body.mimeType || 'image/jpeg';
      fileValue = `data:${mime};base64,${body.imageBase64}`;
      if (!fileValue.startsWith('data:image/')) {
        return res.status(400).json({ error: 'El contenido debe ser una imagen' });
      }
    } else {
      return res.status(400).json({ error: 'Body debe incluir url, dataUrl o imageBase64' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Body JSON inválido' });
  }

  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('file', fileValue);

  try {
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      const msg = errData?.error?.message || `Cloudinary: ${uploadRes.status}`;
      return res.status(502).json({ error: msg });
    }
    const result = await uploadRes.json();
    const url = result.secure_url;
    if (!url) {
      return res.status(502).json({ error: 'Cloudinary no devolvió URL' });
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ url });
  } catch (err) {
    console.error('upload-cover:', err);
    return res.status(500).json({ error: err?.message || 'Error al subir la imagen' });
  }
}
