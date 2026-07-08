'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { uploadDocument, triggerAiExtraction } from '@/app/actions/documents'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Upload, FileText, X, Sparkles } from 'lucide-react'
import Link from 'next/link'

const ACCEPTED_TYPES = '.pdf,.csv,.jpg,.jpeg,.png,.webp,.gif'

export default function UploadPage() {
  const [state, action, pending] = useActionState(uploadDocument, undefined)
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.success && state.documentId) {
      // Trigger AI extraction after upload
      setExtracting(true)
      triggerAiExtraction(state.documentId).finally(() => setExtracting(false))
    }
  }, [state])

  function handleFileChange(file: File | null) {
    setSelectedFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileChange(file)
      // Set the file to the input
      const dt = new DataTransfer()
      dt.items.add(file)
      if (fileInputRef.current) fileInputRef.current.files = dt.files
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload invoices or credit notes. AI will automatically extract the key data.
        </p>
      </div>

      {/* Success state */}
      {state?.success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{state.success}</p>
              {extracting && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-green-700">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  AI is extracting document data…
                </p>
              )}
              {!extracting && state.documentId && (
                <p className="mt-2">
                  <Link
                    href={`/documents/${state.documentId}`}
                    className="text-sm font-medium text-green-700 underline hover:text-green-800"
                  >
                    View document →
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={action} className="space-y-6">
            {/* Document type */}
            <Select
              id="document_type"
              name="document_type"
              label="Document Type"
              placeholder="Select type…"
              required
              options={[
                { value: 'invoice', label: 'Invoice' },
                { value: 'credit_note', label: 'Credit Note' },
              ]}
            />

            {/* Drop zone */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                File <span className="text-gray-400">(PDF, CSV, JPG, PNG, WebP, GIF — max 20MB)</span>
              </label>
              <div
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? 'border-indigo-400 bg-indigo-50'
                    : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  name="file"
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="sr-only"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  required
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3 text-center">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ml-2 rounded p-1 hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-3 h-8 w-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Drop your file here, or click to browse
                    </p>
                    <p className="mt-1 text-xs text-gray-500">PDF, CSV, JPG, PNG, WebP, GIF</p>
                  </>
                )}
              </div>
            </div>

            <Button type="submit" loading={pending} disabled={pending || extracting} className="w-full" size="lg">
              <Upload className="h-4 w-4" />
              {pending ? 'Uploading…' : 'Upload & Extract Data'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="rounded-xl bg-indigo-50 p-4">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-indigo-900">AI-Powered Extraction</p>
            <p className="mt-1 text-sm text-indigo-700">
              After upload, our AI automatically extracts vendor name, invoice number, date, amount, and VAT. 
              Duplicate documents are also automatically detected.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
