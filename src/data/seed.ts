import type { AppData, AttendanceSession, AttendanceStatus, ClassRoom, Student, Teacher } from '../types'
import { SUBJECTS } from '../lib/constants'
import { defaultSettings, schoolDaysBack } from '../lib/utils'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MALE = ['Aditya', 'Ahmad', 'Asep', 'Bagas', 'Bayu', 'Dimas', 'Fajar', 'Farhan', 'Galih', 'Gilang', 'Hendra', 'Ilham', 'Irfan', 'Rizki', 'Rizal', 'Muhammad', 'Naufal', 'Rafi', 'Rangga', 'Reza', 'Sandi', 'Satria', 'Tegar', 'Wahyu', 'Yusuf']
const FEMALE = ['Aisyah', 'Amelia', 'Anisa', 'Ayu', 'Bunga', 'Citra', 'Dewi', 'Dinda', 'Eka', 'Fitri', 'Hana', 'Indah', 'Intan', 'Kharisma', 'Lestari', 'Nadia', 'Nabila', 'Nisa', 'Putri', 'Rahma', 'Salma', 'Sari', 'Siti', 'Tiara', 'Zahra']
const SURNAMES = ['Pratama', 'Saputra', 'Nugraha', 'Hidayat', 'Kurniawan', 'Permana', 'Setiawan', 'Wijaya', 'Ramadhan', 'Firmansyah', 'Maulana', 'Ardiansyah', 'Fauzi', 'Hakim', 'Suryana', 'Gunawan', 'Purnama', 'Anggraeni', 'Novianti', 'Salsabila', 'Aulia', 'Rahmawati', 'Kusuma', 'Sudrajat']
const VILLAGES = ['Cikatomas', 'Cimanuk', 'Pakemitan', 'Sukamaju', 'Cisalam', 'Tanjungsari', 'Cikembulan']

export const demoAccounts = [
  {
    id: 'u_admin',
    name: 'Asep Saepudin, S.Kom.',
    email: 'admin@smpnsatap1ckm.sch.id',
    password: 'admin123',
    role: 'admin' as const,
    nip: '198804122014031007',
    subject: 'Administrator Sistem',
    phone: '0812-3456-7890',
  },
]

/** Akun guru demo yang sudah didaftarkan administrator. */
export const demoTeacherAccount = {
  email: 'guru@smpnsatap1ckm.sch.id',
  password: 'guru123',
}

function buildSeed(): AppData {
  const rand = mulberry32(20261102)
  const usedNames = new Set<string>()

  const classes: ClassRoom[] = [
    { id: 'k7', name: '7', grade: 7, homeroomId: 't1', academicYear: '2026/2027' },
    { id: 'k8', name: '8', grade: 8, homeroomId: 't3', academicYear: '2026/2027' },
    { id: 'k9', name: '9', grade: 9, homeroomId: 't5', academicYear: '2026/2027' },
  ]

  const teachers: Teacher[] = [
    { id: 't1', name: 'Dra. Neni Kurniasih, M.Pd.', nip: '196805121995032002', gender: 'P', subjects: ['Pendidikan Pancasila'], phone: '0812-3456-7801', email: 'neni.kurniasih@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't2', name: 'Rudi Hartono, S.Pd.', nip: '197902152006041003', gender: 'L', subjects: ['Bahasa Indonesia', 'Seni Budaya'], phone: '0812-3456-7802', email: 'guru@smpnsatap1ckm.sch.id', status: 'aktif', accountActive: true, loginPassword: 'guru123' },
    { id: 't3', name: 'Siti Aminah, S.Pd.', nip: '198106202008012004', gender: 'P', subjects: ['Matematika'], phone: '0812-3456-7803', email: 'siti.aminah@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't4', name: 'Agus Prasetyo, S.Pd., Gr.', nip: '198503102010011005', gender: 'L', subjects: ['Ilmu Pengetahuan Alam', 'Informatika'], phone: '0812-3456-7804', email: 'agus.prasetyo@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't5', name: 'Euis Nurhayati, S.Pd.', nip: '198712152012012006', gender: 'P', subjects: ['Bahasa Inggris'], phone: '0812-3456-7805', email: 'euis.nurhayati@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't6', name: 'Deden Supriatna, S.Pd.', nip: '199004222015011008', gender: 'L', subjects: ['Ilmu Pengetahuan Sosial'], phone: '0812-3456-7806', email: 'deden.supriatna@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't7', name: 'Fitri Handayani, S.Pd.', nip: '199205062017022009', gender: 'P', subjects: ['Informatika', 'Prakarya'], phone: '0812-3456-7807', email: 'fitri.handayani@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't8', name: 'Asep Kurnia, S.Pd.', nip: '198810102013011010', gender: 'L', subjects: ['PJOK'], phone: '0812-3456-7808', email: 'asep.kurnia@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't9', name: 'Rina Marlina, S.Pd.', nip: '199307182018012011', gender: 'P', subjects: ['Seni Budaya'], phone: '0812-3456-7809', email: 'rina.marlina@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't10', name: 'Hendra Wijaya, S.Pd.', nip: '198611232011011012', gender: 'L', subjects: ['Pendidikan Agama Islam'], phone: '0812-3456-7810', email: 'hendra.wijaya@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't11', name: 'Yani Suryani, S.Pd.', nip: '199509092019022013', gender: 'P', subjects: ['Prakarya'], phone: '0812-3456-7811', email: 'yani.suryani@smpn1cikatomas.sch.id', status: 'aktif' },
    { id: 't12', name: 'Iwan Setiawan, S.Kom.', nip: '199112152016031014', gender: 'L', subjects: ['Informatika'], phone: '0812-3456-7812', email: 'iwan.setiawan@smpn1cikatomas.sch.id', status: 'aktif' },
  ]

  const classSizes: Record<string, number> = { k7: 59, k8: 59, k9: 60 }
  const students: Student[] = []
  const propensity: Record<string, number> = {}
  let studentNo = 0

  for (const clazz of classes) {
    const size = classSizes[clazz.id]
    for (let i = 0; i < size; i++) {
      const gender: 'L' | 'P' = i % 2 === 0 ? 'L' : 'P'
      const firstPool = gender === 'L' ? MALE : FEMALE
      let name = ''
      for (let attempt = 0; attempt < 60; attempt++) {
        const first = firstPool[Math.floor(rand() * firstPool.length)]
        const last = SURNAMES[Math.floor(rand() * SURNAMES.length)]
        const candidate = `${first} ${last}`
        if (!usedNames.has(candidate)) {
          name = candidate
          usedNames.add(candidate)
          break
        }
        if (attempt === 59) {
          name = `${first} ${last} ${String.fromCharCode(65 + i)}`
          usedNames.add(name)
        }
      }
      const id = `s_${clazz.id}_${i + 1}`
      studentNo += 1
      const birthYear = 2010 + (3 - (clazz.grade - 7))
      const birthMonth = 1 + Math.floor(rand() * 12)
      const birthDay = 1 + Math.floor(rand() * 27)
      const isRisk = studentNo % 27 === 0
      propensity[id] = isRisk ? 0.42 + rand() * 0.2 : rand() * 0.055
      students.push({
        id,
        nisn: String(3120100000 + studentNo),
        name,
        gender,
        classId: clazz.id,
        birthDate: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
        guardian: `${gender === 'L' ? 'Bapak' : 'Ibu'} ${name.split(' ').slice(-1)[0]}`,
        phone: `08${String(1200000000 + Math.floor(rand() * 799999999))}`,
        address: `Kp. ${VILLAGES[Math.floor(rand() * VILLAGES.length)]}, Desa ${VILLAGES[Math.floor(rand() * VILLAGES.length)]}, Kec. Cikatomas`,
        status: 'aktif',
      })
    }
  }

  const sessions: AttendanceSession[] = []
  const dates = schoolDaysBack(30)
  const periods = ['Jam 1-2', 'Jam 3-4']

  dates.forEach((date, dayIndex) => {
    classes.forEach((clazz, classIndex) => {
      const roster = students.filter((s) => s.classId === clazz.id)
      periods.forEach((period, periodIndex) => {
        const subject = SUBJECTS[(dayIndex + classIndex * 2 + periodIndex * 3) % SUBJECTS.length]
        const teacher = teachers[(classIndex + dayIndex + periodIndex) % teachers.length]
        const records: Record<string, AttendanceStatus> = {}
        for (const student of roster) {
          const r = rand()
          const risk = propensity[student.id] ?? 0.03
          if (r < 0.014 + risk * 0.32) records[student.id] = 'alpa'
          else if (r < 0.036 + risk * 0.44) records[student.id] = 'sakit'
          else if (r < 0.068 + risk * 0.56) records[student.id] = 'izin'
          else if (r < 0.1 + risk * 0.68) records[student.id] = 'terlambat'
          else records[student.id] = 'hadir'
        }
        const id = `ses_${date}_${clazz.id}_${periodIndex}`
        sessions.push({
          id,
          date,
          classId: clazz.id,
          subject,
          period,
          teacherId: teacher.id,
          note: dayIndex === dates.length - 1 && periodIndex === 0 ? 'Pembelajaran berjalan kondusif.' : '',
          records,
          createdAt: `${date}T07:${String(20 + periodIndex * 5).padStart(2, '0')}:00.000Z`,
          updatedAt: `${date}T07:${String(25 + periodIndex * 5).padStart(2, '0')}:00.000Z`,
        })
      })
    })
  })

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString()
  const notifications = [
    {
      id: 'n1',
      title: 'Absensi hari ini belum lengkap',
      message: 'Masih terdapat kelas yang belum menyelesaikan absensi jam pelajaran kedua.',
      type: 'warning' as const,
      time: hoursAgo(0.6),
      read: false,
    },
    {
      id: 'n2',
      title: 'Rekap pekan ini tersedia',
      message: 'Rekap kehadiran 30 hari terakhir sudah diperbarui dan siap diunduh.',
      type: 'success' as const,
      time: hoursAgo(2.5),
      read: false,
    },
    {
      id: 'n3',
      title: 'Peserta didik perlu perhatian',
      message: 'Terdapat peserta didik dengan persentase kehadiran di bawah ambang batas.',
      type: 'danger' as const,
      time: hoursAgo(5),
      read: false,
    },
    {
      id: 'n4',
      title: 'Pembaruan sistem SIAP SMP',
      message: 'Modul rekap dan laporan kini tampil lebih cepat. Tidak ada tindakan yang diperlukan.',
      type: 'info' as const,
      time: hoursAgo(26),
      read: true,
    },
  ]

  return {
    students,
    teachers,
    classes,
    sessions,
    notifications,
    settings: JSON.parse(JSON.stringify(defaultSettings)),
  teachingSchedules: [],
  }
}

export const seedData = buildSeed
