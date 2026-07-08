import { GoogleGenAI } from '@google/genai'

export interface ExtractedDocumentData {
  vendor_name: string | null
  invoice_number: string | null
  document_date: string | null
  amount: number | null
  vat_amount: number | null
  confidence: number
}

const SYSTEM_PROMPT = `You are a financial document data extraction specialist.
Extract ONLY data that is explicitly present in the document. Do NOT guess or invent values.
If a field is not clearly present, return null for that field.

Return a JSON object with exactly these fields:
- vendor_name: string or null
- invoice_number: string or null (exactly as written, e.g. "INV-1234")
- document_date: string or null (YYYY-MM-DD format)
- amount: number or null (subtotal excluding VAT, no currency symbols)
- vat_amount: number or null (VAT/tax amount only, no currency symbols)
- confidence: number 0.0-1.0`

const EMPTY: ExtractedDocumentData = {
  vendor_name: null,
  invoice_number: null,
  document_date: null,
  amount: null,
  vat_amount: null,
  confidence: 0,
}

function parseExtracted(parsed: Record<string, unknown>): ExtractedDocumentData {
  return {
    vendor_name: typeof parsed.vendor_name === 'string' ? parsed.vendor_name.trim() || null : null,
    invoice_number: typeof parsed.invoice_number === 'string' ? parsed.invoice_number.trim() || null : null,
    document_date: typeof parsed.document_date === 'string' ? parsed.document_date.trim() || null : null,
    amount: parsed.amount != null && parsed.amount !== '' ? Number(parsed.amount) : null,
    vat_amount: parsed.vat_amount != null && parsed.vat_amount !== '' ? Number(parsed.vat_amount) : null,
    confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
  }
}

async function fetchBytes(url: string): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`fetchBytes: HTTP ${res.status} for ${url.slice(0, 80)}`)
      return null
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const mimeType = contentType.split(';')[0].trim()
    const buffer = await res.arrayBuffer()
    return { buffer, mimeType }
  } catch (err) {
    console.error('fetchBytes error:', err)
    return null
  }
}

export async function extractDocumentData(
  fileUrl: string,
  fileType: string,
  documentType: string
): Promise<ExtractedDocumentData> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set — AI extraction skipped')
    return EMPTY
  }

  // Initialize client (picks up GEMINI_API_KEY dynamically from process.env)
  const ai = new GoogleGenAI({})
  const label = documentType.replace('_', ' ')

  try {
    const file = await fetchBytes(fileUrl)
    if (!file) {
      console.error(`Could not fetch file for extraction: ${fileUrl.slice(0, 80)}`)
      return EMPTY
    }

    const base64 = Buffer.from(file.buffer).toString('base64')

    // Call the model with structured JSON enforcement
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Multimodal model perfect for fast parsing of images, CSV text, and PDFs
      contents: [
        {
          inlineData: {
            data: base64,
            mimeType: file.mimeType,
          },
        },
        `Extract all financial data from this ${label}.`,
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    })

    const text = res.text
    if (!text) return EMPTY
    return parseExtracted(JSON.parse(text))
  } catch (err) {
    console.error('AI extraction failed:', err)
    return EMPTY
  }
}

// ── AI Insights ───────────────────────────────────────────────────────────────
export async function generateAiInsights(reportData: {
  total_amount: number
  total_documents: number
  by_vendor: Array<{ vendor_name: string; count: number; total_amount: number }>
  by_month: Array<{ month: string; count: number; total_amount: number }>
  duplicates_count: number
  pending_count: number
}): Promise<Array<{ type: string; title: string; description: string; severity: string }>> {
  if (!process.env.GEMINI_API_KEY) {
    return generateRuleBasedInsights(reportData)
  }

  const ai = new GoogleGenAI({})

  try {
    const prompt = `Analyze this document management financial data and provide 4-6 concise, actionable insights.

Total Documents: ${reportData.total_documents}
Total Amount: R${reportData.total_amount.toLocaleString()}
Duplicates Detected: ${reportData.duplicates_count}
Pending Approvals: ${reportData.pending_count}
Top Vendors: ${reportData.by_vendor.slice(0, 5).map(v => `${v.vendor_name}: R${v.total_amount.toLocaleString()} (${v.count} docs)`).join(' | ')}
Monthly Trend (last 6 months): ${reportData.by_month.slice(-6).map(m => `${m.month}: R${m.total_amount.toLocaleString()}`).join(' | ')}

Return a JSON object with a single key "insights" containing an array. Each item must have:
- type: one of "anomaly", "trend", "spending", "duplicate_risk"
- title: short descriptive title
- description: 1-2 sentence actionable description
- severity: one of "info", "warning", "critical"`

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a financial analyst providing concise insights on document management data.',
        responseMimeType: 'application/json',
      },
    })

    const text = res.text
    if (!text) return generateRuleBasedInsights(reportData)

    const parsed = JSON.parse(text)
    const insights = parsed.insights ?? parsed
    return Array.isArray(insights) ? insights : generateRuleBasedInsights(reportData)
  } catch {
    return generateRuleBasedInsights(reportData)
  }
}

function generateRuleBasedInsights(data: {
  total_amount: number
  total_documents: number
  by_vendor: Array<{ vendor_name: string; count: number; total_amount: number }>
  duplicates_count: number
  pending_count: number
}) {
  const insights = []

  if (data.duplicates_count > 0) {
    insights.push({
      type: 'duplicate_risk',
      title: `${data.duplicates_count} Duplicate Document${data.duplicates_count > 1 ? 's' : ''} Detected`,
      description: `${data.duplicates_count} document(s) match an existing invoice number or vendor/amount combination. Review and reject to prevent double payments.`,
      severity: 'critical',
    })
  }

  if (data.pending_count > 5) {
    insights.push({
      type: 'trend',
      title: 'High Approval Backlog',
      description: `${data.pending_count} documents are awaiting approval. Consider assigning additional approvers to reduce processing time.`,
      severity: 'warning',
    })
  }

  if (data.by_vendor.length > 0 && data.total_amount > 0) {
    const top = data.by_vendor[0]
    const pct = ((top.total_amount / data.total_amount) * 100).toFixed(1)
    insights.push({
      type: 'spending',
      title: 'Top Vendor Concentration',
      description: `${top.vendor_name} accounts for ${pct}% of total spend (R${top.total_amount.toLocaleString()}).`,
      severity: Number(pct) > 50 ? 'warning' : 'info',
    })
  }

  insights.push({
    type: 'trend',
    title: 'Processing Summary',
    description: `${data.total_documents} document${data.total_documents !== 1 ? 's' : ''} totalling R${data.total_amount.toLocaleString()} processed in this period.`,
    severity: 'info',
  })

  return insights
}