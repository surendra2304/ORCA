import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Fish, Shield, ArrowRight, User, Compass } from 'lucide-react';

export const Page3UserDetails: React.FC = () => {
  const { t, userName, setUserName, userRole, setUserRole } = useApp();
  const navigate = useNavigate();

  const [nameInput, setNameInput] = useState(userName || '');
  const [selectedRole, setSelectedRole] = useState<'fisherman' | 'others'>(userRole);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
    }
    setUserRole(selectedRole);
    if (selectedRole === 'fisherman') {
      navigate('/fisherman/voice');
    } else {
      navigate('/others/home');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      {/* Top Header */}
      <div className="w-full max-w-xl flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
            <img src="/orca-logo.jpg" alt="ORCA Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t.appName}</h2>
            <p className="text-xs text-slate-500">Step 2 of 2: Profile & Role</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/language')}
          className="text-xs text-[#20B2AA] font-semibold hover:underline"
        >
          Change Language
        </button>
      </div>

      {/* Main Profile Form */}
      <div className="w-full max-w-xl my-auto py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            {t.userDetailsTitle}
          </h1>
          <p className="text-sm text-slate-600">
            {t.userDetailsSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {t.fullNameLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#20B2AA] focus:ring-2 focus:ring-[#20B2AA]/20 transition-all"
              />
            </div>
          </div>

          {/* Role Selection (Fisherman vs Others) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {t.selectRoleLabel}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fisherman Role Card */}
              <div
                onClick={() => setSelectedRole('fisherman')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedRole === 'fisherman'
                    ? 'border-[#20B2AA] bg-[#e0f5f4] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedRole === 'fisherman' ? 'bg-[#20B2AA] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Fish className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t.roleFisherman}</h3>
                    <span className="text-[10px] uppercase font-bold text-[#20B2AA] tracking-wider">Voice Assisted</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.roleFishermanDesc}
                </p>
              </div>

              {/* Others / Maritime Officers Role Card */}
              <div
                onClick={() => setSelectedRole('others')}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedRole === 'others'
                    ? 'border-[#20B2AA] bg-[#e0f5f4] shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedRole === 'others' ? 'bg-[#20B2AA] text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t.roleOthers}</h3>
                    <span className="text-[10px] uppercase font-bold text-[#20B2AA] tracking-wider">Full Analytics</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.roleOthersDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-center">
            <button
              type="submit"
              className="w-full sm:w-auto min-w-[240px] flex items-center justify-center space-x-2 px-8 py-3.5 bg-[#20B2AA] hover:bg-[#1a9e97] text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 group"
            >
              <span>{t.startExperienceBtn}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400">
        ORCA Marine Intelligence • Ocean Safety System
      </div>
    </div>
  );
};
