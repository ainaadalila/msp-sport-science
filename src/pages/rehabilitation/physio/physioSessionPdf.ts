import { jsPDF } from 'jspdf'

export interface PrintableSession {
  slot_date: string
  diagnosis: string | null
  date_of_injury: string | null
  referred_by: string | null
  chief_complaint: string | null
  injury_type: string | null
  assessment_notes: string | null
  rehab_plan: string | null
  pain_scale: number | null
  target_muscle: string | null
  attendance_status: 'scheduled' | 'arrived' | 'completed' | 'no_show'
  athlete?: { name: string; sport?: { name: string } } | null
}

const STATUS_LABEL: Record<string, string> = { scheduled: '-', arrived: 'Hadir', completed: 'Selesai', no_show: 'Tidak Hadir' }

const M = 16

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function newDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

// Draws one session starting at the top of the current page. Long notes
// continue onto following pages instead of running off the bottom.
function renderSession(pdf: jsPDF, slot: PrintableSession, subtitle?: string) {
  const PW = pdf.internal.pageSize.getWidth()
  const PH = pdf.internal.pageSize.getHeight()
  const CW = PW - M * 2
  let y = M

  const checkPage = (needed: number) => {
    if (y + needed > PH - M) { pdf.addPage(); y = M }
  }

  // Header
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(245, 106, 0)
  pdf.text(subtitle ? `CATATAN SESI FISIOTERAPI  ·  ${subtitle}` : 'CATATAN SESI FISIOTERAPI', M, y); y += 7

  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
  pdf.text(slot.athlete?.name ?? 'Tiada Atlet', M, y); y += 7

  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
  pdf.text(`${slot.athlete?.sport?.name ?? ''}   ${fmtDate(slot.slot_date)}`, M, y); y += 5

  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 8

  function sectionLabel(text: string) {
    checkPage(10)
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(136, 136, 136)
    pdf.text(text, M, y); y += 5
  }

  function fieldRow(label: string, value: string | null | undefined, multiline = false) {
    if (!value && value !== '0') return
    checkPage(11)
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
    pdf.text(label.toUpperCase(), M, y); y += 4
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(34, 34, 34)
    if (multiline) {
      const lines: string[] = pdf.splitTextToSize(value, CW)
      lines.forEach(line => {
        checkPage(5)
        pdf.text(line, M, y); y += 5
      })
      y += 3
    } else {
      pdf.text(value, M, y); y += 7
    }
  }

  sectionLabel('MAKLUMAT SESI')
  fieldRow('Diagnosis', slot.diagnosis)
  fieldRow('Tarikh Kecederaan', slot.date_of_injury ? fmtDate(slot.date_of_injury) : null)
  fieldRow('Dirujuk Oleh', slot.referred_by)
  y += 2

  checkPage(16)
  pdf.setDrawColor(240, 240, 240); pdf.setLineWidth(0.3); pdf.line(M, y, PW - M, y); y += 6
  sectionLabel('CATATAN SESI')
  fieldRow('Keluhan Utama (COC)', slot.chief_complaint, true)
  fieldRow('Jenis Kecederaan', slot.injury_type, true)
  fieldRow('Nota Penilaian / Nota Kemajuan', slot.assessment_notes, true)
  fieldRow('Pelan Rehabilitasi / Jenis Rawatan', slot.rehab_plan, true)

  // Pain scale + attendance boxes
  checkPage(20)
  const colW = (CW - 4) / 2
  if (slot.pain_scale !== null) {
    pdf.setFillColor(245, 245, 247); pdf.roundedRect(M, y, colW, 14, 1.5, 1.5, 'F')
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
    pdf.text('SKALA KESAKITAN', M + 3, y + 5.5)
    pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
    pdf.text(`${slot.pain_scale} / 10`, M + 3, y + 12)
  }
  pdf.setFillColor(245, 245, 247); pdf.roundedRect(M + colW + 4, y, colW, 14, 1.5, 1.5, 'F')
  pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
  pdf.text('STATUS KEHADIRAN', M + colW + 7, y + 5.5)
  pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
  pdf.text(STATUS_LABEL[slot.attendance_status ?? 'scheduled'], M + colW + 7, y + 12)
  y += 20

  fieldRow('Otot Sasaran', slot.target_muscle, true)
}

function addPageNumbers(pdf: jsPDF) {
  const total = pdf.getNumberOfPages()
  if (total < 2) return
  const PW = pdf.internal.pageSize.getWidth()
  const PH = pdf.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i)
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(170, 170, 170)
    pdf.text(`Halaman ${i} / ${total}`, PW - M, PH - 8, { align: 'right' })
  }
}

export function buildSessionPdf(slot: PrintableSession): jsPDF {
  const pdf = newDoc()
  renderSession(pdf, slot)
  addPageNumbers(pdf)
  return pdf
}

// Summary page listing every selected session, then each session on its own
// page, oldest first.
export function buildSessionsPdf(slots: PrintableSession[]): jsPDF {
  const sorted = [...slots].sort((a, b) => a.slot_date.localeCompare(b.slot_date))
  const pdf = newDoc()
  const PW = pdf.internal.pageSize.getWidth()
  const PH = pdf.internal.pageSize.getHeight()
  const CW = PW - M * 2
  const athlete = sorted[0]?.athlete
  let y = M

  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(245, 106, 0)
  pdf.text('REKOD SESI FISIOTERAPI', M, y); y += 7
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17)
  pdf.text(athlete?.name ?? 'Tiada Atlet', M, y); y += 7
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136)
  const range = sorted.length > 1
    ? `${fmtDate(sorted[0].slot_date)} – ${fmtDate(sorted[sorted.length - 1].slot_date)}`
    : fmtDate(sorted[0].slot_date)
  pdf.text(`${athlete?.sport?.name ?? ''}   ${sorted.length} sesi   ${range}`, M, y); y += 5
  pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.4); pdf.line(M, y, PW - M, y); y += 8

  // Session index table
  const cols = [
    { label: 'Bil.', w: CW * 0.08 },
    { label: 'Tarikh', w: CW * 0.2 },
    { label: 'Diagnosis', w: CW * 0.28 },
    { label: 'Jenis Kecederaan', w: CW * 0.28 },
    { label: 'Kehadiran', w: CW * 0.16 },
  ]
  const xs: number[] = [M]
  for (let i = 0; i < cols.length - 1; i++) xs.push(xs[i] + cols[i].w)

  const drawHeader = () => {
    pdf.setFillColor(249, 250, 251); pdf.rect(M, y, CW, 7, 'F')
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(85, 85, 85)
    cols.forEach((c, i) => pdf.text(c.label.toUpperCase(), xs[i] + 2, y + 4.8))
    y += 7
  }
  drawHeader()

  const clip = (text: string, w: number) => {
    const lines: string[] = pdf.splitTextToSize(text, w - 4)
    return lines.length > 1 ? lines[0].replace(/\s*\S*$/, '') + '…' : lines[0] ?? ''
  }

  sorted.forEach((s, i) => {
    if (y + 7 > PH - M) { pdf.addPage(); y = M; drawHeader() }
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(34, 34, 34)
    const cells = [
      String(i + 1),
      fmtDate(s.slot_date),
      s.diagnosis || '-',
      s.injury_type || '-',
      STATUS_LABEL[s.attendance_status ?? 'scheduled'],
    ]
    cells.forEach((c, ci) => pdf.text(clip(c, cols[ci].w), xs[ci] + 2, y + 4.8))
    pdf.setDrawColor(243, 244, 246); pdf.setLineWidth(0.2); pdf.line(M, y + 7, M + CW, y + 7)
    y += 7
  })

  sorted.forEach((s, i) => {
    pdf.addPage()
    renderSession(pdf, s, `SESI ${i + 1} DARIPADA ${sorted.length}`)
  })

  addPageNumbers(pdf)
  return pdf
}

export function sessionPdfFileName(slots: PrintableSession[]) {
  const dates = slots.map(s => s.slot_date).sort()
  const name = slots[0]?.athlete?.name ?? 'Atlet'
  if (dates.length === 1) return `Catatan_Fisioterapi_${name}_${dates[0]}.pdf`
  return `Catatan_Fisioterapi_${name}_${dates[0]}_hingga_${dates[dates.length - 1]}.pdf`
}
