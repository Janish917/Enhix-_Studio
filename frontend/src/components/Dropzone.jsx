import { useCallback, useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TiltWrapper } from './TiltWrapper.jsx'
import { BubbleButton } from './BubbleButton.jsx'
import { SpotlightCard } from './SpotlightCard.jsx'

const ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime' 
]

export function Dropzone({ onFile, autoStartCamera, onCancelCamera }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)

  const open = () => inputRef.current?.click()

  const validate = (file) => {
    if (!file) return { ok: false, message: 'No file selected.' }
    if (!ACCEPT.includes(file.type)) {
      return { ok: false, message: 'Unsupported format. Use JPG, PNG, WEBP, MP4, or MOV.' }
    }
    return { ok: true }
  }

  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)

  const startCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: true })
      setStream(ms)
    } catch (err) {
      console.error(err)
      alert("Camera access denied or unavailable.")
    }
  }

  useEffect(() => {
    if (autoStartCamera) {
      startCamera()
    }
  }, [autoStartCamera])

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play()
    }
  }, [stream])

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
    if (onCancelCamera) onCancelCamera()
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
      handleFile(file)
      stopCamera()
    }, 'image/jpeg', 0.9)
  }

  const handleFile = useCallback(
    (file) => {
      const v = validate(file)
      if (!v.ok) return v
      onFile(file)
      return { ok: true }
    },
    [onFile]
  )

  return (
    <TiltWrapper maxTilt={8} scale={1.02} className="mx-2 my-4">
      <motion.div
        onDragEnter={(e) => { e.preventDefault(); setDrag(true) }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDrag(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          const f = e.dataTransfer.files?.[0]
          handleFile(f)
        }}
        className={`relative transition-all duration-300 rounded-[2rem] ${drag ? 'scale-105 shadow-[0_0_50px_rgba(236,72,153,0.3)]' : ''}`}
        whileHover={{ y: -2 }}
      >
        <SpotlightCard className={`p-8 ${drag ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5'}`}>
          {stream ? (
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="relative w-full overflow-hidden rounded-[1.5rem] bg-black shadow-lg shadow-pink-500/20 border border-white/10">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="w-full max-h-[300px] object-cover scale-x-[-1]"
                />
              </div>
              <div className="flex gap-3">
                <BubbleButton
                  type="button"
                  onClick={capturePhoto}
                  whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(236, 72, 153, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow"
                >
                  Take Picture 📸
                </BubbleButton>
                <BubbleButton
                  type="button"
                  onClick={stopCamera}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-slate-300 shadow-sm hover:bg-white/20"
                >
                  Cancel ✖️
                </BubbleButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-4 relative z-10">
              <motion.div 
                className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-white shadow-[0_0_30px_rgba(236,72,153,0.2)] border border-pink-500/30"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">✨</span>
              </motion.div>
              <div className="min-w-0">
                <div className="text-lg font-black text-white font-['Space_Grotesk'] tracking-wide drop-shadow-md">
                  Drop your media here
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  JPG, PNG, WEBP, MP4, MOV
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <BubbleButton
                    type="button"
                    onClick={open}
                    whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(168, 85, 247, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-8 py-3 text-sm font-bold text-white shadow-lg border border-white/20 transition-all"
                  >
                    Upload Media
                  </BubbleButton>
                  <BubbleButton
                    type="button"
                    onClick={startCamera}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-6 py-3 text-sm font-bold text-slate-300 shadow-sm transition-all hover:bg-white/10"
                  >
                    Camera 📷
                  </BubbleButton>
                </div>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT.join(',')}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              handleFile(f)
              e.target.value = ''
            }}
          />
        </SpotlightCard>
      </motion.div>
    </TiltWrapper>
  )
}
