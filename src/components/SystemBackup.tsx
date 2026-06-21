import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, Download, Upload, ShieldAlert, CheckCircle, AlertTriangle, Cloud, Copy, Check, RefreshCw } from 'lucide-react';
import { getDatabaseDump, restoreDatabaseFromDump } from '../utils/db';
import ConfirmModal from './ConfirmModal';
import { 
  testSupabaseConnection, 
  pushAllLocalToSupabase, 
  pullSupabaseToLocal, 
  SyncStatus, 
  SUPABASE_SETUP_SQL 
} from '../utils/supabase';

interface SystemBackupProps {
  onDatabaseRestored: () => void;
}

export default function SystemBackup({ onDatabaseRestored }: SystemBackupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Supabase connection and state management
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSqlBlock, setShowSqlBlock] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const status = await testSupabaseConnection();
    setSyncStatus(status);
  };

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    setSyncMessage('Mengirim file database sekolah ke Supabase...');
    try {
      await pushAllLocalToSupabase();
      setSyncMessage('Semua data berhasil disinkronisasi ke cloud Supabase!');
      await checkConnection();
      setTimeout(() => setSyncMessage(''), 4000);
    } catch (err: any) {
      setSyncMessage(`Gagal kirim data: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    setSyncMessage('Menarik data terbaru dari cloud Supabase...');
    try {
      const ok = await pullSupabaseToLocal();
      if (ok) {
        setSyncMessage('Data berhasil ditarik dari Supabase! Memuat ulang halaman...');
        setTimeout(() => {
          onDatabaseRestored();
          setSyncMessage('');
        }, 1500);
      } else {
        throw new Error('Gagal memuat beberapa tabel. Periksa relasi tabel Anda.');
      }
    } catch (err: any) {
      setSyncMessage(`Gagal tarik data: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadBackup = () => {
    try {
      const dump = getDatabaseDump();
      const blob = new Blob([dump], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `back_up_absensi_sd_${dateStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMsg('Pangkalan data berhasil diunduh ke komputer Anda.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setErrorMsg('Gagal memproses pengunduhan database.');
    }
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuccessMsg('');
    setErrorMsg('');

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = restoreDatabaseFromDump(text);
      if (success) {
        setSuccessMsg('Database berhasil dimuat! Me-refresh data aplikasi sekarang...');
        onDatabaseRestored();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg('Format file JSON tidak cocok dengan spesifikasi pangkalan data absensi. Silakan upload file hasil ekspor resmi kami.');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Kesalahan membaca file cadangan.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Database size={18} className="text-emerald-600" />
          Ekspor Cadangan & Pemulihan Database (Backup)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Lakukan pencadangan pangkalan data berkala untuk mengamankan data kehadiran dan biodata siswa sekolah dasar.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-2.5 rounded-xl font-medium flex items-center gap-1.5">
          <CheckCircle size={15} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2.5 rounded-xl font-medium flex items-center gap-1.5">
          <AlertTriangle size={15} />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Backup Panel */}
        <div className="border border-slate-150 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase">
              PENCADANGAN DATA
            </span>
            <h3 className="font-bold text-slate-800 text-sm mt-3">Ekspor Database Keseluruhan</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Mengunduh seluruh isi data aktif sekolah, siswa, guru, kalender libur, serta total absen siswa ke dalam satu file berkstensi <b>.json</b> yang aman.
            </p>
          </div>
          
          <button
            id="btn-download-backup"
            onClick={handleDownloadBackup}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer pointer-events-auto"
          >
            <Download size={14} /> Unduh Cadangan Database (.json)
          </button>
        </div>

        {/* Restore Panel */}
        <div className="border border-slate-150 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase">
              PEMULIHAN DATA
            </span>
            <h3 className="font-bold text-slate-800 text-sm mt-3">Pulihkan dari File Cadangan</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Memasukkan kembali file ekspor <b>.json</b> hasil cadangan sebelumnya untuk memulihkan seluruh kegiatan pelajaran. Tindakan ini akan menimpa data saat ini.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleUploadBackup}
              className="hidden"
            />
            <button
              id="btn-upload-backup-ref"
              onClick={() => setShowRestoreModal(true)}
              className="w-full inline-flex items-center justify-center gap-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-xl shadow-sm transition-all cursor-pointer pointer-events-auto"
            >
              <Upload size={14} /> Unggah File Cadangan (.json)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Supabase Cloud Sync Section */}
      <div className="border border-slate-150 rounded-2xl p-5 bg-gradient-to-r from-slate-50 to-emerald-50/20 mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Cloud size={16} className="text-emerald-600" />
              Integrasi Database Cloud Supabase
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Integrasi backend cloud untuk sinkronisasi pangkalan data multi-perangkat via Supabase.</p>
          </div>
          
          <button
            onClick={checkConnection}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-800 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer pointer-events-auto transition-all"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            Cek Koneksi
          </button>
        </div>

        {/* Sync Status Display */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 px-3 bg-white border border-slate-200/60 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {syncStatus?.connected ? (
                syncStatus?.tablesExist ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </>
                )
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              )}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-700">
                {syncStatus?.connected 
                  ? (syncStatus?.tablesExist ? 'Terhubung ke Supabase (Aktif)' : 'Project Terhubung (Tabel Belum Siap)') 
                  : 'Supabase Offline / Belum Terhubung'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {syncStatus?.error ? `Pesan: ${syncStatus.error}` : `Terakhir Sinkron: ${syncStatus?.lastSynced || 'Beralih ke lokal'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!syncStatus?.tablesExist && syncStatus?.connected && (
              <button
                onClick={() => setShowSqlBlock(!showSqlBlock)}
                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-[10px] sm:text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer pointer-events-auto transition-all animate-bounce"
              >
                Setup SQL Tabel
              </button>
            )}
          </div>
        </div>

        {/* Sync Message notifications */}
        {syncMessage && (
          <div className="bg-sky-50 border border-sky-100 text-sky-800 text-[11px] px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 animate-pulse">
            <RefreshCw size={13} className="animate-spin text-sky-600" />
            {syncMessage}
          </div>
        )}

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handlePushToCloud}
            disabled={isSyncing || !syncStatus?.connected || !syncStatus?.tablesExist}
            className="flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-800 font-bold text-xs py-2.5 rounded-xl cursor-pointer pointer-events-auto transition-all"
          >
            <Upload size={14} /> Kirim Data Lokal ke Supabase Cloud
          </button>

          <button
            onClick={handlePullFromCloud}
            disabled={isSyncing || !syncStatus?.connected || !syncStatus?.tablesExist}
            className="flex items-center justify-center gap-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-800 font-bold text-xs py-2.5 rounded-xl cursor-pointer pointer-events-auto transition-all"
          >
            <Download size={14} /> Tarik Data Cloud dari Supabase ke Lokal
          </button>
        </div>

        {/* Setup SQL Manual Block */}
        {showSqlBlock && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-900 text-slate-100 space-y-3 font-mono text-[11px] overflow-hidden">
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-2">
              <span>SETUP SCRIPT TABEL SQL (SUPABASE EDITOR)</span>
              <button
                onClick={handleCopySql}
                className="text-slate-100 hover:text-emerald-400 flex items-center gap-1 cursor-pointer pointer-events-auto font-sans text-[11px] font-bold bg-slate-850 px-2 py-1 rounded"
              >
                {copiedSql ? (
                  <>
                    <Check size={12} className="text-emerald-400" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Salin SQL Script
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-400 text-[10px] font-sans italic leading-relaxed">
              *Supabase memerlukan pembuatan skema tabel relasi agar aplikasi dapat meng-upload data. Silakan salin script SQL di atas dan tempelkan ke panel <b>SQL Editor</b> di dashboard project Supabase Anda, lalu tekan tombol <b>Run</b>. Setelah itu, tekan tombol "Cek Koneksi" di atas!
            </p>
            <pre className="bg-black/40 p-3 rounded-lg overflow-x-auto max-h-48 text-emerald-300">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-800 leading-relaxed flex gap-2 items-start mt-2">
        <ShieldAlert size={18} className="shrink-0 text-rose-650 mt-0.5" />
        <div>
          <h4 className="font-bold">Keamanan Pemulihan Penting:</h4>
          <p className="text-rose-700/90 mt-0.5">
            Sistem tidak memverifikasi validitas nama admin baru jika diimpor dari file cadangan yang berbeda. Pastikan file JSON yang Anda pilih merupakan ekspor asli dari sistem ini.
          </p>
        </div>
      </div>

      <ConfirmModal
        isOpen={showRestoreModal}
        title="Konfirmasi Pemulihan Database"
        message="PERINGATAN: Memulihkan database dari file cadangan akan menimpa seluruh pangkalan data aktif Anda saat ini secara permanen. Pengisian kehadiran hari ini atau perubahan biodata baru akan terhapus. Lanjutkan?"
        onConfirm={() => {
          setShowRestoreModal(false);
          fileInputRef.current?.click();
        }}
        onCancel={() => setShowRestoreModal(false)}
        confirmText="Ya, Muat Backup"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
}
