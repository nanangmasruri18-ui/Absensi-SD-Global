import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { School, Users, GraduationCap, Calendar, CheckCircle2, AlertCircle, Clock, Cloud, Upload, Download, RefreshCw, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Sekolah, Kelas, Guru, Siswa, Absensi } from '../types';
import { 
  testSupabaseConnection, 
  pushAllLocalToSupabase, 
  pullSupabaseToLocal, 
  SyncStatus, 
  SUPABASE_SETUP_SQL 
} from '../utils/supabase';

interface AdminDashboardProps {
  sekolah: Sekolah;
  kelasList: Kelas[];
  guruList: Guru[];
  siswaList: Siswa[];
  absensiList: Absensi[];
  currentDateStr: string; // YYYY-MM-DD
  onNavigateToAbsensi: () => void;
  onNavigateToLibur: () => void;
  onSyncComplete: () => void;
}

export default function AdminDashboard({
  sekolah,
  kelasList,
  guruList,
  siswaList,
  absensiList,
  currentDateStr,
  onNavigateToAbsensi,
  onNavigateToLibur,
  onSyncComplete,
}: AdminDashboardProps) {
  
  // Supabase states
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSqlBlock, setShowSqlBlock] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const status = await testSupabaseConnection();
    setSyncStatus(status);
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    setSyncMessage('Mengirim file database sekolah ke Supabase...');
    try {
      await pushAllLocalToSupabase();
      setSyncMessage('Semua data berhasil disinkronisasi ke cloud Supabase!');
      await checkConnection();
      setTimeout(() => setSyncMessage(''), 4000);
    } catch (err: any) {
      setSyncMessage(`Gagal kirim data: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    setSyncMessage('Menarik data terbaru dari cloud Supabase...');
    try {
      const ok = await pullSupabaseToLocal();
      if (ok) {
        setSyncMessage('Data berhasil ditarik dari Supabase! Menyegarkan lembar kerja...');
        setTimeout(() => {
          onSyncComplete();
          setSyncMessage('');
        }, 1500);
      } else {
        throw new Error('Gagal memuat beberapa tabel. Periksa relasi tabel Anda.');
      }
    } catch (err: any) {
      setSyncMessage(`Gagal tarik data: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };
  
  // Stats calculations
  const totalClasses = kelasList.length;
  const totalTeachers = guruList.length;
  const totalStudents = siswaList.length;

  // Filter attendance for today
  const todayAbsensi = absensiList.filter(a => a.tanggal === currentDateStr);
  
  const hToday = todayAbsensi.filter(a => a.status === 'H').length;
  const sToday = todayAbsensi.filter(a => a.status === 'S').length;
  const iToday = todayAbsensi.filter(a => a.status === 'I').length;
  const aToday = todayAbsensi.filter(a => a.status === 'A').length;
  
  const totalTodayAbsenInput = todayAbsensi.length;
  
  // Attendance percentage = Hadir / Total Input (or 100% if no inputs yet)
  const attendancePercentage = totalTodayAbsenInput > 0 
    ? Math.round((hToday / totalTodayAbsenInput) * 100) 
    : 100;

  // Generate a nice text representation of today's Indonesian date
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
      {/* School Profile Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 bg-emerald-50 rounded-full -z-10 opacity-60" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-600 p-4 rounded-xl text-white shadow-md shadow-emerald-100 mt-1">
              <School size={28} className="stroke-[1.5]" />
            </div>
            <div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
                Profil Sekolah Aktif
              </span>
              <h2 id="dashboard-school-name" className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mt-1 font-sans">
                {sekolah.nama}
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5 leading-relaxed">
                {sekolah.alamat}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs font-mono text-slate-500">
                <span><b>NPSN:</b> {sekolah.npsn}</span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span><b>Kepala & Admin:</b> {sekolah.adminNama}</span>
              </div>
            </div>
          </div>
          
          <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6 flex flex-col justify-center">
            <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Tanggal Kerja Siswa</span>
            <div className="flex items-center gap-2 text-slate-800 font-bold mt-1 text-sm md:text-base">
              <Calendar size={18} className="text-emerald-600" />
              <span>{getIndonesianDateText(currentDateStr)}</span>
            </div>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium inline-block w-max mt-2">
              Status Kalender: Aktif Sekolah
            </span>
          </div>
        </div>
      </motion.div>

      {/* Supabase Realtime Sync Dashboard Widget */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-emerald-100 rounded-2xl p-5 bg-gradient-to-r from-emerald-50/20 via-slate-50 to-indigo-50/10 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Cloud size={16} className="text-emerald-600 animate-pulse" />
              Sinkronisasi Cloud Database (Supabase Web Portal)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Automasi sinkronisasi data antar perangkat sekolah secara realtime melintasi pangkalan data.</p>
          </div>
          
          <button
            onClick={checkConnection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer pointer-events-auto transition-all"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Segarkan Koneksi
          </button>
        </div>

        {/* Sync Status Display Banner */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-baseline justify-between gap-4 py-2 px-3 bg-white border border-slate-200/60 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {syncStatus?.connected ? (
                syncStatus?.tablesExist ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </>
                )
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              )}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                {syncStatus?.connected 
                  ? (syncStatus?.tablesExist ? 'Supabase Terhubung & Siap Sinkron' : 'Koneksi Berhasil, Tabel Belum Terbuat') 
                  : 'Mode Lokal (Offline / Supabase Belum Terhubung)'}
                {syncStatus?.connected && syncStatus?.tablesExist && (
                  <span className="bg-emerald-550 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase border border-emerald-100">Aktif</span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {syncStatus?.error ? `Masalah: ${syncStatus.error}` : `Waktu Sinkron Akhir: ${syncStatus?.lastSynced || 'Beralih ke lokal'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!syncStatus?.tablesExist && syncStatus?.connected && (
              <button
                onClick={() => setShowSqlBlock(!showSqlBlock)}
                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer pointer-events-auto transition-all"
              >
                Setup SQL Tabel
              </button>
            )}
          </div>
        </div>

        {/* Sync message alert or log */}
        {syncMessage && (
          <div className="bg-sky-50 border border-sky-100 text-sky-800 text-xs px-3 py-2.5 rounded-xl font-medium flex items-center gap-2 animate-pulse">
            <RefreshCw size={13} className="animate-spin text-sky-600" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Sync Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
          <button
            onClick={handlePushToCloud}
            disabled={isSyncing || !syncStatus?.connected || !syncStatus?.tablesExist}
            className="flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-800 font-bold text-xs py-3 rounded-xl cursor-pointer pointer-events-auto transition-all"
            title="Kirim semua data lokal dari browser ini untuk disimpan di database cloud Supabase"
          >
            <Upload size={14} className="text-emerald-600" /> Kirim / Upload Data Lokal ke Cloud
          </button>

          <button
            onClick={handlePullFromCloud}
            disabled={isSyncing || !syncStatus?.connected || !syncStatus?.tablesExist}
            className="flex items-center justify-center gap-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-800 font-bold text-xs py-3 rounded-xl cursor-pointer pointer-events-auto transition-all"
            title="Tarik data terbaru dari database cloud Supabase untuk menggantikan data lokal di browser ini"
          >
            <Download size={14} className="text-indigo-600" /> Tarik / Download Data Cloud ke Lokal
          </button>
        </div>

        {/* Manual database script box */}
        {showSqlBlock && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-900 text-slate-100 space-y-3 font-mono text-[11px] overflow-hidden">
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-2">
              <span>SETUP SCRIPT TABEL SQL (SUPABASE EDITOR)</span>
              <button
                onClick={handleCopySql}
                className="text-slate-100 hover:text-emerald-400 flex items-center gap-1 cursor-pointer pointer-events-auto font-sans text-[11px] font-bold bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check size={12} className="text-emerald-400" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Salin SQL Script
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-400 text-[10px] font-sans italic leading-relaxed">
              *Supabase memerlukan pembuatan skema tabel relasi agar aplikasi dapat meng-upload data. Silakan salin script SQL di atas dan tempelkan ke panel <b>SQL Editor</b> di dashboard project Supabase Anda, lalu tekan tombol <b>Run</b>. Setelah itu, tekan tombol "Segarkan Koneksi" di atas!
            </p>
            <pre className="bg-black/40 p-3 rounded-lg overflow-x-auto max-h-48 text-emerald-300 scrollbar-thin">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        )}
      </motion.div>

      {/* Grid of Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Jumlah Kelas', value: totalClasses, label: 'Rombel Aktif', icon: <School size={22} className="text-emerald-600" />, bg: 'bg-emerald-50' },
          { title: 'Jumlah Guru', value: totalTeachers, label: 'Pendidik', icon: <Users size={22} className="text-blue-600" />, bg: 'bg-blue-50' },
          { title: 'Jumlah Siswa', value: totalStudents, label: 'Siswa Terdaftar', icon: <GraduationCap size={22} className="text-violet-600" />, bg: 'bg-violet-50' },
          { title: 'Kehadiran Hari Ini', value: `${attendancePercentage}%`, label: `${hToday} dari ${totalTodayAbsenInput || totalStudents} murid`, icon: <CheckCircle2 size={22} className="text-amber-600" />, bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm transition-all hover:border-slate-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold">{stat.title}</span>
              <div className={`${stat.bg} p-2.5 rounded-xl`}>{stat.icon}</div>
            </div>
            <div className="mt-3">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">{stat.value}</span>
              <span className="block text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{stat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Kehadiran Hari Ini Detail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock size={16} className="text-emerald-600" />
                Rangkuman Absensi Murid Hari Ini
              </h3>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Tgl: {currentDateStr}
              </span>
            </div>

            {totalTodayAbsenInput === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <AlertCircle size={36} className="text-amber-400 mb-3 stroke-[1.5]" />
                <p className="text-sm font-semibold text-slate-600">Belum Ada Absensi Hari Ini</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Guru kelas belum mengisi lembar absensi harian untuk tanggal {getIndonesianDateText(currentDateStr)}.
                </p>
                <button
                  onClick={onNavigateToAbsensi}
                  className="mt-4 inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors pointer-events-auto cursor-pointer"
                >
                  Isi Absensi Sekarang
                </button>
              </div>
            ) : (
              <div className="py-6 space-y-5">
                {/* SVG Progress Bars for H, S, I, A */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Hadir (H)', count: hToday, color: 'bg-emerald-500', barColor: '#10b981', desc: 'Siswa aktif di kelas' },
                    { label: 'Sakit (S)', count: sToday, color: 'bg-amber-500', barColor: '#f59e0b', desc: 'Ada surat/keterangan' },
                    { label: 'Izin (I)', count: iToday, color: 'bg-blue-500', barColor: '#3b82f6', desc: 'Keperluan keluarga' },
                    { label: 'Alfa (A)', count: aToday, color: 'bg-rose-500', barColor: '#f43f5e', desc: 'Tanpa keterangan' },
                  ].map(item => {
                    const barPercent = Math.round((item.count / totalTodayAbsenInput) * 100) || 0;
                    return (
                      <div key={item.label} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-500 block">{item.label}</span>
                        <span className="text-xl font-extrabold text-slate-800 mt-1 block">
                          {item.count} <small className="text-slate-400 text-xs font-normal">Siswa</small>
                        </span>
                        
                        {/* Custom horizontal percent bar */}
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                          <div 
                            className={`h-full ${item.color}`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 mt-1 block tracking-wider">
                          {barPercent}% dari total absensi
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Ring with Summary */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative h-20 w-20 flex items-center justify-center bg-white rounded-full shadow-inner border border-emerald-100">
                    <svg className="absolute inset-0 h-full w-full rotate-90 transform">
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="#e2e8f0"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="#10b981"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 32}
                        strokeDashoffset={2 * Math.PI * 32 * (1 - attendancePercentage / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-lg font-black text-emerald-800">{attendancePercentage}%</span>
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-emerald-800">Tingkat Pencapaian Kehadiran Hari Ini Sangat Bagus!</p>
                    <p className="text-[11px] text-emerald-700/80 leading-relaxed max-w-md">
                      Sebanyak <b>{hToday}</b> dari total <b>{totalTodayAbsenInput}</b> siswa yang diabsen hari ini tercatat hadir secara fisik. Total yang absen sakit: <b>{sToday}</b>, izin: <b>{iToday}</b>, dan alfa tanpa kabar: <b>{aToday}</b>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>SD Merdeka Belajar • Pelaporan Realtime</span>
            <button 
              onClick={onNavigateToAbsensi}
              className="text-emerald-600 hover:text-emerald-700 font-bold tracking-tight text-[11px] uppercase pointer-events-auto cursor-pointer"
            >
              Lihat Lembar Absensi
            </button>
          </div>
        </div>

        {/* Quick Guidelines Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar size={16} className="text-emerald-600" />
              Kalender & Kebijakan Sekolah
            </h3>
            
            <ul className="mt-4 space-y-3.5 text-xs text-slate-600">
              <li className="flex gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <div>
                  <h4 className="font-semibold text-slate-700">Hari Sekolah Aktif</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Senin sampai Sabtu secara berturut-turut.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <div>
                  <h4 className="font-semibold text-slate-700">Hari Minggu & Libur</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Hari Minggu dikunci otomatis (merah) dan seluruh agenda libur nasional yang ditambahkan ditutup.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <div>
                  <h4 className="font-semibold text-slate-700">Akurasi Rekap Bulanan</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Digunakan untuk keperluan laporan kepada Orang Tua & Dinas Pendidikan.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-6">
            <button
              onClick={onNavigateToLibur}
              className="w-full text-center text-xs font-semibold bg-slate-50 text-slate-600 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-100 hover:text-slate-700 transition-colors pointer-events-auto cursor-pointer"
            >
              Urus Kalender Akademik (Libur)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
