import React, { useState } from 'react';
import { Globe, User, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { OrcaLogo } from './OrcaLogo';
import { translations, SupportedLanguage } from '../i18n/translations';

interface LoginScreenProps {
  currentLanguage?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onLoginSuccess: (username: string, language: SupportedLanguage) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  currentLanguage = 'en',
  onLanguageChange,
  onLoginSuccess,
}) => {
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('orca_user_language') as SupportedLanguage | null;
    return saved && translations[saved] ? saved : currentLanguage;
  });
  const [identifier, setIdentifier] = useState('Ramesh');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = translations[language] || translations.en;

  const handleSelectLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    localStorage.setItem('orca_user_language', lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your mobile number or username.');
      return;
    }
    localStorage.setItem('orca_user_language', language);
    onLoginSuccess(identifier.trim(), language);
  };

  const handleQuickDemoLogin = () => {
    setIdentifier('Ramesh');
    setPassword('demo1234');
    localStorage.setItem('orca_user_language', language);
    onLoginSuccess('Ramesh', language);
  };

  const languageOptions: Array<{ code: SupportedLanguage; label: string; native: string }> = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex items-center justify-center p-4 sm:p-6 lg:p-8 antialiased selection:bg-blue-100 selection:text-blue-900">
      <main
        className="w-full max-w-[460px] bg-white rounded-3xl shadow-[0_10px_35px_rgba(15,23,42,0.07)] border border-slate-100/90 px-7 py-8 sm:px-9 sm:py-10"
        data-purpose="auth-card"
      >
        {/* Brand Header */}
        <header className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center mb-5">
            <OrcaLogo size={46} textColor="#0c2340" />
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-[#0c2340] tracking-tight mb-2">
            {isSignUpMode ? t.login.signUpTitle : t.login.title}
          </h1>
          <p className="text-[13.5px] text-[#3b4d61] font-medium leading-relaxed max-w-[320px]">
            {t.login.subtitle}
          </p>
        </header>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 text-center">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          {/* Primary Language Selection Pills */}
          <div className="flex flex-col gap-2 p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between">
              <label className="text-[12.5px] font-bold text-[#0b2545] flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>{t.login.langLabel}</span>
              </label>
              <span className="text-[11px] font-semibold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                Active: {language.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {languageOptions.map((opt) => {
                const isSelected = language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleSelectLanguage(opt.code)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all text-center flex flex-col items-center justify-center border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200 scale-[1.02]'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <span className="text-[13px] font-bold">{opt.native}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Number / Username Field */}
          <div className="flex flex-col">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-600">
                <User className="w-5 h-5 stroke-[1.8]" />
              </div>
              <input
                id="identifier"
                name="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t.login.usernameLabel}
                required
                className="w-full rounded-xl border border-[#dbe2ea] bg-white py-3.5 pl-11 pr-4 text-[14px] font-medium text-[#0c2340] placeholder:text-slate-400 shadow-2xs transition focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col">
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-600">
                <Lock className="w-5 h-5 stroke-[1.8]" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.login.passwordLabel}
                required
                className="w-full rounded-xl border border-[#dbe2ea] bg-white py-3.5 pl-11 pr-11 text-[14px] font-medium text-[#0c2340] placeholder:text-slate-400 shadow-2xs transition focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 flex items-center text-slate-500 hover:text-slate-800 transition focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 stroke-[1.8]" />
                ) : (
                  <Eye className="w-5 h-5 stroke-[1.8]" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center cursor-pointer select-none">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#dbe2ea] text-[#0b57d0] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="ml-2.5 block text-[13.5px] font-semibold text-[#0c2340]">
                {t.login.rememberMe}
              </span>
            </label>

            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('A password reset code has been sent to your registered mobile number.');
              }}
              className="text-xs font-semibold text-[#0b57d0] hover:underline"
            >
              {t.login.forgotPassword}
            </a>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#0b57d0] hover:bg-[#094abb] py-3.5 px-4 text-[15px] font-semibold text-white shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {isSignUpMode ? t.login.signUpBtn : t.login.loginBtn}
            </button>
          </div>

          {/* Quick Demo Login Option */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2.5 px-3 text-xs font-semibold text-slate-700 hover:text-[#0b57d0] hover:bg-slate-50 rounded-xl transition border border-dashed border-slate-300 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.login.demoLoginBtn}</span>
          </button>
        </form>

        {/* Footer Link */}
        <footer className="mt-6 text-center">
          <p className="text-[13.5px] text-[#3b4d61] font-normal">
            {isSignUpMode ? t.login.alreadyAccount : t.login.dontHaveAccount}
            <button
              type="button"
              onClick={() => setIsSignUpMode(!isSignUpMode)}
              className="font-semibold text-[#0b57d0] hover:underline ml-1 cursor-pointer"
            >
              {isSignUpMode ? t.login.switchLogin : t.login.switchSignUp}
            </button>
          </p>
        </footer>
      </main>
    </div>
  );
};
