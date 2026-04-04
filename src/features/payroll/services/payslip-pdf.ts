/**
 * Payslip PDF & Text Generator
 *
 * MANAGEMENT TOOL DISCLAIMER: This is not a licensed payroll processor.
 * Every document includes a disclaimer to verify with a qualified tax professional.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PayslipRecord, PayrollSettings, CountryPayrollProfile } from '../../../shared/types/payroll'

// ── Currency formatter ────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  const symbols: Record<string, string> = { NGN: '₦', KES: 'KSh', GHS: 'GH₵' }
  const sym = symbols[currency] ?? currency
  return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPeriod(period: string): string {
  const [y, m] = period.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// ── PDF Generation ────────────────────────────────────────────────────────────

export function generatePayslipPDF(
  payslip: PayslipRecord,
  settings: PayrollSettings,
  profile: CountryPayrollProfile,
  farmName: string,
  farmPhone?: string
): Blob {
  const doc = new jsPDF({ format: 'a5', orientation: 'portrait', unit: 'mm' })
  const W = 148  // A5 width mm
  const currency = profile.currency
  let y = 0

  // ── HEADER BAND ─────────────────────────────────────────────────────────────
  doc.setFillColor(45, 106, 79)  // primary-700 green
  doc.rect(0, 0, W, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(farmName, 8, 11)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  if (farmPhone) doc.text(farmPhone, 8, 17)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYSLIP', W - 8, 10, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(fmtPeriod(payslip.period), W - 8, 17, { align: 'right' })
  doc.text(`Pay date: ${settings.payDay}th`, W - 8, 22, { align: 'right' })

  y = 34

  // ── EMPLOYEE INFO ────────────────────────────────────────────────────────────
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(payslip.workerName, 8, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`Worker ID: ${payslip.workerId.slice(0, 8).toUpperCase()}`, 8, y)
  y += 9

  // ── EARNINGS TABLE ───────────────────────────────────────────────────────────
  const earningsRows = payslip.earnings.map(e => [e.name, fmt(e.amount, currency)])
  earningsRows.push(['GROSS PAY', fmt(payslip.grossPay, currency)])

  autoTable(doc, {
    startY: y,
    head: [['Earnings', 'Amount']],
    body: earningsRows,
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [239, 246, 242], textColor: [45, 106, 79], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.index === earningsRows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [239, 246, 242]
      }
    },
    margin: { left: 8, right: 8 },
  })

  y = (doc as any).lastAutoTable.finalY + 4

  // ── DEDUCTIONS TABLE ─────────────────────────────────────────────────────────
  const dedRows = payslip.deductions.map(d => [d.name, fmt(d.amount, currency)])
  dedRows.push(['TOTAL DEDUCTIONS', fmt(payslip.totalDeductions, currency)])

  autoTable(doc, {
    startY: y,
    head: [['Deductions', 'Amount']],
    body: dedRows,
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [254, 242, 242], textColor: [185, 28, 28], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 1: { halign: 'right' } },
    didParseCell: (data) => {
      if (data.row.index === dedRows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [254, 242, 242]
      }
    },
    margin: { left: 8, right: 8 },
  })

  y = (doc as any).lastAutoTable.finalY + 5

  // ── NET PAY BOX ──────────────────────────────────────────────────────────────
  doc.setFillColor(45, 106, 79)
  doc.roundedRect(8, y, W - 16, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('NET PAY', 14, y + 7.5)
  doc.setFontSize(11)
  doc.text(fmt(payslip.netPay, currency), W - 14, y + 7.5, { align: 'right' })
  y += 18

  // ── EMPLOYER CONTRIBUTIONS ───────────────────────────────────────────────────
  if (payslip.employerContributions.length > 0) {
    const erRows = payslip.employerContributions.map(c => [c.name, fmt(c.amount, currency)])
    erRows.push(['TOTAL EMPLOYER COST', fmt(payslip.totalEmployerCost, currency)])

    autoTable(doc, {
      startY: y,
      head: [['Employer Contributions', 'Amount']],
      body: erRows,
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: [100, 100, 100] },
      headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99], fontStyle: 'bold', fontSize: 7 },
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.row.index === erRows.length - 1) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.textColor = [30, 30, 30]
        }
      },
      margin: { left: 8, right: 8 },
    })

    y = (doc as any).lastAutoTable.finalY + 4
  }

  // ── ASSUMPTIONS ──────────────────────────────────────────────────────────────
  if (payslip.assumptions.length > 0) {
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.text('Assumptions:', 8, y)
    y += 4
    for (const a of payslip.assumptions) {
      const lines = doc.splitTextToSize(`• ${a}`, W - 16)
      doc.text(lines, 8, y)
      y += lines.length * 3.5
    }
    y += 2
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200)
  doc.line(8, y, W - 8, y)
  y += 4
  doc.setFontSize(6)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(150, 150, 150)
  const disclaimer = 'This payslip is generated by AgriManagerX as a management tool. Verify statutory deductions with a qualified tax professional.'
  const dLines = doc.splitTextToSize(disclaimer, W - 16)
  doc.text(dLines, 8, y)
  y += dLines.length * 3 + 2
  doc.text(`Tax rates: ${profile.countryName} — ${profile.sourceNotes.split('.')[0]}. Last verified: ${profile.lastVerified}`, 8, y, { maxWidth: W - 16 })

  return doc.output('blob')
}

// ── WhatsApp text summary ─────────────────────────────────────────────────────

export function generatePayslipText(
  payslip: PayslipRecord,
  profile: CountryPayrollProfile,
  farmName: string
): string {
  const currency = profile.currency
  const period = fmtPeriod(payslip.period)

  const earningsLines = payslip.earnings
    .map(e => `  ${e.name}: ${fmt(e.amount, currency)}`)
    .join('\n')

  const deductionLines = payslip.deductions
    .map(d => `  ${d.name}: ${fmt(d.amount, currency)}`)
    .join('\n')

  return [
    `📄 *Payslip — ${period}*`,
    farmName,
    '',
    `Employee: *${payslip.workerName}*`,
    '',
    '*Earnings*',
    earningsLines,
    `*Gross: ${fmt(payslip.grossPay, currency)}*`,
    '',
    '*Deductions*',
    deductionLines,
    `*Total: ${fmt(payslip.totalDeductions, currency)}*`,
    '',
    `💰 *Net Pay: ${fmt(payslip.netPay, currency)}*`,
    '',
    '_Generated by AgriManagerX — management tool only. Verify with a tax professional._',
  ].join('\n')
}
