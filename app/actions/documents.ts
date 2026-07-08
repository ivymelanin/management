'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DocumentStatus, DocumentType } from '@/lib/types'

export type DocumentFormState =
  | { error?: string; success?: string; documentId?: string }
  | undefined

// ── Upload & create document ──────────────────────────────────────────────────
export async function uploadDocument(
  prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const file = formData.get('file') as File | null
  const documentType = formData.get('document_type') as DocumentType

  if (!file || file.size === 0) return { error: 'Please select a file.' }
  if (!documentType) return { error: 'Please select a document type.' }

  // Validate file type
  const allowed = ['application/pdf', 'text/csv', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowedExt = ['pdf', 'csv', 'jpg', 'jpeg', 'png', 'webp', 'gif']
  if (!allowed.includes(file.type) && !allowedExt.includes(ext ?? '')) {
    return { error: 'Only PDF, CSV, and image files (JPG, PNG, WebP, GIF) are allowed.' }
  }

  // Max 20MB
  if (file.size > 20 * 1024 * 1024) {
    return { error: 'File size must be under 20MB.' }
  }

  // Upload to Supabase Storage using admin client (bypasses storage RLS)
  const admin = createAdminClient()
  const filePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const { error: uploadError } = await admin.storage
    .from('documents')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  // Generate a signed URL valid for 10 years (bucket is private)
  const { data: signedData, error: signedError } = await admin.storage
    .from('documents')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10)

  if (signedError || !signedData?.signedUrl) {
    return { error: 'Failed to generate file URL after upload.' }
  }

  const fileUrl = signedData.signedUrl

  // Check for duplicates by invoice number (will be set after AI extraction)
  // Insert document record
  const { data: doc, error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      file_name: file.name,
      file_url: fileUrl,
      file_type: file.type || `application/${ext}`,
      document_type: documentType,
      status: 'pending',
      currency: 'ZAR',
    })
    .select()
    .single()

  if (insertError) {
    return { error: `Failed to save document: ${insertError.message}` }
  }

  revalidatePath('/dashboard')
  revalidatePath('/documents')

  return { success: 'Document uploaded successfully!', documentId: doc.id }
}

// ── Trigger AI extraction ─────────────────────────────────────────────────────
export async function triggerAiExtraction(documentId: string): Promise<DocumentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: doc } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (!doc) return { error: 'Document not found.' }

  try {
    const { extractDocumentData } = await import('@/lib/ai/extractor')
    console.log(`[AI] Starting extraction for document ${documentId}, type: ${doc.file_type}`)
    const extracted = await extractDocumentData(doc.file_url, doc.file_type, doc.document_type)
    console.log(`[AI] Extraction result:`, JSON.stringify(extracted))

    // Check for duplicate invoice numbers (normalise to uppercase, trim whitespace)
    let isDuplicate = false
    let duplicateOf = null

    if (extracted.invoice_number) {
      const normInvoice = extracted.invoice_number.trim().toUpperCase()
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .ilike('invoice_number', normInvoice)
        .neq('id', documentId)
        .limit(1)

      if (existing && existing.length > 0) {
        isDuplicate = true
        duplicateOf = existing[0].id
      }
    }

    // Secondary duplicate check: same vendor + same amount (within 1 cent)
    if (!isDuplicate && extracted.vendor_name && extracted.amount != null) {
      const { data: existingVendor } = await supabase
        .from('documents')
        .select('id')
        .ilike('vendor_name', extracted.vendor_name.trim())
        .eq('amount', extracted.amount)
        .neq('id', documentId)
        .limit(1)

      if (existingVendor && existingVendor.length > 0) {
        isDuplicate = true
        duplicateOf = existingVendor[0].id
      }
    }

    await supabase
      .from('documents')
      .update({
        vendor_name: extracted.vendor_name,
        invoice_number: extracted.invoice_number
          ? extracted.invoice_number.trim().toUpperCase()
          : null,
        document_date: extracted.document_date,
        amount: extracted.amount,
        vat_amount: extracted.vat_amount,
        ai_extracted: true,
        ai_confidence: extracted.confidence,
        is_duplicate: isDuplicate,
        duplicate_of: duplicateOf,
        status: isDuplicate ? 'pending' : 'under_review',
      })
      .eq('id', documentId)

    revalidatePath('/documents')
    revalidatePath(`/documents/${documentId}`)

    return {
      success: isDuplicate
        ? 'Data extracted. Warning: This appears to be a duplicate document.'
        : 'AI extraction complete.',
    }
  } catch (err) {
    return { error: `AI extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}

// ── Approval action ───────────────────────────────────────────────────────────
export async function processApproval(
  documentId: string,
  step: 1 | 2 | 3,
  action: 'approved' | 'rejected',
  comments: string
): Promise<DocumentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'approver'].includes(profile.role)) {
    return { error: 'You do not have permission to approve documents.' }
  }

  // Update approval step
  const { error: stepError } = await supabase
    .from('approval_steps')
    .update({
      status: action,
      approver_id: user.id,
      comments: comments || null,
      actioned_at: new Date().toISOString(),
    })
    .eq('document_id', documentId)
    .eq('step', step)

  if (stepError) return { error: stepError.message }

  // Determine new document status
  let newStatus: DocumentStatus
  if (action === 'rejected') {
    newStatus = 'rejected'
  } else {
    if (step === 1) newStatus = 'approved_1'
    else if (step === 2) newStatus = 'approved_2'
    else newStatus = 'approved'
  }

  const { error: docError } = await supabase
    .from('documents')
    .update({ status: newStatus })
    .eq('id', documentId)

  if (docError) return { error: docError.message }

  revalidatePath('/documents')
  revalidatePath(`/documents/${documentId}`)
  revalidatePath('/dashboard')

  return { success: `Document ${action} at step ${step}.` }
}

// ── Delete document ───────────────────────────────────────────────────────────
export async function deleteDocument(documentId: string): Promise<DocumentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Only admins can delete documents.' }
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('file_url, user_id')
    .eq('id', documentId)
    .single()

  if (!doc) return { error: 'Document not found.' }

  // Delete from storage
  const urlParts = doc.file_url.split('/documents/')
  if (urlParts[1]) {
    await supabase.storage.from('documents').remove([urlParts[1]])
  }

  const { error } = await supabase.from('documents').delete().eq('id', documentId)
  if (error) return { error: error.message }

  revalidatePath('/documents')
  revalidatePath('/dashboard')
  redirect('/documents')
}

// ── Update user role (admin only) ─────────────────────────────────────────────
export async function updateUserRole(userId: string, role: string): Promise<DocumentFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Only admins can change roles.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: 'Role updated.' }
}
