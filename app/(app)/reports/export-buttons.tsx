'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface ExportData {
  docs: Array<{
    id: string
    vendor_name: string
    invoice_number: string
    document_type: string
    status: string
    amount: number
    vat_amount: number
    currency: string
    document_date: string
    is_duplicate: boolean
    created_at: string
  }>
  byVendor: Array<{ vendor_name: string; count: number; total_amount: number; total_vat: number }>
  byMonth: Array<{ month: string; count: number; total_amount: number }>
  byStatus: Array<{ status: string; count: number; total_amount: number }>
}

export function ExportButtons({
  reportData,
  filters,
}: {
  reportData: ExportData
  filters: Record<string, string | undefined>
}) {
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  async function exportExcel() {
    setExportingExcel(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // Documents sheet
      const docsData = reportData.docs.map((d) => ({
        'File Name': d.id,
        'Vendor': d.vendor_name || '',
        'Invoice #': d.invoice_number || '',
        'Type': d.document_type,
        'Status': d.status,
        'Date': d.document_date || '',
        'Amount': d.amount || 0,
        'VAT': d.vat_amount || 0,
        'Total': (d.amount || 0) + (d.vat_amount || 0),
        'Currency': d.currency,
        'Duplicate': d.is_duplicate ? 'Yes' : 'No',
        'Uploaded': d.created_at,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(docsData), 'Documents')

      // Vendor summary
      const vendorData = reportData.byVendor.map((v) => ({
        'Vendor': v.vendor_name,
        'Document Count': v.count,
        'Total Amount': v.total_amount,
        'Total VAT': v.total_vat,
        'Total Incl. VAT': v.total_amount + v.total_vat,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendorData), 'Vendor Summary')

      // Monthly summary
      const monthData = reportData.byMonth.map((m) => ({
        'Month': m.month,
        'Document Count': m.count,
        'Total Amount': m.total_amount,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthData), 'Monthly Summary')

      // Status summary
      const statusData = reportData.byStatus.map((s) => ({
        'Status': s.status,
        'Count': s.count,
        'Total Amount': s.total_amount,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statusData), 'Status Summary')

      XLSX.writeFile(wb, `DocManager_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (err) {
      console.error('Excel export failed:', err)
    } finally {
      setExportingExcel(false)
    }
  }

  async function exportPdf() {
    setExportingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW = doc.internal.pageSize.getWidth()
      let y = 20

      // Title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Document Management Report', pageW / 2, y, { align: 'center' })
      y += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, pageW / 2, y, { align: 'center' })
      y += 16

      // Summary
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0)
      doc.text('Summary', 20, y)
      y += 8

      const totalAmount = reportData.docs.reduce((s, d) => s + (d.amount || 0), 0)
      const totalVat = reportData.docs.reduce((s, d) => s + (d.vat_amount || 0), 0)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const summaryLines = [
        `Total Documents: ${reportData.docs.length}`,
        `Total Amount (excl. VAT): R${totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `Total VAT: R${totalVat.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
        `Total Incl. VAT: R${(totalAmount + totalVat).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      ]
      summaryLines.forEach((line) => {
        doc.text(line, 20, y)
        y += 6
      })
      y += 10

      // Vendor table
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Vendor Analysis', 20, y)
      y += 8

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setFillColor(99, 102, 241)
      doc.setTextColor(255)
      doc.rect(20, y - 5, pageW - 40, 7, 'F')
      doc.text('Vendor', 22, y)
      doc.text('Count', 110, y)
      doc.text('Amount', 130, y)
      doc.text('VAT', 155, y)
      doc.text('Total', 175, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0)

      reportData.byVendor.slice(0, 20).forEach((v, i) => {
        if (y > 270) { doc.addPage(); y = 20 }
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(20, y - 4, pageW - 40, 6, 'F')
        }
        doc.text(v.vendor_name.slice(0, 35), 22, y)
        doc.text(String(v.count), 110, y)
        doc.text(`R${v.total_amount.toFixed(0)}`, 130, y)
        doc.text(`R${v.total_vat.toFixed(0)}`, 155, y)
        doc.text(`R${(v.total_amount + v.total_vat).toFixed(0)}`, 175, y)
        y += 6
      })

      doc.save(`DocManager_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" loading={exportingExcel} onClick={exportExcel}>
        <Download className="h-4 w-4" />
        Export Excel
      </Button>
      <Button variant="outline" size="sm" loading={exportingPdf} onClick={exportPdf}>
        <Download className="h-4 w-4" />
        Export PDF
      </Button>
    </div>
  )
}
