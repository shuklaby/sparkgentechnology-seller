import React, { useState } from 'react';
import {
  ShieldCheck,
  Store,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  KeyRound,
  Sparkles,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { AppUser, SellerProfile } from '../types';
import { loginWithEmailPassword, requestPasswordReset } from '../lib/authService';
import { saveActiveSessionUser } from '../lib/dbService';
import { SparkGenLogo } from './SparkGenLogo';

interface AuthModalProps {
  onSuccess: (user: AppUser, seller?: SellerProfile) => void;
  initialRole?: 'ADMIN' | 'SELLER';
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  initialRole = 'SELLER',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'SELLER' | 'ADMIN'>(initialRole);
  const [email, setEmail] = useState(
    initialRole === 'ADMIN' ? 'admin@sparkgentech.com' : ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password flow state
  const [isForgotView, setIsForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const handleTabChange = (role: 'SELLER' | 'ADMIN') => {
    setActiveTab(role);
    setError(null);
    if (role === 'ADMIN') {
      setEmail('admin@sparkgentech.com');
    } else {
      setEmail('');
    }
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginWithEmailPassword(email.trim(), password, activeTab);
      if (response && response.user) {
        saveActiveSessionUser(response.user);
        onSuccess(response.user, response.seller);
      } else {
        throw new Error('Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setForgotSubmitted(true);
      setForgotMsg(res.message);
    } catch (err: any) {
      setError(err.message || 'Unable to process reset request at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Gradient Banner & Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex flex-col items-center text-center space-y-2">
            <div className="bg-white px-4 py-2 rounded-xl shadow-xs border border-white/20 inline-flex items-center justify-center">
              <SparkGenLogo className="h-9 w-auto max-w-[200px]" alt="Spark Gen Technology" />
            </div>
            <div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                {activeTab === 'ADMIN' ? 'Administrator Authentication' : 'Seller & Staff Portal Login'}
              </p>
            </div>
          </div>

          {/* Role Tab Selector (Only if not in forgot password flow) */}
          {!isForgotView && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/10 rounded-xl mt-5 border border-white/10">
              <button
                type="button"
                onClick={() => handleTabChange('SELLER')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'SELLER'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Seller / User
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('ADMIN')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'ADMIN'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* FORGOT PASSWORD VIEW */}
          {isForgotView ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgotView(false);
                  setForgotSubmitted(false);
                  setError(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-medium transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>

              <div>
                <h3 className="font-bold text-sm text-slate-900">Reset your password</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your registered account email and we'll send you recovery instructions.
                </p>
              </div>

              {forgotSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Password Reset Request Received</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    {forgotMsg ||
                      'If an account is associated with this email, password reset instructions have been dispatched securely.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotView(false);
                      setForgotSubmitted(false);
                    }}
                    className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs transition"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Instructions...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Instructions</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email / User ID
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activeTab === 'ADMIN' ? 'admin@sparkgentech.com' : 'seller@company.com'}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotView(true);
                      setForgotEmail(email);
                      setError(null);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg text-xs font-semibold text-white shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                  activeTab === 'ADMIN'
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {activeTab === 'ADMIN' ? 'Admin Console' : 'Seller Portal'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Security Footnote */}
              <div className="pt-2 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  End-to-end encrypted password verification &amp; session tokens
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
