import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Calendar, X, AlertCircle } from 'lucide-react';
import { HariLibur } from '../types';
import { generateId } from '../utils/db';
import ConfirmModal from './ConfirmModal';

interface HolidayManagementProps {
  hariLiburList: HariLibur[];
  onSaveHariLiburList: (list: HariLibur[]) => void;
}

export default function HolidayManagement({
  hariLiburList,
  onSaveHariLiburList,
}: HolidayManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingLibur, setEditingLibur] = useState<HariLibur | null>(null);
  const [deleteLiburId, setDeleteLiburId] = useState<string | null>(null);

  // Form states
  const [tanggal, setTanggal] = useState('');
  const [namaLibur, setNamaLibur] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setEditingLibur(null);
    setTanggal('');
    setNamaLibur('');
    setKeterangan('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (lib: HariLibur) => {
    setEditingLibur(lib);
    setTanggal(lib.tanggal);
    setNamaLibur(lib.namaLibur);
    setKeterangan(lib.keterangan);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteLiburId(id);
  };

  const executeDelete = () => {
    if (deleteLiburId) {
      const updated = hariLiburList.filter(l => l.id !== deleteLiburId);
      onSaveHariLiburList(updated);
      setDeleteLiburId(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!tanggal || !namaLibur) {
      setErrorMsg('Tanggal dan Nama Hari Libur wajib diisi.');
      return;
    }

    // Check if Sunday which is already automatically locked
    const dayOfWeek = new Date(tanggal).getDay();
    if (dayOfWeek === 0) {
      setErrorMsg('Tanggal tersebut jatuh pada hari Minggu. Hari Minggu sudah otomatis diliburkan oleh sistem.');
      return;
    }

    // Check duplicate tanggal
    const isDuplicate = hariLiburList.some(
      l => l.tanggal === tanggal && (!editingLibur || l.id !== editingLibur.id)
    );
    if (isDuplicate) {
      setErrorMsg('Tanggal libur tersebut sudah terdaftar di sistem.');
      return;
    }

    const savedLib: HariLibur = {
      id: editingLibur ? editingLibur.id : ('lib-' + generateId()),
      tanggal,
      namaLibur: namaLibur.trim(),
      keterangan: keterangan.trim(),
    };

    let updated = [...hariLiburList];
    if (editingLibur) {
      updated = hariLiburList.map(l => l.id === editingLibur.id ? savedLib : l);
    } else {
      updated.push(savedLib);
    }

    // Sort by date chronological order
    updated.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    onSaveHariLiburList(updated);
    setShowModal(false);
  };

  const formatIDDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-800">Kalender Akademik & Hari Libur Sekolah</h2>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">Kelola penguncian tanggal sekolah. Hari libur terdaftar akan terkunci otomatis untuk absensi kelas.</p>
        </div>
        <button
          id="btn-add-libur"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all pointer-events-auto cursor-pointer"
        >
          <Plus size={15} />
          Tambah Hari Libur
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 text-amber-800 text-xs mb-5 items-start">
        <AlertCircle size={16} className="shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-bold">Info Pengondisian Sistem Otomatis:</p>
          <p className="text-amber-700/90 mt-0.5 leading-relaxed">
            Hari <b>Minggu</b> secara otomatis terdeteksi berwarna merah dan terkunci dari segala absensi reguler. Pengguna tidak perlu mendaftarkan hari Minggu sebagai tanggal libur baru di sini.
          </p>
        </div>
      </div>

      {/* Grid List view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hariLiburList.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
            Belum ada jadwal hari libur khusus yang ditambahkan ke kalender sekolah.
          </div>
        ) : (
          hariLiburList.map((lib) => (
            <motion.div
              key={lib.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-slate-150 rounded-xl p-4 bg-slate-50 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                  <Calendar size={15} />
                  <span>{formatIDDate(lib.tanggal)}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mt-2 leading-tight">{lib.namaLibur}</h4>
                {lib.keterangan && (
                  <p className="text-slate-550 text-xs mt-1.5 leading-relaxed bg-white p-2 rounded-lg border border-slate-100 italic">
                    "{lib.keterangan}"
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3 mt-4">
                <button
                  onClick={() => handleOpenEdit(lib)}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:bg-blue-50 px-2 py-1 rounded bg-white border border-slate-150 transition-colors cursor-pointer pointer-events-auto"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(lib.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:bg-rose-50 px-2 py-1 rounded bg-white border border-slate-150 transition-colors cursor-pointer pointer-events-auto"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal Dialog */}
      <AnimatePresence>
        {showModal && (
          <div id="libur-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingLibur ? 'Edit Tanggal Libur' : 'Tambah Tanggal Libur Akademik'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
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

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Pilih Tanggal <span className="text-rose-500">*</span></label>
                  <input
                    id="libur-tanggal-input"
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Nama Hari Libur <span className="text-rose-500">*</span></label>
                  <input
                    id="libur-nama-input"
                    type="text"
                    required
                    value={namaLibur}
                    onChange={(e) => setNamaLibur(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: Isra Miraj, Tahun Baru Imlek, dsb"
                  />
                </div>

                <div>
                  <label className="block text-slate-550 font-semibold mb-1">Keterangan Tambahan (Opsional)</label>
                  <textarea
                    id="libur-keterangan-input"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    placeholder="Sebutkan kegiatan atau dasar dinas libur (jika ada)..."
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 hover:bg-slate-100 rounded-xl font-semibold text-slate-500 cursor-pointer pointer-events-auto"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-save-libur-submit"
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 pointer-events-auto cursor-pointer"
                  >
                    Kunci Hari
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteLiburId !== null}
        title="Hapus Hari Libur Akademik"
        message="Apakah Anda yakin ingin menghapus tanggal libur akademik ini? Hari yang dihapus akan kembali terbuka untuk pengisian absensi harian kelas oleh guru kelas masing-masing."
        onConfirm={executeDelete}
        onCancel={() => setDeleteLiburId(null)}
        confirmText="Ya, Hapus Libur"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
}
