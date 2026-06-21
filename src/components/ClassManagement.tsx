import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Search, X, Check } from 'lucide-react';
import { Kelas, Guru } from '../types';
import { generateId } from '../utils/db';
import ConfirmModal from './ConfirmModal';

interface ClassManagementProps {
  kelasList: Kelas[];
  guruList: Guru[];
  onSaveKelasList: (list: Kelas[]) => void;
  onSaveGuruList: (list: Guru[]) => void;
}

export default function ClassManagement({
  kelasList,
  guruList,
  onSaveKelasList,
  onSaveGuruList,
}: ClassManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState<Kelas | null>(null);
  const [deleteKelasId, setDeleteKelasId] = useState<string | null>(null);

  // Form states
  const [nama, setNama] = useState('');
  const [tingkat, setTingkat] = useState('1');
  const [waliKelasId, setWaliKelasId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setEditingKelas(null);
    setNama('');
    setTingkat('1');
    setWaliKelasId('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (k: Kelas) => {
    setEditingKelas(k);
    setNama(k.nama);
    setTingkat(k.tingkat);
    setWaliKelasId(k.waliKelasId);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteKelasId(id);
  };

  const executeDelete = () => {
    if (deleteKelasId) {
      const updated = kelasList.filter(k => k.id !== deleteKelasId);
      onSaveKelasList(updated);
      
      // Also unassign from Guru
      const updatedGuru = guruList.map(g => {
        if (g.kelasId === deleteKelasId) return { ...g, kelasId: '' };
        return g;
      });
      onSaveGuruList(updatedGuru);
      setDeleteKelasId(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nama.trim()) {
      setErrorMsg('Nama kelas wajib diisi.');
      return;
    }

    // Check duplicate name
    const isDuplicate = kelasList.some(
      k => k.nama.toLowerCase().replace(/\s+/g, '') === nama.toLowerCase().replace(/\s+/g, '') &&
           (!editingKelas || k.id !== editingKelas.id)
    );
    if (isDuplicate) {
      setErrorMsg('Nama kelas sudah ada di database.');
      return;
    }

    let updatedKelasList = [...kelasList];
    const newClassId = editingKelas ? editingKelas.id : ('kls-' + generateId());

    const savedKelas: Kelas = {
      id: newClassId,
      nama: nama.trim(),
      tingkat,
      waliKelasId,
    };

    if (editingKelas) {
      updatedKelasList = kelasList.map(k => k.id === editingKelas.id ? savedKelas : k);
    } else {
      updatedKelasList.push(savedKelas);
    }

    onSaveKelasList(updatedKelasList);

    // Sync back with teacher:
    // 1. If we assigned a teacher, that teacher's kelasId should point to this class
    // 2. Clear any other teacher that was previously assigned to this class
    const updatedGuru = guruList.map(g => {
      // Clear previous assignment if this teacher was wali kelas for this class, but is now changed
      if (g.kelasId === newClassId && g.id !== waliKelasId) {
        return { ...g, kelasId: '' };
      }
      // Set new assignment
      if (g.id === waliKelasId) {
        return { ...g, kelasId: newClassId };
      }
      return g;
    });
    onSaveGuruList(updatedGuru);

    setShowModal(false);
  };

  // Filter list
  const filteredList = kelasList.filter(k => 
    k.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.tingkat.includes(searchTerm)
  );

  const getWaliKelasNama = (id: string) => {
    const matched = guruList.find(g => g.id === id);
    return matched ? matched.nama : 'Belum Ditentukan';
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-800">Daftar Kelas dan Rombongan Belajar (Rombel)</h2>
          <p className="text-xs text-slate-400 mt-0.5">Kelola kelas dasar sekolah, pembagian tingkat, serta wali kelas penanggung jawab.</p>
        </div>
        <button
          id="btn-add-kelas"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all pointer-events-auto cursor-pointer"
        >
          <Plus size={15} />
          Tambah Kelas Baru
        </button>
      </div>

      {/* Filter and Search */}
      <div className="relative mb-5 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={16} />
        </div>
        <input
          id="search-kelas-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700"
          placeholder="Cari nama atau tingkat..."
        />
      </div>

      {/* Table display */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Tingkat</th>
              <th className="px-4 py-3">Nama Kelas / Rombel</th>
              <th className="px-4 py-3">Wali Kelas Pengampu</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Data kelas tidak ditemukan.
                </td>
              </tr>
            ) : (
              filteredList.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-semibold">Tingkat {k.tingkat}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800">{k.nama}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      k.waliKelasId ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {getWaliKelasNama(k.waliKelasId)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEdit(k)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded bg-slate-50 hover:text-blue-700 transition-colors cursor-pointer pointer-events-auto"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(k.id)}
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

      {/* Modal Dialog */}
      <AnimatePresence>
        {showModal && (
          <div id="kelas-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingKelas ? 'Edit Kelas / Rombel' : 'Tambah Kelas Baru'}
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
                  <label className="block text-slate-500 font-semibold mb-1">Nama Kelas / Rombel <span className="text-rose-500">*</span></label>
                  <input
                    id="kelas-nama-input"
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: Kelas 1A"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Tingkat Kelas <span className="text-rose-500">*</span></label>
                  <select
                    id="kelas-tingkat-input"
                    value={tingkat}
                    onChange={(e) => setTingkat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    {['1', '2', '3', '4', '5', '6'].map(num => (
                      <option key={num} value={num}>Tingkat {num}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Wali Kelas Penanggung Jawab</label>
                  <select
                    id="kelas-walikelas-input"
                    value={waliKelasId}
                    onChange={(e) => setWaliKelasId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">-- Tanpa Wali Kelas --</option>
                    {guruList.map(g => (
                      <option key={g.id} value={g.id}>{g.nama} ({g.nip})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Catatan: Satu guru disarankan memegang maksimal 1 kelas sebagai Wali Kelas yang diampu.
                  </p>
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
                    id="btn-save-kelas-submit"
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 pointer-events-auto cursor-pointer"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteKelasId !== null}
        title="Hapus Kelas"
        message="Apakah Anda yakin ingin menghapus kelas ini? Menghapus kelas akan berdampak pada pembagian daftar siswa dan pengisian absensi akademik mereka."
        onConfirm={executeDelete}
        onCancel={() => setDeleteKelasId(null)}
        confirmText="Ya, Hapus Kelas"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
}
