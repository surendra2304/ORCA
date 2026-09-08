import React from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { MarineAlert } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: MarineAlert[];
  onMarkAllAsRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0d6efd] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Marine Notifications</h3>
              <p className="text-[11px] text-slate-500 font-medium">INCOIS and Coast Guard updates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-6 space-y-3 max-h-[380px] overflow-y-auto">
          {alerts.map((alert) => {
            const isHigh = alert.severity === 'high';
            const isMed = alert.severity === 'medium';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  isHigh
                    ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                    : isMed
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-blue-50/40 border-blue-100 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isHigh ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    ) : isMed ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#0d6efd]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs leading-tight">{alert.title}</h4>
                      <span className="text-[10px] text-slate-400">{alert.time}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-600 mt-1 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-xs font-semibold text-[#0d6efd] hover:underline cursor-pointer"
          >
            Mark all as read
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
