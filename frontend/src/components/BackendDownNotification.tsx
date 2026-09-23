import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Github, Linkedin, Mail, ExternalLink, X } from 'lucide-react';

interface BackendDownNotificationProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackendDownNotification: React.FC<BackendDownNotificationProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop with blur effect */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto max-h-[90vh] overflow-y-auto">
        <div className="bg-white border border-[#E5E7EB] border-b-[3px] border-b-[#DC2626] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl">
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF3C7] transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Header with warning icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] shadow-sm">
              <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] mb-1">
                Project 08 System Notice
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#111827] font-display">Backend Gateway Unreachable</h2>
            </div>
          </div>

          {/* Main message */}
          <div className="space-y-3 mb-5">
            <div className="bg-[#FAFAFA] rounded-lg p-3.5 sm:p-4 border border-[#E5E7EB]">
              <p className="text-[#374151] text-xs sm:text-sm leading-relaxed">
                Our local FastAPI interview runtime is currently initializing or unreachable on port <code className="bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.5 rounded font-mono text-xs">8000</code>. 
                Our architectural pipeline requires this gateway for real-time WebSocket interview agent interactions and Judge0 code execution.
              </p>
            </div>

            <div className="bg-[#FEF3C7]/40 rounded-lg p-3.5 sm:p-4 border border-[#FDE68A]">
              <h4 className="text-[#92400E] font-bold mb-1.5 text-xs sm:text-sm">⚡ Quick Local Resolution:</h4>
              <p className="text-[#78350F] text-xs sm:text-sm leading-relaxed">
                Ensure our backend service is running with <code className="bg-white border border-[#FDE68A] px-1.5 py-0.5 rounded font-mono text-xs">uvicorn main:app --reload</code> inside <code className="bg-white border border-[#FDE68A] px-1.5 py-0.5 rounded font-mono text-xs">integrated-interview-agent/backend</code>.
              </p>
            </div>
          </div>

          {/* Close button */}
          <div className="mt-4 flex gap-3">
            <Button
              onClick={onClose}
              className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white py-2.5 rounded-lg font-bold shadow-[0_4px_14px_rgba(220,38,38,0.3)] transition-all text-sm"
            >
              Acknowledge & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendDownNotification; 