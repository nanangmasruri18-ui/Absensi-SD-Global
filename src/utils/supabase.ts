import { createClient } from '@supabase/supabase-js';
import { Sekolah, AdminUser, Kelas, Guru, Siswa, HariLibur, Absensi } from '../types';

// Supabase environment variables configured dynamically with safety fallbacks
const SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL || 'https://kmtikrjsfaiyhgsvzdck.supabase.co').replace(/\/rest\/v1\/?$/, '');
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGlrcmpzZmFpeWhnc3Z6ZGNrIiwicm9sZSI6Imam9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5OTI5NDEsImV4cCI6MjA5NzU2ODk0MX0.QBmUJYnRLtwSF0nTkqFk6kvoOQUomd3uRInPxjphD1Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TABLES = {
  SEKOLAH: 'sekolah',
  ADMIN_USER: 'admin_user',
  KELAS: 'kelas',
  GURU: 'guru',
  SISWA: 'siswa',
  HARI_LIBUR: 'hari_libur',
  ABSENSI: 'absensi',
};

// SQL code for user dashboard display
export const SUPABASE_SETUP_SQL = `-- SCRIPT SQL SETUP ABSENSI SD GLOBAL DI SUPABASE SQL EDITOR
-- Jalankan seluruh kode ini di panel SQL Editor di dashboard Supabase Anda!
-- Script ini akan membuat tabel dan MEMATIKAN Row Level Security (RLS) secara paksa agar web aplikasi dapat membaca/menulis data secara real-time.

-- 1. Buat Tabel (jika belum ada)
CREATE TABLE IF NOT EXISTS sekolah (
  id TEXT PRIMARY KEY,
  nama TEXT,
  alamat TEXT,
  npsn TEXT,
  "adminNama" TEXT
);

CREATE TABLE IF NOT EXISTS admin_user (
  username TEXT PRIMARY KEY,
  nama TEXT,
  "passwordHash" TEXT
);

CREATE TABLE IF NOT EXISTS kelas (
  id TEXT PRIMARY KEY,
  nama TEXT,
  tingkat TEXT,
  "waliKelasId" TEXT
);

CREATE TABLE IF NOT EXISTS guru (
  id TEXT PRIMARY KEY,
  nip TEXT,
  nama TEXT,
  "jenisKelamin" TEXT,
  username TEXT,
  "passwordHash" TEXT,
  "kelasId" TEXT
);

CREATE TABLE IF NOT EXISTS siswa (
  id TEXT PRIMARY KEY,
  nisn TEXT,
  nama TEXT,
  "jenisKelamin" TEXT,
  "tempatLahir" TEXT,
  "tanggalLahir" TEXT,
  "kelasId" TEXT
);

CREATE TABLE IF NOT EXISTS hari_libur (
  id TEXT PRIMARY KEY,
  tanggal TEXT,
  "namaLibur" TEXT,
  keterangan TEXT
);

CREATE TABLE IF NOT EXISTS absensi (
  id TEXT PRIMARY KEY,
  "siswaId" TEXT,
  "kelasId" TEXT,
  tanggal TEXT,
  status TEXT
);

-- 2. MATIKAN ROW LEVEL SECURITY (RLS) SECARA TOTAL
-- Ini adalah solusi paling utama untuk mengatasi error "violates row-level security policy"
ALTER TABLE sekolah DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user DISABLE ROW LEVEL SECURITY;
ALTER TABLE kelas DISABLE ROW LEVEL SECURITY;
ALTER TABLE guru DISABLE ROW LEVEL SECURITY;
ALTER TABLE siswa DISABLE ROW LEVEL SECURITY;
ALTER TABLE hari_libur DISABLE ROW LEVEL SECURITY;
ALTER TABLE absensi DISABLE ROW LEVEL SECURITY;

-- 3. JIKA RLS TETAP AKTIF / DIPAKSA OLEH SUPABASE, 
-- Kita buat kebijakan (policy) PERMISIF yang mengizinkan semua operasi (INSERT, SELECT, UPDATE, DELETE) untuk peran anon/public.
-- Ini adalah pengaman berlapis bilamana sistem Supabase Anda otomatis mengaktifkan kembali RLS.

DROP POLICY IF EXISTS "Allow public read-write on sekolah" ON sekolah;
CREATE POLICY "Allow public read-write on sekolah" ON sekolah FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write on admin_user" ON admin_user;
CREATE POLICY "Allow public read-write on admin_user" ON admin_user FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write on kelas" ON kelas;
CREATE POLICY "Allow public read-write on kelas" ON kelas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write on guru" ON guru;
CREATE POLICY "Allow public read-write on guru" ON guru FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write on siswa" ON siswa;
CREATE POLICY "Allow public read-write on siswa" ON siswa FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write on hari_libur" ON hari_libur;
CREATE POLICY "Allow public read-write on hari_libur" ON hari_libur FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write on absensi" ON absensi;
CREATE POLICY "Allow public read-write on absensi" ON absensi FOR ALL USING (true) WITH CHECK (true);
`;

export interface SyncStatus {
  connected: boolean;
  tablesExist: boolean;
  lastSynced: string;
  error?: string;
}

// Check database table access
export async function testSupabaseConnection(): Promise<SyncStatus> {
  try {
    // Attempt reading from 'sekolah' table to verify structure
    const { error } = await supabase.from(TABLES.SEKOLAH).select('id').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST301') {
        // Connected but empty / RLS blocking can be handled
        return { connected: true, tablesExist: true, lastSynced: new Date().toLocaleTimeString() };
      }
      if (error.message?.includes('relation') || error.code === '42P01') {
        return {
          connected: true,
          tablesExist: false,
          lastSynced: 'Belum Sinkron',
          error: 'Tabel database belum dibuat di Supabase (jalankan script SQL).',
        };
      }
      throw error;
    }

    return { connected: true, tablesExist: true, lastSynced: new Date().toLocaleTimeString() };
  } catch (err: any) {
    console.warn('Supabase connection check failed:', err);
    return {
      connected: false,
      tablesExist: false,
      lastSynced: 'Offline',
      error: err?.message || 'Tidak dapat terhubung ke server Supabase.',
    };
  }
}

// Push local data updates sequentially to Supabase
export async function pushTableToSupabase<T extends { id?: string; username?: string }>(
  tableName: string,
  localData: T[]
): Promise<void> {
  if (!localData || localData.length === 0) return;

  // Split objects to adapt key/primary keys
  const upsertRows = localData.map(row => {
    // Ensure ID key exists
    return { ...row };
  });

  const { error } = await supabase.from(tableName).upsert(upsertRows);
  if (error) {
    throw new Error(`Failed to push table ${tableName}: ${error.message}`);
  }
}

// Helper to push all local storage blocks to Supabase
export async function pushAllLocalToSupabase(): Promise<void> {
  // Grab local data definitions
  const rawSekolah = localStorage.getItem('absensi_sd_sekolah');
  const rawAdmin = localStorage.getItem('absensi_sd_admin');
  const rawKelas = localStorage.getItem('absensi_sd_kelas');
  const rawGuru = localStorage.getItem('absensi_sd_guru');
  const rawSiswa = localStorage.getItem('absensi_sd_siswa');
  const rawLibur = localStorage.getItem('absensi_sd_libur');
  const rawAbsensi = localStorage.getItem('absensi_sd_absensi');

  if (rawSekolah) {
    const sch = JSON.parse(rawSekolah) as Sekolah;
    // Map single school record as row with fixed ID
    await supabase.from(TABLES.SEKOLAH).upsert({ id: 'main', ...sch });
  }
  if (rawAdmin) {
    const list = JSON.parse(rawAdmin) as AdminUser[];
    if (list.length) await supabase.from(TABLES.ADMIN_USER).upsert(list);
  }
  if (rawKelas) {
    const list = JSON.parse(rawKelas) as Kelas[];
    if (list.length) await supabase.from(TABLES.KELAS).upsert(list);
  }
  if (rawGuru) {
    const list = JSON.parse(rawGuru) as Guru[];
    if (list.length) await supabase.from(TABLES.GURU).upsert(list);
  }
  if (rawSiswa) {
    const list = JSON.parse(rawSiswa) as Siswa[];
    if (list.length) await supabase.from(TABLES.SISWA).upsert(list);
  }
  if (rawLibur) {
    const list = JSON.parse(rawLibur) as HariLibur[];
    if (list.length) await supabase.from(TABLES.HARI_LIBUR).upsert(list);
  }
  if (rawAbsensi) {
    const list = JSON.parse(rawAbsensi) as Absensi[];
    if (list.length) await supabase.from(TABLES.ABSENSI).upsert(list);
  }
}

// Pull Supabase remote data back to local store
export async function pullSupabaseToLocal(): Promise<boolean> {
  try {
    // 1. Sekolah
    const { data: sekolahData, error: errSch } = await supabase.from(TABLES.SEKOLAH).select('*');
    if (errSch) throw errSch;
    if (sekolahData && sekolahData.length > 0) {
      // Remove database id field from state if necessary
      const sch = { ...sekolahData[0] };
       localStorage.setItem('absensi_sd_sekolah', JSON.stringify(sch));
    }

    // 2. Admin Users
    const { data: adminData, error: errAdm } = await supabase.from(TABLES.ADMIN_USER).select('*');
    if (errAdm) throw errAdm;
    if (adminData) {
      localStorage.setItem('absensi_sd_admin', JSON.stringify(adminData));
    }

    // 3. Kelas
    const { data: kelasData, error: errKls } = await supabase.from(TABLES.KELAS).select('*');
    if (errKls) throw errKls;
    if (kelasData) {
      localStorage.setItem('absensi_sd_kelas', JSON.stringify(kelasData));
    }

    // 4. Guru
    const { data: guruData, error: errGru } = await supabase.from(TABLES.GURU).select('*');
    if (errGru) throw errGru;
    if (guruData) {
      localStorage.setItem('absensi_sd_guru', JSON.stringify(guruData));
    }

    // 5. Siswa
    const { data: siswaData, error: errSis } = await supabase.from(TABLES.SISWA).select('*');
    if (errSis) throw errSis;
    if (siswaData) {
      localStorage.setItem('absensi_sd_siswa', JSON.stringify(siswaData));
    }

    // 6. Hari Libur
    const { data: liburData, error: errLbr } = await supabase.from(TABLES.HARI_LIBUR).select('*');
    if (errLbr) throw errLbr;
    if (liburData) {
      localStorage.setItem('absensi_sd_libur', JSON.stringify(liburData));
    }

    // 7. Absensi
    const { data: absensiData, error: errAbs } = await supabase.from(TABLES.ABSENSI).select('*');
    if (errAbs) throw errAbs;
    if (absensiData) {
      localStorage.setItem('absensi_sd_absensi', JSON.stringify(absensiData));
    }

    return true;
  } catch (error) {
    console.error('Failed pulling from Supabase:', error);
    return false;
  }
}
