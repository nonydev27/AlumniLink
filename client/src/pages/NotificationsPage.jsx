import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Search, 
  CheckCheck, 
  GraduationCap, 
  Briefcase, 
  Users, 
  MessageSquare, 
  User, 
  Settings, 
  Calendar, 
  Eye, 
  MoreVertical, 
  SlidersHorizontal,
  Compass,
  ArrowRight,
  LogOut,
  Sparkles,
  Inbox,
  UserPlus,
  Clock,
  Reply,
  FileText,
  Play,
  ChevronsUpDown,
  Filter
} from 'lucide-react';

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unread', 'connections', 'mentorship', 'messages', 'opportunities'
  
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      category: 'connections',
      unread: true,
      timeframe: 'today',
      name: 'Kwame Mensah',
      badge: "KNUST CS '19",
      actionText: 'sent you a connection request',
      message: '“Hi Alex, noticed your final year capstone on distributed consensus systems! Would love to link up.”',
      time: '12m ago',
      roleSubtitle: 'Senior Full-Stack at Paystack',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      subBadge: 'student',
      actions: ['accept', 'decline']
    },
    {
      id: 2,
      category: 'mentorship',
      unread: true,
      timeframe: 'today',
      title: 'Mentorship Session Confirmed',
      messageTextLead: 'Nana Ama Serwah',
      messageTextFollow: 'accepted your 1:1 request for',
      messageHighlight: 'Thursday, Nov 21 at 4:30 PM GMT',
      messageTrailing: '(Virtual Room).',
      time: '1h ago',
      roleSubtitle: 'Legal Counsel & Tech Policy',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      subBadge: 'mentor',
      actions: ['calendar', 'view_details']
    },
    {
      id: 3,
      category: 'messages',
      unread: true,
      timeframe: 'today',
      name: 'Kofi Boateng',
      actionText: 'sent you a direct message',
      message: '“I just uploaded the annotated African NLP preprint we talked about during the seminar...”',
      time: '3h ago',
      roleSubtitle: 'ML Researcher at Google Research Ghana',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      subBadge: 'mentor',
      actions: ['reply']
    },
    {
      id: 4,
      category: 'opportunities',
      unread: true,
      timeframe: 'today',
      isIcon: true,
      iconType: 'briefcase',
      priority: true,
      title: 'New Endorsed Opportunity',
      opportunityLead: 'Paystack Finance opened applications for',
      opportunityPosition: '“Cloud & DevOps Associate (Junior)”',
      opportunityEndorsed: ', endorsed by Kwame Mensah (\'19).',
      time: '5h ago',
      urgentText: 'Closes in 4 days',
      actions: ['view_position']
    },
    {
      id: 5,
      category: 'profile',
      unread: false,
      timeframe: 'today',
      isIcon: true,
      iconType: 'eye',
      title: 'Profile Discovery',
      message: 'Your profile was viewed by a Senior Technical Recruiter at Flutterwave and 3 other alumni in Accra this week.',
      time: '7h ago',
      roleSubtitle: 'KNUST CS Network',
      actions: ['see_analytics']
    },
    {
      id: 6,
      category: 'mentorship',
      unread: false,
      timeframe: 'earlier',
      name: 'Akosua Agyeman',
      actionText: 'submitted session follow-up notes',
      message: '“Portfolio feedback and product framework resources uploaded for your APM application.”',
      time: 'Yesterday at 3:15 PM',
      roleSubtitle: 'Fintech Product Lead',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&q=80',
      subBadge: 'mentor',
      actions: ['read_notes']
    },
    {
      id: 7,
      category: 'connections',
      unread: false,
      timeframe: 'earlier',
      name: 'Mark Dunham',
      actionText: 'accepted your connection request',
      message: 'You are now connected with Mark Dunham (Senior Technical Program Manager).',
      time: 'Yesterday at 11:20 AM',
      roleSubtitle: '16 mutual alumni',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      subBadge: 'connection',
      actions: ['send_message']
    },
    {
      id: 8,
      category: 'opportunities',
      unread: false,
      timeframe: 'earlier',
      isIcon: true,
      iconType: 'calendar',
      title: 'KNUST Alumni Annual Tech Mixer 2024',
      tag: 'Kumasi & Accra',
      message: 'Early bird registration is officially live for current finalists and recent graduates. Connect with 200+ industry leads.',
      time: '3 days ago',
      roleSubtitle: 'Organized by KNUST CoS Alumni Chapter',
      actions: ['register_now']
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return n.unread;
    return n.category === activeTab;
  });

  const todayList = filteredNotifications.filter(n => n.timeframe === 'today');
  const earlierList = filteredNotifications.filter(n => n.timeframe === 'earlier');
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1B2B] font-sans flex antialiased">
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-5 sticky top-0 h-screen hidden lg:flex flex-shrink-0 z-30">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 px-2">
            {/* AlumniLink Connected Nodes Icon */}
            <div className="w-8 h-8 flex items-center justify-center text-[#0B1B2B]">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="5" r="2.5" fill="#0B1B2B" />
                <circle cx="19" cy="5" r="2.5" fill="#0B1B2B" />
                <circle cx="5" cy="19" r="2.5" fill="#0B1B2B" />
                <circle cx="19" cy="19" r="2.5" fill="#0B1B2B" />
                <circle cx="12" cy="12" r="2.2" fill="#0B1B2B" />
                <line x1="6.5" y1="6.5" x2="10.5" y2="10.5" stroke="#0B1B2B" strokeWidth="1.8" />
                <line x1="17.5" y1="6.5" x2="13.5" y2="10.5" stroke="#0B1B2B" strokeWidth="1.8" />
                <line x1="6.5" y1="17.5" x2="10.5" y2="13.5" stroke="#0B1B2B" strokeWidth="1.8" />
                <line x1="17.5" y1="17.5" x2="13.5" y2="13.5" stroke="#0B1B2B" strokeWidth="1.8" />
                <line x1="7.5" y1="5" x2="16.5" y2="5" stroke="#0B1B2B" strokeWidth="1.5" />
                <line x1="5" y1="7.5" x2="5" y2="16.5" stroke="#0B1B2B" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <span className="text-[17px] font-extrabold tracking-tight text-[#0B1B2B] block leading-tight">
                AlumniLink
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-[0.16em] uppercase block">
                BEYOND GRADUATION
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link 
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <div className="w-4 h-4 text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </div>
              Dashboard
            </Link>

            <Link 
              to="/directory"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <Compass className="w-4 h-4 text-slate-400" />
              Explore Directory
            </Link>

            <Link 
              to="/mentorship"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <GraduationCap className="w-4 h-4 text-slate-400" />
              Mentorship
            </Link>

            <Link 
              to="/opportunities"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <Briefcase className="w-4 h-4 text-slate-400" />
              Opportunities
            </Link>

            <Link 
              to="/network"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <Users className="w-4 h-4 text-slate-400" />
              My Connections
            </Link>

            <Link 
              to="/messages"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                Messages
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] text-[10px] font-bold">
                3
              </span>
            </Link>

            {/* Active Notifications Nav Item */}
            <Link 
              to="/notifications"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#0B1B2B] bg-[#EDF6FA] transition"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#0B1B2B]" />
                Notifications
              </div>
              <span className="w-5 h-5 rounded-full bg-[#FF7E86] text-white text-[10px] font-bold flex items-center justify-center">
                5
              </span>
            </Link>

            <Link 
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <User className="w-4 h-4 text-slate-400" />
              My Profile
            </Link>

            <Link 
              to="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Settings
            </Link>
          </nav>
        </div>

        {/* Bottom Profile Widget */}
        <div className="border border-slate-200/80 rounded-2xl p-2.5 flex items-center justify-between bg-slate-50/70 hover:bg-slate-50 transition cursor-pointer">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              AM
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#0B1B2B] truncate leading-tight">Alex Morgan</p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">Final Year CS · KNUST</p>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200/80 px-6 sm:px-10 py-3.5 flex items-center justify-between sticky top-0 z-20">
          {/* Breadcrumb & Search */}
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Dashboard</span>
              <span className="text-slate-300">›</span>
              <span className="font-bold text-[#0B1B2B]">Notifications</span>
            </div>

            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notifications, updates, alumni..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200/80 focus:outline-none focus:bg-white focus:border-slate-300 transition"
              />
            </div>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-4 ml-4">
            <span className="hidden lg:inline-flex items-center gap-1.5 bg-[#E0F2FE] text-[#0284C7] text-[10px] font-bold px-3 py-1 rounded-full tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF7E86]"></span>
              ROLE: STUDENT VIEW (KNUST)
            </span>

            <div className="relative cursor-pointer p-1.5 text-slate-600 hover:text-slate-900">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF7E86]"></span>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center font-bold text-xs cursor-pointer overflow-hidden ring-2 ring-slate-100">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="p-6 sm:p-10 max-w-5xl mx-auto w-full space-y-6">
          
          {/* Page Title & Mark All as Read */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#0B1B2B] tracking-tight">
                Notifications
              </h1>
              <p className="text-slate-500 text-xs mt-1">
                Stay updated on your connections, mentorship activities and institutional opportunities.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B1B2B] hover:bg-slate-100 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-xl shadow-2xs transition cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#0B1B2B]" />
                Mark All as Read
              </button>

              <button className="p-2 bg-white border border-slate-200/80 rounded-xl text-slate-600 hover:text-slate-900 shadow-2xs transition cursor-pointer">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Total Alerts */}
            <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#0B1B2B]">Total Alerts</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                18
              </span>
            </div>

            {/* Card 2: Unread */}
            <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FFF0F2] text-[#FF7E86] flex items-center justify-center flex-shrink-0">
                  <Inbox className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#0B1B2B]">Unread</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#FF7E86] text-white">
                5
              </span>
            </div>

            {/* Card 3: Mentorship */}
            <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EDF6FA] text-[#1E7497] flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#0B1B2B]">Mentorship</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EDF6FA] text-[#1E7497]">
                4
              </span>
            </div>

            {/* Card 4: Connections */}
            <div className="bg-white px-4 py-3.5 rounded-2xl border border-slate-200/70 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EDF6FA] text-[#1E7497] flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#0B1B2B]">Connections</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EDF6FA] text-[#1E7497]">
                3
              </span>
            </div>

          </div>

          {/* Filter Chips Row */}
          <div className="flex items-center justify-between pt-1 pb-1 flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {/* All */}
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#0B1B2B] text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                All <span className={activeTab === 'all' ? 'opacity-70 text-[11px]' : 'text-slate-400 text-[11px]'}>18</span>
              </button>

              {/* Unread */}
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'unread'
                    ? 'bg-[#0B1B2B] text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                Unread <span className="bg-[#FF7E86] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">5</span>
              </button>

              {/* Connections */}
              <button
                onClick={() => setActiveTab('connections')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'connections'
                    ? 'bg-[#0B1B2B] text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                Connections <span className={activeTab === 'connections' ? 'opacity-70 text-[11px]' : 'text-slate-400 text-[11px]'}>3</span>
              </button>

              {/* Mentorship */}
              <button
                onClick={() => setActiveTab('mentorship')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'mentorship'
                    ? 'bg-[#0B1B2B] text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                Mentorship <span className={activeTab === 'mentorship' ? 'opacity-70 text-[11px]' : 'text-slate-400 text-[11px]'}>4</span>
              </button>

              {/* Messages */}
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'messages'
                    ? 'bg-[#0B1B2B] text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                Messages <span className={activeTab === 'messages' ? 'opacity-70 text-[11px]' : 'text-slate-400 text-[11px]'}>3</span>
              </button>

              {/* Opportunities */}
              <button
                onClick={() => setActiveTab('opportunities')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'opportunities'
                    ? 'bg-[#0B1B2B] text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                Opportunities <span className={activeTab === 'opportunities' ? 'opacity-70 text-[11px]' : 'text-slate-400 text-[11px]'}>2</span>
              </button>
            </div>

            {/* Filter alerts in view */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium cursor-pointer hover:text-slate-800 transition">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter alerts in view...</span>
            </div>
          </div>

          {/* 7. NOTIFICATIONS LIST CONTAINER */}
          <div className="space-y-6 pt-2">
            
            {/* SECTION: TODAY */}
            {todayList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <span className="flex items-center gap-1.5">
                    TODAY <span className="w-1.5 h-1.5 rounded-full bg-[#FF7E86]"></span>
                  </span>
                  <span className="font-semibold text-slate-400 normal-case text-[11px]">
                    4 unread items
                  </span>
                </div>

                <div className="space-y-2.5">
                  {todayList.map(item => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        item.unread 
                          ? 'bg-[#EDF6FA] border-[#D6E8F2]' 
                          : 'bg-white border-slate-200/70 shadow-2xs'
                      }`}
                    >
                      {/* Left Avatar & Content */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        
                        {/* Avatar / Icon Container */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          {item.isIcon ? (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              item.iconType === 'briefcase' 
                                ? 'bg-[#D7EEF9] text-[#1E7497]' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.iconType === 'briefcase' ? <Briefcase className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </div>
                          ) : (
                            <div className="relative">
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="w-10 h-10 rounded-full object-cover shadow-2xs"
                              />
                              {/* Sub Badge icon on avatar */}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center border border-white text-[9px]">
                                {item.subBadge === 'student' && <GraduationCap className="w-2.5 h-2.5" />}
                                {item.subBadge === 'mentor' && <User className="w-2.5 h-2.5" />}
                                {item.subBadge === 'connection' && <Users className="w-2.5 h-2.5" />}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Text Block */}
                        <div className="min-w-0 flex-1">
                          
                          {/* Title Line */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.name && (
                              <span className="text-xs font-bold text-[#0B1B2B]">
                                {item.name}
                              </span>
                            )}
                            {item.badge && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                {item.badge}
                              </span>
                            )}
                            {item.actionText && (
                              <span className="text-xs text-slate-600 font-normal">
                                {item.actionText}
                              </span>
                            )}
                            {item.title && (
                              <span className="text-xs font-bold text-[#0B1B2B]">
                                {item.title}
                              </span>
                            )}
                            {item.priority && (
                              <span className="bg-[#D3EEF9] text-[#1E7497] text-[10px] font-extrabold px-2 py-0.5 rounded">
                                Priority
                              </span>
                            )}
                            {item.unread && (
                              <span className="w-2 h-2 rounded-full bg-[#FF7E86] inline-block ml-0.5"></span>
                            )}
                          </div>

                          {/* Message Body */}
                          {item.message && (
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                              {item.message}
                            </p>
                          )}

                          {item.messageTextLead && (
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                              <strong className="text-[#0B1B2B] font-semibold">{item.messageTextLead}</strong> {item.messageTextFollow}{' '}
                              <strong className="text-[#0B1B2B] font-semibold">{item.messageHighlight}</strong> {item.messageTrailing}
                            </p>
                          )}

                          {item.opportunityLead && (
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                              {item.opportunityLead} <strong className="text-[#0B1B2B] font-semibold">{item.opportunityPosition}</strong>{item.opportunityEndorsed}
                            </p>
                          )}

                          {/* Meta Line */}
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.time}
                            </span>
                            {item.roleSubtitle && (
                              <>
                                <span>·</span>
                                <span className="text-slate-500 font-medium">{item.roleSubtitle}</span>
                              </>
                            )}
                            {item.urgentText && (
                              <>
                                <span>·</span>
                                <span className="text-[#FF7E86] font-bold">{item.urgentText}</span>
                              </>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        {item.actions.includes('accept') && (
                          <button className="px-3.5 py-1.5 rounded-lg bg-[#0B1B2B] hover:bg-[#152e45] text-white text-xs font-bold shadow-2xs transition cursor-pointer">
                            Accept
                          </button>
                        )}
                        {item.actions.includes('decline') && (
                          <button className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            Decline
                          </button>
                        )}
                        {item.actions.includes('calendar') && (
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            Add to Calendar
                          </button>
                        )}
                        {item.actions.includes('view_details') && (
                          <button className="px-3.5 py-1.5 rounded-lg bg-[#0B1B2B] hover:bg-[#152e45] text-white text-xs font-bold shadow-2xs transition cursor-pointer">
                            View Details
                          </button>
                        )}
                        {item.actions.includes('reply') && (
                          <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            <Reply className="w-3.5 h-3.5 text-slate-500" />
                            Reply
                          </button>
                        )}
                        {item.actions.includes('view_position') && (
                          <button className="px-3.5 py-1.5 rounded-lg bg-[#0B1B2B] hover:bg-[#152e45] text-white text-xs font-bold shadow-2xs transition cursor-pointer">
                            View Position
                          </button>
                        )}
                        {item.actions.includes('see_analytics') && (
                          <button className="px-3 py-1.5 text-xs font-bold text-[#0B1B2B] hover:text-slate-700 transition cursor-pointer">
                            See Analytics
                          </button>
                        )}

                        <button className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION: EARLIER THIS WEEK */}
            {earlierList.length > 0 && (
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <span>EARLIER THIS WEEK</span>
                  <span className="font-semibold text-slate-400 normal-case text-[11px]">
                    Archived & Read
                  </span>
                </div>

                <div className="space-y-2.5">
                  {earlierList.map(item => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition"
                    >
                      {/* Left Avatar & Content */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        
                        <div className="relative flex-shrink-0 mt-0.5">
                          {item.isIcon ? (
                            <div className="w-10 h-10 rounded-xl bg-[#EDF6FA] text-[#1E7497] flex items-center justify-center">
                              <Calendar className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="relative">
                              <img
                                src={item.avatar}
                                alt={item.name}
                                className="w-10 h-10 rounded-full object-cover shadow-2xs"
                              />
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center border border-white text-[9px]">
                                {item.subBadge === 'mentor' && <User className="w-2.5 h-2.5" />}
                                {item.subBadge === 'connection' && <Users className="w-2.5 h-2.5" />}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.name && (
                              <span className="text-xs font-bold text-[#0B1B2B]">
                                {item.name}
                              </span>
                            )}
                            {item.actionText && (
                              <span className="text-xs text-slate-600 font-normal">
                                {item.actionText}
                              </span>
                            )}
                            {item.title && (
                              <span className="text-xs font-bold text-[#0B1B2B]">
                                {item.title}
                              </span>
                            )}
                            {item.tag && (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                                {item.tag}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                            {item.message}
                          </p>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.time}
                            </span>
                            {item.roleSubtitle && (
                              <>
                                <span>·</span>
                                <span className="text-slate-500 font-medium">{item.roleSubtitle}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Button */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        {item.actions.includes('read_notes') && (
                          <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Read Notes
                          </button>
                        )}
                        {item.actions.includes('send_message') && (
                          <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            <Play className="w-3 h-3 fill-slate-700 text-slate-700" />
                            Send Message
                          </button>
                        )}
                        {item.actions.includes('register_now') && (
                          <button className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                            Register Now
                          </button>
                        )}

                        <button className="p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* 8. BOTTOM PREFERENCES BANNER */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#EDF6FA] text-[#1E7497] flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#0B1B2B]">
                  Manage Notification Preferences
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose when and how you receive alerts for Connection requests, Mentorship updates, Direct messages, and Career opportunities.
                </p>
              </div>
            </div>

            <button className="px-4 py-2 rounded-xl bg-[#0B1B2B] hover:bg-[#152e45] text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer">
              Adjust Settings →
            </button>
          </div>

        </main>
      </div>

    </div>
  );
}
