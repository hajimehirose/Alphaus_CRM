'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, File, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FileUploadProps {
  customerId: string
  onUploadSuccess: () => void
}

export default function FileUpload({ customerId, onUploadSuccess }: FileUploadProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `File size must be less than ${maxSize / 1024 / 1024}MB`,
      })
      return
    }

    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(`/api/customers/${customerId}/attachments/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          variant: 'success',
          title: 'Success',
          description: 'File uploaded successfully',
        })
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        onUploadSuccess()
      } else {
        throw new Error(data.error || 'Failed to upload file')
      }
    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload file. Please try again.',
      })
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 dark:border-gray-700'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <File className="h-8 w-8 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null)
                if (fileInputRef.current) {
                  fileInputRef.current.value = ''
                }
              }}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-sm font-medium">
                Drag and drop a file here, or{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum file size: 10MB
              </p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {selectedFile && (
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </>
          )}
        </Button>
      )}
    </div>
  )
}

