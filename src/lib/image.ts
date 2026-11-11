const MAX_FILE_SIZE = 8 * 1024 * 1024

export interface ImageProcessOptions {
  /** Ukuran sisi terpanjang gambar hasil (px). */
  maxSize?: number
  /** Kualitas kompresi 0-1 untuk JPEG/WebP. */
  quality?: number
  /** Format hasil. Gunakan PNG untuk logo agar transparansi tetap terjaga. */
  mimeType?: 'image/jpeg' | 'image/png'
  /** Potong gambar menjadi persegi dari bagian tengah (cocok untuk foto profil). */
  cropSquare?: boolean
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gambar tidak dapat dibaca. Gunakan file JPG, PNG, atau WebP.'))
    image.src = src
  })
}

export async function readImageAsDataUrl(
  file: File,
  options: ImageProcessOptions = {},
): Promise<string> {
  const { maxSize = 256, quality = 0.8, mimeType = 'image/jpeg', cropSquare = true } = options

  if (!file.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan gambar.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Ukuran gambar terlalu besar. Maksimal 8 MB.')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const sourceWidth = image.naturalWidth || image.width
    const sourceHeight = image.naturalHeight || image.height
    if (!sourceWidth || !sourceHeight) throw new Error('Ukuran gambar tidak valid.')

    let sx = 0
    let sy = 0
    let sw = sourceWidth
    let sh = sourceHeight

    if (cropSquare) {
      const side = Math.min(sourceWidth, sourceHeight)
      sx = (sourceWidth - side) / 2
      sy = (sourceHeight - side) / 2
      sw = side
      sh = side
    }

    const scale = Math.min(1, maxSize / Math.max(sw, sh))
    const width = Math.max(1, Math.round(sw * scale))
    const height = Math.max(1, Math.round(sh * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Perangkat tidak mendukung pengolahan gambar.')

    if (mimeType === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
    }
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)

    return canvas.toDataURL(mimeType, quality)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Membuat area putih pada gambar (kertas/scan tanda tangan) menjadi transparan.
 * Cocok dipakai untuk tanda tangan agar menyatu dengan latar laporan.
 */
export async function removeWhiteBackground(dataUrl: string, threshold = 236): Promise<string> {
  try {
    const image = await loadImage(dataUrl)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    if (!width || !height) return dataUrl

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return dataUrl

    context.drawImage(image, 0, 0, width, height)
    const imageData = context.getImageData(0, 0, width, height)
    const pixels = imageData.data
    const feather = 30

    for (let index = 0; index < pixels.length; index += 4) {
      const brightness = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3
      if (brightness >= threshold) {
        pixels[index + 3] = 0
      } else if (brightness >= threshold - feather) {
        const factor = (threshold - brightness) / feather
        pixels[index + 3] = Math.round(pixels[index + 3] * factor)
      }
    }

    context.putImageData(imageData, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return dataUrl
  }
}
