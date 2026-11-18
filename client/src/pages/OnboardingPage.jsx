import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Check, 
  Award, 
  Landmark, 
  ShieldCheck, 
  ChevronDown, 
  Lock, 
  TrendingUp, 
  User,
  CheckCircle2,
  Circle
} from 'lucide-react';

export default function OnboardingPage() {
  const [associationStatus, setAssociationStatus] = useState('student'); // 'student' or 'alumni'
  const [university, setUniversity] = useState('University of Oxford');
  const [faculty, setFaculty] = useState('Mathematical, Physical and Life Sciences');
  const [degree, setDegree] = useState('BSc Computer Science');
  const [yearOfStudy, setYearOfStudy] = useState('Final Year (3rd / 4th Year)');
  const [gradYear, setGradYear] = useState('2025');

  const steps = [
    { num: 1, label: 'Personal Info', completed: true },
    { num: 2, label: 'Academic', active: true },
    { num: 3, label: 'Skills & Interests' },
    { num: 4, label: 'Networking Goals' },
    { num: 5, label: 'Review & Polish' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0B1B2B] font-sans flex flex-col justify-between">
      
      {/* 1. TOP NAVBAR */}
      <header className="bg-white border-b border-slate-100 px-6 sm:px-12 py-3.5 flex items-center justify-between sticky top-0 z-30">
        {/* Brand Logo & Pill */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0B1B2B] flex items-center justify-center text-white">
            {/* Pause/double vertical bars icon from Figma */}
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-white rounded-full"></span>
              <span className="w-1.5 h-4 bg-[#FF7E86] rounded-full"></span>
            </div>
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0B1B2B]">
            Alumni<span className="text-[#FF7E86]">Link</span>
          </span>
          <span className="ml-1 bg-[#E8F5FA] text-[#1E7497] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            Profile Setup
          </span>
        </div>

        {/* Right Nav Progress & User Profile */}
        <div className="flex items-center gap-5 sm:gap-7">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-700">
              <span className="text-slate-400 font-normal">Step 2 of 5 · </span>Academic Background
            </span>
            <div className="w-32 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden flex">
              <div className="w-2/5 h-full bg-[#1E7497] rounded-full"></div>
            </div>
          </div>

          <button 
            type="button"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Save & Exit
          </button>

          <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY WRAPPER */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        
        {/* Header Eyebrow & Title */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 bg-[#E8F5FA] text-[#1E7497] text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7E86]"></span>
            Onboarding Process
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B1B2B] tracking-tight">
            Let's Build Your AlumniLink Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">
            Tell us a little about yourself so we can help you discover the right people, opportunities, and connections across our global network.
          </p>
        </div>

        {/* 3. STEPPER (Horizontal 5-step indicator) */}
        <div className="mb-10 max-w-4xl">
          <div className="relative flex items-center justify-between">
            {/* Step Connector Line */}
            <div className="absolute left-4 right-4 top-4 h-[2px] bg-slate-200 -z-0"></div>

            {steps.map((step) => (
              <div key={step.num} className="relative z-10 flex flex-col items-center">
                {step.completed ? (
                  <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : step.active ? (
                  <div className="w-8 h-8 rounded-full bg-[#FF7E86] text-white flex items-center justify-center text-xs font-extrabold shadow-md ring-4 ring-[#FF7E86]/20">
                    {step.num}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                    {step.num}
                  </div>
                )}
                
                <span className="mt-2 text-[11px] font-medium text-slate-400">
                  Step {step.num}
                </span>
                <span className={`text-xs font-bold ${step.active ? 'text-[#0B1B2B]' : 'text-slate-600'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. TWO COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Profile Status Sidebar */}
          <div className="lg:col-span-4 space-y-5">
            {/* White Status Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
              
              {/* Mini User Profile */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
                  alt="Alex Morgan avatar"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#0B1B2B] truncate">Alex Morgan</p>
                    <span className="inline-flex items-center gap-1 bg-[#E8F5FA] text-[#1E7497] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">alex.m@oxford.alumni.edu</p>
                  <span className="inline-block mt-1 bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                    Final Year CS Student
                  </span>
                </div>
              </div>

              {/* Profile Strength Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-[#0B1B2B] flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-[#FF7E86] inline-block animate-spin"></span>
                    Profile Strength
                  </span>
                  <span className="font-extrabold text-[#FF7E86]">45%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-[45%] h-full bg-[#0B1B2B] rounded-full"></div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Adding degree honors and technical skills unlocks high-match mentorship tracks.
                </p>
              </div>

              {/* Completion Status Checklist */}
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                  Completion Status
                </p>
                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-center gap-2.5 text-slate-700 font-medium">
                    <div className="w-4 h-4 rounded-full bg-[#FF7E86]/15 text-[#FF7E86] flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    Basic contact & identity info
                  </li>
                  <li className="flex items-center gap-2.5 text-[#FF7E86] font-bold">
                    <div className="w-4 h-4 rounded-full bg-[#FF7E86] text-white flex items-center justify-center flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    </div>
                    Academic credentials (In Progress)
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"></div>
                    Skills & specialty topics
                  </li>
                  <li className="flex items-center gap-2.5 text-slate-400">
                    <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"></div>
                    Mentorship & networking goals
                  </li>
                </ul>
              </div>

              {/* Dark Navy Info Box ("Why complete this now?") */}
              <div className="bg-[#0B1B2B] text-white p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <TrendingUp className="w-4 h-4 text-[#FF7E86]" />
                  Why complete this now?
                </div>
                <ul className="space-y-2 text-[11px] text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF7E86] font-bold">•</span>
                    <span><strong>3.8x faster</strong> mentor matching by alumni in software & product</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF7E86] font-bold">•</span>
                    <span>Direct visibility to <strong>1,200+ partner employers</strong> (Google, Spotify, McKinsey)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#FF7E86] font-bold">•</span>
                    <span>Access to exclusive regional alumni meetups & research summits</span>
                  </li>
                </ul>
              </div>

              {/* Privacy Footer */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>You control public visibility. Update details anytime in Account Settings.</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Step 2 Form Card */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100">
            {/* Step 2 Eyebrow & Title */}
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Step 2 of 5
            </span>
            <h2 className="text-2xl font-black text-[#0B1B2B] tracking-tight mt-1">
              Your Academic Background
            </h2>
            <p className="text-slate-500 text-xs mt-1 mb-8">
              Connect your formal credentials to verify your status in our collegiate directory.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              
              {/* Current Association Status (Selectable Cards) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-3">
                  Current Association Status <span className="text-[#FF7E86]">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Student Option */}
                  <div
                    onClick={() => setAssociationStatus('student')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer relative flex items-start gap-3.5 ${
                      associationStatus === 'student'
                        ? 'border-[#0B1B2B] bg-[#EBF7FC]'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#0B1B2B] text-white flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="pr-5">
                      <p className="text-sm font-bold text-[#0B1B2B]">Student</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Currently enrolled in active undergraduate, master's or doctoral coursework.
                      </p>
                    </div>

                    {associationStatus === 'student' && (
                      <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-[#FF7E86] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Alumni / Graduate Option */}
                  <div
                    onClick={() => setAssociationStatus('alumni')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer relative flex items-start gap-3.5 ${
                      associationStatus === 'alumni'
                        ? 'border-[#0B1B2B] bg-[#EBF7FC]'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="pr-5">
                      <p className="text-sm font-bold text-[#0B1B2B]">Alumni / Graduate</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Completed degree programs and currently operating in industry or research.
                      </p>
                    </div>

                    {associationStatus === 'alumni' && (
                      <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-[#FF7E86] text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* University or Collegiate College */}
              <div>
                <label 
                  htmlFor="university"
                  className="block text-xs font-bold text-slate-700 mb-2"
                >
                  University or Collegiate College <span className="text-[#FF7E86]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <input
                    id="university"
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]"
                  />
                </div>
              </div>

              {/* Row 2: Faculty & Degree */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label 
                    htmlFor="faculty"
                    className="block text-xs font-bold text-slate-700 mb-2"
                  >
                    Faculty / Academic Division <span className="text-[#FF7E86]">*</span>
                  </label>
                  <input
                    id="faculty"
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]"
                  />
                </div>

                <div>
                  <label 
                    htmlFor="degree"
                    className="block text-xs font-bold text-slate-700 mb-2"
                  >
                    Degree & Course of Study <span className="text-[#FF7E86]">*</span>
                  </label>
                  <input
                    id="degree"
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B]"
                  />
                </div>
              </div>

              {/* Row 3: Current Year of Study & Expected Graduation Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label 
                    htmlFor="yearOfStudy"
                    className="block text-xs font-bold text-slate-700 mb-2"
                  >
                    Current Year of Study <span className="text-[#FF7E86]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="yearOfStudy"
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] appearance-none bg-white pr-9 cursor-pointer"
                    >
                      <option>1st Year (Freshman)</option>
                      <option>2nd Year (Sophomore)</option>
                      <option>3rd Year (Junior)</option>
                      <option>Final Year (3rd / 4th Year)</option>
                      <option>Master's Program</option>
                      <option>Doctoral Candidate</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label 
                    htmlFor="gradYear"
                    className="block text-xs font-bold text-slate-700 mb-2"
                  >
                    Expected Graduation Year <span className="text-[#FF7E86]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="gradYear"
                      value={gradYear}
                      onChange={(e) => setGradYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B1B2B] appearance-none bg-white pr-9 cursor-pointer"
                    >
                      <option>2024</option>
                      <option>2025</option>
                      <option>2026</option>
                      <option>2027</option>
                      <option>2028</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* SSO Auto Validation Banner */}
              <div className="bg-[#F0F7FA] rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white text-[#1E7497] flex items-center justify-center flex-shrink-0 shadow-sm">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0B1B2B]">
                      Automatic Alumni Verification
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Validated through your active Single Sign-On session via Oxford SSO ID.
                    </p>
                  </div>
                </div>

                <span className="bg-[#D3EEF9] text-[#1E7497] text-[10px] font-extrabold px-3 py-1.5 rounded-lg tracking-wider flex-shrink-0">
                  SSO VALIDATED
                </span>
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  ← Back
                </button>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    Save Draft
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#E8513D] hover:bg-[#d64532] text-white font-bold text-xs shadow-md transition duration-200 cursor-pointer"
                  >
                    Continue →
                  </button>
                </div>
              </div>

            </form>
          </div>

        </div>
      </main>

      {/* 5. FOOTER */}
      <footer className="border-t border-slate-100 px-6 sm:px-12 py-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white mt-12">
        <p>© 2025 AlumniLink Network. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <a href="#support" className="hover:text-slate-600 transition">Support</a>
          <a href="#privacy" className="hover:text-slate-600 transition">Privacy Policy</a>
          <a href="#terms" className="hover:text-slate-600 transition">Terms of Service</a>
        </div>
      </footer>

    </div>
  );
}
