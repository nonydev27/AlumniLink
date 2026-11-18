import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Briefcase, 
  Users, 
  Compass, 
  ArrowRight, 
  Search, 
  Star, 
  Check, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  Award, 
  Heart,
  ChevronRight,
  TrendingUp,
  MapPin,
  Building2,
  ExternalLink
} from 'lucide-react';
import { AlumniLinkLogoMark } from '../components/AlumniLinkLogo';
import authStudentsImg from '../assets/auth-students.jpg';
import loginAlumnusImg from '../assets/login-alumnus.jpg';

export default function LandingPage() {
  const [quickEmail, setQuickEmail] = useState('');
  const [quickRole, setQuickRole] = useState('student');

  return (
    <div className="min-h-screen bg-white text-[#0B1B2B] font-sans antialiased overflow-x-hidden selection:bg-[#FF7E86]/20">
      
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Left Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <AlumniLinkLogoMark className="w-8 h-8 text-[#0B1B2B] group-hover:scale-105 transition-transform" />
            <div>
              <span className="text-xl font-black tracking-tight text-[#0B1B2B] block leading-none">
                Alumni<span className="text-[#FF7E86]">Link</span>
              </span>
              <span className="text-[8px] font-extrabold text-slate-400 tracking-[0.2em] uppercase block mt-0.5">
                BEYOND GRADUATION
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-xs font-bold text-slate-600 hover:text-[#0B1B2B] transition">
              About
            </a>
            <a href="#mentorship" className="text-xs font-bold text-slate-600 hover:text-[#0B1B2B] transition">
              Mentorship
            </a>
            <a href="#directory" className="text-xs font-bold text-slate-600 hover:text-[#0B1B2B] transition">
              Directory
            </a>
            <a href="#opportunities" className="text-xs font-bold text-slate-600 hover:text-[#0B1B2B] transition">
              Opportunities
            </a>
            <a href="#stories" className="text-xs font-bold text-slate-600 hover:text-[#0B1B2B] transition">
              Stories
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="text-xs font-bold text-[#0B1B2B] hover:text-slate-600 px-3 py-2 transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-[#E8513D] hover:bg-[#d64532] text-white text-xs font-bold shadow-sm hover:shadow transition duration-200"
            >
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-[#F9FBFC] to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#EDF6FA] border border-[#D5E8F3] px-3.5 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#FF7E86]"></span>
                <span className="text-[11px] font-bold text-[#1E7497]">
                  New: Class of 2024 mentor slots are live now →
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black text-[#0B1B2B] tracking-tight leading-[1.08]">
                Your University <br className="hidden sm:block" />
                Network. <span className="text-[#0B1B2B]">Beyond</span> <br className="hidden sm:block" />
                <span className="text-[#FF7E86]">Graduation.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                Find career mentors, build professional connections, and discover exclusive opportunities with fellow graduates and verified alumni.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#E8513D] hover:bg-[#d64532] text-white font-bold text-sm shadow-md hover:shadow-lg transition duration-200 cursor-pointer"
                >
                  Join AlumniLink <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-2xs transition duration-200 cursor-pointer"
                >
                  Explore the Network
                </Link>
              </div>

              {/* Social Proof & Rating */}
              <div className="pt-4 flex items-center gap-4">
                <div className="flex -space-x-2 overflow-hidden">
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                    alt="Alumnus"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
                    alt="Alumnus"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
                    alt="Alumnus"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="text-xs font-black text-[#0B1B2B] ml-1">4.9/5</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Trusted by 10,000+ students & alumni
                  </p>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-100 max-w-lg">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#0B1B2B]">120+</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Partner Universities</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#0B1B2B]">8.4k</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Active Mentors</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#0B1B2B]">32k</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Connections Made</p>
                </div>
              </div>

            </div>

            {/* Right Visual Image Card with Floating Badges */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Main Hero Photo Container */}
                <div className="relative rounded-[32px] overflow-hidden shadow-2xl bg-slate-100 border border-slate-100">
                  <img
                    src={authStudentsImg}
                    alt="University students and alumni collaborating"
                    className="w-full h-[400px] sm:h-[480px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B]/40 via-transparent to-transparent"></div>
                </div>

                {/* Floating Badge 1: Top-Right Mentor Match */}
                <div className="absolute -top-4 right-4 sm:-right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 z-20">
                  <div className="w-10 h-10 rounded-full bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center font-bold text-xs">
                    LM
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1E7497] bg-[#EDF6FA] px-1.5 py-0.5 rounded">
                        Mentor Match
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">98% Match</span>
                    </div>
                    <p className="text-xs font-bold text-[#0B1B2B] mt-0.5">Lauren Miller</p>
                    <p className="text-[10px] text-slate-400">Staff Data Scientist @ Google</p>
                  </div>
                </div>

                {/* Floating Badge 2: Middle-Left Session Confirmed */}
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 sm:-left-8 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 z-20">
                  <div className="w-9 h-9 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-xs">
                    MB
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <p className="text-xs font-bold text-[#0B1B2B]">Marcus Boateng</p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Accepted 1:1 Mentorship Session</p>
                  </div>
                </div>

                {/* Floating Badge 3: Bottom-Left Hired Alumnus */}
                <div className="absolute -bottom-4 left-6 sm:left-12 bg-white/95 backdrop-blur-md py-2.5 px-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 z-20">
                  <div className="w-8 h-8 rounded-full bg-[#FFF0F2] text-[#FF7E86] flex items-center justify-center font-bold text-xs">
                    CE
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0B1B2B]">Christian Egbal</p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Hired at Paystack · Junior Full-Stack
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. LOGOS SOCIAL PROOF RIBBON */}
      <section className="py-10 border-y border-slate-100 bg-[#FAFCFD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-6">
            Alumni Working At Top Organizations & Tech Companies
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all">
            <span className="text-lg font-black tracking-tight text-[#0B1B2B]">Google</span>
            <span className="text-lg font-black tracking-tight text-[#0B1B2B]">Spotify</span>
            <span className="text-lg font-black tracking-tight text-[#0B1B2B]">McKinsey & Co.</span>
            <span className="text-lg font-black tracking-tight text-[#0B1B2B]">Paystack</span>
            <span className="text-lg font-black tracking-tight text-[#0B1B2B]">Flutterwave</span>
            <span className="text-lg font-black tracking-tight text-[#0B1B2B]">Microsoft</span>
          </div>
        </div>
      </section>

      {/* 4. FAST SIGN-UP NAVY VALUE BANNER */}
      <section id="about" className="py-20 bg-[#0B1B2B] text-white relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1E7497]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#FF7E86]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left pitch */}
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#FF7E86]"></span>
                START BUILDING CONNECTIONS
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.15]">
                Your next opportunity starts with a connection.
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
                The fastest-growing network of students and graduates helping each other succeed in software, engineering, fintech, product, and research.
              </p>

              <div className="pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#E8513D] hover:bg-[#d64532] text-white font-bold text-xs uppercase tracking-wider shadow-lg transition"
                >
                  Claim Your Free Account <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Value check items */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800 text-xs text-slate-300 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF7E86]" />
                  <span>100% Free for Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF7E86]" />
                  <span>Verified Alumni Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF7E86]" />
                  <span>Direct Mentorship</span>
                </div>
              </div>
            </div>

            {/* Right Interactive Quick Profile Widget */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 text-[#0B1B2B] shadow-2xl max-w-lg mx-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-[#0B1B2B]">Create your profile</h3>
                    <p className="text-xs text-slate-400">Takes less than 60 seconds</p>
                  </div>
                  <span className="bg-[#EDF6FA] text-[#1E7497] text-[10px] font-extrabold px-2.5 py-1 rounded-full">
                    Step 1 of 2
                  </span>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.location.href = '/register';
                  }}
                  className="mt-5 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name</label>
                      <input 
                        type="text" 
                        placeholder="Alex" 
                        defaultValue="Alex"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name</label>
                      <input 
                        type="text" 
                        placeholder="Morgan" 
                        defaultValue="Morgan"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">University Email</label>
                    <input 
                      type="email" 
                      placeholder="alex.m@alumni.edu" 
                      defaultValue="alex.m@oxford.alumni.edu"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Field / Degree</label>
                    <select className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] bg-white">
                      <option>BSc Computer Science</option>
                      <option>BSc Electrical Engineering</option>
                      <option>BSc Business Administration</option>
                      <option>BSc Data Science & AI</option>
                    </select>
                  </div>

                  {/* Association Status Radios */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-2">Current Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickRole('student')}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition cursor-pointer ${
                          quickRole === 'student'
                            ? 'bg-[#0B1B2B] text-white border-[#0B1B2B]'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickRole('recent')}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition cursor-pointer ${
                          quickRole === 'recent'
                            ? 'bg-[#0B1B2B] text-white border-[#0B1B2B]'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Recent Grad
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickRole('alumni')}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition cursor-pointer ${
                          quickRole === 'alumni'
                            ? 'bg-[#0B1B2B] text-white border-[#0B1B2B]'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        Alumnus
                      </button>
                    </div>
                  </div>

                  <Link
                    to="/register"
                    className="w-full py-3 rounded-xl bg-[#0B1B2B] hover:bg-[#152e45] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                  >
                    Continue to Profile →
                  </Link>

                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    Verified through active university SSO credentials
                  </p>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. "EVERYTHING YOU NEED" FEATURE BENTO GRID */}
      <section id="directory" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF7E86] block mb-2">
              WHAT WE OFFER
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0B1B2B] tracking-tight">
              Everything you need to grow, in one place.
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-3">
              From finding your next career mentor to landing job referrals — the platform built exclusively around your university community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Bento Card 1: Find a Mentor */}
            <div className="bg-[#0B1B2B] text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-lg relative overflow-hidden group">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-5">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold tracking-tight mb-2">Find a Mentor</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Match with experienced alumni in your field who offer 1:1 guidance, resume reviews, and mock interviews.
                </p>
              </div>

              {/* Internal Mini Mockup */}
              <div className="mt-6 bg-white/10 rounded-2xl p-3 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-extrabold bg-[#FF7E86] text-white px-2 py-0.5 rounded">
                    Top Match
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold">98% Compatibility</span>
                </div>
                <p className="text-[11px] font-bold text-white">Engineering & AI</p>
                <p className="text-[9px] text-slate-400">Available for 1:1 sessions</p>
              </div>
            </div>

            {/* Bento Card 2: Alumni Directory */}
            <div className="bg-[#F8FAFC] rounded-3xl p-6 sm:p-7 flex flex-col justify-between border border-slate-100 shadow-2xs hover:border-slate-200 transition">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center mb-5">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1B2B] tracking-tight mb-2">Alumni Directory</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Discover graduates across 50+ countries. Filter by graduation year, current company, role, or hometown.
                </p>
              </div>

              {/* Mini Mockup */}
              <div className="mt-6 bg-white rounded-2xl p-3 border border-slate-200/80">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                  <Search className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Filter by company, city...</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-[#1E7497]">
                  <span>2,400+ Verified Alumni</span>
                  <span>View All →</span>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Career Opportunities */}
            <div className="bg-[#F8FAFC] rounded-3xl p-6 sm:p-7 flex flex-col justify-between border border-slate-100 shadow-2xs hover:border-slate-200 transition">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-2xl bg-[#FFF0F2] text-[#FF7E86] flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="bg-[#FF7E86] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    NEW
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0B1B2B] tracking-tight mb-2">Career Opportunities</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Access exclusive internships, graduate schemes, and junior positions posted directly by alumni hiring for their teams.
                </p>
              </div>

              {/* Mini Mockup */}
              <div className="mt-6 bg-white rounded-2xl p-3 border border-slate-200/80">
                <p className="text-[11px] font-bold text-[#0B1B2B]">Junior Cloud Associate</p>
                <p className="text-[10px] text-slate-500 font-medium">Paystack Finance · Accra</p>
                <span className="inline-block mt-1 text-[9px] font-extrabold text-[#FF7E86]">Closes in 4 days</span>
              </div>
            </div>

            {/* Bento Card 4: Meaningful Connections */}
            <div className="bg-gradient-to-br from-[#FFF0F2] to-[#FFE6E8] rounded-3xl p-6 sm:p-7 flex flex-col justify-between border border-[#FFD0D4] shadow-2xs">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white text-[#FF7E86] flex items-center justify-center mb-5 shadow-xs">
                  <Heart className="w-5 h-5 fill-[#FF7E86]" />
                </div>
                <h3 className="text-lg font-bold text-[#0B1B2B] tracking-tight mb-2">Meaningful Connections</h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Direct messaging, group mixers, and virtual meetups that keep your KNUST community active long after graduation.
                </p>
              </div>

              {/* Mini Mockup */}
              <div className="mt-6 bg-white rounded-2xl p-3 shadow-xs">
                <p className="text-[10px] font-bold text-[#0B1B2B]">“Would love to connect on your capstone!”</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Kwame Mensah · 12m ago</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. HOW ALUMNILINK WORKS (3-STEP PROCESS) */}
      <section className="py-20 bg-[#F8FAFC] border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF7E86] block mb-2">
              SIMPLE PROCESS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0B1B2B] tracking-tight">
              From sign-up to hired in three steps.
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-3">
              Three easy steps to connect with a mentor and kickstart your career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Step 1 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="w-10 h-10 rounded-2xl bg-[#0B1B2B] text-white flex items-center justify-center font-black text-sm mb-6">
                  01
                </span>
                <h3 className="text-lg font-extrabold text-[#0B1B2B] mb-2">Create Your Account</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Verify your university credentials with your student or alumni email and build your customized academic profile.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                SSO Verification Included
              </div>
            </div>

            {/* Step 2 (Highlighted Active Card) */}
            <div className="bg-[#0B1B2B] text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <span className="w-10 h-10 rounded-2xl bg-[#FF7E86] text-white flex items-center justify-center font-black text-sm mb-6">
                  02
                </span>
                <h3 className="text-lg font-extrabold text-white mb-2">Discover Alumni & Mentors</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Search by industry, company, or graduation year and request 1:1 mentorship, portfolio reviews, or referrals.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] font-bold text-[#FF7E86] relative z-10">
                8,400+ Active Mentors
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="w-10 h-10 rounded-2xl bg-[#0B1B2B] text-white flex items-center justify-center font-black text-sm mb-6">
                  03
                </span>
                <h3 className="text-lg font-extrabold text-[#0B1B2B] mb-2">Connect, Learn and Grow</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Book sessions, attend virtual mixers, and unlock referrals for top jobs directly through your network.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] font-bold text-slate-400">
                Direct Career Placement
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. FEATURED MENTORS GRID */}
      <section id="mentorship" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF7E86] block mb-2">
                MEET OUR MENTORS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#0B1B2B] tracking-tight">
                Learn from people who were once where you are.
              </h2>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B1B2B] hover:text-[#FF7E86] transition flex-shrink-0"
            >
              Browse all 8,400+ mentors <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3 Mentor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Mentor 1 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="relative mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80"
                    alt="Ama Serwah"
                    className="w-full h-48 rounded-2xl object-cover"
                  />
                  <span className="absolute top-3 right-3 bg-white/95 text-[#0B1B2B] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    Top Mentor
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#0B1B2B]">Ama Serwah</h3>
                <p className="text-xs text-slate-500 font-semibold">Product Lead @ Spotify · CS '18</p>

                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="bg-[#EDF6FA] text-[#1E7497] text-[10px] font-bold px-2 py-0.5 rounded">
                    Product Mgmt
                  </span>
                  <span className="bg-[#EDF6FA] text-[#1E7497] text-[10px] font-bold px-2 py-0.5 rounded">
                    Fintech
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  “I love helping current students navigate career transitions and master PM interviews.”
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/register"
                  className="w-full py-2.5 rounded-xl bg-[#0B1B2B] hover:bg-[#152e45] text-white text-xs font-bold text-center transition"
                >
                  Connect
                </Link>
              </div>
            </div>

            {/* Mentor 2 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="relative mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                    alt="Kwame Mensah"
                    className="w-full h-48 rounded-2xl object-cover"
                  />
                  <span className="absolute top-3 right-3 bg-white/95 text-[#0B1B2B] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    Verified Alumnus
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#0B1B2B]">Kwame Mensah</h3>
                <p className="text-xs text-slate-500 font-semibold">Senior Full-Stack @ Paystack · CS '19</p>

                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="bg-[#EDF6FA] text-[#1E7497] text-[10px] font-bold px-2 py-0.5 rounded">
                    Full-Stack
                  </span>
                  <span className="bg-[#EDF6FA] text-[#1E7497] text-[10px] font-bold px-2 py-0.5 rounded">
                    System Design
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  “Happy to review final year projects and share engineering hiring tips for fast-growth startups.”
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/register"
                  className="w-full py-2.5 rounded-xl bg-[#0B1B2B] hover:bg-[#152e45] text-white text-xs font-bold text-center transition"
                >
                  Connect
                </Link>
              </div>
            </div>

            {/* Mentor 3 */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="relative mb-4">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
                    alt="Dr. Kofi Boateng"
                    className="w-full h-48 rounded-2xl object-cover"
                  />
                  <span className="absolute top-3 right-3 bg-white/95 text-[#0B1B2B] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    Research Fellow
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#0B1B2B]">Dr. Kofi Boateng</h3>
                <p className="text-xs text-slate-500 font-semibold">ML Researcher @ Google Research · '17</p>

                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  <span className="bg-[#EDF6FA] text-[#1E7497] text-[10px] font-bold px-2 py-0.5 rounded">
                    Machine Learning
                  </span>
                  <span className="bg-[#EDF6FA] text-[#1E7497] text-[10px] font-bold px-2 py-0.5 rounded">
                    NLP
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  “Guiding undergraduates into AI research fellowships and graduate school applications abroad.”
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/register"
                  className="w-full py-2.5 rounded-xl bg-[#0B1B2B] hover:bg-[#152e45] text-white text-xs font-bold text-center transition"
                >
                  Connect
                </Link>
              </div>
            </div>

          </div>

          {/* Testimonial Banner */}
          <div className="mt-12 bg-[#0B1B2B] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white text-[#0B1B2B] font-bold flex items-center justify-center flex-shrink-0">
                AM
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-200 italic leading-relaxed">
                  “AlumniLink helped me connect with an alumnus at Paystack who referred me for my current role within 3 weeks of graduating.”
                </p>
                <p className="text-xs font-extrabold text-white mt-1">
                  Alex Morgan · <span className="text-slate-400 font-medium">Final Year CS, KNUST (Class of '24)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-amber-400 flex-shrink-0">
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>

        </div>
      </section>

      {/* 8. BOTTOM SKY BLUE CTA BANNER */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#EDF6FA] border border-[#D5E8F3] rounded-[36px] p-8 sm:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xs">
            
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-black text-[#0B1B2B] tracking-tight">
                Your network doesn't end at graduation.
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-xl">
                Stay connected, discover opportunities, and help the next generation succeed. Join thousands of your peers today.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/register"
                  className="px-6 py-3.5 rounded-xl bg-[#0B1B2B] hover:bg-[#152e45] text-white font-bold text-xs shadow-md text-center transition"
                >
                  Join AlumniLink Today →
                </Link>
                <Link
                  to="/login"
                  className="px-6 py-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs text-center transition"
                >
                  Explore Directory
                </Link>
              </div>

              <p className="text-[11px] text-slate-400 font-semibold pt-1">
                ✓ Free forever for university students.
              </p>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-white">
                <img
                  src={loginAlumnusImg}
                  alt="Alumni team"
                  className="w-full h-56 object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-[#E8513D] text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-md">
                  92% reported faster job placement
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 9. COLLEGIATE FOOTER */}
      <footer className="bg-[#0B1B2B] text-white pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            
            {/* Col 1: Brand & Bio */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <AlumniLinkLogoMark className="w-8 h-8 text-white" />
                <span className="text-xl font-black tracking-tight text-white">
                  Alumni<span className="text-[#FF7E86]">Link</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                The student & alumni platform built for lifelong professional growth, university mentorship, and trusted collegiate connections.
              </p>
              <div className="flex items-center gap-3 pt-2 text-slate-400 text-xs">
                <span className="hover:text-white cursor-pointer transition">Twitter</span>
                <span>·</span>
                <span className="hover:text-white cursor-pointer transition">LinkedIn</span>
                <span>·</span>
                <span className="hover:text-white cursor-pointer transition">GitHub</span>
              </div>
            </div>

            {/* Col 2: Platform */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Platform</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><Link to="/register" className="hover:text-white transition">Find Mentors</Link></li>
                <li><Link to="/register" className="hover:text-white transition">Alumni Directory</Link></li>
                <li><Link to="/register" className="hover:text-white transition">Career Board</Link></li>
                <li><Link to="/register" className="hover:text-white transition">Virtual Mixers</Link></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Company</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><a href="#about" className="hover:text-white transition">About Us</a></li>
                <li><a href="#stories" className="hover:text-white transition">Success Stories</a></li>
                <li><a href="#mentorship" className="hover:text-white transition">Partner Universities</a></li>
                <li><a href="#about" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>

            {/* Col 4: Legal & Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Legal & Support</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><a href="#privacy" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#terms" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#support" className="hover:text-white transition">Support Center</a></li>
                <li><a href="#security" className="hover:text-white transition">SSO Security</a></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
            <p>© 2025 AlumniLink Network. Built for KNUST & Global Alumni Community.</p>
            <div className="flex items-center gap-6">
              <a href="#privacy" className="hover:text-white transition">Privacy</a>
              <a href="#terms" className="hover:text-white transition">Terms</a>
              <a href="#cookies" className="hover:text-white transition">Cookies</a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
