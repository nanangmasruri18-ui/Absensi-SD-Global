import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Search, X, UserCheck } from 'lucide-react';
import { Guru, Kelas } from '../types';
import { generateId, hashPassword } from '../utils/db';
import ConfirmModal from './ConfirmModal';

interface TeacherManagementProps {
  guruList: Guru[];
  kelasList: Kelas[];
  onSaveGuruList: (list: Guru[]) => void;
  onSaveKelasList: (list: Kelas[]) => void;
}

export default function TeacherManagement({
  guruList,
  kelasList,
  onSaveGuruList,
  onSaveKelasList,
}: TeacherManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
  const [deleteGuruId, setDeleteGuruId] = useState<string | null>(null);

  // Form states
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setEditingGuru(null);
    setNip('');
    setNama('');
    setJenisKelamin('L');
    setUsername('');
    setPassword('');
    setKelasId('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (g: Guru) => {
    setEditingGuru(g);
    setNip(g.nip);
    setNama(g.nama);
    setJenisKelamin(g.jenisKelamin);
    setUsername(g.username);
    setPassword(''); // Leave empty for security (or only update if entered)
    setKelasId(g.kelasId);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteGuruId(id);
  };

  const executeDelete = () => {
    if (deleteGuruId) {
      const updated = guruList.filter(g => g.id !== deleteGuruId);
      onSaveGuruList(updated);

      // Remove from classes as well
      const updatedKelas = kelasList.map(k => {
        if (k.waliKelasId === deleteGuruId) return { ...k, waliKelasId: '' };
        return k;
      });
      onSaveKelasList(updatedKelas);
      setDeleteGuruId(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nip || !nama || !username) {
      setErrorMsg('NIP, Nama, dan Username wajib diisi.');
      return;
    }

    // Hash check or new password requirement check
    if (!editingGuru && !password) {
      setErrorMsg('Sandi wajib diisi untuk mendirikan akun guru baru.');
      return;
    }

    // Check duplicate username inside Guru & default admins
    const usernameTaken = guruList.some(
      g => g.username.toLowerCase() === username.toLowerCase() && (!editingGuru || g.id !== editingGuru.id)
    ) || username.toLowerCase() === 'admin';

    if (usernameTaken) {
      setErrorMsg('Username guru tersebut sudah digunakan di sistem.');
      return;
    }

    const savedId = editingGuru ? editingGuru.id : ('guru-' + generateId());
    
    // Hash password if filled (or reuse old hash if editing and empty)
    const passHash = password 
      ? hashPassword(password)
      : (editingGuru ? editingGuru.passwordHash : hashPassword('guru123'));

    const savedGuru: Guru = {
      id: savedId,
      nip,
      nama: nama.trim(),
      jenisKelamin,
      username: username.trim(),
      passwordHash: passHash,
      kelasId,
    };

    let updatedGuruList = [...guruList];
    if (editingGuru) {
      updatedGuruList = guruList.map(g => g.id === editingGuru.id ? savedGuru : g);
    } else {
      updatedGuruList.push(savedGuru);
    }

    onSaveGuruList(updatedGuruList);

    // Sync back with kelas listing
    // 1. If we assigned a class to this teacher, update the class's waliKelasId
    // 2. Clear previous assignments from other classes
    const updatedKelas = kelasList.map(k => {
      // Clear previous assignment if this class was held by this teacher but is now unassigned or changed
      if (k.waliKelasId === savedId && k.id !== kelasId) {
        return { ...k, waliKelasId: '' };
      }
      // Set new assignment
      if (k.id === kelasId) {
        return { ...k, waliKelasId: savedId };
      }
      return k;
    });
    onSaveKelasList(updatedKelas);

    setShowModal(false);
  };

  const getKelasNama = (id: string) => {
    const matched = kelasList.find(k => k.id === id);
    return matched ? matched.nama : 'Belum mengampu rombel';
  };

  // Filter list
  const filteredList = guruList.filter(g => 
    g.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.nip.includes(searchTerm) ||
    g.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-800">Daftar Tenaga Pendidik / Guru Kelas</h2>
          <p className="text-xs text-slate-400 mt-0.5">Kelola akun masuk pendidik dasar, status NIP, jenis kelamin, serta kelas binaan sekolah.</p>
        </div>
        <button
          id="btn-add-guru"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-sm transition-all pointer-events-auto cursor-pointer"
        >
          <Plus size={15} />
          Tambah Akun Guru
        </button>
      </div>

      {/* Filter and Search */}
      <div className="relative mb-5 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={16} />
        </div>
        <input
          id="search-guru-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-slate-700"
          placeholder="Cari NIP, nama guru, atau username..."
        />
      </div>

      {/* Table display */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">NIP Guru</th>
              <th className="px-4 py-3">Nama Lengkap Pendidik</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Username Masuk</th>
              <th className="px-4 py-3">Kelas yang Diampu (Wali)</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Data pendidik tidak ditemukan.
                </td>
              </tr>
            ) : (
              filteredList.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-slate-500 font-medium">{g.nip}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-800">{g.nama}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      g.jenisKelamin === 'L' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {g.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono bg-slate-50 max-w-max px-2.5 py-1 rounded text-[11px] text-slate-700">{g.username}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      g.kelasId ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {getKelasNama(g.kelasId)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEdit(g)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded bg-slate-50 hover:text-blue-700 transition-colors cursor-pointer pointer-events-auto"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
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
          <div id="guru-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingGuru ? 'Edit Data Pendidik' : 'Tambah Guru / Pendidik'}
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

              <form onSubmit={handleSave} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">NIP (Nomor Induk Pegawai) <span className="text-rose-500">*</span></label>
                  <input
                    id="guru-nip-input"
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: 198503122011011002"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Nama Lengkap & Gelar <span className="text-rose-500">*</span></label>
                  <input
                    id="guru-nama-input"
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Contoh: Budi Santoso, S.Pd."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Jenis Kelamin <span className="text-rose-500">*</span></label>
                    <select
                      id="guru-jk-input"
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      <option value="L">Laki-Laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Kelas yang Diampu (Wali)</label>
                    <select
                      id="guru-kelas-input"
                      value={kelasId}
                      onChange={(e) => setKelasId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">-- Belum Ditentukan --</option>
                      {kelasList.map(k => (
                        <option key={k.id} value={k.id}>{k.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">KREDENSI LOGIN GURU</h4>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Username Masuk / Akun <span className="text-rose-500">*</span></label>
                    <input
                      id="guru-username-input"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Contoh: budis"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">
                      {editingGuru ? 'Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi Awal *'}
                    </label>
                    <input
                      id="guru-password-input"
                      type="text"
                      required={!editingGuru}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder={editingGuru ? 'Masukkan sandi baru jika ingin diubah' : 'Sandi masuk minimum 5 kata'}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 hover:bg-slate-100 rounded-xl font-semibold text-slate-500 cursor-pointer pointer-events-auto"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-save-guru-submit"
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 pointer-events-auto cursor-pointer"
                  >
                    Simpan Akun
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteGuruId !== null}
        title="Hapus Akun Guru"
        message="Apakah Anda yakin ingin menghapus guru ini secara permanen? Akun guru ini tidak akan dapat login kembali, dan status wali kelas yang diampunya akan otomatis dilepas."
        onConfirm={executeDelete}
        onCancel={() => setDeleteGuruId(null)}
        confirmText="Ya, Hapus Guru"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
}
