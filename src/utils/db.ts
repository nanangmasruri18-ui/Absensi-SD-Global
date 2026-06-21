import { Sekolah, AdminUser, Guru, Kelas, Siswa, HariLibur, Absensi, Session } from '../types';
import { supabase, TABLES } from './supabase';

// Helper to push updates to Supabase asynchronously in the background
const pushToSupabaseBg = async (table: string, data: any) => {
  try {
    const { error } = await supabase.from(table).upsert(data);
    if (error) {
      console.warn(`[Supabase Background Sync] Failed for ${table}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase Background Sync] Error for ${table}:`, err);
  }
};

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substring(2, 11);

// Helper to calculate simple secure hash (SHA-256 simulation or string hash for custom password requirement)
export const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'hash_' + Math.abs(hash).toString(16);
};

// Default Pre-seeded database keys
const KEYS = {
  SEKOLAH: 'absensi_sd_sekolah',
  ADMIN: 'absensi_sd_admin',
  GURU: 'absensi_sd_guru',
  KELAS: 'absensi_sd_kelas',
  SISWA: 'absensi_sd_siswa',
  LIBUR: 'absensi_sd_libur',
  ABSENSI: 'absensi_sd_absensi',
  SESSION: 'absensi_sd_session',
};

// Initial Setup Check
export const isDatabaseInitialized = (): boolean => {
  return localStorage.getItem(KEYS.SEKOLAH) !== null;
};

// Retrieve data safely with fallbacks
export const getSekolah = (): Sekolah => {
  const data = localStorage.getItem(KEYS.SEKOLAH);
  if (data) return JSON.parse(data);
  return {
    nama: 'SD Negeri Sukamaju 01',
    alamat: 'Jl. Pendidikan No. 45, Kecamatan Sukasari, Bandung',
    npsn: '20214567',
    adminNama: 'Admin Utama',
  };
};

export const saveSekolah = (sekolah: Sekolah) => {
  localStorage.setItem(KEYS.SEKOLAH, JSON.stringify(sekolah));
  pushToSupabaseBg(TABLES.SEKOLAH, { id: 'main', ...sekolah });
};

export const getAdmins = (): AdminUser[] => {
  const data = localStorage.getItem(KEYS.ADMIN);
  if (data) return JSON.parse(data);
  // Default pre-seeded admin
  return [
    {
      username: 'admin',
      nama: 'Administrator',
      passwordHash: hashPassword('admin123'),
    }
  ];
};

export const saveAdmins = (admins: AdminUser[]) => {
  localStorage.setItem(KEYS.ADMIN, JSON.stringify(admins));
  if (admins.length > 0) pushToSupabaseBg(TABLES.ADMIN_USER, admins);
};

export const getKelasList = (): Kelas[] => {
  const data = localStorage.getItem(KEYS.KELAS);
  if (data) return JSON.parse(data);
  // Pre-seeded classes
  return [
    { id: 'kls-1a', nama: 'Kelas 1A', tingkat: '1', waliKelasId: 'guru-budi' },
    { id: 'kls-2a', nama: 'Kelas 2A', tingkat: '2', waliKelasId: 'guru-dewi' },
    { id: 'kls-3a', nama: 'Kelas 3A', tingkat: '3', waliKelasId: '' },
  ];
};

export const saveKelasList = (kelas: Kelas[]) => {
  localStorage.setItem(KEYS.KELAS, JSON.stringify(kelas));
  if (kelas.length > 0) pushToSupabaseBg(TABLES.KELAS, kelas);
};

export const getGuruList = (): Guru[] => {
  const data = localStorage.getItem(KEYS.GURU);
  if (data) return JSON.parse(data);
  // Pre-seeded teachers
  return [
    {
      id: 'guru-budi',
      nip: '198503122011011002',
      nama: 'Budi Santoso, S.Pd.',
      jenisKelamin: 'L',
      username: 'budi',
      passwordHash: hashPassword('budi123'),
      kelasId: 'kls-1a',
    },
    {
      id: 'guru-dewi',
      nip: '199012242015042001',
      nama: 'Dewi Lestari, S.Pd.',
      jenisKelamin: 'P',
      username: 'dewi',
      passwordHash: hashPassword('dewi123'),
      kelasId: 'kls-2a',
    }
  ];
};

export const saveGuruList = (guru: Guru[]) => {
  localStorage.setItem(KEYS.GURU, JSON.stringify(guru));
  if (guru.length > 0) pushToSupabaseBg(TABLES.GURU, guru);
};

export const getSiswaList = (): Siswa[] => {
  const data = localStorage.getItem(KEYS.SISWA);
  if (data) return JSON.parse(data);
  // Pre-seeded students
  return [
    // Kelas 1A
    { id: 'sis-101', nisn: '0153456781', nama: 'Aditya Pratama', jenisKelamin: 'L', tempatLahir: 'Bandung', tanggalLahir: '2019-05-12', kelasId: 'kls-1a' },
    { id: 'sis-102', nisn: '0153456782', nama: 'Anisa Rahmawati', jenisKelamin: 'P', tempatLahir: 'Sumedang', tanggalLahir: '2019-08-20', kelasId: 'kls-1a' },
    { id: 'sis-103', nisn: '0153456783', nama: 'Bagus Wijaya', jenisKelamin: 'L', tempatLahir: 'Bandung', tanggalLahir: '2019-02-14', kelasId: 'kls-1a' },
    { id: 'sis-104', nisn: '0153456784', nama: 'Citra Kirana', jenisKelamin: 'P', tempatLahir: 'Jakarta', tanggalLahir: '2019-11-03', kelasId: 'kls-1a' },
    { id: 'sis-105', nisn: '0153456785', nama: 'Dani Setiawan', jenisKelamin: 'L', tempatLahir: 'Bandung', tanggalLahir: '2019-04-25', kelasId: 'kls-1a' },

    // Kelas 2A
    { id: 'sis-201', nisn: '0143456791', nama: 'Eka Saputra', jenisKelamin: 'L', tempatLahir: 'Bandung', tanggalLahir: '2018-01-10', kelasId: 'kls-2a' },
    { id: 'sis-202', nisn: '0143456792', nama: 'Fitri Handayani', jenisKelamin: 'P', tempatLahir: 'Garut', tanggalLahir: '2018-06-15', kelasId: 'kls-2a' },
    { id: 'sis-203', nisn: '0143456793', nama: 'Galih Permana', jenisKelamin: 'L', tempatLahir: 'Bandung', tanggalLahir: '2018-09-08', kelasId: 'kls-2a' },
    { id: 'sis-204', nisn: '0143456794', nama: 'Hana Nabila', jenisKelamin: 'P', tempatLahir: 'Cianjur', tanggalLahir: '2018-03-22', kelasId: 'kls-2a' },
    { id: 'sis-205', nisn: '0143456795', nama: 'Irfan Hakim', jenisKelamin: 'L', tempatLahir: 'Bandung', tanggalLahir: '2018-12-30', kelasId: 'kls-2a' },
  ];
};

export const saveSiswaList = (siswa: Siswa[]) => {
  localStorage.setItem(KEYS.SISWA, JSON.stringify(siswa));
  if (siswa.length > 0) pushToSupabaseBg(TABLES.SISWA, siswa);
};

export const getHariLiburList = (): HariLibur[] => {
  const data = localStorage.getItem(KEYS.LIBUR);
  if (data) return JSON.parse(data);
  // Pre-seeded holidays for 2026/any academic calendar
  return [
    { id: 'lib-1', tanggal: '2026-06-01', namaLibur: 'Hari Lahir Pancasila', keterangan: 'Libur Nasional' },
    { id: 'lib-2', tanggal: '2026-08-17', namaLibur: 'Hari Kemerdekaan RI', keterangan: 'Libur Nasional HUT RI Ke-81' },
    { id: 'lib-3', tanggal: '2026-12-25', namaLibur: 'Hari Raya Natal', keterangan: 'Libur Pajak' }
  ];
};

export const saveHariLiburList = (libur: HariLibur[]) => {
  localStorage.setItem(KEYS.LIBUR, JSON.stringify(libur));
  if (libur.length > 0) pushToSupabaseBg(TABLES.HARI_LIBUR, libur);
};

export const getAbsensiList = (): Absensi[] => {
  const data = localStorage.getItem(KEYS.ABSENSI);
  if (data) return JSON.parse(data);
  
  // Pre-seeded attendance records for past few days to make dashboard pretty
  // Let's seed for 2026-06-19 and 2026-06-18 and today (2026-06-20, which is Saturday in Indonesia time)
  const initialAbsensi: Absensi[] = [];
  const siswas = [
    'sis-101', 'sis-102', 'sis-103', 'sis-104', 'sis-105',
    'sis-201', 'sis-202', 'sis-203', 'sis-204', 'sis-205'
  ];

  const dates = ['2026-06-18', '2026-06-19', '2026-06-20'];
  
  dates.forEach(date => {
    siswas.forEach(siswaId => {
      const kelasId = siswaId.startsWith('sis-1') ? 'kls-1a' : 'kls-2a';
      // Roll random status, heavy bias on 'H' (Hadir)
      const rand = Math.random();
      let status: 'H' | 'S' | 'I' | 'A' = 'H';
      if (rand > 0.95) status = 'A';
      else if (rand > 0.90) status = 'I';
      else if (rand > 0.85) status = 'S';
      
      initialAbsensi.push({
        id: `${kelasId}_${date}_${siswaId}`,
        siswaId,
        kelasId,
        tanggal: date,
        status,
      });
    });
  });

  return initialAbsensi;
};

export const saveAbsensiList = (absensi: Absensi[]) => {
  localStorage.setItem(KEYS.ABSENSI, JSON.stringify(absensi));
  if (absensi.length > 0) pushToSupabaseBg(TABLES.ABSENSI, absensi);
};

// Seed database fully
export const initializeDatabase = () => {
  if (!isDatabaseInitialized()) {
    saveSekolah(getSekolah());
    saveAdmins(getAdmins());
    saveKelasList(getKelasList());
    saveGuruList(getGuruList());
    saveSiswaList(getSiswaList());
    saveHariLiburList(getHariLiburList());
    saveAbsensiList(getAbsensiList());
  }
};

// Session management (includes session timeout checks)
export const getSession = (): Session | null => {
  const data = localStorage.getItem(KEYS.SESSION);
  if (!data) return null;
  const session: Session = JSON.parse(data);
  
  // Check if session has expired
  if (new Date(session.expiresAt) < new Date()) {
    clearSession();
    return null;
  }
  
  return session;
};

export const saveSession = (session: Session) => {
  localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(KEYS.SESSION);
};

export const refreshSessionTimeout = () => {
  const data = localStorage.getItem(KEYS.SESSION);
  if (data) {
    const session: Session = JSON.parse(data);
    // Extend session by 15 minutes from now
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    session.expiresAt = now.toISOString();
    saveSession(session);
  }
};

// Database safety backup operations (Full JSON dump and restoration)
export const getDatabaseDump = (): string => {
  const dump = {
    sekolah: getSekolah(),
    admins: getAdmins(),
    kelas: getKelasList(),
    guru: getGuruList(),
    siswa: getSiswaList(),
    libur: getHariLiburList(),
    absensi: getAbsensiList(),
    timestamp: new Date().toISOString(),
  };
  return JSON.stringify(dump, null, 2);
};

export const restoreDatabaseFromDump = (dumpStr: string): boolean => {
  try {
    const dump = JSON.parse(dumpStr);
    if (!dump.sekolah || !dump.admins || !dump.kelas || !dump.guru || !dump.siswa || !dump.libur || !dump.absensi) {
      return false;
    }
    saveSekolah(dump.sekolah);
    saveAdmins(dump.admins);
    saveKelasList(dump.kelas);
    saveGuruList(dump.guru);
    saveSiswaList(dump.siswa);
    saveHariLiburList(dump.libur);
    saveAbsensiList(dump.absensi);
    return true;
  } catch (e) {
    console.error('Failed to restore database backup:', e);
    return false;
  }
};
