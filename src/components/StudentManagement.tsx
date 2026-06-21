import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Search, X, FileSpreadsheet, Download, Upload, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Siswa, Kelas } from '../types';
import { generateId } from '../utils/db';
import { downloadCsvTemplateSiswa, parseSiswaCsv, ParsedSiswa } from '../utils/excel';
import ConfirmModal from './ConfirmModal';

interface StudentManagementProps {
  siswaList: Siswa[];
  kelasList: Kelas[];
  onSaveSiswaList: (list: Siswa[]) => void;
}

export default function StudentManagement({
  siswaList,
  kelasList,
  onSaveSiswaList,
}: StudentManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  
  // Custom Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [deleteSiswaId, setDeleteSiswaId] = useState<string | null>(null);

  // General Form state
  const [nisn, setNisn] = useState('');
  const [nama, setNama] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Excel Importer dragging/parsing states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedSiswa[]>([]);
  const [importNotice, setImportNotice] = useState('');

  const handleOpenAdd = () => {
    setEditingSiswa(null);
    setNisn('');
    setNama('');
    setJenisKelamin('L');
    setTempatLahir('');
    setTanggalLahir('');
    setKelasId(kelasList[0]?.id || '');
    setErrorMsg('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (s: Siswa) => {
    setEditingSiswa(s);
    setNisn(s.nisn);
    setNama(s.nama);
    setJenisKelamin(s.jenisKelamin);
    setTempatLahir(s.tempatLahir);
    setTanggalLahir(s.tanggalLahir);
    setKelasId(s.kelasId);
    setErrorMsg('');
    setShowFormModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteSiswaId(id);
  };

  const executeDelete = () => {
    if (deleteSiswaId) {
      const updated = siswaList.filter(s => s.id !== deleteSiswaId);
      onSaveSiswaList(updated);
      setDeleteSiswaId(null);
    }
  };

  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nisn || !nama || !tempatLahir || !tanggalLahir || !kelasId) {
      setErrorMsg('Semua kolom bertanda bintang wajib diisi.');
      return;
    }

    const savedId = editingSiswa ? editingSiswa.id : ('sis-' + generateId());
    
    // Check duplicates of NISN in system
    const isDuplicate = siswaList.some(
      s => s.nisn === nisn && (!editingSiswa || s.id !== editingSiswa.id)
    );
    if (isDuplicate) {
      setErrorMsg('NISN/NIS tersebut sudah terdaftar di sistem.');
      return;
    }

    const savedSiswa: Siswa = {
      id: savedId,
      nisn: nisn.trim(),
      nama: nama.trim(),
      jenisKelamin,
      tempatLahir: tempatLahir.trim(),
      tanggalLahir,
      kelasId,
    };

    let updated = [...siswaList];
    if (editingSiswa) {
      updated = siswaList.map(s => s.id === editingSiswa.id ? savedSiswa : s);
    } else {
      updated.push(savedSiswa);
    }

    onSaveSiswaList(updated);
    setShowFormModal(false);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleParseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleParseFile(e.target.files[0]);
    }
  };

  const handleParseFile = (file: File) => {
    setImportNotice('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseSiswaCsv(text, kelasList);
      if (parsed.length === 0) {
        setImportNotice('Gagal memproses file. Pastikan file berupa CSV hasil download dari template kami.');
      } else {
        setParsedItems(parsed);
      }
    };
    reader.onerror = () => {
      setImportNotice('Kesalahan membaca file.');
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    const validItems = parsedItems.filter(p => p.isValid);
    if (validItems.length === 0) {
      alert('Tidak ada data siswa baru yang valid untuk diimpor.');
      return;
    }

    const mappedNewSiswaList: Siswa[] = validItems.map(p => {
      // Find matching class ID
      const targetClass = kelasList.find(c => c.nama.toLowerCase() === p.kelasNama.toLowerCase());
      return {
        id: 'sis-' + generateId(),
        nisn: p.nisn,
        nama: p.nama,
        jenisKelamin: p.jenisKelamin,
        tempatLahir: p.tempatLahir,
        tanggalLahir: p.tanggalLahir,
        kelasId: targetClass ? targetClass.id : kelasList[0].id
      };
    });

    // Check duplicate NISN to avoid saving double inputs
    const finalSiswaList = [...siswaList];
    let insertedCount = 0;
    mappedNewSiswaList.forEach(ns => {
      if (!finalSiswaList.some(s => s.nisn === ns.nisn)) {
        finalSiswaList.push(ns);
        insertedCount++;
      }
    });

    onSaveSiswaList(finalSiswaList);
    alert(`Berhasil mengimpor ${insertedCount} siswa ke dalam database.`);
    setShowImportModal(false);
    setParsedItems([]);
  };

  const getKelasNama = (id: string) => {
    const matched = kelasList.find(k => k.id === id);
    return matched ? matched.nama : 'Tanpa Kelas';
  };

  // Filter lists based on Search & Select Inputs
  const filteredList = siswaList.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
    const matchKelas = filterKelas === '' || s.kelasId === filterKelas;
    return matchSearch && matchKelas;
  });

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-800">Daftar Induk Murid / Siswa</h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">Urus biodata dasar murid sekolah dasar, pindahan kelas, dan unggah basis rekap massal.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Export Template Button */}
          <button
            id="btn-template-excel"
            onClick={downloadCsvTemplateSiswa}
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs px-3 py-2.5 rounded-xl transition-all cursor-pointer pointer-events-auto"
            title="Download Template Pengisian Excel"
          >
            <Download size={14} />
            Template Excel
          </button>

          {/* Import XLSX Button */}
          <button
            id="btn-import-excel"
            onClick={() => { setParsedItems([]); setImportNotice(''); setShowImportModal(true); }}
            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs px-3 py-2.5 rounded-xl border border-indigo-100 transition-all cursor-pointer pointer-events-auto"
          >
            <Upload size={14} />
            Unggah Excel (CSV)
          </button>

          {/* Add Student Button */}
          <button
            id="btn-add-siswa"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer pointer-events-auto"
          >
            <Plus size={15} />
            Tambah Murid
          </button>
        </div>
      </div>

      {/* Query Filter and Search Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            id="search-siswa-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700"
            placeholder="Cari NISN, NIS atau nama lengkap siswa..."
          />
        </div>

        <div className="w-full md:w-56">
          <select
            id="filter-siswa-kelas"
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="block w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700 bg-white"
          >
            <option value="">-- Tampilkan Semua Kelas --</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table grid layout list */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">NISN/NIS</th>
              <th className="px-4 py-3">Nama Lengkap Murid</th>
              <th className="px-4 py-3">JK</th>
              <th className="px-4 py-3">Tempat, Tanggal Lahir</th>
              <th className="px-4 py-3">Rombel Aktif</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Data murid tidak ditemukan dalam jangkauan filter.
                </td>
              </tr>
            ) : (
              filteredList.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-slate-500 font-medium">{s.nisn}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800">{s.nama}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.jenisKelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">{s.tempatLahir}, {s.tanggalLahir}</td>
                  <td className="px-4 py-3.5">
                    <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-1 rounded-md text-[10px]">
                      {getKelasNama(s.kelasId)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded bg-slate-50 hover:text-blue-700 transition-colors cursor-pointer pointer-events-auto"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="inline-flex items-center gap-1 text-rose-600 hover:bg-rose-50 px-2 py-1 rounded bg-slate-50 hover:text-rose-750 transition-colors cursor-pointer pointer-events-auto"
                    >
                      <Trash2 size={12} /> Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Add/Edit Form Modal */}
      <AnimatePresence>
        {showFormModal && (
          <div id="siswa-form-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingSiswa ? 'Edit Biodata Siswa' : 'Tambah Siswa Baru'}
                </h3>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-150 p-1 rounded-full cursor-pointer pointer-events-auto"
                >
                  <X size={16} />
                </button>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg mb-4 font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSaveSingle} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">NISN / NIS Sekolah <span className="text-rose-500">*</span></label>
                  <input
                    id="siswa-nisn-input"
                    type="text"
                    required
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: 0153456781 (10 digit)"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Nama Lengkap Siswa <span className="text-rose-500">*</span></label>
                  <input
                    id="siswa-nama-input"
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: Aditya Pratama"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Jenis Kelamin <span className="text-rose-500">*</span></label>
                    <select
                      id="siswa-jk-input"
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      <option value="L">Laki-Laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Rombel / Kelas <span className="text-rose-500">*</span></label>
                    <select
                      id="siswa-kelas-input"
                      value={kelasId}
                      onChange={(e) => setKelasId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      {kelasList.map(k => (
                        <option key={k.id} value={k.id}>{k.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Tempat Lahir <span className="text-rose-500">*</span></label>
                    <input
                      id="siswa-tempat-input"
                      type="text"
                      required
                      value={tempatLahir}
                      onChange={(e) => setTempatLahir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Contoh: Bandung"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Tanggal Lahir <span className="text-rose-500">*</span></label>
                    <input
                      id="siswa-tanggal-input"
                      type="date"
                      required
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-3.5 py-2 hover:bg-slate-100 rounded-xl font-semibold text-slate-500 cursor-pointer pointer-events-auto"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-save-siswa-submit"
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 pointer-events-auto cursor-pointer"
                  >
                    Simpan Murid
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mass Import Preview & Validation Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div id="siswa-import-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="text-indigo-600" size={20} />
                  <h3 className="font-bold text-slate-800 text-sm">
                    Import Massal Data Siswa (CSV Template)
                  </h3>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-150 p-1 rounded-full cursor-pointer pointer-events-auto"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drag Area */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors max-h-48 flex flex-col justify-center items-center ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".csv"
                  onChange={handleFileChange}
                />
                <Upload size={32} className="text-slate-400 mb-2.5" />
                <p className="text-xs font-bold text-slate-700">Tarik dan jatuhkan file template CSV Anda di sini</p>
                <p className="text-[10px] text-slate-400 mt-1">Atau klik untuk menjelajahi file komputer Anda</p>
              </div>

              {importNotice && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-xl mt-3 font-medium">
                  {importNotice}
                </div>
              )}

              {/* Parsed Output Preview */}
              {parsedItems.length > 0 && (
                <div className="flex-1 overflow-y-auto mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Info size={14} className="text-indigo-600" /> Preview dan Validasi Baris ({parsedItems.length} Terdeteksi)
                    </h4>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                      Valid: {parsedItems.filter(p => p.isValid).length} | Gagal: {parsedItems.filter(p => !p.isValid).length}
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-[11px]">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                        <tr>
                          <th className="px-3 py-2">NISN/NIS</th>
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2">JK</th>
                          <th className="px-3 py-2">TTL</th>
                          <th className="px-3 py-2">Tujuan Kelas</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                        {parsedItems.map((pi, index) => (
                          <tr key={index} className={pi.isValid ? 'hover:bg-emerald-50/20' : 'bg-rose-50/30'}>
                            <td className="px-3 py-2 font-mono">{pi.nisn || '-'}</td>
                            <td className="px-3 py-2 font-semibold text-slate-800">{pi.nama || '-'}</td>
                            <td className="px-3 py-2">{pi.jenisKelamin}</td>
                            <td className="px-3 py-2">{pi.tempatLahir}, {pi.tanggalLahir}</td>
                            <td className="px-3 py-2 font-medium text-slate-600">{pi.kelasNama}</td>
                            <td className="px-3 py-2">
                              {pi.isValid ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold text-[10px]">
                                  <CheckCircle size={12} /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-start gap-1 text-rose-600 text-[10px]" title={pi.notes.join(', ')}>
                                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                  <span className="truncate max-w-[120px] font-medium">{pi.notes[0]}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowImportModal(false); setParsedItems([]); }}
                  className="px-3.5 py-2 hover:bg-slate-100 rounded-xl font-semibold text-slate-500 cursor-pointer pointer-events-auto text-xs"
                >
                  Batal
                </button>
                <button
                  id="btn-import-commit-submit"
                  type="button"
                  onClick={handleCommitImport}
                  disabled={parsedItems.filter(p => p.isValid).length === 0}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto cursor-pointer text-xs flex items-center gap-1.5"
                >
                  Simpan Impor Massal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteSiswaId !== null}
        title="Hapus Data Siswa"
        message="Apakah Anda yakin ingin menghapus seluruh data siswa ini dari absensi secara permanen? Catatan atau rekapitulasi kehadiran siswa bersangkutan untuk bulan-bulan berjalan akan terhapus."
        onConfirm={executeDelete}
        onCancel={() => setDeleteSiswaId(null)}
        confirmText="Ya, Hapus Siswa"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
}
