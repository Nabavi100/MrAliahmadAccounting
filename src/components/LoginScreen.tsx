import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Lock, User, Eye, EyeOff, LogIn, ShieldCheck, Building2, KeyRound, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { users, currentUser, login, companySettings } = useAccounting();
  const [selectedUserId, setSelectedUserId] = useState<string>(() => currentUser?.id || users[0]?.id || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (!selectedUser) {
      setErrorMessage('لطفاً یک کاربر را انتخاب نمایید.');
      setIsSubmitting(false);
      return;
    }

    if (!password.trim()) {
      setErrorMessage('لطفاً رمز عبور را وارد فرمایید.');
      setIsSubmitting(false);
      return;
    }

    const result = login(selectedUser.id, password);
    if (!result.success) {
      setErrorMessage(result.message || 'رمز عبور وارد شده نادرست است.');
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setErrorMessage('');
    setPassword('');
  };

  return (
    <div
      id="login-screen-container"
      dir="rtl"
      className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex items-center justify-center p-4 overflow-y-auto font-sans select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 animate-fadeIn">
        {/* Top Header Branding Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 pb-7 text-center relative">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-600/30 mb-3 border-2 border-white/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-white">
            {companySettings?.name || 'شرکت تجارتی برادران نبوی'}
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1">
            سیستم یکپارچه حسابداری، مدیریت گدام و صرافی
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-bold text-emerald-400 mt-3 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ورود امن به برنامه با احراز هویت رمز عبور</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="p-6 pt-5 space-y-5">
          {/* User selection chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              انتخاب کاربر سیستم:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {users.map(u => {
                const isSelected = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSelectUser(u.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-right transition border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg ${u.avatarColor || 'bg-slate-700'} text-white flex items-center justify-center text-xs font-black shrink-0`}
                    >
                      {u.name.slice(0, 1)}
                    </span>
                    <div className="truncate">
                      <div className="text-[11px] font-bold truncate leading-tight">{u.name}</div>
                      <div className="text-[9.5px] text-slate-500 truncate">{u.roleTitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected User display */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-600">نام کاربری:</span>
                <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedUser?.username || selectedUser?.name}
                </span>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {selectedUser?.roleTitle}
              </span>
            </div>

            {/* Password input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>رمز عبور (پسورد ورود):</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (رمز اولیه: ۱۲۳)
                </span>
              </label>

              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  dir="ltr"
                  placeholder="رمز عبور خود را وارد نمایید..."
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 outline-none transition pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                  title={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ورود...' : 'ورود به سیستم حسابداری'}</span>
            </button>
          </form>

          {/* Quick Demo Fill Pill */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>رمز عبور پیش‌فرض: <strong className="font-mono text-slate-800">123</strong></span>
            <button
              type="button"
              onClick={() => {
                setPassword('123');
                setErrorMessage('');
              }}
              className="text-blue-600 hover:underline font-bold cursor-pointer"
            >
              درج خودکار رمز ۱۲۳
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
