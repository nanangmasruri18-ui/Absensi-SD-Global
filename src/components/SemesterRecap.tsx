import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { CalendarRange, FileSpreadsheet, Printer, Users, Download } from 'lucide-react';
import { Siswa, Kelas, Absensi, HariLibur } from '../types';
import { exportSemesterToExcel, SemesterExportRow } from '../utils/excel';
import { printElementById, downloadElementAsPDF } from '../utils/print';

interface SemesterRecapProps {
  kelasList: Kelas[];
  siswaList: Siswa[];
  absensiList: Absensi[];
  hariLiburList: HariLibur[];
  currentUser: { role: 'admin' | 'guru'; username: string; nama: string; userId?: string };
  schoolName: string;
}

export default function SemesterRecap({
  kelasList,
  siswaList,
  absensiList,
  hariLiburList,
  currentUser,
  schoolName,
}: SemesterRecapProps) {
  const isGuru = currentUser.role === 'guru';

  // Available classes based on login
  const availableClasses = isGuru
    ? kelasList.filter(k => k.waliKelasId === currentUser.userId)
    : kelasList;

  // Semester details
  const [selectedSemester, setSelectedSemester] = useState('Ganjil'); // Ganjil / Genap
  const [selectedTahunPelajaran, setSelectedTahunPelajaran] = useState('2025/2026');
  const [selectedKelasId, setSelectedKelasId] = useState(() => availableClasses[0]?.id || '');

  // Months determined by Semester
  // Ganjil: Jul-Des, Genap: Jan-Jun
  const activeMonths = useMemo(() => {
    if (selectedSemester === 'Ganjil') {
      return [7, 8, 9, 10, 11, 12]; // July to December
    } else {
      return [1, 2, 3, 4, 5, 6]; // January to June
    }
  }, [selectedSemester]);

  // Selected Class details
  const activeClass = detailClass(selectedKelasId);
  function detailClass(id: string) {
    return kelasList.find(c => c.id === id);
  }

  // Active students in selected class
  const classStudents = useMemo(() => {
    return siswaList.filter(s => s.kelasId === selectedKelasId);
  }, [selectedKelasId, siswaList]);

  // Compile calculations of all attendance within the semester range
  const semesterLogs = useMemo(() => {
    if (!selectedKelasId) return [];

    // Parse Year intervals from "2025/2026"
    const [startYearStr, endYearStr] = selectedTahunPelajaran.split('/');
    const startYear = parseInt(startYearStr, 10) || 2025;
    const endYear = parseInt(endYearStr, 10) || 2026;

    return classStudents.map((siswa, idx) => {
      let hCount = 0;
      let sCount = 0;
      let iCount = 0;
      let aCount = 0;

      // Filter all attendance records of this student
      const studentRecords = absensiList.filter(
        a => a.siswaId === siswa.id && a.kelasId === selectedKelasId
      );

      studentRecords.forEach(rec => {
        try {
          // Parse record date
          const dateObj = new Date(rec.tanggal);
          const month = dateObj.getMonth() + 1; // 1-indexed
          const year = dateObj.getFullYear();

          // Check if month belongs to active semester
          const isMonthMatch = activeMonths.includes(month);
          
          // Verify Year match:
          // For Ganjil (Jul-Dec), the year is startYear (e.g. 2025)
          // For Genap (Jan-Jun), the year is endYear (e.g. 2026)
          let isYearMatch = false;
          if (selectedSemester === 'Ganjil' && month >= 7 && year === startYear) {
            isYearMatch = true;
          } else if (selectedSemester === 'Genap' && month <= 6 && year === endYear) {
            isYearMatch = true;
          }

          if (isMonthMatch && isYearMatch) {
            if (rec.status === 'H') hCount++;
            else if (rec.status === 'S') sCount++;
            else if (rec.status === 'I') iCount++;
            else if (rec.status === 'A') aCount++;
          }
        } catch (e) {
          // Date parsing issue safely ignored
        }
      });

      const totalFilled = hCount + sCount + iCount + aCount;
      const attendancePercent = totalFilled > 0
        ? Math.round((hCount / totalFilled) * 100)
        : 100;

      return {
        id: siswa.id,
        no: idx + 1,
        nisn: siswa.nisn,
        nama: siswa.nama,
        jenisKelamin: siswa.jenisKelamin,
        H: hCount,
        S: sCount,
        I: iCount,
        A: aCount,
        pct: attendancePercent,
      };
    });
  }, [selectedKelasId, selectedSemester, selectedTahunPelajaran, activeMonths, classStudents, absensiList]);

  const handleExcelExport = () => {
    if (semesterLogs.length === 0) {
      alert('Tidak ada data semester yang dapat diekspor.');
      return;
    }

    const rows: SemesterExportRow[] = semesterLogs.map(log => ({
      no: log.no,
      nisn: log.nisn,
      nama: log.nama,
      jenisKelamin: log.jenisKelamin === 'L' ? 'L' : 'P',
      hadir: log.H,
      sakit: log.S,
      izin: log.I,
      alfa: log.A,
      persentase: `${log.pct}%`
    }));

    exportSemesterToExcel(
      schoolName,
      activeClass?.nama || 'Kelas',
      `Semester ${selectedSemester}`,
      selectedTahunPelajaran,
      rows
    );
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handlePrint = () => {
    printElementById('print-semester-sheet', `Rekap_Semester_Absensi_${activeClass?.nama || 'Kelas'}`);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const filename = `Rekap_Semester_Absensi_${activeClass?.nama || 'Kelas'}_Semester_${selectedSemester}_${selectedTahunPelajaran.replace(/\//g, '-')}`;
      await downloadElementAsPDF('print-semester-sheet', filename);
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
            <h2 className="text-base font-bold text-slate-800">Rekapitulasi Kehadiran Semester Siswa</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">Saring data berdasarkan Semester ganjil/genap dan unduh file rekapitulasi semester untuk laporan rapor.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
               id="btn-export-semester-excel"
               onClick={handleExcelExport}
               disabled={semesterLogs.length === 0}
               className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs px-3.5 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer pointer-events-auto"
            >
              <FileSpreadsheet size={15} />
              Ekspor Semester Excel
            </button>
            <button
               onClick={handleDownloadPdf}
               disabled={semesterLogs.length === 0 || isDownloadingPdf}
               className="inline-flex items-center gap-1.5 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-semibold text-xs px-3.5 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer pointer-events-auto"
            >
              <Download size={15} className={isDownloadingPdf ? "animate-bounce" : ""} />
              {isDownloadingPdf ? 'Mengunduh...' : 'Unduh PDF'}
            </button>
            <div className="flex flex-col items-end">
              <button
                 onClick={handlePrint}
                 disabled={semesterLogs.length === 0}
                 className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl disabled:opacity-50 transition-all cursor-pointer pointer-events-auto"
              >
                <Printer size={15} />
                Cetak Semester
              </button>
              {semesterLogs.length > 0 && (
                <span className="text-[9px] text-slate-400 mt-1.5 block font-bold text-right">
                  *Gunakan opsi <b>"Simpan sebagai PDF"</b> di dialog cetak
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
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
            <label className="block text-slate-550 font-semibold mb-1.5 text-xs">Pilih Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white text-slate-800"
            >
              <option value="Ganjil">Semester Ganjil (Jul - Des)</option>
              <option value="Genap">Semester Genap (Jan - Jun)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-555 font-semibold mb-1.5 text-xs">Tahun Pelajaran</label>
            <select
              value={selectedTahunPelajaran}
              onChange={(e) => setSelectedTahunPelajaran(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs bg-white text-slate-800"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2027/2028">2027/2028</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sheet View */}
      <div id="print-semester-sheet" className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Print Header */}
        <div className="hidden print:block pb-5 mb-5 border-b-2 border-slate-800 text-center uppercase">
          <h1 className="text-xl font-extrabold tracking-tight">{schoolName}</h1>
          <p className="text-xs mt-1 font-semibold">LAPORAN REKAPITULASI DETAIL KEHADIRAN SEMESTERAN RAPOR</p>
          <div className="flex justify-center gap-x-6 text-[11px] font-mono mt-2 font-bold normal-case">
            <span><b>Kelas:</b> {activeClass?.nama || '—'}</span>
            <span>|</span>
            <span><b>Semester:</b> {selectedSemester}</span>
            <span>|</span>
            <span><b>Tahun Pelajaran:</b> {selectedTahunPelajaran}</span>
          </div>
        </div>

        {semesterLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl text-xs">
            Belum ada rekapitulasi semester untuk kelas terpilih. Harap isi absensi harian terlebih dahulu.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center print:hidden">
              <span className="text-slate-550 font-bold text-xs flex items-center gap-1">
                <CalendarRange size={16} className="text-emerald-600" />
                Daftar Persentase Semester {activeClass?.nama} — Semester {selectedSemester} (TA {selectedTahunPelajaran})
              </span>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table id="semester-printable-table" className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[9px] uppercase tracking-wider">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-center w-16">No</th>
                    <th className="px-4 py-3 w-36">NISN/NIS</th>
                    <th className="px-4 py-3">Nama Siswa Didik</th>
                    <th className="px-4 py-3 text-center w-20">JK</th>
                    <th className="px-4 py-3 text-center bg-emerald-50/55 text-emerald-800">Hadir (H)</th>
                    <th className="px-4 py-3 text-center bg-amber-50/55 text-amber-800">Sakit (S)</th>
                    <th className="px-4 py-3 text-center bg-blue-50/55 text-blue-800">Izin (I)</th>
                    <th className="px-4 py-3 text-center bg-rose-50/55 text-rose-800">Alfa (A)</th>
                    <th className="px-4 py-3 text-right font-bold text-slate-700 w-44">Tingkat Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                  {semesterLogs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/20 transition-colors">
                      <td className="px-4 py-3.5 text-center font-mono text-slate-400">{r.no}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500 font-medium">{r.nisn}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{r.nama}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.jenisKelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {r.jenisKelamin === 'L' ? 'L' : 'P'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold bg-emerald-50/20 text-emerald-700 font-mono">{r.H} Hari</td>
                      <td className="px-4 py-3.5 text-center font-bold bg-amber-50/20 text-amber-700 font-mono">{r.S} Hari</td>
                      <td className="px-4 py-3.5 text-center font-bold bg-blue-50/20 text-blue-700 font-mono">{r.I} Hari</td>
                      <td className="px-4 py-3.5 text-center font-bold bg-rose-50/20 text-rose-700 font-mono">{r.A} Hari</td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          r.pct >= 90 ? 'text-emerald-700 bg-emerald-50' : r.pct >= 75 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {r.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Signature lines (Only visible on browser Print action or PDF exports) */}
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
