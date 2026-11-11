import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AttendanceSession, CbtAttempt, CbtExam } from './src/types'

interface AttendanceStore {
  updatedAt: string
  sessions: AttendanceSession[]
  /** ID sesi yang dihapus administrator beserta waktu penghapusannya. */
  deleted?: Record<string, string>
}

function createAttendanceApi(): Plugin {
  const file = resolve(process.cwd(), 'server-data', 'attendance.json')

  const readStore = (): AttendanceStore => {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<AttendanceStore>
      return {
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
        sessions: Array.isArray(parsed.sessions) ? (parsed.sessions as AttendanceSession[]) : [],
        deleted:
          parsed.deleted && typeof parsed.deleted === 'object'
            ? (parsed.deleted as Record<string, string>)
            : {},
      }
    } catch {
      return { updatedAt: '', sessions: [], deleted: {} }
    }
  }

  const writeStore = (store: AttendanceStore) => {
    mkdirSync(dirname(file), { recursive: true })
    const temp = `${file}.tmp`
    writeFileSync(temp, JSON.stringify(store, null, 2), 'utf8')
    renameSync(temp, file)
  }

  const sendJson = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(body))
  }

  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolveBody, reject) => {
      let size = 0
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 8 * 1024 * 1024) {
          reject(new Error('Ukuran data terlalu besar.'))
          req.destroy()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })

  const isValidSession = (value: unknown): value is AttendanceSession => {
    if (!value || typeof value !== 'object') return false
    const session = value as Partial<AttendanceSession>
    return (
      typeof session.id === 'string' &&
      session.id.length > 0 &&
      typeof session.date === 'string' &&
      typeof session.classId === 'string' &&
      typeof session.updatedAt === 'string' &&
      typeof session.records === 'object' &&
      session.records !== null
    )
  }

  return {
    name: 'siap-attendance-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/attendance')) {
          next()
          return
        }

        const url = new URL(req.url, 'http://localhost')

        try {
          if (req.method === 'GET') {
            const store = readStore()
            sendJson(res, 200, store)
            return
          }

          if (req.method === 'DELETE') {
            const id = url.searchParams.get('id')
            const store = readStore()
            const now = new Date().toISOString()
            if (id) {
              store.sessions = store.sessions.filter((session) => session.id !== id)
              store.deleted = { ...(store.deleted ?? {}), [id]: now }
            } else {
              for (const session of store.sessions) {
                store.deleted = { ...(store.deleted ?? {}), [session.id]: now }
              }
              store.sessions = []
            }
            store.updatedAt = now
            writeStore(store)
            sendJson(res, 200, { ok: true, count: store.sessions.length })
            return
          }

          if (req.method === 'POST') {
            const raw = await readBody(req)
            const payload = JSON.parse(raw || '{}') as {
              sessions?: AttendanceSession[]
              session?: AttendanceSession
              submittedBy?: { id?: string; name?: string; role?: string }
            }
            const incoming = Array.isArray(payload.sessions)
              ? payload.sessions
              : payload.session
                ? [payload.session]
                : []

            if (incoming.length === 0) {
              sendJson(res, 400, { error: 'Tidak ada data absensi yang dikirim.' })
              return
            }

            const store = readStore()
            const map = new Map(store.sessions.map((session) => [session.id, session]))
            const now = new Date().toISOString()
            let accepted = 0

            for (const session of incoming) {
              if (!isValidSession(session)) continue
              const deletedAt = store.deleted?.[session.id]
              if (deletedAt && (session.updatedAt ?? '') <= deletedAt) continue
              const existing = map.get(session.id)
              if (existing && (existing.updatedAt ?? '') > (session.updatedAt ?? '')) continue
              const role =
                payload.submittedBy?.role === 'admin' || payload.submittedBy?.role === 'guru'
                  ? payload.submittedBy.role
                  : session.submittedByRole
              map.set(session.id, {
                ...session,
                submittedById: payload.submittedBy?.id ?? session.submittedById,
                submittedByName: payload.submittedBy?.name ?? session.submittedByName,
                submittedByRole: role,
                syncedAt: now,
              })
              if (deletedAt) {
                const nextDeleted = { ...(store.deleted ?? {}) }
                delete nextDeleted[session.id]
                store.deleted = nextDeleted
              }
              accepted += 1
            }

            store.sessions = Array.from(map.values()).sort((a, b) =>
              (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt),
            )
            store.updatedAt = now
            writeStore(store)
            sendJson(res, 200, {
              ok: true,
              accepted,
              count: store.sessions.length,
              updatedAt: now,
            })
            return
          }

          sendJson(res, 405, { error: 'Metode tidak didukung.' })
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : 'Gagal memproses data absensi.',
          })
        }
      })
    },
  }
}

function createCbtApi(): Plugin {
  const file = resolve(process.cwd(), 'server-data', 'cbt.json')

  interface CbtStore {
    updatedAt: string
    exams: CbtExam[]
    attempts: CbtAttempt[]
    deletedExams: Record<string, string>
    deletedAttempts: Record<string, string>
  }

  const emptyStore = (): CbtStore => ({
    updatedAt: '',
    exams: [],
    attempts: [],
    deletedExams: {},
    deletedAttempts: {},
  })

  const readStore = (): CbtStore => {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<CbtStore>
      return {
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
        exams: Array.isArray(parsed.exams) ? (parsed.exams as CbtExam[]) : [],
        attempts: Array.isArray(parsed.attempts) ? (parsed.attempts as CbtAttempt[]) : [],
        deletedExams:
          parsed.deletedExams && typeof parsed.deletedExams === 'object'
            ? (parsed.deletedExams as Record<string, string>)
            : {},
        deletedAttempts:
          parsed.deletedAttempts && typeof parsed.deletedAttempts === 'object'
            ? (parsed.deletedAttempts as Record<string, string>)
            : {},
      }
    } catch {
      return emptyStore()
    }
  }

  const writeStore = (store: CbtStore) => {
    mkdirSync(dirname(file), { recursive: true })
    const temp = `${file}.tmp`
    writeFileSync(temp, JSON.stringify(store, null, 2), 'utf8')
    renameSync(temp, file)
  }

  const sendJson = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(body))
  }

  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolveBody, reject) => {
      let size = 0
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 8 * 1024 * 1024) {
          reject(new Error('Ukuran data terlalu besar.'))
          req.destroy()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })

  const hasId = (value: unknown): value is { id: string } =>
    Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string' && (value as { id: string }).id.length > 0)
  const hasUpdatedAt = (value: unknown): value is { updatedAt: string } =>
    Boolean(value && typeof value === 'object' && typeof (value as { updatedAt?: unknown }).updatedAt === 'string')

  return {
    name: 'siap-cbt-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/cbt')) {
          next()
          return
        }

        const url = new URL(req.url, 'http://localhost')

        try {
          if (req.method === 'GET') {
            sendJson(res, 200, readStore())
            return
          }

          if (req.method === 'DELETE') {
            const kind = url.searchParams.get('kind')
            const id = url.searchParams.get('id')
            if ((kind !== 'exam' && kind !== 'attempt') || !id) {
              sendJson(res, 400, { error: 'Parameter kind (exam|attempt) dan id wajib diisi.' })
              return
            }
            const store = readStore()
            const now = new Date().toISOString()
            if (kind === 'exam') {
              store.exams = store.exams.filter((exam) => exam.id !== id)
              store.deletedExams = { ...store.deletedExams, [id]: now }
            } else {
              store.attempts = store.attempts.filter((attempt) => attempt.id !== id)
              store.deletedAttempts = { ...store.deletedAttempts, [id]: now }
            }
            store.updatedAt = now
            writeStore(store)
            sendJson(res, 200, { ok: true, updatedAt: now })
            return
          }

          if (req.method === 'POST') {
            const raw = await readBody(req)
            const payload = JSON.parse(raw || '{}') as {
              exams?: CbtExam[]
              attempts?: CbtAttempt[]
            }
            const incomingExams = Array.isArray(payload.exams) ? payload.exams.filter(hasId) : []
            const incomingAttempts = Array.isArray(payload.attempts) ? payload.attempts.filter(hasId) : []
            if (incomingExams.length === 0 && incomingAttempts.length === 0) {
              sendJson(res, 400, { error: 'Tidak ada data CBT yang dikirim.' })
              return
            }

            const store = readStore()
            const now = new Date().toISOString()
            let accepted = 0

            const examMap = new Map(store.exams.map((exam) => [exam.id, exam]))
            for (const exam of incomingExams) {
              if (!hasUpdatedAt(exam)) continue
              const deletedAt = store.deletedExams[exam.id]
              if (deletedAt && (exam.updatedAt ?? '') <= deletedAt) continue
              const existing = examMap.get(exam.id)
              if (existing && (existing.updatedAt ?? '') > (exam.updatedAt ?? '')) continue
              examMap.set(exam.id, exam)
              if (deletedAt) {
                const nextDeleted = { ...store.deletedExams }
                delete nextDeleted[exam.id]
                store.deletedExams = nextDeleted
              }
              accepted += 1
            }
            store.exams = Array.from(examMap.values()).sort((a, b) =>
              (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
            )

            const attemptMap = new Map(store.attempts.map((attempt) => [attempt.id, attempt]))
            for (const attempt of incomingAttempts) {
              if (!hasUpdatedAt(attempt)) continue
              const deletedAt = store.deletedAttempts[attempt.id]
              if (deletedAt && (attempt.updatedAt ?? '') <= deletedAt) continue
              const existing = attemptMap.get(attempt.id)
              if (existing && (existing.updatedAt ?? '') > (attempt.updatedAt ?? '')) continue
              attemptMap.set(attempt.id, attempt)
              if (deletedAt) {
                const nextDeleted = { ...store.deletedAttempts }
                delete nextDeleted[attempt.id]
                store.deletedAttempts = nextDeleted
              }
              accepted += 1
            }
            store.attempts = Array.from(attemptMap.values()).sort((a, b) =>
              (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
            )

            store.updatedAt = now
            writeStore(store)
            sendJson(res, 200, { ok: true, accepted, updatedAt: now })
            return
          }

          sendJson(res, 405, { error: 'Metode tidak didukung.' })
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : 'Gagal memproses data CBT.',
          })
        }
      })
    },
  }
}

function createStateApi(): Plugin {
  const file = resolve(process.cwd(), 'server-data', 'state.json')

  const readState = (): Record<string, unknown> => {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  const writeState = (state: unknown) => {
    mkdirSync(dirname(file), { recursive: true })
    const temp = `${file}.tmp`
    writeFileSync(temp, JSON.stringify(state ?? {}, null, 2), 'utf8')
    renameSync(temp, file)
  }

  const sendJson = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(body))
  }

  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolveBody, reject) => {
      let size = 0
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 8 * 1024 * 1024) {
          reject(new Error('Ukuran data terlalu besar.'))
          req.destroy()
          return
        }
        chunks.push(chunk)
      })
      req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
      req.on('error', reject)
    })

  return {
    name: 'siap-state-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/state')) {
          next()
          return
        }

        try {
          if (req.method === 'GET') {
            sendJson(res, 200, readState())
            return
          }

          if (req.method === 'POST') {
            const raw = await readBody(req)
            const body = JSON.parse(raw || '{}') as unknown
            writeState(body)
            sendJson(res, 200, { ok: true })
            return
          }

          sendJson(res, 405, { error: 'Metode tidak didukung.' })
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : 'Gagal memproses state.',
          })
        }
      })
    },
  }
}

export default defineConfig({
  define: {
    __DEFINES__: {},
    __HMR_CONFIG_NAME__: '""',
    __BASE__: '"/"',
    __SERVER_HOST__: '""',
    __SERVER_PORT__: '""',
    __HMR_PROTOCOL__: '""',
    __HMR_HOSTNAME__: '""',
    __HMR_PORT__: '""',
    __HMR_BASE__: '""',
  },
  plugins: [react(), createAttendanceApi(), createCbtApi(), createStateApi()],
  server: {
    port: 5173,
    host: true,
  },
})
