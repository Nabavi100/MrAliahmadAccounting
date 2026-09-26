import React, { useState, useRef, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { CompanyStampSeal } from './CompanyStampSeal';
import {
  X,
  Check,
  Upload,
  Eraser,
  PenTool,
  Stamp,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface SignatureAndSealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (settings: {
    showStamp: boolean;
    showSignature: boolean;
    stampUrl?: string;
    signatureUrl?: string;
    stampColor?: 'blue' | 'red' | 'navy';
    stampSize?: number;
    signatureSize?: number;
  }) => void;
}

export const SignatureAndSealModal: React.FC<SignatureAndSealModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const { companySettings, updateCompanySettings, currentUser } = useAccounting();

  // Local state initialized from companySettings
  const [activeTab, setActiveTab] = useState<'signature' | 'stamp'>('signature');
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw' | 'preset'>('draw');

  const [showStamp, setShowStamp] = useState<boolean>(
    companySettings.showStampOnInvoice !== undefined ? companySettings.showStampOnInvoice : true
  );
  const [showSignature, setShowSignature] = useState<boolean>(
    companySettings.showSignatureOnInvoice !== undefined
      ? companySettings.showSignatureOnInvoice
      : true
  );

  const [stampUrl, setStampUrl] = useState<string>(companySettings.stampUrl || '');
  const [signatureUrl, setSignatureUrl] = useState<string>(companySettings.signatureUrl || '');
  const [stampColor, setStampColor] = useState<'navy' | 'blue' | 'red'>(
    companySettings.stampColor || 'navy'
  );
  const [stampSize, setStampSize] = useState<number>(companySettings.stampSize || 56);
  const [signatureSize, setSignatureSize] = useState<number>(companySettings.signatureSize || 48);

  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync with companySettings when opened
  useEffect(() => {
    if (isOpen) {
      if (companySettings.stampSize) setStampSize(companySettings.stampSize);
      if (companySettings.signatureSize) setSignatureSize(companySettings.signatureSize);
    }
  }, [isOpen, companySettings.stampSize, companySettings.signatureSize]);

  // Canvas Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnOnCanvas, setHasDrawnOnCanvas] = useState(false);
  const [penColor, setPenColor] = useState<'#1E3A8A' | '#0F172A' | '#B91C1C'>('#1E3A8A');

  // Initialize canvas
  useEffect(() => {
    if (isOpen && activeTab === 'signature' && signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = penColor;
    }
  }, [isOpen, activeTab, signatureMode, penColor]);

  if (!isOpen) return null;

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnOnCanvas(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.strokeStyle = penColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnOnCanvas(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnOnCanvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureUrl(dataUrl);
    setStatusMessage('امضای ترسیم‌شده ثبت شد و در پیش‌نمایش قرار گرفت.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Upload Handlers
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم فایل امضا نباید بیشتر از ۲ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setSignatureUrl(base64);
      setStatusMessage('تصویر امضا با موفقیت بارگذاری شد.');
      setTimeout(() => setStatusMessage(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('حجم فایل مهر نباید بیشتر از ۲ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setStampUrl(base64);
      setStatusMessage('تصویر مهر با موفقیت بارگذاری شد.');
      setTimeout(() => setStatusMessage(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  // Preset Signatures (SVG Data URLs)
  const applyPresetSignature = (presetIndex: number) => {
    // Generate a sleek calligraphic SVG signature representation
    const managerName = currentUser?.name || companySettings.name || 'علی احمد نبوی';
    let pathD = '';

    if (presetIndex === 1) {
      pathD =
        'M 15 45 Q 35 15, 60 40 T 110 35 Q 130 50, 160 25 T 200 45 Q 170 55, 120 52 T 40 48 Q 20 48, 180 40';
    } else if (presetIndex === 2) {
      pathD =
        'M 20 30 Q 50 60, 90 20 T 140 45 Q 160 10, 190 35 M 40 50 Q 90 55, 150 48 T 210 46 M 70 25 L 85 45';
    } else {
      pathD =
        'M 30 40 C 60 10, 80 60, 110 30 C 140 10, 160 55, 190 25 M 25 45 Q 110 52, 215 42 M 130 20 Q 140 40, 155 35';
    }

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 70" width="240" height="70">
      <path d="${pathD}" fill="none" stroke="#1E3A8A" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="120" y="65" font-size="9" font-family="sans-serif" fill="#1E3A8A" font-weight="bold" text-anchor="middle" opacity="0.85">${managerName}</text>
    </svg>`;

    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    setSignatureUrl(dataUrl);
    setStatusMessage('امضای رسمی پیش‌فرض انتخاب شد.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Handle Save & Apply
  const handleApply = () => {
    if (saveAsDefault) {
      updateCompanySettings({
        stampUrl,
        signatureUrl,
        showStampOnInvoice: showStamp,
        showSignatureOnInvoice: showSignature,
        stampColor,
        stampSize,
        signatureSize,
      });
    }

    if (onApply) {
      onApply({
        showStamp,
        showSignature,
        stampUrl,
        signatureUrl,
        stampColor,
        stampSize,
        signatureSize,
      });
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-xs">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black">
                تنظیم تصویر مهر شرکت و امضای دیجیتال
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                شخصی‌سازی امضا و مهر رسمی در پایین برگه فاکتورها هنگام چاپ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2.5 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('signature')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'signature'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>امضای دیجیتال صادرکننده</span>
            {signatureUrl && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stamp')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-t-xl transition cursor-pointer border-b-2 ${
              activeTab === 'stamp'
                ? 'bg-white text-blue-600 border-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>مهر رسمی شرکت</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {/* ================= TAB 1: SIGNATURE ================= */}
          {activeTab === 'signature' && (
            <div className="space-y-4">
              {/* Toggle switch for printing signature */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-blue-950 block">
                    نمایش امضای دیجیتال در برگه فاکتورها
                  </span>
                  <p className="text-[11px] text-blue-800/80">
                    امضا در کادر مخصوص صادرکننده فاکتور در پایین برگه چاپ خواهد شد.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={e => setShowSignature(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Sub-modes: Draw, Upload, Preset */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs w-full">
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    signatureMode === 'draw'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>ترسیم دستی با قلم یا لمس</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('upload')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    signatureMode === 'upload'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>آپلود عکس امضا (PNG/JPG)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('preset')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    signatureMode === 'preset'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>امضاهای آماده اداری</span>
                </button>
              </div>

              {/* Mode 1: Draw Signature */}
              {signatureMode === 'draw' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      با ماوس، قلم نوری یا انگشت روی کادر زیر امضا نمایید:
                    </span>

                    {/* Pen Color Picker */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">رنگ قلم:</span>
                      <button
                        type="button"
                        onClick={() => setPenColor('#1E3A8A')}
                        className={`w-5 h-5 rounded-full bg-blue-900 border-2 transition ${
                          penColor === '#1E3A8A' ? 'border-amber-400 scale-110' : 'border-transparent'
                        }`}
                        title="آبی جوهری"
                      />
                      <button
                        type="button"
                        onClick={() => setPenColor('#0F172A')}
                        className={`w-5 h-5 rounded-full bg-slate-900 border-2 transition ${
                          penColor === '#0F172A' ? 'border-amber-400 scale-110' : 'border-transparent'
                        }`}
                        title="مشکی اداری"
                      />
                      <button
                        type="button"
                        onClick={() => setPenColor('#B91C1C')}
                        className={`w-5 h-5 rounded-full bg-rose-700 border-2 transition ${
                          penColor === '#B91C1C' ? 'border-amber-400 scale-110' : 'border-transparent'
                        }`}
                        title="قرمز رسمی"
                      />
                    </div>
                  </div>

                  {/* Canvas Pad */}
                  <div className="relative bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden shadow-2xs touch-none">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-36 cursor-crosshair block"
                    />

                    {/* Dotted guideline */}
                    <div className="absolute bottom-6 left-8 right-8 border-b border-dashed border-slate-200 pointer-events-none flex justify-between text-[9px] text-slate-400">
                      <span>خط مبنای امضا</span>
                      <span>مدیریت شرکت</span>
                    </div>

                    {!hasDrawnOnCanvas && !signatureUrl && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs pointer-events-none font-medium">
                        اینجا امضا کنید...
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>پاک کردن کادر</span>
                    </button>

                    <button
                      type="button"
                      onClick={saveCanvasSignature}
                      disabled={!hasDrawnOnCanvas}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تأیید و اعمال این امضا</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode 2: Upload File */}
              {signatureMode === 'upload' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-white transition cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <strong className="text-xs font-bold text-slate-800">
                        کلیک کنید یا عکس اسکن‌شده امضا را اینجا بکشید
                      </strong>
                      <p className="text-[11px] text-slate-500">
                        فرمت PNG با پس‌زمینه شفاف (Transparent) پیشنهاد می‌شود • حداکثر ۲ مگابایت
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 3: Presets */}
              {signatureMode === 'preset' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 block">
                    یکی از طرح‌های امضای خوشنویسی و رسمی زیر را انتخاب فرمایید:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => applyPresetSignature(num)}
                        className="bg-white hover:bg-blue-50/50 p-3 rounded-xl border border-slate-200 hover:border-blue-400 text-center transition cursor-pointer flex flex-col items-center gap-2 shadow-2xs group"
                      >
                        <div className="h-14 flex items-center justify-center">
                          <svg
                            viewBox="0 0 200 60"
                            className="w-32 h-12 stroke-blue-900 group-hover:scale-105 transition-transform"
                          >
                            {num === 1 && (
                              <path
                                d="M 15 45 Q 35 15, 60 40 T 110 35 Q 130 50, 160 25 T 200 45 Q 170 55, 120 52 T 40 48"
                                fill="none"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            )}
                            {num === 2 && (
                              <path
                                d="M 20 30 Q 50 60, 90 20 T 140 45 Q 160 10, 190 35 M 40 50 Q 90 55, 150 48"
                                fill="none"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            )}
                            {num === 3 && (
                              <path
                                d="M 30 40 C 60 10, 80 60, 110 30 C 140 10, 160 55, 190 25 M 25 45 Q 110 52, 185 42"
                                fill="none"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                              />
                            )}
                          </svg>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">
                          قالب امضای اداری شماره {num}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Signature Preview and Delete */}
              {signatureUrl && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-28 bg-white rounded-lg border border-emerald-300 p-1 flex items-center justify-center shadow-2xs">
                      <img
                        src={signatureUrl}
                        alt="امضا"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-black text-emerald-900 block">
                        امضای دیجیتال فعال است
                      </span>
                      <span className="text-[10px] text-emerald-700">
                        در پایین فاکتورها روی خط صادرکننده فاکتور درج خواهد شد
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSignatureUrl('');
                      clearCanvas();
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                    title="حذف امضا"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Signature Size Adjustment */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      تنظیم اندازه و ارتفاع امضا در فاکتور:
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono font-bold">
                      {signatureSize}px
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'کوچک', size: 36 },
                      { label: 'استاندارد', size: 48 },
                      { label: 'بزرگ', size: 64 },
                      { label: 'خیلی بزرگ', size: 78 },
                    ].map(preset => (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() => setSignatureSize(preset.size)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          signatureSize === preset.size
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-medium">کوچک (۲۸px)</span>
                  <input
                    type="range"
                    min={28}
                    max={85}
                    step={2}
                    value={signatureSize}
                    onChange={e => setSignatureSize(Number(e.target.value))}
                    className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">بزرگ (۸۵px)</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: STAMP / SEAL ================= */}
          {activeTab === 'stamp' && (
            <div className="space-y-4">
              {/* Toggle switch for printing stamp */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-blue-950 block">
                    نمایش مهر رسمی شرکت روی فاکتور
                  </span>
                  <p className="text-[11px] text-blue-800/80">
                    مهر با زاویه رسمی و جلوه جوهر در کنار امضای صادرکننده درج می‌شود.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStamp}
                    onChange={e => setShowStamp(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Stamp Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Official Dynamic Vector Seal */}
                <div
                  onClick={() => setStampUrl('')}
                  className={`p-4 rounded-2xl border-2 transition cursor-pointer space-y-3 ${
                    !stampUrl
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center p-0.5">
                        {!stampUrl && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        مهر رسمی سیستمی
                      </span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      خودکار
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    مهر گرد دایره‌ای با نام «{companySettings.name}»، کد تجارتی و عبارت «تأیید شد».
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-600">رنگ جوهر:</span>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setStampColor('navy');
                          setStampUrl('');
                        }}
                        className={`w-5 h-5 rounded-full bg-blue-900 border-2 transition ${
                          stampColor === 'navy' && !stampUrl
                            ? 'border-amber-400 scale-110'
                            : 'border-transparent'
                        }`}
                        title="سرمه‌ای اداری"
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setStampColor('red');
                          setStampUrl('');
                        }}
                        className={`w-5 h-5 rounded-full bg-rose-700 border-2 transition ${
                          stampColor === 'red' && !stampUrl
                            ? 'border-amber-400 scale-110'
                            : 'border-transparent'
                        }`}
                        title="سرخ رسمی"
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setStampColor('blue');
                          setStampUrl('');
                        }}
                        className={`w-5 h-5 rounded-full bg-sky-600 border-2 transition ${
                          stampColor === 'blue' && !stampUrl
                            ? 'border-amber-400 scale-110'
                            : 'border-transparent'
                        }`}
                        title="آبی کاربنی"
                      />
                    </div>

                    <CompanyStampSeal size={52} color={stampColor} tilt={true} />
                  </div>
                </div>

                {/* Option 2: Upload Custom Seal Image */}
                <div
                  className={`p-4 rounded-2xl border-2 transition space-y-3 ${
                    stampUrl
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center p-0.5">
                        {stampUrl && <div className="w-2 h-2 rounded-full bg-blue-600"></div>}
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        آپلود تصویر اختصاصی مهر
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      عکس اسکن‌شده
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    عکس مهر استامپ واقعی شرکت با پس‌زمینه شفاف (فرمت PNG یا SVG).
                  </p>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>انتخاب فایل مهر</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStampUpload}
                        className="hidden"
                      />
                    </label>

                    {stampUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={stampUrl}
                          alt="مهر اختصاصی"
                          className="w-12 h-12 object-contain rounded-lg border border-slate-300 p-0.5 bg-white shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setStampUrl('')}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                          title="حذف و بازگشت به مهر سیستمی"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stamp Size Adjustment */}
              <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      تنظیم اندازه و قطر مهر رسمی در فاکتور:
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono font-bold">
                      {stampSize}px
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'کوچک', size: 42 },
                      { label: 'استاندارد', size: 56 },
                      { label: 'بزرگ', size: 72 },
                      { label: 'خیلی بزرگ', size: 88 },
                    ].map(preset => (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() => setStampSize(preset.size)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          stampSize === preset.size
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-medium">کوچک (۳۲px)</span>
                  <input
                    type="range"
                    min={32}
                    max={100}
                    step={2}
                    value={stampSize}
                    onChange={e => setStampSize(Number(e.target.value))}
                    className="flex-1 accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 font-medium">بزرگ (۱۰۰px)</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= LIVE INVOICE FOOTER PREVIEW ================= */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>پیش‌نمایش زنده در پایین برگه فاکتور چاپ:</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  اندازه مهر: {stampSize}px • امضا: {signatureSize}px
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  نمایش واقعی
                </span>
              </div>
            </div>

            {/* Paper Preview Simulation */}
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs">
              <div className="grid grid-cols-3 gap-3 text-center text-[10px] items-end">
                {/* Right side: Issuer Signature */}
                <div className="relative flex flex-col justify-between min-h-[96px] border border-dashed border-blue-300 p-2 rounded-lg bg-blue-50/25">
                  <span className="text-slate-600 font-bold">امضای صادرکننده فاکتور</span>

                  <div className="relative min-h-[52px] flex items-center justify-center py-1">
                    {showSignature && signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="امضای صادرکننده"
                        style={{
                          height: `${signatureSize}px`,
                          maxHeight: '75px',
                          maxWidth: `${Math.round(signatureSize * 2.8)}px`,
                        }}
                        className="object-contain select-none z-10 filter contrast-125 pointer-events-none"
                      />
                    ) : (
                      <span className="text-slate-400 text-[9px]">(محل امضای صادرکننده)</span>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-bold truncate">
                    مدیریت: {companySettings.name}
                  </div>
                </div>

                {/* Center: Official Company Stamp (وسط دو امضا) */}
                <div className="relative flex flex-col justify-between min-h-[96px] border-2 border-dashed border-amber-300 p-2 rounded-lg bg-amber-50/30">
                  <div className="flex flex-col items-center">
                    <span className="text-amber-900 font-bold text-[10.5px]">مهر رسمی شرکت</span>
                    <span className="text-[9px] text-amber-600 font-semibold">(وسط دو امضا)</span>
                  </div>

                  <div className="relative min-h-[52px] flex items-center justify-center py-1">
                    {showStamp ? (
                      <div className="select-none pointer-events-none opacity-95 flex items-center justify-center">
                        <CompanyStampSeal
                          size={stampSize}
                          stampUrl={stampUrl}
                          color={stampColor}
                          tilt={true}
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[9px]">(مهر غیرفعال است)</span>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-400 pt-1 text-slate-800 font-bold">
                    تأییدیه و اعتبار رسمی
                  </div>
                </div>

                {/* Left side: Buyer Signature & Fingerprint */}
                <div className="flex flex-col justify-between min-h-[96px] border border-dashed border-slate-200 p-2 rounded-lg bg-slate-50/40">
                  <span className="text-slate-500 font-bold">امضا و اثر انگشت خریدار</span>
                  <div className="min-h-[52px] flex items-center justify-center text-slate-300 text-[9px]">
                    (محل امضا و اثر انگشت)
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-slate-700 font-bold truncate">
                    مشتری محترم
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Persistent Save Checkbox */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={e => setSaveAsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
            />
            <span>
              این تنظیمات به عنوان پیش‌فرض مشخصات شرکت در سیستم ذخیره شود (جهت تمام فاکتورهای آینده)
            </span>
          </label>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            انصراف
          </button>

          <button
            type="button"
            id="apply-signature-and-seal-btn"
            onClick={handleApply}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs hover:shadow cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>تأیید و اعمال در فاکتور چاپی</span>
          </button>
        </div>
      </div>
    </div>
  );
};
