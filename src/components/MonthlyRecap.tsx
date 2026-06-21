import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, FileSpreadsheet, Printer, Search, ArrowRight, Download } from 'lucide-react';
import { Siswa, Kelas, HariLibur, Absensi } from '../types';
import { exportMonthlyToExcel, MonthlyExportRow } from '../utils/excel';
import { printElementById, downloadElementAsPDF } from '../utils/print';

interface MonthlyRecapProps {
  kelasList: Kelas[];
  siswaList: Siswa[];
  hariLiburList: HariLibur[];
  absensiList: Absensi[];
  currentUser: { role: 'admin' | 'guru'; username: string; nama: string; userId?: string };
  schoolName: string;
}

export default function MonthlyRecap({
  kelasList,
  siswaList,
  hariLiburList,
  absensiList,
  currentUser,
  schoolName,
}: MonthlyRecapProps) {
  const isGuru = currentUser.role === 'guru';

  // Available classes based on login
  const availableClasses = isGuru
    ? kelasList.filter(k => k.waliKelasId === currentUser.userId)
    : kelasList;

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => String(today.getMonth() + 1)); // 1-indexed
  const [selectedYear, setSelectedYear] = useState(() => String(today.getFullYear()));
  const [selectedKelasId, setSelectedKelasId] = useState(() => availableClasses[0]?.id || '');

  // Months listing
  const months = [
    { value: '1', name: 'Januari' },
    { value: '2', name: 'Februari' },
    { value: '3', name: 'Maret' },
    { value: '4', name: 'April' },
    { value: '5', name: 'Mei' },
    { value: '6', name: 'Juni' },
    { value: '7', name: 'Juli' },
    { value: '8', name: 'Agustus' },
    { value: '9', name: 'September' },
    { value: '10', name: 'Oktober' },
    { value: '11', name: 'November' },
    { value: '12', name: 'Desember' },
  ];

  // Years listing
  const years = ['2025', '2026', '2027', '2028'];

  // Days in selected Month
  const daysInMonth = useMemo(() => {
    const m = parseInt(selectedMonth, 10);
    const y = parseInt(selectedYear, 10);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Selected Class details
  const activeClass = enrolledClassDetails(selectedKelasId);
  function enrolledClassDetails(id: string) {
    return kelasList.find(c => c.id === id);
  }

  // Active students in selected class
  const classStudents = useMemo(() => {
    return siswaList.filter(s => s.kelasId === selectedKelasId);
  }, [selectedKelasId, siswaList]);

  // Compile monthly logs matrix
  const monthlyLogs = useMemo(() => {
    if (!selectedKelasId) return [];

    return classStudents.map((siswa, idx) => {
      let hCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      const dailyLog: (string | number)[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        // Date formatting helpers: YYYY-MM-DD
        const monthStr = selectedMonth.padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const currentDateStr = `${selectedYear}-${monthStr}-${dayStr}`;

        // Verify if Sunday
        const dateObj = new Date(currentDateStr);
        const isSunday = dateObj.getDay() === 0;

        // Verify listed academic holiday
        const isHoliday = hariLiburList.some(h => h.tanggal === currentDateStr);

        if (isSunday || isHoliday) {
          dailyLog.push('—'); // represented as locked dashboard spacer
          continue;
        }

        // Find match record
        const record = absensiList.find(
          a => a.kelasId === selectedKelasId && a.tanggal === currentDateStr && a.siswaId === siswa.id
        );

        if (record) {
          dailyLog.push(record.status);
          if (record.status === 'H') hCount++;
          if (record.status === 'S') sCount++;
          if (record.status === 'I') iCount++;
          if (record.status === 'A') aCount++;
        } else {
          // If not recorded yet, show dot spacer
          dailyLog.push('.');
        }
      }

      return {
        id: siswa.id,
        no: idx + 1,
        nama: siswa.nama,
        dailyLog,
        H: hCount,
        S: sCount,
        I: iCount,
        A: aCount,
      };
    });
  }, [selectedKelasId, selectedMonth, selectedYear, daysInMonth, classStudents, absensiList, hariLiburList]);

  const handleExcelExport = () => {
    if (monthlyLogs.length === 0) {
      alert('Tidak ada data yang dapat diekspor.');
      return;
    }

    const currentMonthName = months.find(m => m.value === selectedMonth)?.name || 'Bulan';
    const rows: MonthlyExportRow[] = monthlyLogs.map(log => ({
      no: log.no,
      nama: log.nama,
      kehadiranLog: log.dailyLog.map(v => v === '.' ? '' : v),
      hadir: log.H,
      sakit: log.S,
      izin: log.I,
      alfa: log.A
    }));

    exportMonthlyToExcel(
      schoolName,
      activeClass?.nama || 'Kelas',
      currentMonthName,
      parseInt(selectedYear, 10),
      daysInMonth,
      rows
    );
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = () => {
    printElementById('print-monthly-sheet', `Rekapitulasi_Absensi_Bulanan_Siswa_${activeClass?.nama || 'Kelas'}`);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const monthLabel = months.find(m => m.value === selectedMonth)?.name || 'Bulan';
      const filename = `Rekapitulasi_Absensi_Bulanan_Siswa_${activeClass?.nama || 'Kelas'}_${monthLabel}_${selectedYear}`;
      await downloadElementAsPDF('print-monthly-sheet', filename);
    } catch (err) {
      console.error('Download PDF failed:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">Rekapitulasi Absensi Bulanan Siswa</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">Saring data berdasarkan bulan, tahun, dan inginkan pelaporan cetak atau unduh file Excel/PDF.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
               id="btn-export-excel-recap"
               onClick={handleExcelExport}
               disabled={monthlyLogs.length === 0}
               className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs px-3.5 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer pointer-events-auto"
            >
              <FileSpreadsheet size={15} />
              Ekspor Excel (CSV)
            </button>
            <button
               onClick={handleDownloadPdf}
               disabled={monthlyLogs.length === 0 || isDownloadingPdf}
               className="inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold text-xs px-3.5 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer pointer-events-auto"
            >
              <Download size={15} className={isDownloadingPdf ? "animate-bounce" : ""} />
              {isDownloadingPdf ? 'Mengunduh...' : 'Unduh PDF'}
            </button>
            <div className="flex flex-col items-end">
              <button
                 onClick={handlePrint}
                 disabled={monthlyLogs.length === 0}
                 className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer pointer-events-auto"
              >
                <Printer size={15} />
                Cetak / PDF
              </button>
              {monthlyLogs.length > 0 && (
                <span className="text-[9px] text-slate-400 mt-1.5 block font-bold text-right">
                  *Gunakan opsi <b>"Simpan sebagai PDF"</b> di dialog cetak
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-550 font-semibold mb-1.5 text-xs">Pilih Kelas / Rombel</label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white text-slate-800 font-bold"
            >
              {availableClasses.length === 0 ? (
                <option value="">-- Tidak Ada Hak Akses Kelas --</option>
              ) : (
                availableClasses.map(k => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-550 font-semibold mb-1.5 text-xs">Pilih Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white text-slate-800"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-550 font-semibold mb-1.5 text-xs">Pilih Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white text-slate-800"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Sheet View - Works stunningly for screens AND during standard print browser interactions */}
      <div id="print-monthly-sheet" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Printable Meta School Banner (Only active on print preview/renders) */}
        <div className="hidden print:block pb-5 mb-5 border-b-2 border-slate-800 text-center uppercase">
          <h1 className="text-xl font-extrabold tracking-tight">{schoolName}</h1>
          <p className="text-sm mt-1 font-bold">REKAPITULASI ABSENSI BULANAN SISWA</p>
          <div className="flex justify-center gap-x-6 text-[11px] font-mono mt-2 font-bold normal-case">
            <span><b>Kelas:</b> {activeClass?.nama || '—'}</span>
            <span>|</span>
            <span><b>Periode:</b> {months.find(m => m.value === selectedMonth)?.name} {selectedYear}</span>
          </div>
        </div>

        {monthlyLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl text-xs">
            Tidak ada siswa aktif terdaftar di dalam kelas ini untuk menyusun pelaporan buku induk harian.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <span className="text-slate-500 font-bold text-xs flex items-center gap-1">
                <Users size={15} className="text-emerald-600" />
                Matriks Absensi {activeClass?.nama} — {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
              </span>
              <span className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-1 rounded font-mono font-medium select-none">
                •: Belum Diabsen | —: Hari Libur/Minggu
              </span>
            </div>

            {/* Scrollable Matrix Grid Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100 max-w-full">
              <table id="monthly-printable-table" className="min-w-full divide-y divide-slate-100 text-left text-[11px] table-fixed">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[9px] uppercase tracking-wider">
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 w-10 text-center">No</th>
                    <th className="px-3 py-2 w-48 font-sans">Nama Siswa</th>
                    {/* Days column */}
                    {Array.from({ length: daysInMonth }, (_, d) => (
                      <th key={d} className="px-1 py-2 text-center w-7 border-l border-slate-100 font-mono">{d + 1}</th>
                    ))}
                    {/* H S I A totals */}
                    <th className="px-2 py-2 text-center w-8 border-l-2 border-slate-200 bg-emerald-50 text-emerald-800">H</th>
                    <th className="px-2 py-2 text-center w-8 border-l border-slate-100 bg-amber-50 text-amber-800">S</th>
                    <th className="px-2 py-2 text-center w-8 border-l border-slate-100 bg-blue-50 text-blue-800">I</th>
                    <th className="px-2 py-2 text-center w-8 border-l border-slate-100 bg-rose-50 text-rose-800">A</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                  {monthlyLogs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-2 py-2.5 text-center font-mono text-slate-400">{r.no}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800 truncate select-none">{r.nama}</td>
                      {/* Daily values */}
                      {r.dailyLog.map((status, index) => {
                        let colorHex = 'text-slate-400';
                        if (status === 'H') colorHex = 'text-emerald-600 font-bold';
                        else if (status === 'S') colorHex = 'text-amber-500 font-bold';
                        else if (status === 'I') colorHex = 'text-blue-500 font-bold';
                        else if (status === 'A') colorHex = 'text-rose-500 font-extrabold';
                        
                        return (
                          <td key={index} className={`px-1 py-2.5 text-center font-mono border-l border-slate-100 text-[10px] ${colorHex}`}>
                            {status}
                          </td>
                        );
                      })}
                      {/* H S I A values */}
                      <td className="px-2 py-2.5 text-center font-bold border-l-2 border-slate-200 bg-emerald-50/40 text-emerald-700">{r.H}</td>
                      <td className="px-2 py-2.5 text-center font-bold border-l border-slate-100 bg-amber-50/40 text-amber-700">{r.S}</td>
                      <td className="px-2 py-2.5 text-center font-bold border-l border-slate-100 bg-blue-50/40 text-blue-700">{r.I}</td>
                      <td className="px-2 py-2.5 text-center font-bold border-l border-slate-100 bg-rose-50/40 text-rose-700">{r.A}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Printable signature lines (Only visible on browser Print action or PDF exports) */}
            <div className="hidden print:flex print:justify-end mt-12 text-xs pt-8 ml-auto" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', marginTop: '3rem' }}>
              <div className="text-center w-64" style={{ marginLeft: 'auto', marginRight: '0', textAlign: 'center' }}>
                <p>Gelora, _________________ 2026</p>
                <p style={{ marginTop: '2px' }} className="font-bold">Guru Kelas</p>
                <div className="h-20" style={{ height: '5rem' }} />
                <p className="underline font-bold">__________________________</p>
                <p className="text-[10px] font-mono mt-1">NIP. _____________________</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
