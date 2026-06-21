import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Award, School, User, Lock, Save } from 'lucide-react';
import { Sekolah, AdminUser, Guru } from '../types';
import { hashPassword, getAdmins, saveAdmins } from '../utils/db';

interface AccountSettingsProps {
  sekolah: Sekolah;
  onSaveSekolah: (school: Sekolah) => void;
  currentUser: { role: 'admin' | 'guru'; username: string; nama: string; userId?: string };
  guruList: Guru[];
  onSaveGuruList: (list: Guru[]) => void;
}

export default function AccountSettings({
  sekolah,
  onSaveSekolah,
  currentUser,
  guruList,
  onSaveGuruList,
}: AccountSettingsProps) {
  const isAdmin = currentUser.role === 'admin';

  // 1. School settings (Admin only)
  const [schNama, setSchNama] = useState(sekolah.nama);
  const [schAlamat, setSchAlamat] = useState(sekolah.alamat);
  const [schNpsn, setSchNpsn] = useState(sekolah.npsn);
  const [schAdminNama, setSchAdminNama] = useState(sekolah.adminNama);
  const [schSuccess, setSchSuccess] = useState('');

  // 2. Profile setting (Both Admin & Guru)
  const [profileName, setProfileName] = useState(() => {
    if (isAdmin) {
      return currentUser.nama;
    } else {
      const g = guruList.find(x => x.id === currentUser.userId);
      return g ? g.nama : currentUser.nama;
    }
  });

  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profileSuccess, setProfileSuccess] = useState('');

  // 3. Security setting (Password Edit)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setSchSuccess('');
    
    if (!schNama || !schAlamat || !schNpsn || !schAdminNama) {
      alert('Semua kolom profile sekolah wajib diisi.');
      return;
    }

    const updatedSchool: Sekolah = {
      nama: schNama.trim(),
      alamat: schAlamat.trim(),
      npsn: schNpsn.trim(),
      adminNama: schAdminNama.trim(),
    };
    onSaveSekolah(updatedSchool);
    setSchSuccess('Identitas sekolah berhasil diperbarui.');
    
    setTimeout(() => setSchSuccess(''), 3000);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');

    if (!profileName.trim()) {
      alert('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (isAdmin) {
      // Update inside Admin db
      const admins = getAdmins();
      const updatedAdmins = admins.map(a => {
        if (a.username.toLowerCase() === currentUser.username.toLowerCase()) {
          return { ...a, nama: profileName.trim() };
        }
        return a;
      });
      saveAdmins(updatedAdmins);
    } else {
      // Update inside Guru list
      const updatedGuru = guruList.map(g => {
        if (g.id === currentUser.userId) {
          return { ...g, nama: profileName.trim() };
        }
        return g;
      });
      onSaveGuruList(updatedGuru);
    }

    setProfileSuccess('Profil Anda berhasil diperbarui.');
    setTimeout(() => setProfileSuccess(''), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassError('Semua kolom kata sandi wajib diisi.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (newPassword.length < 5) {
      setPassError('Sandi baru minimal terdiri atas 5 karakter demi kekuatan keamanan.');
      return;
    }

    // Hash verify verification
    const hashedOld = hashPassword(oldPassword);
    const hashedNew = hashPassword(newPassword);

    if (isAdmin) {
      const admins = getAdmins();
      const activeAdmin = admins.find(a => a.username.toLowerCase() === currentUser.username.toLowerCase());
      
      if (!activeAdmin || activeAdmin.passwordHash !== hashedOld) {
        setPassError('Sandi lama yang dimasukkan salah.');
        return;
      }

      const updatedAdmins = admins.map(a => {
        if (a.username.toLowerCase() === currentUser.username.toLowerCase()) {
          return { ...a, passwordHash: hashedNew };
        }
        return a;
      });
      saveAdmins(updatedAdmins);
    } else {
      const activeGuru = guruList.find(g => g.id === currentUser.userId);
      
      if (!activeGuru || activeGuru.passwordHash !== hashedOld) {
        setPassError('Sandi lama yang dimasukkan salah.');
        return;
      }

      const updatedGuru = guruList.map(g => {
        if (g.id === currentUser.userId) {
          return { ...g, passwordHash: hashedNew };
        }
        return g;
      });
      onSaveGuruList(updatedGuru);
    }

    setPassSuccess('Kata sandi berhasil diperbarui.');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
      
      {/* 1. Profile Sekolah Form (Admin only) */}
      {isAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
        >
          <form onSubmit={handleSaveSchool} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <School className="text-emerald-600" size={17} /> Edit Profil & Identitas Sekolah
            </h3>

            {schSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2.5 rounded-xl font-medium">
                {schSuccess}
              </div>
            )}

            <div>
              <label className="block text-slate-500 font-bold mb-1">Nama Sekolah Dasar</label>
              <input
                id="sch-nama-input"
                type="text"
                required
                value={schNama}
                onChange={(e) => setSchNama(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Alamat Lengkap Sekolah</label>
              <input
                id="sch-alamat-input"
                type="text"
                required
                value={schAlamat}
                onChange={(e) => setSchAlamat(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 font-bold mb-1">NPSN</label>
                <input
                  id="sch-npsn-input"
                  type="text"
                  required
                  value={schNpsn}
                  onChange={(e) => setSchNpsn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Nama Kepala Sekolah</label>
                <input
                  id="sch-adminnama-input"
                  type="text"
                  required
                  value={schAdminNama}
                  onChange={(e) => setSchAdminNama(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                id="btn-save-school-submit"
                type="submit"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-750 text-white font-bold px-4 py-2 rounded-xl transition-all cursor-pointer pointer-events-auto"
              >
                <Save size={14} /> Update Sekolah
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* 2. Personal Profile Settings (Both roles) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="text-emerald-600" size={17} /> Edit Informasi Akun Pribadi
          </h3>

          {profileSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2.5 rounded-xl font-medium">
              {profileSuccess}
            </div>
          )}

          <div>
            <label className="block text-slate-500 font-bold mb-1">Username (Tidak Dapat Diubah)</label>
            <input
              type="text"
              disabled
              value={profileUsername}
              className="w-full px-3 py-2 border border-slate-100 rounded-xl bg-slate-50 text-slate-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-bold mb-1">Nama Lengkap Pengguna</label>
            <input
              id="profile-name-input"
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              id="btn-save-profile-submit"
              type="submit"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-750 text-white font-bold px-4 py-2 rounded-xl transition-all cursor-pointer pointer-events-auto"
            >
              <Save size={14} /> Update Profil
            </button>
          </div>
        </form>
      </motion.div>

      {/* 3. Security Settings Form (Both roles) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between lg:col-span-1"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Lock className="text-emerald-600" size={17} /> Ganti Kata Sandi Keamanan
          </h3>

          {passError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2.5 rounded-xl font-medium">
              {passError}
            </div>
          )}

          {passSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2.5 rounded-xl font-medium">
              {passSuccess}
            </div>
          )}

          <div>
            <label className="block text-slate-500 font-bold mb-1">Kata Sandi Lama <span className="text-rose-500">*</span></label>
            <input
              id="old-password-input"
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
              placeholder="Masukkan sandi lama Anda"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Sandi Baru <span className="text-rose-500">*</span></label>
              <input
                id="new-password-input"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                placeholder="Minimal 5 huruf"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1">Ulangi Sandi Baru <span className="text-rose-500">*</span></label>
              <input
                id="confirm-password-input"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                placeholder="Masukkan kembali"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-end">
            <button
              id="btn-save-password-submit"
              type="submit"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-750 text-white font-bold px-4 py-2 rounded-xl transition-all cursor-pointer pointer-events-auto"
            >
              <Save size={14} /> Ganti Kata Sandi
            </button>
          </div>
        </form>
      </motion.div>

      {/* Safe Disclaimer Info */}
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 text-sky-900 text-xs leading-relaxed space-y-2 lg:col-span-1 self-start">
        <h4 className="font-bold flex items-center gap-1.5">
          <Award size={15} className="text-sky-700" /> Jaminan Enkripsi & Privasi Data
        </h4>
        <p className="text-sky-700/90 font-sans">
          Sistem kami tidak pernah menyimpan kata sandi Anda dalam bentuk teks mentah reguler. Semua sandi dienkripsi menggunakan representasi satu arah matematis (cryptographic hashes). 
        </p>
        <p className="text-sky-700/80 font-sans">
          Kami menyarankan agar me-refresh sandi berkala demi mencegah kebocoran informasi oleh pihak yang tidak bertanggung jawab.
        </p>
      </div>

    </div>
  );
}
