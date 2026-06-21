import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Trash2, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorClasses = {
    danger: {
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      btn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
    },
    warning: {
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    info: {
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
    },
  }[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop overlay */}
        <div 
          onClick={onCancel}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300" 
        />

        {/* Modal content container */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-xl z-50 space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-xl shrink-0 ${colorClasses.iconBg}`}>
                {type === 'danger' ? (
                  <Trash2 size={22} className="stroke-[1.75]" />
                ) : type === 'warning' ? (
                  <AlertCircle size={22} className="stroke-[1.75]" />
                ) : (
                  <HelpCircle size={22} className="stroke-[1.75]" />
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
                  {title}
                </h3>
                <p className="text-slate-550 text-xs mt-1 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 text-xs font-semibold">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer pointer-events-auto"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-4 py-2 text-white rounded-xl shadow-sm transition-all cursor-pointer pointer-events-auto ${colorClasses.btn}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
