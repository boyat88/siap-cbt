import { useEffect, useRef, useState, type DragEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Loader2,
  RotateCcw,
  Upload,
} from 'lucide-react'
import { Alert, Badge, Button, Modal, cn, useToast } from './ui'
import { downloadExcelTemplate, readExcelFile } from '../lib/excel'

export interface ImportValidation<T> {
  row: number
  item?: T
  error?: string
}

interface ImportModalProps<T> {
  open: boolean
  onClose: () => void
  title: string
  description: string
  templateName: string
  templateHeaders: string[]
  templateSamples: (string | number)[][]
  note?: string
  previewColumns: { label: string }[]
  previewRow: (item: T) => (string | number)[]
  validate: (rows: Record<string, unknown>[]) => ImportValidation<T>[]
  onImport: (items: T[]) => void
  importLabel?: string
}

export function ImportModal<T>({
  open,
  onClose,
  title,
  description,
  templateName,
  templateHeaders,
  templateSamples,
  note,
  previewColumns,
  previewRow,
  validate,
  onImport,
  importLabel = 'Impor Data',
}: ImportModalProps<T>) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState<ImportValidation<T>[] | null>(null)
  const [fileError, setFileError] = useState('')

  useEffect(() => {
    if (!open) {
      setFileName('')
      setReading(false)
      setDragging(false)
      setResults(null)
      setFileError('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [open])

  const processFile = async (file: File) => {
    setFileError('')
    setResults(null)
    setFileName(file.name)
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setFileError('Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setFileError('Ukuran file terlalu besar. Maksimal 8 MB.')
      return
    }
    setReading(true)
    try {
      const rows = await readExcelFile(file)
      if (rows.length === 0) {
        setFileError('File tidak berisi data. Pastikan baris pertama adalah judul kolom.')
        return
      }
      const parsed = validate(rows)
      setResults(parsed)
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Gagal membaca file Excel.')
    } finally {
      setReading(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const resetFile = () => {
    setFileName('')
    setResults(null)
    setFileError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const validItems = results?.filter((r) => r.item).map((r) => r.item as T) ?? []
  const errorRows = results?.filter((r) => r.error) ?? []
  const validRows = results?.filter((r) => r.item) ?? []

  const handleTemplate = () => {
    downloadExcelTemplate(templateName, templateHeaders, templateSamples)
    toast('Template Excel berhasil diunduh.', 'success')
  }

  const confirm = () => {
    if (validItems.length === 0) {
      toast('Tidak ada data valid untuk diimpor.', 'error')
      return
    }
    onImport(validItems)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={confirm} disabled={validItems.length === 0 || reading}>
            <Upload size={14} /> {importLabel} {validItems.length > 0 ? `(${validItems.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Alert tone="info" title="Gunakan template agar format sesuai">
          {note || 'Unduh template, isi data sesuai kolom, lalu unggah kembali file Excel tersebut.'}{' '}
          Jangan mengubah nama kolom pada baris pertama template.
        </Alert>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FileSpreadsheet size={16} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-700">Template Excel</p>
              <p className="text-[9.5px] text-slate-400">{templateHeaders.length} kolom · .xlsx</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleTemplate}>
            <Download size={13} /> Unduh Template
          </Button>
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void processFile(file)
            }}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors',
              dragging
                ? 'border-brand-400 bg-brand-50/70'
                : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30',
            )}
          >
            {reading ? (
              <>
                <Loader2 size={24} className="animate-spin text-brand-500" />
                <p className="mt-2 text-xs font-semibold text-slate-700">Membaca file...</p>
              </>
            ) : fileName && !fileError ? (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet size={20} />
                </div>
                <p className="mt-2 max-w-full truncate text-xs font-semibold text-slate-700">{fileName}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Klik untuk mengganti file</p>
              </>
            ) : (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <FileUp size={20} />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-700">Klik atau seret file Excel ke sini</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Mendukung .xlsx, .xls, dan .csv · maksimal 8 MB</p>
              </>
            )}
          </div>
          {fileError && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[10.5px] text-rose-600">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              {fileError}
            </div>
          )}
        </div>

        {results && (
          <div className="animate-fade-up space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total Baris</p>
                <p className="mt-0.5 text-lg font-bold text-navy-950">{results.length}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-600">Valid</p>
                <p className="mt-0.5 text-lg font-bold text-emerald-700">{validRows.length}</p>
              </div>
              <div className={cn('rounded-lg border px-3 py-2', errorRows.length ? 'border-rose-100 bg-rose-50' : 'border-slate-100 bg-slate-50')}>
                <p className={cn('text-[9px] font-semibold uppercase tracking-wider', errorRows.length ? 'text-rose-500' : 'text-slate-400')}>Gagal</p>
                <p className={cn('mt-0.5 text-lg font-bold', errorRows.length ? 'text-rose-600' : 'text-slate-500')}>{errorRows.length}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-700">Pratinjau data valid</p>
              <button onClick={resetFile} className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700">
                <RotateCcw size={11} /> Ganti file
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-2">Baris</th>
                    {previewColumns.map((col) => (
                      <th key={col.label} className="px-3 py-2">{col.label}</th>
                    ))}
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validRows.slice(0, 6).map((row) => (
                    <tr key={row.row}>
                      <td className="px-3 py-2 font-mono text-[9px] text-slate-400">{row.row}</td>
                      {previewRow(row.item as T).map((cell, index) => (
                        <td key={index} className="max-w-[150px] truncate px-3 py-2 text-[10px] text-slate-600">{cell || '—'}</td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <Badge tone="emerald"><CheckCircle2 size={10} /> Valid</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validRows.length === 0 && (
                <p className="px-3 py-6 text-center text-[10.5px] text-slate-400">Tidak ada baris valid pada file ini.</p>
              )}
            </div>

            {errorRows.length > 0 && (
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold text-rose-700">
                  <AlertCircle size={13} /> {errorRows.length} baris perlu diperbaiki
                </p>
                <ul className="space-y-1">
                  {errorRows.slice(0, 6).map((row) => (
                    <li key={row.row} className="text-[10px] leading-relaxed text-rose-600">
                      <span className="font-semibold">Baris {row.row}:</span> {row.error}
                    </li>
                  ))}
                  {errorRows.length > 6 && (
                    <li className="text-[10px] italic text-rose-500">+{errorRows.length - 6} baris lainnya...</li>
                  )}
                </ul>
              </div>
            )}

            {validItems.length > 0 && (
              <p className="text-[10px] text-slate-400">
                {validItems.length} data valid siap diimpor. Baris yang gagal tidak akan dimasukkan dan dapat diperbaiki pada file.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
