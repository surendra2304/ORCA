import React, { useState } from 'react';
import { X, Headset, Phone, Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setMessage('');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0d6efd] flex items-center justify-center">
              <Headset className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">ORCA 24/7 Support</h3>
              <p className="text-[11px] text-slate-500 font-medium">Marine Assistance & Technical Help</p>
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {sent ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-slate-900 text-sm">Message Transmitted!</h4>
              <p className="text-xs text-slate-500">Our coastal radio desk will contact your vessel shortly.</p>
            </div>
          ) : (
            <>
              {/* Emergency Coastal Hotlines */}
              <div className="space-y-2">
                <a
                  href="tel:1554"
                  className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Coast Guard Helpline</span>
                      <span className="text-[10px] text-slate-500">Toll Free Maritime Distress: 1554</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-white px-2 py-0.5 rounded shadow-2xs">
                    1554
                  </span>
                </a>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">Harbour Desk Support</span>
                      <span className="text-[10px] text-slate-500">support@orca-fishermen.in</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Contact Form */}
              <form onSubmit={handleSend} className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Send a message to Support Desk:
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Need navigation help, reporting telemetry glitch, or asking for weather clarification..."
                  rows={3}
                  className="w-full text-xs text-slate-800 bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0d6efd] hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
