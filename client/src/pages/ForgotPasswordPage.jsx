import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Mail, 
  Eye, 
  EyeOff, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  HelpCircle, 
  CheckCircle2 
} from 'lucide-react';
import recoveryStudentsImg from '../assets/recovery-students.jpg';
import { AlumniLinkLogoMark } from '../components/AlumniLinkLogo';

export default function ForgotPasswordPage() {
  // Step 1: email, Step 2: new password, Step 3: success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendRecovery = (e) => {
    e.preventDefault();
    console.log('Recovery requested for:', email);
    setStep(2);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    console.log('Password reset for:', email, { newPassword });
    setStep(3);
  };

  /* ───────────────── STEP 1: Request Recovery ───────────────── */
  const renderStep1 = () => (
    <>
      {/* Logo + Step Badge */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-85 transition w-fit">
          <div className="w-8 h-8 rounded-xl bg-[#0B1B2B] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0B1B2B]">
            Alumni<span className="text-[#FF7E86]">Link</span>
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 bg-[#F8FAFC] text-slate-700 text-[11px] font-semibold px-3 py-1 rounded-full border border-slate-200/60 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8513D]"></span>
          Step 1 of 2
        </span>
      </div>

      {/* Heading */}
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0B1B2B] tracking-tight">
        Reset Your Password
      </h1>
      <p className="text-slate-500 text-xs mt-1.5 mb-5 leading-relaxed">
        Enter your verified university email or AlumniLink handle. We'll send you a secure verification link and one-time passcode (OTP).
      </p>

      {/* Form */}
      <form onSubmit={handleSendRecovery} className="space-y-4">
        {/* Email Field */}
        <div>
          <label
            htmlFor="recovery-email"
            className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider"
          >
            University or Work Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="recovery-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.morgan@st.knust.edu.gh"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] focus:border-transparent transition duration-200"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            Must match your enrolled institutional Google Workspace or verified alumnus domain.
          </p>
        </div>

        {/* Send Recovery CTA */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-[#0B1B2B] hover:bg-[#152e45] text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition duration-200 flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span>Send Recovery Link & OTP</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
        </button>
      </form>

      {/* Or Divider */}
      <div className="relative my-4 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/80"></div>
        </div>
        <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Or recover via
        </span>
      </div>

      {/* Google Workspace Button */}
      <button
        type="button"
        className="w-full py-2.5 px-4 bg-[#F8FAFC] border border-slate-200/80 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Continue with Google Workspace
      </button>

      {/* Helpdesk Notice */}
      <div className="mt-4 p-3 bg-[#F8FAFC] border border-slate-100 rounded-xl flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
        <p className="text-[10.5px] text-slate-600 leading-relaxed">
          Lost access to your institutional mailbox? Reach out to the Alumni Helpdesk at{' '}
          <a href="mailto:support@alumnilink.org" className="font-semibold text-slate-900 underline hover:text-[#0B1B2B]">
            support@alumnilink.org
          </a>
        </p>
      </div>

      {/* Bottom Link */}
      <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
        <span>Remembered your password?</span>
        <Link to="/login" className="font-bold text-[#0B1B2B] hover:underline">
          Sign In
        </Link>
      </div>
    </>
  );

  /* ───────────────── STEP 2: Set New Password ───────────────── */
  const renderStep2 = () => (
    <>
      {/* Logo + Step Badge */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-85 transition w-fit">
          <div className="w-8 h-8 rounded-xl bg-[#0B1B2B] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#0B1B2B]">
            Alumni<span className="text-[#FF7E86]">Link</span>
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 bg-[#F8FAFC] text-slate-700 text-[11px] font-semibold px-3 py-1 rounded-full border border-slate-200/60 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E8513D]"></span>
          Step 2 of 2
        </span>
      </div>

      {/* Heading */}
      <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#0B1B2B] tracking-tight">
        Create New Password
      </h1>
      <p className="text-slate-500 text-xs mt-1.5 mb-5 leading-relaxed">
        Your identity has been verified. Set a new secure password for your AlumniLink account.
      </p>

      {/* Form */}
      <form onSubmit={handleResetPassword} className="space-y-4">
        {/* New Password */}
        <div>
          <label
            htmlFor="new-password"
            className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider"
          >
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] focus:border-transparent transition duration-200"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Must be at least 8 characters with a mix of letters, numbers & symbols.
          </p>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider"
          >
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200/80 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] focus:border-transparent transition duration-200"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Reset Password CTA */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-[#0B1B2B] hover:bg-[#152e45] text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition duration-200 flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span>Reset Password</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
        </button>
      </form>

      {/* Bottom Link */}
      <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
        <span>Remembered your password?</span>
        <Link to="/login" className="font-bold text-[#0B1B2B] hover:underline">
          Sign In
        </Link>
      </div>
    </>
  );

  /* ───────────────── STEP 3: Success (Matching Emerald Reference) ───────────────── */
  const renderStep3 = () => (
    <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-gradient-to-br from-[#0c2e28] via-[#09221e] to-[#041210] text-white shadow-xl relative overflow-hidden">
      {/* Subtle emerald ambient glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-600/15 rounded-full blur-2xl pointer-events-none"></div>

      {/* Success Icon */}
      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-5 shadow-lg relative z-10">
        <ShieldCheck className="w-7 h-7 text-emerald-400" />
      </div>

      <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug relative z-10 text-white">
        Your Password Changed<br />Successfully
      </h1>
      <p className="text-slate-300 text-xs mt-2.5 mb-7 relative z-10">
        You can now login with your new password
      </p>

      <Link
        to="/login"
        className="w-full py-3 px-6 bg-white hover:bg-slate-100 text-[#0c2e28] font-bold text-xs rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 group relative z-10"
      >
        <span>Back to My Account</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen md:h-screen w-full bg-[#F0F4F8] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans overflow-x-hidden md:overflow-hidden select-none">
      {/* Main Split Card Container */}
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-[1040px] bg-white rounded-[32px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[600px]">

        {/* Left Visual Branding Panel (Sky Blue Panel) */}
        <div className="hidden md:flex bg-[#A8DCF0] p-7 lg:p-9 flex-col justify-between relative overflow-hidden">
          {/* Top Tags */}
          <div className="z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 bg-white text-slate-800 text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-sm">
              <GraduationCap className="w-3.5 h-3.5 text-slate-800" />
              Verified University Network
            </span>
            <span className="w-8 h-8 rounded-full bg-white text-slate-800 text-[11px] font-bold flex items-center justify-center shadow-sm">
              AL
            </span>
          </div>

          {/* Center Card Visual Representation */}
          <div className="my-auto py-4 relative z-10 w-full">
            <div className="bg-white rounded-3xl p-3 shadow-lg max-w-sm mx-auto w-full">
              {/* Photo Container */}
              <div className="relative rounded-2xl overflow-hidden">
                <img
                  src={recoveryStudentsImg}
                  alt="Students collaborating"
                  className="w-full h-52 lg:h-56 object-cover object-[center_20%] block"
                />
                {/* Floating Top-Left Badge: Secure Recovery Mode */}
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm py-1 px-3 rounded-full shadow-md flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E8513D]"></span>
                  <span className="text-[11px] font-bold text-[#0B1B2B]">Secure Recovery Mode</span>
                </div>
              </div>

              {/* Bottom Info inside the Card */}
              <div className="pt-3 pb-1 px-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                    AR
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-[#0B1B2B] leading-tight">
                      Alumni Registry
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 leading-tight">
                      Class of '19 • Verified Alumni
                    </p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border border-[#FF7E86] flex items-center justify-center text-[#FF7E86]">
                  <CheckCircle2 className="w-4 h-4 text-[#FF7E86]" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Heading & Subtitle */}
          <div className="z-10 pt-1">
            <h2 className="text-2xl lg:text-[28px] font-black text-[#0B1B2B] tracking-tight leading-[1.15]">
              Seamless Recovery.<br />Uninterrupted<br />Connection.
            </h2>
            <p className="text-[#1A384C] text-xs font-medium mt-2 leading-relaxed">
              Regain access to your verified alumni profile, mentorship conversations, and exclusive collegiate network with ease.
            </p>
            <div className="flex items-center gap-2 mt-3 text-[#0B1B2B]">
              <Lock className="w-3.5 h-3.5 text-[#0B1B2B]" />
              <span className="text-[10px] font-medium">
                Institutional 256-bit SSO verification
              </span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

      </div>
    </div>
  );
}
