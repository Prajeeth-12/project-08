import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Sync mode with initialMode prop when it changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-[#E5E7EB] border-b-[3px] border-b-[#EAB308] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#F3F4F6] bg-[#FAFAFA]">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] mb-1">
                Candidate Portal
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-[#111827] font-display">
                {mode === 'login' ? 'Welcome Back' : 'Create Candidate Account'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF3C7] rounded-lg transition-all duration-200"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 bg-white">
            {mode === 'login' ? (
              <LoginForm onSuccess={onClose} />
            ) : (
              <RegisterForm onSuccess={onClose} />
            )}

            <div className="mt-5 sm:mt-6 text-center pt-3 border-t border-[#F3F4F6]">
              <p className="text-[#4B5563] text-sm">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="ml-2 text-[#DC2626] hover:text-[#B91C1C] font-bold transition-colors duration-200"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal; 