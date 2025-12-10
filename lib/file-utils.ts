import { formatFileSize } from './file-parser'

export function getFileIcon(fileType: string | null, filename?: string | null): string {
  if (!fileType && !filename) return '📄'
  
  const type = (fileType || '').toLowerCase()
  const name = (filename || '').toLowerCase()
  
  // Images
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) {
    return '🖼️'
  }
  
  // PDFs
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return '📕'
  }
  
  // Documents
  if (type.includes('word') || /\.(doc|docx)$/.test(name)) {
    return '📘'
  }
  if (type.includes('excel') || type.includes('spreadsheet') || /\.(xls|xlsx|csv)$/.test(name)) {
    return '📗'
  }
  if (type.includes('powerpoint') || /\.(ppt|pptx)$/.test(name)) {
    return '📙'
  }
  if (type.includes('text') || /\.(txt|md)$/.test(name)) {
    return '📄'
  }
  
  // Archives
  if (type.includes('zip') || type.includes('rar') || /\.(zip|rar|7z|tar|gz)$/.test(name)) {
    return '📦'
  }
  
  // Code
  if (/\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml)$/.test(name)) {
    return '💻'
  }
  
  // Video
  if (type.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm)$/.test(name)) {
    return '🎥'
  }
  
  // Audio
  if (type.startsWith('audio/') || /\.(mp3|wav|flac|aac|ogg)$/.test(name)) {
    return '🎵'
  }
  
  return '📎'
}

export { formatFileSize }


