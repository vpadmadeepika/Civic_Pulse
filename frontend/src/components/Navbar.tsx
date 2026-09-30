import React from 'react';
import { ShieldCheck, UserCheck, LayoutDashboard, PlusCircle } from 'lucide-react';

interface NavbarProps {
  currentTab: 'report' | 'authority' | 'track';
  setCurrentTab: (tab: 'report' | 'authority' | 'track') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setCurrentTab('report')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-white">CIVIC PULSE</h1>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-400/30">
                MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Report. Track. Resolve.
            </p>
          </div>
        </div>

        {/* Navigation Switch */}
        <nav className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <button
            onClick={() => setCurrentTab('report')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'report'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Issue</span>
          </button>

          <button
            onClick={() => setCurrentTab('track')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'track'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Track / Verify</span>
          </button>

          <button
            onClick={() => setCurrentTab('authority')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'authority'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Authority Portal</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
