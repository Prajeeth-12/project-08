import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name.trim());
      onSuccess?.();
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div className="form-group">
        <label htmlFor="name" className="block text-sm font-semibold text-[#111827] mb-1">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition-all duration-200"
          placeholder="Your full name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email" className="block text-sm font-semibold text-[#111827] mb-1">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition-all duration-200"
          placeholder="e.g., student@stjosephs.ac.in"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="block text-sm font-semibold text-[#111827] mb-1">
          Create Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 pr-12 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition-all duration-200"
            placeholder="Min. 8 characters"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#DC2626] transition-colors duration-200"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#111827] mb-1">
          Confirm Password
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 pr-12 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition-all duration-200"
            placeholder="Re-enter password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#DC2626] transition-colors duration-200"
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold py-3 px-6 rounded-lg shadow-[0_4px_14px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] focus:outline-none focus:ring-2 focus:ring-[#DC2626] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
};

export default RegisterForm; 