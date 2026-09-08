import React, { useState } from 'react';
import { Globe, User, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { OrcaLogo } from './OrcaLogo';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [language, setLanguage] = useState('en');
  const [identifier, setIdentifier] = useState('Ramesh');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg('Please enter your mobile number or username.');
      return;
    }
    onLoginSuccess(identifier.trim());
  };

  const handleQuickDemoLogin = () => {
    setIdentifier('Ramesh');
    setPassword('demo1234');
    onLoginSuccess('Ramesh');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex items-center justify-center p-4 sm:p-6 lg:p-8 antialiased selection:bg-blue-100 selection:text-blue-900">
      <main
        className="w-full max-w-[430px] bg-white rounded-3xl shadow-[0_10px_35px_rgba(15,23,42,0.07)] border border-slate-100/90 px-7 py-8 sm:px-9 sm:py-10"
        data-purpose="auth-card"
      >
        {/* Brand Header */}
        <header className="flex flex-col items-center text-center">
          {/* Orca Logo & Brand Lockup */}
          <div className="flex items-center justify-center mb-5">
            <OrcaLogo size={46} textColor="#0c2340" />
          </div>

          <h1 className="text-[21px] sm:text-[23px] font-bold text-[#0c2340] tracking-tight mb-2">
            {isSignUpMode ? 'Create your ORCA Account' : 'Welcome to ORCA Fishermen'}
          </h1>
          <p className="text-[13.5px] text-[#3b4d61] font-medium leading-relaxed max-w-[280px]">
            Smart marine intelligence for safer and better fishing.
          </p>
        </header>

        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100 text-center">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          {/* Language Selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="language-select"
              className="text-[13px] font-semibold text-[#0c2340]"
            >
              Language
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-600">
                <Globe className="w-5 h-5 stroke-[1.8]" />
              </div>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#dbe2ea] bg-white py-3.5 pl-11 pr-10 text-[14px] font-medium text-[#0c2340] shadow-2xs transition focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="pt">Português</option>
              </select>
              <div className="absolute right-3.5 flex items-center pointer-events-none text-[#0c2340]">
                <svg
                  className="w-4 h-4 stroke-[2.5]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
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
                placeholder="Mobile Number / Username"
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
                placeholder="Password"
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
                Remember me
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
              Forgot?
            </a>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#0b57d0] hover:bg-[#094abb] py-3.5 px-4 text-[15px] font-semibold text-white shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
            >
              {isSignUpMode ? 'Create Account' : 'Login'}
            </button>
          </div>

          {/* Quick Demo Login Option */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-[#0b57d0] hover:bg-slate-50 rounded-xl transition border border-dashed border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Quick Login as Ramesh (Captain, MV Ocean Star)</span>
          </button>
        </form>

        {/* Footer Link */}
        <footer className="mt-6 text-center">
          <p className="text-[13.5px] text-[#3b4d61] font-normal">
            {isSignUpMode ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              onClick={() => setIsSignUpMode(!isSignUpMode)}
              className="font-semibold text-[#0b57d0] hover:underline ml-1 cursor-pointer"
            >
              {isSignUpMode ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </footer>
      </main>
    </div>
  );
};
