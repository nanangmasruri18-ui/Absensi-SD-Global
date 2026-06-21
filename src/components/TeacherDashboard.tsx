import { motion } from 'motion/react';
import { User, School, Users, GraduationCap, CheckCircle2, Award, Calendar, AlertCircle } from 'lucide-react';
import { Guru, Kelas, Siswa, Absensi } from '../types';

interface TeacherDashboardProps {
  currentGuru: Guru;
  kelasList: Kelas[];
  siswaList: Siswa[];
  absensiList: Absensi[];
  currentDateStr: string;
  onNavigateToAbsensi: () => void;
}

export default function TeacherDashboard({
  currentGuru,
  kelasList,
  siswaList,
  absensiList,
  currentDateStr,
  onNavigateToAbsensi,
}: TeacherDashboardProps) {
  
  // Find their class room
  const filterClass = kelasList.find(k => k.id === currentGuru.kelasId);
  const classSiswa = siswaList.filter(s => s.kelasId === currentGuru.kelasId);
  const totalStudents = classSiswa.length;

  // Filter attendance of today specifically for their classroom
  const todayClassAbsensi = absensiList.filter(
    a => a.kelasId === currentGuru.kelasId && a.tanggal === currentDateStr
  );

  const hCount = todayClassAbsensi.filter(a => a.status === 'H').length;
  const sCount = todayClassAbsensi.filter(a => a.status === 'S').length;
  const iCount = todayClassAbsensi.filter(a => a.status === 'I').length;
  const aCount = todayClassAbsensi.filter(a => a.status === 'A').length;

  const totalInput = todayClassAbsensi.length;
  const attendancePercentage = totalInput > 0 
    ? Math.round((hCount / totalInput) * 100) 
    : 100;

  const getIndonesianDateText = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Teacher Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 bg-emerald-50 rounded-full -z-10 opacity-60" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-600 p-4.5 rounded-2xl text-white shadow-lg shadow-emerald-100 mt-1">
              <User size={30} className="stroke-[1.5]" />
            </div>
            <div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                Panel Wali Kelas
              </span>
              <h2 id="teacher-dashboard-name" className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
                Selamat Datang, {currentGuru.nama}
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 font-mono">
                NIP: {currentGuru.nip}
              </p>
              
              <div className="flex flex-wrap gap-4 mt-3.5 text-xs">
                <span className="bg-slate-50 border border-slate-100 text-slate-600 px-3 py-1 rounded-xl font-semibold flex items-center gap-1.5">
                  <School size={13} className="text-emerald-600" />
                  Kelas Binaan: <b>{filterClass ? filterClass.nama : 'Belum Ditentukan'}</b>
                </span>
                <span className="bg-slate-50 border border-slate-100 text-slate-600 px-3 py-1 rounded-xl font-semibold flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-600" />
                  Siswa Didik: <b>{totalStudents} Anak</b>
                </span>
              </div>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 shrink-0 flex flex-col justify-center">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Tanggal Kerja Guru</span>
            <div className="flex items-center gap-2 text-slate-800 font-bold mt-1 text-sm md:text-base">
              <Calendar size={18} className="text-emerald-600" />
              <span>{getIndonesianDateText(currentDateStr)}</span>
            </div>
            {totalInput > 0 ? (
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold inline-block w-max mt-2.5">
                ✓ Absensi Hari Ini Selesai
              </span>
            ) : (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-bold inline-block w-max mt-2.5 flex items-center gap-1">
                <AlertCircle size={10} /> Belum Isi Absensi Hari Ini
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Blocks */}
      {!currentGuru.kelasId ? (
        <div id="teacher-no-class-lock" className="p-8 text-center bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-xs flex flex-col items-center">
          <AlertCircle size={36} className="text-rose-500 mb-3" />
          <p className="font-bold">Kelas Belum Ditugaskan</p>
          <p className="mt-1 leading-relaxed max-w-sm">
            Admin sekolah belum mengaitkan akun Wali Kelas Anda ke salah satu kelas di pangkalan data. Anda tidak dapat mengisi kehadiran atau melihat rekap kelas sebelum ditautkan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick stats panel */}
          <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Rekap Kehadiran Kelas Hari Ini
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                {filterClass?.nama}
              </span>
            </div>

            {totalInput === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center">
                <AlertCircle size={32} className="text-amber-400 mb-2.5" />
                <p className="text-sm font-semibold text-slate-600">Anda Belum Mengisi Absensi Hari Ini</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Harap catat kehadiran seluruh siswa didikan di {filterClass?.nama} untuk menghindari keterlambatan laporan harian.
                </p>
                <button
                  onClick={onNavigateToAbsensi}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-colors cursor-pointer pointer-events-auto"
                >
                  Isi Absensi Kelas {filterClass?.nama}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Hadir (H)', count: hCount, color: 'bg-emerald-500' },
                    { label: 'Sakit (S)', count: sCount, color: 'bg-amber-500' },
                    { label: 'Izin (I)', count: iCount, color: 'bg-blue-500' },
                    { label: 'Alfa (A)', count: aCount, color: 'bg-rose-500' },
                  ].map(item => {
                    const pct = Math.round((item.count / totalInput) * 100) || 0;
                    return (
                      <div key={item.label} className="bg-slate-50/70 border border-slate-100 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-bold block select-none">{item.label}</span>
                        <span className="text-xl font-black text-slate-800 mt-1 block">
                          {item.count} <small className="text-xs font-normal text-slate-400">Anak</small>
                        </span>
                        
                        <div className="w-full bg-slate-200 h-1 rounded-full mt-2.5 overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 block font-mono">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 bg-white rounded-full flex items-center justify-center font-black text-emerald-800 border border-emerald-100 text-sm shadow-inner">
                    {attendancePercentage}%
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800">Kehadiran Kelas Berlangsung Kondusif</h4>
                    <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                      Siswa kelas binaan yang masuk belajar hari ini mencapai <b>{attendancePercentage}%</b> (<b>{hCount}</b> anak). Pastikan rekap sakit (<b>{sCount}</b>) dan izin (<b>{iCount}</b>) dicocokkan dengan surat dari orang tua siswa.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Links / Rules list specifically for teachers */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <Award size={16} className="text-emerald-600" />
                Aturan & Batasan Wali Kelas
              </h3>

              <ul className="text-xs text-slate-550 space-y-3">
                <li className="flex gap-2">
                  <span className="text-rose-500 shrink-0 select-none">•</span>
                  <p><b>Isi Absensi Harian:</b> Pengisian ditutup jika berada di hari Minggu atau tanggal Libur Nasional pilihan Admin.</p>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-500 shrink-0 select-none">•</span>
                  <p><b>Hanya Kelas Pengampu:</b> Anda dilarang membuka atau mengubah biodata/kehadiran murid dari rombel kelas lain.</p>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-500 shrink-0 select-none">•</span>
                  <p><b>Akses CRUD Siswa:</b> Guru dilarang menambah atau menghapus murid didiknya. Segala pendaftaran siswa harus dimohonkan kepada Admin Sekolah.</p>
                </li>
              </ul>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-6">
              <button
                onClick={onNavigateToAbsensi}
                disabled={totalStudents === 0}
                className="w-full text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-750 text-white py-3 rounded-xl shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto cursor-pointer"
              >
                Tulis Absensi Harian Kelas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
