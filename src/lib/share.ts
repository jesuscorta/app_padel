import { toBlob } from 'html-to-image'

type ShareResult = 'shared' | 'downloaded'

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareNodeAsImage(
  node: HTMLElement,
  fileName: string,
  title: string,
): Promise<ShareResult> {
  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#f6faf7',
  })

  if (!blob) throw new Error('No se pudo generar la imagen de la jornada')

  const file = new File([blob], fileName, { type: 'image/png' })
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
  }

  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    await nav.share({
      title,
      files: [file],
    })
    return 'shared'
  }

  downloadBlob(blob, fileName)
  return 'downloaded'
}
