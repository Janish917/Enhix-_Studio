import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import './Landing.css';

// Reusable animated section wrapper
function ScrollSection({ children, className = "", id = "", delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.section
      id={id}
      ref={ref}
      className={`section ${className}`}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, ease: "easeOut", delay }}
    >
      {children}
    </motion.section>
  );
}

function DashboardMockup({ currentTime, enhanceVal, splitPos, activeTab, kpiValue }) {
  const [recentTaskTime, setRecentTaskTime] = useState(12);

  useEffect(() => {
    const taskInterval = setInterval(() => {
      setRecentTaskTime(t => (t <= 2 ? 30 : t - 1));
    }, 3000);
    return () => clearInterval(taskInterval);
  }, []);

  const formatTimecode = (sec) => {
    const min = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${min.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full select-none" style={{ transformStyle: 'preserve-3d' }}>
      {/* 1. Background Glass Panel (Top-Left) - Blurred view of Cloud Gallery */}
      <div 
        className="absolute -top-10 -left-12 w-60 h-44 bg-[#1e1e22]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 opacity-50 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-0 flex flex-col gap-3"
        style={{ transform: 'translateZ(-80px) rotateY(-15deg) rotateX(10deg)' }}
      >
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-['Space_Grotesk']">Cloud Storage</span>
          <span className="text-[10px] text-indigo-400 font-medium">84.2 GB used</span>
        </div>
        <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden filter blur-[2px]">
          <div className="rounded bg-cover bg-center border border-white/10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150')" }} />
          <div className="rounded bg-cover bg-center border border-white/10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=150')" }} />
          <div className="rounded bg-cover bg-center border border-white/10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=150')" }} />
          <div className="rounded bg-cover bg-center border border-white/10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1472214222541-d510753a8707?w=150')" }} />
        </div>
      </div>

      {/* 2. Background Glass Panel (Bottom-Right) - Analytics Graph */}
      <div 
        className="absolute -bottom-12 -right-8 w-56 h-36 bg-[#1e1e22]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 opacity-50 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-0 flex flex-col gap-2"
        style={{ transform: 'translateZ(-60px) rotateY(-15deg) rotateX(10deg)' }}
      >
        <div className="flex justify-between items-center">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Render Efficiency</span>
          <span className="text-[10px] text-emerald-400 font-bold">99.8%</span>
        </div>
        <div className="text-lg font-bold text-white tracking-tight">{kpiValue} frames/s</div>
        <div className="flex-1 flex items-end gap-1 overflow-hidden filter blur-[1px]">
          {[30, 45, 35, 60, 50, 75, 65, 80, 55, 90, 70, 85, 95].map((h, i) => (
            <div 
              key={i} 
              className="flex-1 bg-gradient-to-t from-indigo-500/20 to-indigo-400 rounded-t transition-all duration-300"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* 3. Main Browser Window Canvas */}
      <div 
        className="absolute inset-0 bg-[#161618] border border-white/10 rounded-2xl shadow-[0_35px_80px_rgba(0,0,0,0.6)] z-10 flex flex-col overflow-hidden"
        style={{ transform: 'rotateY(-15deg) rotateX(10deg) translateZ(20px)' }}
      >
        {/* Browser Chrome Header */}
        <div className="h-10 bg-black/40 border-b border-white/5 flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 w-1/4">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff453a] opacity-80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffd60a] opacity-80" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#32d74b] opacity-80" />
          </div>
          <div className="w-1/2 max-w-[280px] bg-white/5 border border-white/10 rounded-lg py-0.5 text-center flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400 tracking-tight">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            enhix.studio/editor
          </div>
          <div className="w-1/4 flex justify-end gap-3 text-slate-400 text-xs">
            <span>⟳</span>
            <span>⋮</span>
          </div>
        </div>

        {/* Inner Editor Area */}
        <div className="flex-1 flex min-h-0">
          
          {/* Left Sidebar */}
          <div className="w-12 bg-black/35 border-r border-white/5 flex flex-col items-center py-4 gap-5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center font-bold text-white text-sm shadow-[0_0_10px_rgba(10,132,255,0.4)]">E</div>
            
            <div className="flex flex-col gap-3.5 w-full items-center">
              {[
                { id: 'adjust', icon: '🎛️' },
                { id: 'effects', icon: '✨' },
                { id: 'remove', icon: '✂️' },
                { id: 'filters', icon: '🎨' },
                { id: 'crop', icon: '📐' },
                { id: 'video', icon: '🎬' },
              ].map(t => (
                <div 
                  key={t.id}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-300 ${activeTab === t.id ? 'bg-[#0a84ff]/25 text-[#0a84ff] border border-[#0a84ff]/30 shadow-[0_0_8px_rgba(10,132,255,0.25)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t.icon}
                </div>
              ))}
            </div>
            
            <div className="mt-auto w-8 h-8 rounded-full border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50" className="w-full h-full object-cover" alt="User Avatar" />
            </div>
          </div>

          {/* Center Canvas Area */}
          <div className="flex-1 bg-[#0f0f10] p-4 flex flex-col relative overflow-hidden min-w-0">
            {/* Top Toolbar overlay inside editor canvas */}
            <div className="absolute top-6 left-6 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">AI Subject Lock</span>
            </div>

            {/* Main Interactive Workspace Image Canvas */}
            <div className="flex-1 border border-white/5 rounded-xl overflow-hidden relative shadow-inner bg-black/60 flex items-center justify-center">
              
              {/* Base Raw Image Layer (Desaturated / Un-enhanced) */}
              <div 
                className="absolute inset-0 bg-cover bg-center filter grayscale-[40%] brightness-[80%] contrast-[95%]"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600')" }}
              />

              {/* Enhanced Top Image Layer (Clipped dynamically by Split Slider position) */}
              <div 
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${splitPos}%` }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center filter saturate-[1.4] contrast-[1.12] brightness-[1.04]"
                  style={{ 
                    backgroundImage: "url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600')",
                    width: '100%',
                    height: '100%',
                    minWidth: '280px' // Ensure width doesn't squeeze on resizing container
                  }}
                />
              </div>

              {/* Subject Detection glowing boundary (SVG Overlay) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice">
                {/* Simulated human shape head-shoulder detection box */}
                <path 
                  d="M130 95 C130 80, 170 80, 170 95 C170 110, 130 110, 130 95 M120 130 C120 110, 180 110, 180 130 Z" 
                  fill="none" 
                  stroke="#0a84ff" 
                  strokeWidth="1.2" 
                  strokeDasharray="4 3" 
                  className="dashboard-pulse-glow"
                />
                <circle cx="150" cy="95" r="3" fill="#32d74b" />
                <rect x="110" y="70" width="80" height="75" fill="none" stroke="#32d74b" strokeWidth="0.8" opacity="0.4" />
                <text x="110" y="65" fill="#32d74b" fontSize="5" fontWeight="bold" letterSpacing="0.5">FACE RETINA LOCK</text>
              </svg>

              {/* Sliding Handle Line */}
              <div 
                className="absolute inset-y-0 w-[1.5px] bg-[#0a84ff] shadow-[0_0_10px_rgba(10,132,255,0.7)] z-20 pointer-events-none"
                style={{ left: `${splitPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black/80 border border-[#0a84ff] backdrop-blur-md flex items-center justify-center text-[8px] text-white">
                  ↔
                </div>
              </div>
            </div>
          </div>

          {/* Right Inspector Panel */}
          <div className="w-40 bg-black/15 border-l border-white/5 p-3 flex flex-col gap-4.5 flex-shrink-0">
            <div>
              <div className="text-[8px] uppercase font-bold text-slate-500 tracking-wider mb-2">AI Processor Status</div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
                <div className="w-2 h-2 rounded-full bg-[#0a84ff] animate-ping" />
                <div className="text-[9px] text-slate-200 font-semibold truncate">Refining RGB Curves</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">Adjustment Parameters</div>
              
              {/* Dynamic Sliders */}
              {[
                { name: 'AI Enhance', val: `${enhanceVal}%`, pct: enhanceVal },
                { name: 'Contrast Science', val: '+12%', pct: 60 },
                { name: 'Smart Exposure', val: '-0.15', pct: 42 }
              ].map(s => (
                <div key={s.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[8px] text-slate-400">
                    <span>{s.name}</span>
                    <span className="font-semibold text-indigo-400">{s.val}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] transition-all duration-300"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Sparkline Histogram Graph */}
            <div className="flex flex-col gap-1.5 mt-auto">
              <div className="text-[8px] uppercase font-bold text-slate-500 tracking-wider font-['Space_Grotesk']">Luminance Spectrum</div>
              <div className="h-14 border border-white/5 rounded-lg bg-black/35 p-1 relative overflow-hidden flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="glow-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0a84ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Waveform line */}
                  <path 
                    d={`M 0 35 Q 20 ${40 - enhanceVal * 0.3} 40 ${enhanceVal * 0.2} T 80 ${40 - enhanceVal * 0.35} T 100 32 L 100 40 L 0 40 Z`}
                    fill="url(#glow-grad)"
                  />
                  <path 
                    d={`M 0 35 Q 20 ${40 - enhanceVal * 0.3} 40 ${enhanceVal * 0.2} T 80 ${40 - enhanceVal * 0.35} T 100 32`}
                    fill="none" 
                    stroke="#0a84ff" 
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Timeline Bar */}
        <div className="h-14 bg-black/45 border-t border-white/5 flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Play Button */}
            <div className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 text-[10px] cursor-pointer">
              ▶
            </div>
            {/* Timecode */}
            <div className="text-[11px] font-mono text-slate-200 tracking-wider font-bold">
              {formatTimecode(currentTime)}
            </div>
          </div>

          {/* Equalizer Waveform */}
          <div className="flex items-end gap-[2px] h-7 w-2/5 justify-center opacity-85">
            {[2, 4, 3, 5, 2, 6, 8, 4, 7, 5, 9, 3, 6, 8, 4, 5, 2, 7, 3, 5, 2, 4, 3, 6].map((bar, i) => {
              const delays = [0.1, 0.3, 0.5, 0.2, 0.6, 0.8, 0.4, 0.7, 0.2, 0.9, 0.5, 0.3];
              const delay = delays[i % delays.length];
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-[#0a84ff] rounded-t dashboard-eq-bar"
                  style={{ 
                    animationDelay: `${delay}s`,
                    animationDuration: `${0.8 + delay}s`
                  }} 
                />
              );
            })}
          </div>

          {/* Render Export Button */}
          <button className="h-8 px-4 bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] rounded-lg text-[10px] font-bold text-white shadow-[0_0_12px_rgba(10,132,255,0.4)] border border-[#0a84ff]/30">
            Render 4K
          </button>
        </div>
      </div>
    </div>
  );
}

export function Landing({ onEnter }) {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);

  // Live state values shared across dashboard mockups
  const [currentTime, setCurrentTime] = useState(0);
  const [enhanceVal, setEnhanceVal] = useState(78);
  const [splitPos, setSplitPos] = useState(45);
  const [activeTab, setActiveTab] = useState('adjust');
  const [kpiValue, setKpiValue] = useState(1284);

  useEffect(() => {
    // 1. Timecode ticker
    const timeInterval = setInterval(() => {
      setCurrentTime(t => (t >= 59.9 ? 0 : t + 0.08));
    }, 80);

    // 2. Enhance value oscillation
    const enhanceInterval = setInterval(() => {
      setEnhanceVal(() => {
        const delta = Math.sin(Date.now() / 1500) * 11 + 83;
        return Math.round(delta);
      });
    }, 200);

    // 3. Before/After Split slider oscillation
    const splitInterval = setInterval(() => {
      setSplitPos(() => {
        const pos = Math.sin(Date.now() / 2000) * 18 + 50;
        return pos;
      });
    }, 40);

    // 4. Tab switching simulation
    const tabInterval = setInterval(() => {
      const tabs = ['adjust', 'effects', 'remove', 'filters', 'crop', 'video'];
      setActiveTab(prev => {
        const nextIndex = (tabs.indexOf(prev) + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 4000);

    // 5. KPI Counter ticking
    const kpiInterval = setInterval(() => {
      setKpiValue(k => k + (Math.random() > 0.7 ? 1 : 0));
    }, 3000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(enhanceInterval);
      clearInterval(splitInterval);
      clearInterval(tabInterval);
      clearInterval(kpiInterval);
    };
  }, []);
  
  return (
    <div className="landing-page">
      {/* Ambient background glows */}
      <motion.div className="landing-bg-glow glow-blue" style={{ y: y1 }} />
      <motion.div className="landing-bg-glow glow-violet" style={{ y: y2 }} />
      <div className="landing-bg-glow glow-chrome" />

      <div className="landing-container">
        
        {/* Navigation / Header */}
        <nav className="flex justify-between items-center py-6 relative z-50">
          <div className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center shadow-lg">E</span>
            ENHIX
          </div>
          <div className="hidden md:flex gap-8 text-sm font-medium text-[#8e8e93]">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#editor" className="hover:text-white transition">Dashboard</a>
            <a href="#ai" className="hover:text-white transition">AI Tools</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onEnter} className="text-sm font-medium text-[#f5f5f7] hover:text-white transition">Log In</button>
            <button onClick={onEnter} className="btn-primary text-sm py-2 px-6">Sign Up</button>
          </div>
        </nav>

        {/* 1. Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 text-xs font-semibold text-[#8e8e93]"
              >
                <span className="w-2 h-2 rounded-full bg-[#0a84ff] animate-pulse" />
                Enhix Engine Released
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="heading-hero"
              >
                Create with <br/>
                <span className="text-gradient-blue">Intelligence.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-subtitle mb-8"
              >
                The advanced AI-powered photo and video editor. Experience cinematic lighting, intelligent background removal, and studio-grade color science directly in your browser.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <button onClick={onEnter} className="btn-accent">Start Editing</button>
                <a href="#features" className="btn-primary" style={{ textDecoration: 'none' }}>View Features</a>
              </motion.div>
            </div>

            {/* Interactive 3D Editor Preview */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="dashboard-preview hidden md:block"
            >
              <DashboardMockup 
                currentTime={currentTime}
                enhanceVal={enhanceVal}
                splitPos={splitPos}
                activeTab={activeTab}
                kpiValue={kpiValue}
              />
            </motion.div>
          </div>
        </section>

        {/* 2. Features Section */}
        <ScrollSection id="features">
          <h2 className="heading-section">Next-Generation Capabilities</h2>
          <div className="features-grid">
            {[
              { title: "AI Photo Enhancement", icon: "✨", desc: "Adaptive profile generation based on RGB distribution and dynamic range." },
              { title: "Video Upscaling", icon: "🎬", desc: "Real-time WebGL rendering with physics-based cinematic shaders." },
              { title: "Background Removal", icon: "🎀", desc: "Precise edge detection and flawless cutouts instantly." },
              { title: "Color Grading", icon: "🎨", desc: "Professional cinematic color science and volumetric lighting." },
              { title: "Motion Effects", icon: "💨", desc: "Add realistic camera shake, VHS distortion, and bloom." },
              { title: "Smart Filters", icon: "🔮", desc: "One-click intelligent filters that respect skin tones." }
            ].map((feat, i) => (
              <div key={i} className="glass-card">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-6 shadow-inner">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feat.title}</h3>
                <p className="text-sm text-[#8e8e93] leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </ScrollSection>

        {/* 3. Editor Dashboard (Full Width preview) */}
        <ScrollSection id="editor" className="py-24">
           <div className="text-center mb-16">
             <h2 className="heading-section mb-4">Professional Editor Dashboard</h2>
             <p className="text-subtitle mx-auto">A layout designed for speed, creativity, and precision.</p>
           </div>
           
           <div className="glass-panel p-2 flex flex-col md:flex-row gap-2 h-[600px]">
              {/* Left sidebar */}
              <div className="w-full md:w-64 bg-white/5 rounded-xl border border-white/5 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible flex-shrink-0">
                 <div className="hidden md:flex items-center gap-2 mb-4 px-2">
                   <span className="w-2.5 h-2.5 rounded-full bg-[#0a84ff] animate-pulse" />
                   <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Enhix Toolset</span>
                 </div>
                 {[
                    { id: 'adjust', label: 'Basic Adjustments', icon: '🎛️' },
                    { id: 'effects', label: 'AI Studio (Enhance & HDR)', icon: '✨' },
                    { id: 'remove', label: 'Smart Background Removal', icon: '✂️' },
                    { id: 'filters', label: 'Color Grading & LUTs', icon: '🎨' },
                    { id: 'crop', label: 'Transform & Crop', icon: '📐' },
                    { id: 'video', label: 'Video Upscaling & FX', icon: '🎬' },
                  ].map(item => {
                    const isActive = activeTab === item.id;
                    return (
                      <div 
                        key={item.id} 
                        className={`h-10 rounded-lg flex items-center px-3 flex-shrink-0 transition-all duration-300 cursor-pointer ${isActive ? 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30 shadow-[0_0_12px_rgba(10,132,255,0.15)] font-semibold' : 'bg-transparent text-white/55 hover:bg-white/5'}`}
                      >
                         <span className="text-base mr-3">{item.icon}</span>
                         <span className="text-xs">{item.label}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Center Canvas */}
              <div className="flex-1 bg-[#111112] rounded-xl border border-white/5 relative overflow-hidden flex flex-col min-w-0">
                 {/* Top Status Bar */}
                 <div className="absolute top-4 left-4 flex items-center gap-2 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1">
                   <span className="w-2.5 h-2.5 rounded-full bg-[#32d74b] animate-ping" />
                   <span className="text-[10px] text-slate-300 font-semibold font-mono tracking-tight">
                     PLAYING • {currentTime.toFixed(2)}s
                   </span>
                 </div>
                 <div className="absolute top-4 right-4 flex gap-2 z-20 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[10px] font-mono text-slate-400">
                   Resolution: 3840×2160 (4K)
                 </div>

                 {/* Main Video Viewport */}
                 <div className="flex-1 m-4 md:m-6 border border-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden bg-black">
                    {/* Raw/Before background layer */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center filter grayscale-[35%] brightness-[80%] contrast-[95%] opacity-90"
                      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000')" }}
                    />

                    {/* Color Graded/Enhanced foreground layer */}
                    <div 
                      className="absolute inset-y-0 left-0 overflow-hidden"
                      style={{ width: `${splitPos}%` }}
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center filter saturate-[1.45] contrast-[1.15] brightness-[1.05]"
                        style={{ 
                          backgroundImage: "url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000')",
                          width: '100%',
                          height: '100%',
                          minWidth: '350px'
                        }}
                      />
                    </div>

                    {/* SVG Face Lock Overlay */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice">
                      <path 
                        d="M130 85 C130 70, 170 70, 170 85 C170 100, 130 100, 130 85 M120 120 C120 105, 180 105, 180 120 Z" 
                        fill="none" 
                        stroke="#5e5ce6" 
                        strokeWidth="1.2" 
                        strokeDasharray="5 3" 
                        className="dashboard-pulse-glow"
                      />
                      <circle cx="150" cy="85" r="3.5" fill="#32d74b" />
                      <rect x="110" y="60" width="80" height="75" fill="none" stroke="#0a84ff" strokeWidth="0.8" opacity="0.3" />
                      <text x="112" y="54" fill="#0a84ff" fontSize="5" fontWeight="bold" letterSpacing="0.8">FACE DETECTION STAGE</text>
                    </svg>

                    {/* Split Handle Line */}
                    <div 
                      className="absolute inset-y-0 w-[1.5px] bg-[#0a84ff] shadow-[0_0_12px_rgba(10,132,255,0.8)] z-15 pointer-events-none"
                      style={{ left: `${splitPos}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black/85 border border-[#0a84ff] backdrop-blur-md flex items-center justify-center text-[8px] text-white">
                        ↔
                      </div>
                    </div>
                 </div>

                 {/* Bottom Timeline with Equalizer bars */}
                 <div className="h-24 bg-white/5 border-t border-white/5 p-4 flex flex-col justify-end gap-2 flex-shrink-0">
                    <div className="flex gap-1 h-14 w-full items-end">
                       {[25, 45, 80, 50, 95, 30, 60, 40, 85, 55, 75, 45, 90, 35, 65, 50, 80, 40, 70, 60, 85, 35, 55, 75, 45, 90, 50, 65, 30, 80].map((val, i) => {
                         const delays = [0.1, 0.4, 0.2, 0.6, 0.3, 0.8, 0.5, 0.7, 0.2, 0.9];
                         const delay = delays[i % delays.length];
                         return (
                           <div 
                             key={i} 
                             className="flex-1 bg-gradient-to-t from-[#0a84ff]/30 to-[#0a84ff] rounded-t dashboard-eq-bar" 
                             style={{ 
                               animationDelay: `${delay}s`,
                               animationDuration: `${0.8 + delay}s`
                             }} 
                           />
                         );
                       })}
                    </div>
                 </div>
              </div>

              {/* Right Properties */}
              <div className="hidden lg:flex w-72 bg-white/5 rounded-xl border border-white/5 p-5 flex-col gap-6 flex-shrink-0">
                 <div className="flex justify-between items-center pb-2 border-b border-white/5">
                   <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">AI Color Inspector</span>
                   <span className="text-[10px] text-emerald-400 font-bold">Live Synced</span>
                 </div>
                 
                 <div className="space-y-5 mt-2">
                   {[
                     { label: 'AI Super Enhance', val: `${enhanceVal}%`, pct: enhanceVal },
                     { label: 'Luminance Denoise', val: '45%', pct: 45 },
                     { label: 'High-Key Exposure', val: '62%', pct: 62 },
                     { label: 'Chrominance Repair', val: '78%', pct: 78 }
                   ].map((param, i) => (
                     <div key={param.label} className="space-y-2">
                       <div className="flex justify-between text-xs">
                         <span className="text-slate-400">{param.label}</span>
                         <span className="text-indigo-400 font-semibold font-mono">{param.val}</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] transition-all duration-300" 
                           style={{ width: `${param.pct}%` }} 
                         />
                       </div>
                     </div>
                   ))}
                 </div>

                 <button onClick={onEnter} className="mt-auto h-12 w-full rounded-xl bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] hover:brightness-110 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_20px_rgba(10,132,255,0.3)] transition-all cursor-pointer border border-[#0a84ff]/30">
                   Export Project
                 </button>
              </div>
           </div>
        </ScrollSection>

        {/* 4. AI Tools Section */}
        <ScrollSection id="ai">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
             <div className="flex-1">
               <h2 className="heading-section text-left mb-6">Intelligent AI Assistant</h2>
               <p className="text-subtitle mb-8">
                 Enhix understands your context. Ask the holographic AI panel to color grade your footage, remove noise, or enhance resolution.
               </p>
               <div className="flex flex-col gap-4">
                 {[
                   "Enhance portrait lighting automatically.",
                   "Upscale this video to 4K resolution.",
                   "Remove the background behind the subject."
                 ].map((cmd, i) => (
                   <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
                     <span className="text-[#0a84ff]">✨</span>
                     <span className="text-sm font-medium text-white">{cmd}</span>
                   </div>
                 ))}
               </div>
             </div>
             
             <div className="flex-1 w-full max-w-md relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a84ff]/20 to-[#5e5ce6]/20 blur-3xl rounded-full" />
                <div className="glass-panel p-6 relative">
                   <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center font-bold text-white">AI</div>
                         <div>
                            <div className="font-bold text-sm text-white">Enhix Core</div>
                            <div className="text-xs text-[#0a84ff]">Online</div>
                         </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-[#0a84ff] animate-pulse" />
                   </div>
                   
                   <div className="ai-panel text-white">
                      <div className="ai-message system">
                         I've analyzed the image. The dynamic range is quite low in the shadows. Would you like me to apply a Smart Lightning profile?
                      </div>
                      <div className="ai-message user">
                         Yes, apply it and add a cinematic fade.
                      </div>
                      <div className="ai-message system">
                         <div className="flex items-center gap-2 mb-2">
                           <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                           Applying cinematic profile...
                         </div>
                         <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden mt-3">
                            <motion.div 
                              className="h-full bg-[#0a84ff]"
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </ScrollSection>


        {/* Footer */}
        <footer className="py-12 border-t border-white/10 text-center text-sm text-[#8e8e93] flex flex-col md:flex-row justify-between items-center gap-4">
           <div>© 2026 Enhix Studio. All rights reserved.</div>
           <div className="flex gap-6">
             <a href="#" className="hover:text-white transition">Privacy Policy</a>
             <a href="#" className="hover:text-white transition">Terms of Service</a>
             <a href="#" className="hover:text-white transition">Contact</a>
           </div>
        </footer>

      </div>
    </div>
  );
}
