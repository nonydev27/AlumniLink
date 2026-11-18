import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ShieldCheck, Star } from 'lucide-react';
import loginAlumnusImg from '../assets/login-alumnus.jpg';
import { AlumniLinkLogoMark } from '../components/AlumniLinkLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt with:', { email, password, rememberMe });
  };

  return (
    <div className="min-h-screen md:h-screen w-full bg-[#F0F4F8] flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans overflow-x-hidden md:overflow-hidden select-none">
      {/* Main Split Card Container */}
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-[1040px] bg-white rounded-[32px] shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        
        {/* Left Visual Branding Panel (Figma Sky Blue Panel) */}
        <div className="hidden md:flex bg-[#A1D1E6] p-7 lg:p-9 flex-col justify-between relative overflow-hidden">
          {/* Top Tags */}
          <div className="z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 bg-white/95 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm">
              <GraduationCap className="w-3.5 h-3.5 text-slate-800" />
              Verified University Network
            </span>
            <span className="w-7 h-7 rounded-full bg-white/90 text-slate-800 text-[11px] font-bold flex items-center justify-center shadow-sm">
              AU
            </span>
          </div>

          {/* Center Card Visual Representation */}
          <div className="my-auto py-5 relative z-10 w-full">
            <div className="relative w-full">
              {/* Main Photo Card — fills width between left and right tags */}
              <div className="rounded-[22px] overflow-hidden shadow-md w-full">
                <img
                  src={loginAlumnusImg}
                  alt="Alumni working in innovation hub"
                  className="w-full h-56 lg:h-64 object-cover block"
                />
              </div>

              {/* Floating Top-Right Mentor Match Badge */}
              <div className="absolute -top-3.5 right-4 bg-white py-1.5 px-3.5 rounded-[14px] shadow-lg flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-[#FF7E86]/20 flex items-center justify-center">
                  <span className="text-[#FF7E86] text-[10px]">★</span>
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[11px] font-bold text-[#0B1B2B]">Mentor Match</p>
                  <p className="text-[9px] font-semibold text-slate-400">98% Compatibility</p>
                </div>
              </div>

              {/* Floating Bottom-Left Priya Sharma Badge */}
              <div className="absolute -bottom-4 left-4 bg-white py-2 px-3.5 rounded-[14px] shadow-xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-[11px] ring-2 ring-[#FF7E86] flex-shrink-0">
                  PS
                </div>
                <div className="pr-1 text-left">
                  <p className="text-[11px] font-extrabold text-[#0B1B2B] leading-none mb-1">
                    Priya Sharma
                  </p>
                  <p className="text-[9px] font-medium text-slate-500 leading-none">
                    Staff Eng @ Stripe · Class of '17
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Heading & Subtitle */}
          <div className="z-10 pt-1">
            <h2 className="text-2xl lg:text-[27px] font-black text-[#0B1B2B] tracking-tight leading-[1.15]">
              Your Next Chapter Starts With a<br />Connection.
            </h2>
            <p className="text-[#20445C] text-xs font-medium mt-2 leading-relaxed">
              Connect with graduates, discover mentors, and unlock exclusive career opportunities within your trusted university community.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          {/* Logo Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <AlumniLinkLogoMark className="w-7 h-7 text-[#0B1B2B]" />
            <span className="text-xl font-bold tracking-tight text-[#0B1B2B]">
              Alumni<span className="text-[#FF7E86]">Link</span>
            </span>
          </div>

          {/* Header Texts */}
          <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#0B1B2B] tracking-tight">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-xs mt-1 mb-5">
            Sign in to reconnect with your university network.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                University or Work Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@alumni.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] focus:border-transparent transition duration-200"
              />
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] focus:border-transparent transition duration-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Options: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium text-xs">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0B1B2B] focus:ring-[#0B1B2B]"
                />
                Remember me
              </label>
              <a 
                href="#forgot-password" 
                className="font-semibold text-slate-600 hover:text-slate-900 transition text-[11px]"
              >
                Forgot password?
              </a>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#0B1B2B] hover:bg-[#152e45] text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition duration-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Sign In
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </button>
          </form>

          {/* Or Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <span className="relative bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Or continue with
            </span>
          </div>

          {/* Social Sign-In: Google (matching the rounded pill style) */}
          <button
            type="button"
            className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
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
            Continue with Google
          </button>

          {/* Bottom Link to Register */}
          <p className="mt-5 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-slate-900 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

