import React from 'react';

export function AlumniLinkLogoMark({ className = "w-7 h-7", color = "currentColor" }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top horizontal connection */}
      <line x1="6" y1="6" x2="18" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Left vertical connection */}
      <line x1="6" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Top-Left to Bottom-Right diagonal */}
      <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Bottom-Left to Top-Right diagonal */}
      <line x1="6" y1="18" x2="18" y2="6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* 5 Network Nodes */}
      <circle cx="6" cy="6" r="2.8" fill={color} />
      <circle cx="18" cy="6" r="2.8" fill={color} />
      <circle cx="12" cy="12" r="2.8" fill={color} />
      <circle cx="6" cy="18" r="2.8" fill={color} />
      <circle cx="18" cy="18" r="2.8" fill={color} />
    </svg>
  );
}

export default function AlumniLinkLogo({ 
  className = "flex items-center gap-2.5", 
  iconClassName = "w-7 h-7 text-[#0B1B2B]",
  textClassName = "text-xl font-bold tracking-tight text-[#0B1B2B]",
  subtitle = null 
}) {
  return (
    <div className={className}>
      <AlumniLinkLogoMark className={iconClassName} />
      <div>
        <span className={textClassName}>
          Alumni<span className="text-[#FF7E86]">Link</span>
        </span>
        {subtitle && (
          <span className="text-[9px] font-bold text-slate-400 tracking-[0.16em] uppercase block leading-tight">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
