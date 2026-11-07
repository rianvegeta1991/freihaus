// Fotos vor dem Hochladen verkleinern und neu kodieren. Das Neu-Kodieren über ein Canvas entfernt
// zugleich alle EXIF-Daten (GPS-Standort, Gerätename) – wichtig für den Datenschutz der Verkäufer.
const MAX_EDGE = 1600
const MAX_BYTES = 2 * 1024 * 1024

export async function compressImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    throw new Error('Bitte nur Fotos im Format JPG, PNG oder WebP hochladen.')
  }
  if (file.size > 25 * 1024 * 1024) throw new Error('Das Foto ist größer als 25 MB. Bitte ein kleineres wählen.')
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Dieses Foto konnte nicht gelesen werden. HEIC-Fotos bitte vorher als JPG exportieren.')
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale)), hgt = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = hgt
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Bildverarbeitung wird von diesem Browser nicht unterstützt.')
  ctx.drawImage(bmp, 0, 0, w, hgt)
  bmp.close()
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q))
  for (const q of [0.82, 0.7, 0.55]) {
    const b = (await toBlob('image/webp', q)) ?? (await toBlob('image/jpeg', q))
    if (b && b.size <= MAX_BYTES) return b
  }
  throw new Error('Das Foto ist auch nach dem Verkleinern zu groß. Bitte ein anderes wählen.')
}
