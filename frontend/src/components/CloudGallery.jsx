import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BubbleButton } from './BubbleButton.jsx'
import { TiltWrapper } from './TiltWrapper.jsx'
import { SpotlightCard } from './SpotlightCard.jsx'

export function CloudGallery({ onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/media`)
      .then(r => r.json())
      .then(d => {
        setItems(d || [])
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [apiBaseUrl])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 sm:p-6 text-slate-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0a0a0a]/80 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <motion.div className="absolute -top-32 -left-32 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px]" animate={{ x: [0, 50, 0], y: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity }} />
          <motion.div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" animate={{ x: [0, -50, 0], y: [0, -20, 0] }} transition={{ duration: 12, repeat: Infinity }} />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-md px-6 py-5">
            <h2 className="text-xl font-black text-white tracking-wide font-['Space_Grotesk'] flex items-center gap-3">
              <span className="text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">☁️</span> Cloud Render History
            </h2>
            <BubbleButton
              type="button"
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </BubbleButton>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(236,72,153,0.5)]"></div>
                  <span className="font-bold tracking-widest uppercase text-xs">Loading Secure Cloud...</span>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="text-5xl mb-4 opacity-50 filter grayscale">📭</div>
                <div className="text-lg font-bold text-slate-300">No media found</div>
                <div className="mt-2 max-w-sm text-sm text-slate-500 font-medium leading-relaxed">
                  Export an edited image or video from the studio, and it will be securely backed up here.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((it) => (
                  <TiltWrapper key={it.id} maxTilt={5} scale={1.03}>
                    <SpotlightCard className="flex flex-col group p-1 transition-all duration-300">
                      <div className="relative aspect-square w-full overflow-hidden rounded-[1.5rem] bg-black/50 border border-white/5">
                        {it.contentType.startsWith('video') ? (
                          <video
                            src={`${apiBaseUrl}/api/media/${it.id}`}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            muted
                            playsInline
                            onMouseOver={(e) => e.target.play()}
                            onMouseOut={(e) => {
                              e.target.pause()
                              e.target.currentTime = 0
                            }}
                          />
                        ) : (
                          <img
                            src={`${apiBaseUrl}/api/media/${it.id}`}
                            alt={it.filename}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
                        
                        {/* Hover Actions */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                          <a
                            href={`${apiBaseUrl}/api/media/${it.id}`}
                            download={it.filename}
                            className="transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-white font-bold text-xs py-2 px-4 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                          >
                            Download High-Res
                          </a>
                        </div>
                      </div>
                      <div className="px-3 py-3 flex items-center justify-between">
                        <div className="truncate text-xs font-semibold text-slate-300 tracking-wide">
                          {it.filename}
                        </div>
                        <div className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 border border-white/10">
                          {it.contentType.split('/')[1] || 'FILE'}
                        </div>
                      </div>
                    </SpotlightCard>
                  </TiltWrapper>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
