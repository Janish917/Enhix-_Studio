import React, { useRef } from 'react';
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

export function Landing({ onEnter }) {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  
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
              <div className="dashboard-canvas overflow-hidden">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" alt="Editor Background" className="w-full h-full object-cover opacity-60" />
                
                {/* Floating UI Layers inside Canvas */}
                <div className="ui-layer top-4 left-4 p-3 flex flex-col gap-2 w-12 animate-float">
                   <div className="w-6 h-6 rounded bg-white/20" />
                   <div className="w-6 h-6 rounded bg-[#0a84ff]" />
                   <div className="w-6 h-6 rounded bg-white/20" />
                </div>
                <div className="ui-layer bottom-4 left-20 right-20 h-12 flex items-center px-4 animate-float-delayed">
                   <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
                     <div className="h-full w-1/3 bg-[#5e5ce6]" />
                   </div>
                </div>
                <div className="ui-layer top-4 right-4 w-48 h-64 p-4 animate-float">
                   <div className="h-4 w-24 bg-white/20 rounded mb-4" />
                   <div className="h-2 w-full bg-white/10 rounded mb-2" />
                   <div className="h-2 w-3/4 bg-white/10 rounded mb-6" />
                   <div className="w-full h-32 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                     <div className="w-12 h-12 rounded-full border-2 border-[#0a84ff] border-t-transparent animate-spin" />
                   </div>
                </div>
              </div>
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
                 <div className="hidden md:block h-8 w-full bg-white/10 rounded mb-4" />
                 {[1,2,3,4,5,6].map(i => (
                   <div key={i} className={`h-10 rounded-lg flex items-center px-3 flex-shrink-0 ${i===2 ? 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30' : 'bg-transparent text-white/50 hover:bg-white/5'}`}>
                      <div className="w-5 h-5 rounded bg-current opacity-80" />
                      <div className="hidden md:block ml-3 h-2 w-16 bg-current opacity-80 rounded" />
                   </div>
                 ))}
              </div>

              {/* Center Canvas */}
              <div className="flex-1 bg-[#111112] rounded-xl border border-white/5 relative overflow-hidden flex flex-col min-w-0">
                 <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <div className="h-8 w-24 bg-white/10 backdrop-blur rounded-full" />
                 </div>
                 <div className="flex-1 m-4 md:m-8 border border-white/10 border-dashed rounded-2xl flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center">
                    <div className="absolute inset-0 backdrop-blur-[2px] bg-black/20" />
                    <div className="relative w-48 h-64 md:w-64 md:h-80 rounded-lg shadow-2xl bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center border border-white/20" />
                 </div>
                 {/* Bottom Timeline */}
                 <div className="h-24 md:h-32 bg-white/5 border-t border-white/5 p-4 flex flex-col justify-end gap-2 flex-shrink-0">
                    <div className="flex gap-1 h-12 w-full items-end">
                       {[25, 45, 80, 50, 95, 30, 60, 40, 85, 55, 75, 45, 90, 35, 65, 50, 80, 40, 70, 60, 85, 35, 55, 75, 45, 90, 50, 65, 30, 80].map((val, i) => (
                         <div key={i} className="flex-1 bg-white/20 rounded-t" style={{ height: `${val}%` }} />
                       ))}
                    </div>
                 </div>
              </div>

              {/* Right Properties */}
              <div className="hidden lg:flex w-72 bg-white/5 rounded-xl border border-white/5 p-5 flex-col gap-6 flex-shrink-0">
                 <div className="h-4 w-32 bg-white/20 rounded" />
                 
                 <div className="space-y-4 mt-4">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="space-y-2">
                       <div className="flex justify-between">
                         <div className="h-2 w-16 bg-white/40 rounded" />
                         <div className="h-2 w-8 bg-white/20 rounded" />
                       </div>
                       <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6]" style={{ width: `${(i + 1) * 20 + 10}%` }} />
                       </div>
                     </div>
                   ))}
                 </div>

                 <button onClick={onEnter} className="mt-auto h-12 w-full rounded-xl bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] opacity-80 hover:opacity-100 flex items-center justify-center text-sm font-bold text-white shadow-[0_0_20px_rgba(10,132,255,0.3)] transition-all cursor-pointer">
                   Export Media
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
