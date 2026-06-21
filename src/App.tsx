import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  School, Users, GraduationCap, Calendar, CheckSquare, 
  FileSpreadsheet, Database, Settings, LogOut, Menu, X, 
  Award, Clock, CalendarRange, Lock, User
} from 'lucide-react';

// Import Types and DB Helpers
import { Sekolah, Kelas, Guru, Siswa, HariLibur, Absensi, Session } from './types';
import { 
  initializeDatabase, getSekolah, saveSekolah, getKelasList, saveKelasList, 
  getGuruList, saveGuruList, getSiswaList, saveSiswaList, getHariLiburList, 
  saveHariLiburList, getAbsensiList, saveAbsensiList, getSession, saveSession, 
  clearSession, refreshSessionTimeout 
} from './utils/db';

// Import UI components
import AuthScreen from './components/AuthScreen';
import AdminDashboard from './components/AdminDashboard';
import ClassManagement from './components/ClassManagement';
import TeacherManagement from './components/TeacherManagement';
import StudentManagement from './components/StudentManagement';
import HolidayManagement from './components/HolidayManagement';
import AttendanceEntry from './components/AttendanceEntry';
import TeacherDashboard from './components/TeacherDashboard';
import MonthlyRecap from './components/MonthlyRecap';
import SemesterRecap from './components/SemesterRecap';
import AccountSettings from './components/AccountSettings';
import SystemBackup from './components/SystemBackup';
import ConfirmModal from './components/ConfirmModal';

export default function App() {
  // 1. Initialise mock Relational DB on mount
  useEffect(() => {
    initializeDatabase();
  }, []);

  // 2. Load reactive states from LocalStorage
  const [sekolah, setSekolah] = useState<Sekolah>(getSekolah);
  const [kelasList, setKelasList] = useState<Kelas[]>(getKelasList);
  const [guruList, setGuruList] = useState<Guru[]>(getGuruList);
  const [siswaList, setSiswaList] = useState<Siswa[]>(getSiswaList);
  const [hariLiburList, setHariLiburList] = useState<HariLibur[]>(getHariLiburList);
  const [absensiList, setAbsensiList] = useState<Absensi[]>(getAbsensiList);

  // Active Session state
  const [session, setSession] = useState<Session | null>(getSession);

  // Navigation sidebar states
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Logout custom confirmation modal state
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Today's Date Str (for dashboard and absensi defaults) - locked at Indonesian Local Time standard 2026-06-20 (Saturday) from metadata bounds, or can track real time.
  // The system's current time from metadata is Saturday, June 20, 2026. Let's seed at 2026-06-20!
  const [currentDateStr] = useState('2026-06-20');

  // Triggered on DB restorer callbacks
  const handleDatabaseRestored = () => {
    setSekolah(getSekolah());
    setKelasList(getKelasList());
    setGuruList(getGuruList());
    setSiswaList(getSiswaList());
    setHariLiburList(getHariLiburList());
    setAbsensiList(getAbsensiList());
    // Also reset session if restore changes credentials
    clearSession();
    setSession(null);
  };

  // 3. User activity tracking for security (Inactivity automatic logout)
  useEffect(() => {
    if (!session) return;

    // Listen to user inputs and gestures
    const handleUserActivity = () => {
      refreshSessionTimeout();
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity);
    });

    // Check expiration timer every 5 seconds
    const intervalId = setInterval(() => {
      const activeSession = getSession();
      if (!activeSession) {
        setSession(null);
        alert('Sesi masuk Anda telah berakhir karena tidak ada aktivitas selama 15 menit. Silakan login kembali demi mengamankan data.');
      }
    }, 5000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(intervalId);
    };
  }, [session]);

  const handleLoginSuccess = (role: 'admin' | 'guru', username: string, nama: string, userId?: string) => {
    const now = new Date();
    // 15-minute expiration
    now.setMinutes(now.getMinutes() + 15);
    
    const newSession: Session = {
      role,
      username,
      nama,
      userId,
      expiresAt: now.toISOString(),
    };
    
    saveSession(newSession);
    setSession(newSession);
    setActiveMenu('dashboard');
  };

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
  };

  const executeLogout = () => {
    clearSession();
    setSession(null);
    setLogoutConfirmOpen(false);
  };

  // State update wrapping helpers to save directly both to memory and local storage
  const handleWriteSekolah = (sch: Sekolah) => {
    saveSekolah(sch);
    setSekolah(sch);
  };

  const handleWriteKelasList = (list: Kelas[]) => {
    saveKelasList(list);
    setKelasList(list);
  };

  const handleWriteGuruList = (list: Guru[]) => {
    saveGuruList(list);
    setGuruList(list);
  };

  const handleWriteSiswaList = (list: Siswa[]) => {
    saveSiswaList(list);
    setSiswaList(list);
  };

  const handleWriteHariLiburList = (list: HariLibur[]) => {
    saveHariLiburList(list);
    setHariLiburList(list);
  };

  const handleWriteAbsensiList = (list: Absensi[]) => {
    saveAbsensiList(list);
    setAbsensiList(list);
  };

  // Find active Guru metadata if role is Guru
  const currentGuru = session?.role === 'guru' 
    ? guruList.find(g => g.id === session.userId)
    : null;

  // Navigation Menus definitions based on authorized role
  const menuItems = session?.role === 'admin' ? [
    { key: 'dashboard', label: 'Dashboard Utama', icon: <School size={16} /> },
    { key: 'kelas', label: 'Data Kelas / Rombel', icon: <Users size={16} /> },
    { key: 'guru', label: 'Data Guru', icon: <Award size={16} /> },
    { key: 'siswa', label: 'Data Siswa', icon: <GraduationCap size={16} /> },
    { key: 'libur', label: 'Kalender (Hari Libur)', icon: <Calendar size={16} /> },
    { key: 'absensi', label: 'Isi Absensi Siswa', icon: <CheckSquare size={16} /> },
    { key: 'rekap-bulanan', label: 'Rekap Absen Bulanan', icon: <FileSpreadsheet size={16} /> },
    { key: 'rekap-semester', label: 'Rekap Absen Semester', icon: <CalendarRange size={16} /> },
    { key: 'pengaturan', label: 'Pengaturan & Backup', icon: <Settings size={16} /> },
  ] : [
    { key: 'dashboard', label: 'Dashboard Guru', icon: <User size={16} /> },
    { key: 'absensi', label: 'Absensi Siswa Harian', icon: <CheckSquare size={16} /> },
    { key: 'rekap-bulanan', label: 'Rekap Bulanan', icon: <FileSpreadsheet size={16} /> },
    { key: 'rekap-semester', label: 'Rekap Semester', icon: <CalendarRange size={16} /> },
    { key: 'pengaturan', label: 'Profil & Ubah Sandi', icon: <Settings size={16} /> },
  ];

  if (!session) {
    return (
      <AuthScreen 
        onLoginSuccess={handleLoginSuccess} 
        allGuru={guruList} 
        onRegisterSuccess={handleWriteSekolah} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 1. Header Toolbar Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-2.5">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 focus:outline-none rounded-lg text-slate-500 hover:text-slate-800 xl:hidden active:bg-slate-100 cursor-pointer pointer-events-auto"
          >
            <Menu size={22} />
          </button>
          
          <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <School size={18} className="stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-800 tracking-wider uppercase font-sans sm:block hidden">
              APLIKASI ABSENSI SD
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-tight">
              {sekolah.nama} • NPSN: {sekolah.npsn}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-700">{session.nama}</span>
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full self-end mt-0.5">
               {session.role === 'admin' ? 'Administrator' : `Guru ${currentGuru ? getKelasList().find(ck => ck.id === currentGuru.kelasId)?.nama || '' : ''}`}
            </span>
          </div>
          
          <div className="border-l border-slate-100 pl-4 flex items-center gap-2 text-slate-400 text-xs">
            <Clock size={16} className="text-slate-400" />
            <span className="font-mono font-semibold">{currentDateStr}</span>
          </div>

          <button
            id="btn-header-logout"
            onClick={handleLogout}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all font-semibold flex items-center gap-1 cursor-pointer pointer-events-auto text-xs"
            title="Keluar dari Aplikasi"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* 2. Main Page Layout Grid container */}
      <div className="flex flex-1 relative print:bg-white print:block">
        
        {/* Sidebar Left Navigation (Desktop persistent, Mobile dynamic overlay) */}
        <aside
          className={`bg-white border-r border-slate-150 w-64 p-4 shrink-0 transition-transform duration-300 xl:translate-x-0 xl:static fixed bottom-0 top-16 left-0 z-30 print:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile close sidebar button */}
          <div className="flex justify-end xl:hidden mb-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer pointer-events-auto"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2 text-xs">
              <div className="h-7 w-7 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-bold">
                {session?.role === 'admin' ? 'A' : 'G'}
              </div>
              <div className="truncate">
                <p className="font-bold text-slate-700 truncate">{session.nama}</p>
                <p className="text-[10px] text-slate-450 uppercase font-semibold">{session.role} sekolah</p>
              </div>
            </div>

            <nav id="sidebar-navigation" className="space-y-1">
              {menuItems.map((item) => {
                const isActive = activeMenu === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setActiveMenu(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`nav-menu-button w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer pointer-events-auto ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-50 font-bold'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                );
              })}
              
              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  id="btn-sidebar-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer pointer-events-auto"
                >
                  <span className="text-rose-500">
                    <LogOut size={16} />
                  </span>
                  Keluar dari Aplikasi
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Sidebar Background Backdrop overlay purely for mobile modes */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-20 xl:hidden"
          />
        )}

        {/* 3. Central Application Working Screen Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full print:p-0 print:bg-white">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="print:p-0"
          >
            {/* Navigates to correct screen dynamically based on activeMenu state */}
            {activeMenu === 'dashboard' && (
              session.role === 'admin' ? (
                <AdminDashboard
                  sekolah={sekolah}
                  kelasList={kelasList}
                  guruList={guruList}
                  siswaList={siswaList}
                  absensiList={absensiList}
                  currentDateStr={currentDateStr}
                  onNavigateToAbsensi={() => setActiveMenu('absensi')}
                  onNavigateToLibur={() => setActiveMenu('libur')}
                />
              ) : currentGuru ? (
                <TeacherDashboard
                  currentGuru={currentGuru}
                  kelasList={kelasList}
                  siswaList={siswaList}
                  absensiList={absensiList}
                  currentDateStr={currentDateStr}
                  onNavigateToAbsensi={() => setActiveMenu('absensi')}
                />
              ) : (
                <div id="no-auth-warning" className="p-8 text-center text-rose-700 bg-rose-50 border border-rose-100 rounded-xl">
                  Mendeteksi anomali otentikasi. Silakan masuk kembali.
                </div>
              )
            )}

            {activeMenu === 'kelas' && session.role === 'admin' && (
              <ClassManagement
                kelasList={kelasList}
                guruList={guruList}
                onSaveKelasList={handleWriteKelasList}
                onSaveGuruList={handleWriteGuruList}
              />
            )}

            {activeMenu === 'guru' && session.role === 'admin' && (
              <TeacherManagement
                guruList={guruList}
                kelasList={kelasList}
                onSaveGuruList={handleWriteGuruList}
                onSaveKelasList={handleWriteKelasList}
              />
            )}

            {activeMenu === 'siswa' && session.role === 'admin' && (
              <StudentManagement
                siswaList={siswaList}
                kelasList={kelasList}
                onSaveSiswaList={handleWriteSiswaList}
              />
            )}

            {activeMenu === 'libur' && session.role === 'admin' && (
              <HolidayManagement
                hariLiburList={hariLiburList}
                onSaveHariLiburList={handleWriteHariLiburList}
              />
            )}

            {activeMenu === 'absensi' && (
              <AttendanceEntry
                kelasList={kelasList}
                siswaList={siswaList}
                hariLiburList={hariLiburList}
                absensiList={absensiList}
                onSaveAbsensiList={handleWriteAbsensiList}
                currentUser={session}
              />
            )}

            {activeMenu === 'rekap-bulanan' && (
              <MonthlyRecap
                kelasList={kelasList}
                siswaList={siswaList}
                hariLiburList={hariLiburList}
                absensiList={absensiList}
                currentUser={session}
                schoolName={sekolah.nama}
              />
            )}

            {activeMenu === 'rekap-semester' && (
              <SemesterRecap
                kelasList={kelasList}
                siswaList={siswaList}
                absensiList={absensiList}
                hariLiburList={hariLiburList}
                currentUser={session}
                schoolName={sekolah.nama}
              />
            )}

            {activeMenu === 'pengaturan' && (
              <div className="space-y-6">
                <AccountSettings
                  sekolah={sekolah}
                  onSaveSekolah={handleWriteSekolah}
                  currentUser={session}
                  guruList={guruList}
                  onSaveGuruList={handleWriteGuruList}
                />
                
                {/* Admin Backup Panel block */}
                {session.role === 'admin' && (
                  <SystemBackup onDatabaseRestored={handleDatabaseRestored} />
                )}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <ConfirmModal
        isOpen={logoutConfirmOpen}
        title="Konfirmasi Keluar Sesi"
        message="Apakah Anda yakin ingin keluar dari pangkalan data absensi sekolah ini? Sesi Anda akan dialihkan kembali ke gerbang login autentikasi."
        onConfirm={executeLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
        confirmText="Keluar Sesi"
        cancelText="Batal"
        type="warning"
      />
    </div>
  );
}
