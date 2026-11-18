import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ShieldCheck, Star } from 'lucide-react';

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
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Left Visual Branding Panel — hidden on very small mobile, visible md and up */}
        <div className="hidden md:flex bg-[#93CBE2] p-6 lg:p-8 flex-col justify-between relative overflow-hidden">
          {/* Top Tag */}
          <div className="z-10">
            <span className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-sm text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm">
              <GraduationCap className="w-4 h-4 text-slate-700" />
              Verified University Network
            </span>
          </div>

          {/* Center Card Visual Representation */}
          <div className="my-auto py-4 relative z-10">
            <div className="relative max-w-sm mx-auto">
              {/* Main Photo Card — seamless rounded corners, NO border outline */}
              <div className="rounded-[22px] overflow-hidden shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80"
                  alt="University students studying together"
                  className="w-full h-44 lg:h-52 object-cover block"
                />
              </div>

              {/* Floating Top-Right Mentor Match Badge — subtle rounded corners */}
              <div className="absolute -top-3 -right-4 bg-white text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-[10px] shadow-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E8513D]"></span>
                Mentor Match: 98%
                <span className="text-[#E8513D] text-xs">★</span>
              </div>

              {/* Floating Bottom-Left Priya Sharma Badge — subtle rounded corners */}
              <div className="absolute -bottom-4 -left-4 bg-white py-2 px-3.5 rounded-[10px] shadow-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-[11px] ring-2 ring-[#E8513D] flex-shrink-0">
                  PS
                </div>
                <div className="pr-1 text-left">
                  <p className="text-[12px] font-extrabold text-[#0B1B2B] leading-none mb-0.5">
                    Priya Sharma
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 leading-none">
                    Staff Eng @ Stri
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Heading & Subtitle */}
          <div className="z-10">
            <h2 className="text-xl lg:text-2xl font-extrabold text-[#0F2231] tracking-tight leading-snug">
              Your Next Chapter Starts With a Connection.
            </h2>
            <p className="text-slate-700/90 text-xs mt-1.5 leading-relaxed">
              Connect with graduates, discover mentors, and unlock exclusive career opportunities within your trusted university community.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          {/* Logo Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#0F2231] flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-[#0F2231] tracking-tight">AlumniLink</span>
          </div>

          {/* Header Texts */}
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 mb-5">
            Sign in to reconnect with your university network.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2231] focus:border-transparent transition duration-200"
              />
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2231] focus:border-transparent transition duration-200 pr-10"
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
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#0F2231] focus:ring-[#0F2231]"
                />
                Remember me
              </label>
              <a 
                href="#forgot-password" 
                className="font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Forgot password?
              </a>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#0F2231] hover:bg-[#18354c] text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow transition duration-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Sign In
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </button>
          </form>

          {/* Or Divider */}
          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Or continue with
            </span>
          </div>

          {/* Social Sign-In: Google */}
          <button
            type="button"
            className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
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

