import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, Sliders, CheckSquare, Save, AlertTriangle, HelpCircle } from 'lucide-react';
import { Siswa, Kelas, HariLibur, Absensi } from '../types';

interface AttendanceEntryProps {
  kelasList: Kelas[];
  siswaList: Siswa[];
  hariLiburList: HariLibur[];
  absensiList: Absensi[];
  onSaveAbsensiList: (list: Absensi[]) => void;
  currentUser: { role: 'admin' | 'guru'; username: string; nama: string; userId?: string };
}

export default function AttendanceEntry({
  kelasList,
  siswaList,
  hariLiburList,
  absensiList,
  onSaveAbsensiList,
  currentUser,
}: AttendanceEntryProps) {
  // Determine available classes based on authorization level (Guru vs Admin)
  const isGuru = currentUser.role === 'guru';

  // Get matching Guru object to verify their class
  const availableClasses = isGuru
    ? kelasList.filter(k => k.waliKelasId === currentUser.userId)
    : kelasList;

  // Selected state
  const [selectedDate, setSelectedDate] = useState(() => {
    // Current date YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [selectedKelasId, setSelectedKelasId] = useState(() => {
    return availableClasses[0]?.id || '';
  });

  // Keep a local working map of student state for active edits
  // format: { [siswaId]: 'H' | 'S' | 'I' | 'A' }
  const [attendanceSheet, setAttendanceSheet] = useState<{ [key: string]: 'H' | 'S' | 'I' | 'A' }>({});
  const [lockStatus, setLockStatus] = useState<{ isLocked: boolean; reason: string }>({ isLocked: false, reason: '' });
  const [saveStatus, setSaveStatus] = useState('');

  // Find all active students in selected class
  const activeStudents = siswaList.filter(s => s.kelasId === selectedKelasId);

  // Core Lock Evaluator (Checks whether the chosen date is Sunday or listed inside academic holidays)
  const evaluateLockStatus = (dateStr: string) => {
    if (!dateStr) return { isLocked: false, reason: '' };

    const selectedDateObj = new Date(dateStr);
    const dayOfWeek = selectedDateObj.getDay();

    // 1. Check if Sunday
    if (dayOfWeek === 0) {
      return { isLocked: true, reason: 'Hari Minggu: Sistem meliburkan otomatis dan mengunci lembar kerja absensi.' };
    }

    // 2. Check if listed Academic Holiday
    const matchedHoliday = hariLiburList.find(h => h.tanggal === dateStr);
    if (matchedHoliday) {
      return { isLocked: true, reason: `Hari Libur Akademik: Terkunci otomatis oleh "${matchedHoliday.namaLibur}" (${matchedHoliday.keterangan || 'Libur Resmi'}).` };
    }

    return { isLocked: false, reason: '' };
  };

  // Synchronize calendar locks and prep sheet from existing DB records
  useEffect(() => {
    const lockInfo = evaluateLockStatus(selectedDate);
    setLockStatus(lockInfo);

    if (lockInfo.isLocked) {
      setAttendanceSheet({});
      return;
    }

    // Load existing records from DB
    const newSheet: { [key: string]: 'H' | 'S' | 'I' | 'A' } = {};
    
    activeStudents.forEach(siswa => {
      // Find matching record
      const record = absensiList.find(
        a => a.kelasId === selectedKelasId && a.tanggal === selectedDate && a.siswaId === siswa.id
      );
      // Prepopulate. Default state is 'H' (Hadir) if not saved yet
      newSheet[siswa.id] = record ? record.status : 'H';
    });

    setAttendanceSheet(newSheet);
    setSaveStatus('');
  }, [selectedDate, selectedKelasId, absensiList, siswaList]);

  const handleStatusChange = (siswaId: string, status: 'H' | 'S' | 'I' | 'A') => {
    if (lockStatus.isLocked) return;
    setAttendanceSheet(prev => ({
      ...prev,
      [siswaId]: status
    }));
  };

  const handleSetAllHadir = () => {
    if (lockStatus.isLocked) return;
    const newSheet = { ...attendanceSheet };
    activeStudents.forEach(s => {
      newSheet[s.id] = 'H';
    });
    setAttendanceSheet(newSheet);
  };

  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('');

    if (lockStatus.isLocked) {
      alert('Lembar kerja dikunci. Tidak dapat menyimpan data.');
      return;
    }

    if (activeStudents.length === 0) {
      alert('Tidak ada siswa aktif di dalam kelas untuk disimpan.');
      return;
    }

    // Construct update items
    const updatedRecords = [...absensiList];

    activeStudents.forEach(s => {
      const status = attendanceSheet[s.id] || 'H';
      const recordId = `${selectedKelasId}_${selectedDate}_${s.id}`;
      
      const matchIndex = updatedRecords.findIndex(r => r.id === recordId);
      const newRecord: Absensi = {
        id: recordId,
        siswaId: s.id,
        kelasId: selectedKelasId,
        tanggal: selectedDate,
        status,
      };

      if (matchIndex >= 0) {
        updatedRecords[matchIndex] = newRecord;
      } else {
        updatedRecords.push(newRecord);
      }
    });

    onSaveAbsensiList(updatedRecords);
    setSaveStatus('success');
    
    setTimeout(() => {
      setSaveStatus('');
    }, 3000);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="border-b border-slate-100 pb-4 mb-5">
        <h2 className="text-base font-bold text-slate-800">Isi Kehadiran Siswa Harian</h2>
        <p className="text-xs text-slate-400 mt-0.5">Silakan pilih tanggal pembelajaran, nama kelas, dan simpan data rekap harian secara realtime.</p>
      </div>

      {availableClasses.length === 0 ? (
        <div id="no-auth-classes-alert" className="p-8 text-center bg-rose-50/50 border border-rose-100 rounded-2xl text-rose-700 text-xs flex flex-col items-center">
          <AlertTriangle size={32} className="text-rose-500 mb-3" />
          <p className="font-bold">Akses Terkunci / Guru Pendatang Baru</p>
          <p className="mt-1 text-rose-600/90 leading-relaxed max-w-sm">
            Akun Anda belum dikaitkan dengan kelas mana pun di database sekolah. Hubungi Admin Sekolah untuk menugaskan Anda ke kelas / rombel terlebih dahulu.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSaveAttendance} className="space-y-6">
          {/* Header query layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-slate-500 font-bold mb-1.5 text-xs flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-600" /> Pilih Tanggal Absensi
              </label>
              <input
                id="attendance-date border"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white font-medium text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1.5 text-xs flex items-center gap-1.5">
                <Users size={14} className="text-emerald-600" /> Pilih Rombel / Kelas
              </label>
              <select
                id="attendance-kelas-select"
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-xs font-bold"
              >
                {availableClasses.map(k => (
                  <option key={k.id} value={k.id}>{k.nama} ({isGuru ? 'Binaan Anda' : 'Admin Serta Seluruh'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Locked indicators */}
          {lockStatus.isLocked ? (
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              id="attendance-locked-alert" 
              className="p-6 bg-rose-50/70 border border-rose-200 rounded-xl flex items-start gap-3.5 text-rose-700"
            >
              <AlertTriangle size={24} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Lembar Absensi Terkunci</h4>
                <p className="text-xs text-rose-600/90 mt-1 leading-relaxed">
                  {lockStatus.reason}
                </p>
                <div className="mt-4 p-3 bg-white/75 border border-rose-100 rounded-lg text-rose-800 text-xs">
                  <span className="font-bold">Peraturan Sekolah Dasar:</span> Hari Minggu dan Hari Libur Nasional yang didaftarkan Admin dilarang digunakan untuk pencatatan kehadiran.
                </div>
              </div>
            </motion.div>
          ) : activeStudents.length === 0 ? (
            <div id="class-no-students-alert" className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
              Tidak ada siswa yang terdaftar di kelas ini. Masukkan siswa terlebih dahulu melalui menu Data Siswa.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table header control options */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-xs font-bold flex items-center gap-1.5">
                  <Sliders size={15} className="text-emerald-600" /> Daftar Nama Siswa ({activeStudents.length} Anak)
                </span>
                <button
                  id="btn-set-all-hadir"
                  type="button"
                  onClick={handleSetAllHadir}
                  className="inline-flex items-center gap-1.5 border border-emerald-150 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer pointer-events-auto"
                >
                  <CheckSquare size={12} /> Set Semua Hadir (H)
                </button>
              </div>

              {/* Student grid list with H S I A selection */}
              <div id="attendance-student-table" className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 w-16">No</th>
                      <th className="px-4 py-2.5 w-36">NISN/NIS</th>
                      <th className="px-4 py-2.5">Nama Lengkap Murid</th>
                      <th className="px-4 py-2.5 text-center w-64">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeStudents.map((siswa, idx) => {
                      const currentStatus = attendanceSheet[siswa.id] || 'H';
                      return (
                        <tr key={siswa.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-slate-450">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-slate-500 font-semibold">{siswa.nisn}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{siswa.nama}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{siswa.jenisKelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}</div>
                          </td>
                          <td className="px-4 py-3">
                            {/* Four Status Buttons */}
                            <div className="flex items-center justify-center gap-1 font-bold">
                              {[
                                { key: 'H', label: 'Hadir', activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-50', inactiveColor: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-750' },
                                { key: 'S', label: 'Sakit', activeColor: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-50', inactiveColor: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-55 bg-white/70 hover:text-amber-700' },
                                { key: 'I', label: 'Izin', activeColor: 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-50', inactiveColor: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-750' },
                                { key: 'A', label: 'Alfa', activeColor: 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-50', inactiveColor: 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-750' },
                              ].map(st => (
                                <button
                                  key={st.key}
                                  type="button"
                                  onClick={() => handleStatusChange(siswa.id, st.key as 'H' | 'S' | 'I' | 'A')}
                                  className={`w-14 items-center justify-center py-2 text-center rounded-lg border text-xs tracking-tight transition-all cursor-pointer pointer-events-auto ${
                                    currentStatus === st.key ? st.activeColor : st.inactiveColor
                                  }`}
                                  title={`${st.label} (${st.key})`}
                                >
                                  {st.key}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Form submit button triggers */}
              <div className="flex border-t border-slate-100 pt-4 items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] italic">
                  <HelpCircle size={14} /> S: Sakit, I: Izin, A: Alfa, H: Hadir Pembelajaran.
                </div>

                <div className="flex items-center gap-3">
                  {saveStatus === 'success' && (
                    <span id="save-success-indicator" className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                      ✓ Absensi Disimpan
                    </span>
                  )}
                  <button
                    id="btn-save-attendance-submit"
                    type="submit"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md cursor-pointer pointer-events-auto"
                  >
                    <Save size={15} />
                    Simpan Rekap Kehadiran
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
