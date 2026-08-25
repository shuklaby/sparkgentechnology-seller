import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  ShieldCheck,
  Smartphone,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  Store,
  RotateCcw
} from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { syncAuthenticatedUser } from '../lib/dbService';
import { ADMIN_PHONE_NUMBER } from '../data/mockDemoData';
import { AppUser, SellerProfile } from '../types';

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
  const [phoneNumber, setPhoneNumber] = useState(
    initialRole === 'ADMIN' ? ADMIN_PHONE_NUMBER : ''
  );
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const timerRef = useRef<any>(null);

  // Initialize reCAPTCHA verifier once on mount & clean up on unmount
  useEffect(() => {
    try {
      if (!recaptchaVerifierRef.current && isFirebaseConfigured) {
        const container = document.getElementById('recaptcha-container');
        if (container) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved callback
            },
            'expired-callback': () => {
              setError('reCAPTCHA verification expired. Please submit your phone number again.');
            },
          });
        }
      }
    } catch (err) {
      console.warn('RecaptchaVerifier setup warning:', err);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.warn('Recaptcha cleanup warning on unmount:', e);
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Countdown for OTP resend
  useEffect(() => {
    if (resendSeconds > 0) {
      timerRef.current = setInterval(() => {
        setResendSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendSeconds]);

  const getOrCreateRecaptcha = (): RecaptchaVerifier => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const container = document.getElementById('recaptcha-container');
    if (!container) {
      throw new Error('reCAPTCHA container element not found in DOM.');
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        setError('reCAPTCHA verification expired. Please submit your phone number again.');
      },
    });

    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const formatPhoneNumber = (raw: string): string => {
    const clean = raw.replace(/\D/g, '');
    if (clean.length === 10) {
      return `+91${clean}`;
    }
    if (clean.startsWith('91') && clean.length === 12) {
      return `+${clean}`;
    }
    if (raw.startsWith('+')) {
      return `+${clean}`;
    }
    return `+91${clean}`;
  };

  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  const getFirebaseErrorMessage = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
      setIsOperationNotAllowed(true);
      return 'Phone OTP authentication is not enabled in Firebase. Enable Phone Authentication in Firebase Console → Authentication → Sign-in method.';
    }
    if (code === 'auth/invalid-phone-number') {
      return 'The phone number format is invalid. Please enter a valid 10-digit mobile number.';
    }
    if (code === 'auth/invalid-verification-code') {
      return 'Invalid OTP. The code you entered does not match the SMS sent by Firebase.';
    }
    if (code === 'auth/code-expired') {
      return 'This verification code has expired. Please click Resend OTP for a fresh code.';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please wait a few moments before requesting another OTP.';
    }
    if (code === 'auth/quota-exceeded') {
      return 'SMS quota exceeded for today. Please try again later.';
    }
    if (code === 'auth/captcha-check-failed') {
      return 'reCAPTCHA verification failed. Please refresh the page and try again.';
    }
    if (code === 'auth/unauthorized-domain' || code === 'auth/app-not-authorized') {
      return 'Application domain is not authorized in Firebase. Add current domain to Firebase Console → Authentication → Settings → Authorized domains.';
    }
    return msg || 'Authentication error occurred. Please verify your connection and try again.';
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsOperationNotAllowed(false);

    if (!isFirebaseConfigured) {
      setError(
        'Firebase Authentication is not configured. Please ensure Firebase Phone Authentication is enabled in the Firebase Console.'
      );
      return;
    }

    const clean = phoneNumber.replace(/\D/g, '');
    if (clean.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    try {
      const verifier = getOrCreateRecaptcha();
      const formatted = formatPhoneNumber(phoneNumber);

      const confirmation = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmationResult(confirmation);
      setStep('OTP');
      setResendSeconds(30);
      setSuccessMsg(`Verification code sent to ${formatted} via SMS.`);
    } catch (err: any) {
      console.error('Firebase Phone Auth send error:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || isLoading) return;
    setError(null);
    setIsOperationNotAllowed(false);
    setIsLoading(true);

    try {
      const verifier = getOrCreateRecaptcha();
      const formatted = formatPhoneNumber(phoneNumber);
      const confirmation = await signInWithPhoneNumber(auth, formatted, verifier);
      setConfirmationResult(confirmation);
      setResendSeconds(30);
      setSuccessMsg(`A new OTP has been sent to ${formatted}.`);
    } catch (err: any) {
      console.error('Firebase Phone Auth resend error:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsOperationNotAllowed(false);

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the complete 6-digit OTP received via SMS.');
      return;
    }

    if (!confirmationResult) {
      setError('Verification session expired. Please request a new OTP.');
      setStep('PHONE');
      return;
    }

    setIsLoading(true);

    try {
      // Confirm with real Firebase Auth ConfirmationResult
      const credential = await confirmationResult.confirm(cleanOtp);
      const firebaseUser = credential.user;

      if (!firebaseUser) {
        throw new Error('Firebase user confirmation failed. No valid user token received.');
      }

      // Sync and verify user role strictly in Firestore
      const { user, seller } = await syncAuthenticatedUser(firebaseUser, activeTab);
      onSuccess(user, seller);
    } catch (err: any) {
      console.error('Firebase Phone Auth verification error:', err);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchTab = (role: 'SELLER' | 'ADMIN') => {
    setActiveTab(role);
    setStep('PHONE');
    setError(null);
    setSuccessMsg(null);
    setIsOperationNotAllowed(false);
    setOtp('');
    if (role === 'ADMIN') {
      setPhoneNumber(ADMIN_PHONE_NUMBER);
    } else {
      setPhoneNumber('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden transition-all animate-in fade-in zoom-in-95">
        {/* Modal Top Header */}
        <div className="bg-white px-6 pt-6 pb-4 border-b border-slate-100 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-tight">Catalogo Platform</h3>
                <p className="text-xs text-slate-500">Firebase Phone Authentication</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Switcher Pills */}
          <div className="mt-4 grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              id="role-seller-tab-btn"
              type="button"
              onClick={() => handleSwitchTab('SELLER')}
              className={`py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition ${
                activeTab === 'SELLER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Seller Portal
            </button>
            <button
              id="role-admin-tab-btn"
              type="button"
              onClick={() => handleSwitchTab('ADMIN')}
              className={`py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition ${
                activeTab === 'ADMIN'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Master
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-6">
          <div className="mb-5">
            <h4 className="text-sm font-bold text-slate-900">
              {activeTab === 'ADMIN' ? 'Platform Administrator Sign-In' : 'Seller Portal Sign-In'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'ADMIN'
                ? 'Authorized admin gateway verified strictly via Firebase Auth & Firestore role checks.'
                : 'Manage product catalog, visual website designer, custom domain & SEO.'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 space-y-2">
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>

              {isOperationNotAllowed && (
                <div className="p-3 rounded-lg bg-slate-900 text-slate-200 text-[11px] space-y-2 border border-slate-700">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" /> Firebase Console Setup Required:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 font-mono">
                    <li>Open <strong className="text-white">Firebase Console</strong></li>
                    <li>Navigate to <strong className="text-white">Authentication → Sign-in method</strong></li>
                    <li>Click <strong className="text-white">Phone</strong> and toggle <strong className="text-white">Enable</strong></li>
                    <li>Add current host to <strong className="text-white">Settings → Authorized domains</strong></li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMsg && !error && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number (Real SMS OTP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
                    +91
                  </div>
                  <input
                    id="auth-phone-input"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 7897752217"
                    className="w-full pl-12 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
                </div>
              </div>

              {activeTab === 'ADMIN' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Lock className="w-3.5 h-3.5" /> Database Role Verification
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Admin privileges require real Firebase SMS authentication and a verified{' '}
                    <span className="font-mono font-bold text-slate-900">ADMIN</span> role record in Firestore.
                  </p>
                </div>
              )}

              <button
                id="send-otp-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Send Real SMS OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  Code sent to <span className="font-semibold text-slate-900">{formatPhoneNumber(phoneNumber)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('PHONE');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-blue-600 hover:underline font-semibold text-xs"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Enter 6-Digit SMS Verification Code
                </label>
                <div className="relative">
                  <input
                    id="auth-otp-input"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-center tracking-widest text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    required
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendSeconds > 0 || isLoading}
                  className="text-blue-600 hover:text-blue-800 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : 'Resend OTP'}
                </button>
              </div>

              <button
                id="verify-otp-submit-btn"
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Verify & Authenticate
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Dedicated Container for Firebase reCAPTCHA */}
          <div id="recaptcha-container" className="mt-2" />
        </div>
      </div>
    </div>
  );
};
