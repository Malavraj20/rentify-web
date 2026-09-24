const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024

const ACCEPTED_MIME_PREFIXES = ['image/', 'application/pdf']

export function isAcceptedDocumentFile(file: File): boolean {
  return ACCEPTED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))
}

export function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isAcceptedDocumentFile(file)) {
      reject(new Error('Please choose an image or PDF file.'))
      return
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      reject(new Error('File must be smaller than 8 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}
