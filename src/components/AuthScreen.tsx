import React, { useState } from 'react';
import { motion } from 'motion/react';
import { School, User, Lock, Eye, EyeOff, UserPlus, LogIn, Award } from 'lucide-react';
import { Sekolah, AdminUser } from '../types';
import { hashPassword, getAdmins, saveAdmins, saveSekolah } from '../utils/db';

interface AuthScreenProps {
  onLoginSuccess: (role: 'admin' | 'guru', username: string, nama: string, userId?: string) => void;
  allGuru: { id: string; nama: string; username: string; passwordHash: string; kelasId: string }[];
  onRegisterSuccess: (school: Sekolah) => void;
}

export default function AuthScreen({ onLoginSuccess, allGuru, onRegisterSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolNpsn, setSchoolNpsn] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername || !loginPassword) {
      setLoginError('Silakan isi seluruh kolom username dan password.');
      return;
    }

    const hashed = hashPassword(loginPassword);

    // 1. Check in Admin database
    const admins = getAdmins();
    const matchedAdmin = admins.find(
      a => a.username.toLowerCase() === loginUsername.toLowerCase() && a.passwordHash === hashed
    );

    if (matchedAdmin) {
      onLoginSuccess('admin', matchedAdmin.username, matchedAdmin.nama);
      return;
    }

    // 2. Check in Teacher (Guru) state
    const matchedGuru = allGuru.find(
      g => g.username.toLowerCase() === loginUsername.toLowerCase() && g.passwordHash === hashed
    );

    if (matchedGuru) {
      onLoginSuccess('guru', matchedGuru.username, matchedGuru.nama, matchedGuru.id);
      return;
    }

    setLoginError('Username atau sandi salah. Hubungi Admin Sekolah untuk informasi akun.');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess(false);

    if (!schoolName || !schoolAddress || !schoolNpsn || !adminName || !adminUsername || !adminPassword || !confirmPassword) {
      setRegisterError('Semua kolom bertanda bintang wajib diisi.');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setRegisterError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (adminPassword.length < 5) {
      setRegisterError('Sandi minimal terdiri atas 5 karakter demi keamanan.');
      return;
    }

    const admins = getAdmins();
    const usernameTaken = admins.some(a => a.username.toLowerCase() === adminUsername.toLowerCase());
    if (usernameTaken) {
      setRegisterError('Username admin tersebut sudah digunakan. Pilih username lain.');
      return;
    }

    // Save School Data
    const newSchool: Sekolah = {
      nama: schoolName,
      alamat: schoolAddress,
      npsn: schoolNpsn,
      adminNama: adminName,
    };
    saveSekolah(newSchool);
    onRegisterSuccess(newSchool);

    // Save Brand-New Admin Data
    const newAdmin: AdminUser = {
      username: adminUsername,
      nama: adminName,
      passwordHash: hashPassword(adminPassword),
    };
    saveAdmins([...admins, newAdmin]);

    // Flush fields and display success
    setRegisterSuccess(true);
    setSchoolName('');
    setSchoolAddress('');
    setSchoolNpsn('');
    setAdminName('');
    setAdminUsername('');
    setAdminPassword('');
    setConfirmPassword('');
    
    // Switch to login tab after success transition
    setTimeout(() => {
      setActiveTab('login');
      // Set register success to false
      setRegisterSuccess(false);
    }, 2500);
  };

  return (
    <div id="auth-screen-container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center flex-col items-center"
        >
          <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
            <School size={36} className="stroke-[1.75]" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-800 font-sans">
            ABSENSI SISWA SD
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500 max-w-xs leading-relaxed">
            Sistem informasi kehadiran siswa terpadu untuk Sekolah Dasar yang modern & mudah digunakan.
          </p>
        </motion.div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-2xl sm:px-10">
          <div className="flex border-b border-slate-100 pb-4 mb-6">
            <button
              id="tab-login"
              onClick={() => { setActiveTab('login'); setLoginError(''); setRegisterError(''); }}
              className={`w-1/2 pb-3 text-center font-semibold text-sm transition-all focus:outline-none flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'border-b-2 border-emerald-600 text-emerald-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LogIn size={16} />
              Masuk Akun
            </button>
            <button
              id="tab-register"
              onClick={() => { setActiveTab('register'); setLoginError(''); setRegisterError(''); }}
              className={`w-1/2 pb-3 text-center font-semibold text-sm transition-all focus:outline-none flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'border-b-2 border-emerald-600 text-emerald-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserPlus size={16} />
              Registrasi Admin
            </button>
          </div>

          {activeTab === 'login' ? (
            <motion.form 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onSubmit={handleLogin} 
              className="space-y-5"
            >
              {loginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2.5 rounded-xl font-medium">
                  {loginError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={18} />
                  </div>
                  <input
                    id="login-username-input"
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm placeholder-slate-400 text-slate-800 transition-all font-sans"
                    placeholder="Masukkan username Anda"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Kata Sandi
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm placeholder-slate-400 text-slate-800 transition-all font-sans"
                    placeholder="Masukkan sandi Anda"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <button
                  id="btn-login-submit"
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-[3px] focus:outline-offset-2 focus:outline-emerald-500 transition-all cursor-pointer"
                >
                  Masuk ke Aplikasi
                </button>
              </div>

              <div id="demo-credentials-info" className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-indigo-900 flex items-center gap-1">
                  <Award size={13} /> Akun Demo Bawaan:
                </p>
                <p className="text-indigo-700/85">
                  • <b>Admin:</b> <code className="bg-white/80 px-1 rounded">admin</code> | Sandi: <code className="bg-white/80 px-1 rounded">admin123</code>
                </p>
                <p className="text-indigo-700/85">
                  • <b>Guru Kelas 1A:</b> <code className="bg-white/80 px-1 rounded">budi</code> | Sandi: <code className="bg-white/80 px-1 rounded">budi123</code>
                </p>
              </div>
            </motion.form>
          ) : (
            <motion.form 
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onSubmit={handleRegister} 
              className="space-y-5"
            >
              {registerSuccess && (
                <div id="register-success-alert" className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2.5 rounded-xl font-medium">
                  Pendaftaran berhasil! Menyimpan data dan mengalihkan ke menu masuk...
                </div>
              )}
              {registerError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2.5 rounded-xl font-medium">
                  {registerError}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <School size={14} className="text-emerald-600" /> IDENTITAS SEKOLAH
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Nama Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="school-name-input"
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                    placeholder="Contoh: SD Negeri Mekarjaya 2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Alamat Lengkap Sekolah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="school-address-input"
                    type="text"
                    required
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                    placeholder="Alamat lengkap, jalan, kec, kota"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    NPSN (Nomor Pokok Sekolah Nasional) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="school-npsn-input"
                    type="text"
                    required
                    maxLength={12}
                    value={schoolNpsn}
                    onChange={(e) => setSchoolNpsn(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                    placeholder="Contoh: 20214567"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-emerald-600" /> DATA ADMIN SEKOLAH
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Nama Admin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="admin-name-input"
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                    placeholder="Contoh: Supriyanto, S.Pd."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Username Admin <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="admin-username-input"
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                    placeholder="Username untuk masuk"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="admin-password-input"
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                      placeholder="Sandi baru"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Konfirmasi Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="admin-password-confirm-input"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-sans"
                      placeholder="Ulangi sandi"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  id="btn-register-submit"
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-[3px] focus:outline-offset-2 focus:outline-emerald-500 transition-all cursor-pointer"
                >
                  Daftarkan Admin & Sekolah
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
}
