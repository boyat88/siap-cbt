const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173
const HOST = '0.0.0.0'
const ROOT = path.join(__dirname, 'dist')
const STATE_FILE = path.join(__dirname, 'server-data', 'state.json')
const ATTENDANCE_FILE = path.join(__dirname, 'server-data', 'attendance.json')
const CBT_FILE = path.join(__dirname, 'server-data', 'cbt.json')

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 8 * 1024 * 1024) { reject(new Error('too large')); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function readJsonFile(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return fallback }
}

function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = file + '.tmp'
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(temp, file)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  // API: state
  if (url.pathname === '/api/state') {
    if (req.method === 'GET') {
      sendJson(res, 200, readJsonFile(STATE_FILE, {}))
      return
    }
    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        writeJsonFile(STATE_FILE, JSON.parse(raw || '{}'))
        sendJson(res, 200, { ok: true })
      } catch (e) {
        sendJson(res, 500, { error: e.message })
      }
      return
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  // API: attendance
  if (url.pathname === '/api/attendance') {
    if (req.method === 'GET') {
      sendJson(res, 200, readJsonFile(ATTENDANCE_FILE, { updatedAt: '', sessions: [], deleted: {} }))
      return
    }
    if (req.method === 'DELETE') {
      const store = readJsonFile(ATTENDANCE_FILE, { updatedAt: '', sessions: [], deleted: {} })
      const now = new Date().toISOString()
      const id = url.searchParams.get('id')
      if (id) {
        store.sessions = (store.sessions || []).filter((s) => s.id !== id)
        store.deleted = { ...(store.deleted || {}), [id]: now }
      } else {
        for (const s of store.sessions || []) store.deleted = { ...(store.deleted || {}), [s.id]: now }
        store.sessions = []
      }
      store.updatedAt = now
      writeJsonFile(ATTENDANCE_FILE, store)
      sendJson(res, 200, { ok: true, count: store.sessions.length })
      return
    }
    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        const payload = JSON.parse(raw || '{}')
        const incoming = Array.isArray(payload.sessions) ? payload.sessions : payload.session ? [payload.session] : []
        const store = readJsonFile(ATTENDANCE_FILE, { updatedAt: '', sessions: [], deleted: {} })
        const map = new Map((store.sessions || []).map((s) => [s.id, s]))
        const now = new Date().toISOString()
        let accepted = 0
        for (const session of incoming) {
          if (!session || typeof session.id !== 'string') continue
          const deletedAt = store.deleted?.[session.id]
          if (deletedAt && (session.updatedAt || '') <= deletedAt) continue
          const existing = map.get(session.id)
          if (existing && (existing.updatedAt || '') > (session.updatedAt || '')) continue
          map.set(session.id, { ...session, syncedAt: now })
          if (deletedAt) {
            const nextDeleted = { ...(store.deleted || {}) }
            delete nextDeleted[session.id]
            store.deleted = nextDeleted
          }
          accepted++
        }
        store.sessions = Array.from(map.values()).sort((a, b) => (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt))
        store.updatedAt = now
        writeJsonFile(ATTENDANCE_FILE, store)
        sendJson(res, 200, { ok: true, accepted, count: store.sessions.length, updatedAt: now })
      } catch (e) {
        sendJson(res, 500, { error: e.message })
      }
      return
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  // API: CBT (ujian berbasis komputer)
  if (url.pathname === '/api/cbt') {
    const emptyStore = () => ({
      updatedAt: '',
      exams: [],
      attempts: [],
      deletedExams: {},
      deletedAttempts: {},
    })
    const readStore = () => {
      const store = readJsonFile(CBT_FILE, emptyStore())
      return {
        updatedAt: typeof store.updatedAt === 'string' ? store.updatedAt : '',
        exams: Array.isArray(store.exams) ? store.exams : [],
        attempts: Array.isArray(store.attempts) ? store.attempts : [],
        deletedExams: store.deletedExams && typeof store.deletedExams === 'object' ? store.deletedExams : {},
        deletedAttempts:
          store.deletedAttempts && typeof store.deletedAttempts === 'object' ? store.deletedAttempts : {},
      }
    }
    const hasId = (value) => value && typeof value === 'object' && typeof value.id === 'string' && value.id.length > 0
    const hasUpdatedAt = (value) => value && typeof value === 'object' && typeof value.updatedAt === 'string'

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
      writeJsonFile(CBT_FILE, store)
      sendJson(res, 200, { ok: true, updatedAt: now })
      return
    }

    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        const payload = JSON.parse(raw || '{}')
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
          if (deletedAt && (exam.updatedAt || '') <= deletedAt) continue
          const existing = examMap.get(exam.id)
          if (existing && (existing.updatedAt || '') > (exam.updatedAt || '')) continue
          examMap.set(exam.id, exam)
          if (deletedAt) {
            const nextDeleted = { ...store.deletedExams }
            delete nextDeleted[exam.id]
            store.deletedExams = nextDeleted
          }
          accepted += 1
        }
        store.exams = Array.from(examMap.values()).sort((a, b) =>
          (b.updatedAt || '').localeCompare(a.updatedAt || ''),
        )

        const attemptMap = new Map(store.attempts.map((attempt) => [attempt.id, attempt]))
        for (const attempt of incomingAttempts) {
          if (!hasUpdatedAt(attempt)) continue
          const deletedAt = store.deletedAttempts[attempt.id]
          if (deletedAt && (attempt.updatedAt || '') <= deletedAt) continue
          const existing = attemptMap.get(attempt.id)
          if (existing && (existing.updatedAt || '') > (attempt.updatedAt || '')) continue
          attemptMap.set(attempt.id, attempt)
          if (deletedAt) {
            const nextDeleted = { ...store.deletedAttempts }
            delete nextDeleted[attempt.id]
            store.deletedAttempts = nextDeleted
          }
          accepted += 1
        }
        store.attempts = Array.from(attemptMap.values()).sort((a, b) =>
          (b.updatedAt || '').localeCompare(a.updatedAt || ''),
        )

        store.updatedAt = now
        writeJsonFile(CBT_FILE, store)
        sendJson(res, 200, { ok: true, accepted, updatedAt: now })
        return
      } catch (e) {
        sendJson(res, 500, { error: e.message })
        return
      }
    }

    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  // Static files
  let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html')
  }
  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'
  try {
    const data = fs.readFileSync(filePath)
    res.statusCode = 200
    res.setHeader('Content-Type', mime)
    res.setHeader('Cache-Control', 'no-cache')
    res.end(data)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
})

server.listen(PORT, HOST, () => {
  console.log(`SIAP SMP production server running at http://${HOST}:${PORT}`)
})
server.on('error', (err) => {
  console.error('Server error:', err)
  process.exit(1)
})
