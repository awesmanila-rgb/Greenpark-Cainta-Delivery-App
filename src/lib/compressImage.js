// Resizes an image file down to a max dimension and re-encodes it as
// JPEG at moderate quality, entirely in the browser — keeps product
// photo uploads small for merchants on slow/patchy mobile data.

const MAX_DIMENSION = 800
const JPEG_QUALITY = 0.75

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.onload = () => {
      img.onerror = () => reject(new Error('Could not read the selected image.'))
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not process the image.'))
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          JPEG_QUALITY
        )
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
