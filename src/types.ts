export interface Sekolah {
  nama: string;
  alamat: string;
  npsn: string;
  adminNama: string;
}

export interface AdminUser {
  username: string;
  nama: string;
  passwordHash: string;
}

export interface Guru {
  id: string;
  nip: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  username: string;
  passwordHash: string;
  kelasId: string; // The specific class this teacher is in charge of (wali kelas)
}

export interface Kelas {
  id: string;
  nama: string; // e.g. "Kelas 1A"
  tingkat: string; // "1", "2", "3", etc.
  waliKelasId: string; // matches Guru.id or "" if unassigned
}

export interface Siswa {
  id: string;
  nisn: string; // NISN or NIS
  nama: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD
  kelasId: string; // matches Kelas.id
}

export interface HariLibur {
  id: string;
  tanggal: string; // YYYY-MM-DD
  namaLibur: string;
  keterangan: string;
}

export interface Absensi {
  id: string; // format: `${kelasId}_${tanggal}_${siswaId}`
  siswaId: string;
  kelasId: string;
  tanggal: string; // YYYY-MM-DD
  status: 'H' | 'S' | 'I' | 'A'; // Hadir, Sakit, Izin, Alfa
}

export type UserRole = 'admin' | 'guru';

export interface Session {
  role: UserRole;
  username: string;
  nama: string;
  userId?: string; // If guru, store guru id here
  expiresAt: string; // ISO string for auto-logout
}
