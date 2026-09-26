import React from 'react';
import { useAccounting } from '../context/AccountingContext';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useAccounting();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div
      id="app-toast-container"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2.5 w-full max-w-md px-4 pointer-events-none"
      dir="rtl"
    >
      {notifications.map((toast) => {
        let bgStyle = 'bg-slate-900/95 text-white border-slate-700 shadow-2xl';
        let iconElem = <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />;
        let progressBg = 'bg-sky-500';

        if (toast.type === 'success') {
          bgStyle = 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white border-emerald-500/50 shadow-emerald-950/40 shadow-2xl';
          iconElem = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
          progressBg = 'bg-emerald-500';
        } else if (toast.type === 'error') {
          bgStyle = 'bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white border-rose-500/50 shadow-rose-950/40 shadow-2xl';
          iconElem = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
          progressBg = 'bg-rose-500';
        } else if (toast.type === 'warning') {
          bgStyle = 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white border-amber-500/50 shadow-amber-950/40 shadow-2xl';
          iconElem = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
          progressBg = 'bg-amber-500';
        }

        return (
          <div
            key={toast.id}
            id={`toast-item-${toast.id}`}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5 flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${bgStyle}`}
          >
            {iconElem}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-black tracking-tight leading-snug">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-[11.5px] text-slate-300 font-medium mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeNotification(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0 cursor-pointer"
              title="بستن پیام"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Auto dismiss visual indicator */}
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${progressBg} opacity-80`} />
          </div>
        );
      })}
    </div>
  );
};
