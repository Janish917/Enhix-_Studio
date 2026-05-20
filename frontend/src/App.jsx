import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { Landing } from './components/Landing.jsx'
import { Auth } from './components/Auth.jsx'
import { Settings } from './components/Settings.jsx'
import { TiltWrapper } from './components/TiltWrapper.jsx'
import { BubbleButton } from './components/BubbleButton.jsx'
import { SpotlightCard } from './components/SpotlightCard.jsx'
import { Dropzone } from './components/Dropzone.jsx'
import { BeforeAfter } from './components/BeforeAfter.jsx'
import { BytesRow, Slider } from './components/Slider.jsx'
import { Toggle } from './components/Toggle.jsx'
import { Spinner } from './components/Spinner.jsx'
import { CloudGallery } from './components/CloudGallery.jsx'
import { formatBytes } from './lib/format.js'
import {
  canvasToBlob,
  defaultImageSettings,
  renderEditedImageToCanvas,
  processObjectRemovalInpaint,
  analyzeImageProfile,
  processSemanticMatting
} from './lib/imagePipeline.js'
import { processVideo } from './lib/ffmpegPipeline.js'
import { uploadToBackend } from './lib/api.js'
import cv from '@techstark/opencv-js'

const computeCanvasSizeFit = (width, height, maxWidth, maxHeight) => {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    w: Math.round(width * ratio),
    h: Math.round(height * ratio)
  };
};

const TOOLS = [
  { id: 'adjust', label: 'Basic Adjustments' },
  { id: 'effects', label: 'AI Studio (Enhance & HDR)' },
  { id: 'remove', label: 'Smart Background Removal' },
  { id: 'filters', label: 'Color Grading & LUTs' },
  { id: 'beauty', label: 'Pro Retouch' },
  { id: 'text', label: 'Typography' },
  { id: 'crop', label: 'Transform & Crop' },
  { id: 'video', label: 'Video Upscaling & FX' },
  { id: 'export', label: 'Export Media' }
]

function useTheme() {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dark')
  }, [])
  return { theme, setTheme }
}

function App() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const [showLanding, setShowLanding] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutToast, setLogoutToast] = useState('')
  const { theme, setTheme } = useTheme()
  const [tool, setTool] = useState('adjust')
  const [analysisStage, setAnalysisStage] = useState(null)

  const runAIAnalysis = async () => {
    if (!sourceBitmapRef.current) return;
    setAnalysisStage('Analyzing RGB distribution...');
    await new Promise(r => setTimeout(r, 600));
    setAnalysisStage('Computing dynamic range...');
    await new Promise(r => setTimeout(r, 600));
    setAnalysisStage('Generating adaptive profile...');
    const profile = await analyzeImageProfile(sourceBitmapRef.current);
    await new Promise(r => setTimeout(r, 600));
    setAnalysisStage(null);
    setImgSettings(s => {
      const newS = { ...s, adaptiveProfile: profile, enhance: 100 };
      renderCanvases({ bitmap: sourceBitmapRef.current, settings: newS });
      return newS;
    });
  }
  
  // Global Interactive Cursor Glow
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0)
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0)
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  const handleGlobalMouseMove = (e) => {
    mouseX.set(e.clientX)
    mouseY.set(e.clientY)
  }
  const [media, setMedia] = useState(null) 
  const [busy, setBusy] = useState(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isGeneratingFill, setIsGeneratingFill] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [pricingEstimate, setPricingEstimate] = useState(null)
  const [removeSubTool, setRemoveSubTool] = useState('erase')
  const aiAbortControllerRef = useRef(null)

  const calculatePricing = (width, height, maskArea = 0) => {
    if (!width || !height) return null;
    const base = 0.01; // Base credit
    const resolutionFactor = (width * height) / (1000 * 1000) * 0.02; // $0.02 per megapixel
    const fillFactor = maskArea > 0 ? (maskArea / (width * height)) * 0.05 : 0;
    const total = base + resolutionFactor + fillFactor;
    return total.toFixed(3);
  }
  const [error, setError] = useState('')
  const [autoStartCamera, setAutoStartCamera] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false })
  const toastTimeoutRef = useRef(null)

  const showToast = (message, type = 'success', duration = 4000) => {
     setToast({ message, type, visible: true })
     if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
     toastTimeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), duration)
  }

  
  const [imgSettings, setImgSettings] = useState(defaultImageSettings)
  const [beforeAfterOn, setBeforeAfterOn] = useState(false)
  const [quality, setQuality] = useState(85) 
  const [format, setFormat] = useState('image/jpeg')
  const [exportName, setExportName] = useState('enhix-edit')

  
  const beforeCanvasRef = useRef(null)
  const afterCanvasRef = useRef(null)
  const maskCanvasRef = useRef(null) 
  const isDrawingMask = useRef(false)
  const isDraggingText = useRef(false)
  const [brushSize, setBrushSize] = useState(30)

  const originalBitmapRef = useRef(null) 
  const sourceBitmapRef = useRef(null)   
  const rafRef = useRef(null)            
  const lastOriginalBlobSize = useRef(0)
  const [estimatedOutBytes, setEstimatedOutBytes] = useState(0)

  
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [videoSpeed, setVideoSpeed] = useState(1)
  const videoRef = useRef(null)

  // Extra state for improvements
  const [uploadProgress, setUploadProgress] = useState(null)
  const [lastUploadData, setLastUploadData] = useState(null)
  const [historyStack, setHistoryStack] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [projectsList, setProjectsList] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)

  const isUndoingRedoing = useRef(false)
  const lastSavedSettings = useRef(null)
  const debounceTimeout = useRef(null)
  const timelineRef = useRef(null)
  const estimateOutputTimeoutRef = useRef(null)

  // Session Restore and OAuth Callback handling on Mount
  useEffect(() => {
    const checkAuthAndCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (code && (state === 'google' || state === 'github')) {
        setOauthLoading(`Authenticating with ${state === 'google' ? 'Google' : 'GitHub'}...`);
        try {
          const endpoint = `${apiBaseUrl}/api/auth/${state}/callback`;
          
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              code, 
              redirectUri: window.location.origin 
            })
          });
          
          const data = await res.json();
          if (data.ok) {
            localStorage.setItem("enhix_token", data.token);
            localStorage.setItem("enhix_user", JSON.stringify(data.user));
            setIsAuthenticated(true);
            setShowLanding(false);
            setShowAuth(false);
            showToast(`Signed in successfully with ${state === 'google' ? 'Google' : 'GitHub'}!`, 'success');
          } else {
            showToast(data.message || `${state === 'google' ? 'Google' : 'GitHub'} sign-in failed.`, 'error');
            setShowAuth(true);
            setShowLanding(false);
          }
        } catch (err) {
          console.error('OAuth callback error:', err);
          showToast('OAuth network error. Could not connect to authentication server.', 'error');
          setShowAuth(true);
          setShowLanding(false);
        } finally {
          setOauthLoading(null);
          // Clean up the URL search params so a refresh doesn't trigger oauth again
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        const token = localStorage.getItem('enhix_token');
        if (token) {
          setIsAuthenticated(true);
          setShowLanding(false);
        }
      }
    };

    checkAuthAndCallback();
  }, []);

  const isScrubbing = useRef(false)

  const updateSeekFromEvent = (e) => {
    if (!videoRef.current || !videoDuration || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const leftOffset = 80
    const rightOffset = 8
    const availableWidth = rect.width - leftOffset - rightOffset
    const percentage = Math.max(0, Math.min(1, (clickX - leftOffset) / availableWidth))
    const newTime = percentage * videoDuration
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleTimelineMouseDown = (e) => {
    if (!videoRef.current || !videoDuration || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const leftOffset = 80
    if (clickX < leftOffset) return // Clicked on labels, don't scrub
    
    isScrubbing.current = true
    updateSeekFromEvent(e)
    
    const handleMouseMove = (moveEvent) => {
      if (isScrubbing.current) {
        updateSeekFromEvent(moveEvent)
      }
    }
    
    const handleMouseUp = () => {
      isScrubbing.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const pushToHistory = (nextBitmap, nextSettings = imgSettings) => {
    setHistoryStack(prev => {
      const next = prev.slice(0, historyIndex + 1)
      return [...next, {
        settings: nextSettings,
        bitmap: nextBitmap
      }]
    })
    setHistoryIndex(prev => prev + 1)
    lastSavedSettings.current = JSON.stringify(nextSettings)
  }

  // Undo / Redo tracking Effect
  useEffect(() => {
    if (!media) {
      setHistoryStack([])
      setHistoryIndex(-1)
      lastSavedSettings.current = null
      return
    }

    if (isUndoingRedoing.current) {
      isUndoingRedoing.current = false
      return
    }

    const currentStr = JSON.stringify(imgSettings)
    if (!lastSavedSettings.current) {
      lastSavedSettings.current = currentStr
      setHistoryStack([{
        settings: imgSettings,
        bitmap: sourceBitmapRef.current
      }])
      setHistoryIndex(0)
      return
    }

    if (currentStr !== lastSavedSettings.current) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
      debounceTimeout.current = setTimeout(() => {
        setHistoryStack(prev => {
          const next = prev.slice(0, historyIndex + 1)
          return [...next, {
            settings: imgSettings,
            bitmap: sourceBitmapRef.current
          }]
        })
        setHistoryIndex(prev => prev + 1)
        lastSavedSettings.current = currentStr
      }, 500)
    }
  }, [imgSettings, media])

  const undo = () => {
    if (historyIndex > 0) {
      isUndoingRedoing.current = true
      const prevIndex = historyIndex - 1
      setHistoryIndex(prevIndex)
      const entry = historyStack[prevIndex]
      setImgSettings(entry.settings)
      if (entry.bitmap) {
         sourceBitmapRef.current = entry.bitmap
         setPricingEstimate(calculatePricing(entry.bitmap.width, entry.bitmap.height, 0))
      }
      if (maskCanvasRef.current) {
         maskCanvasRef.current.getContext('2d').clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
      }
      lastSavedSettings.current = JSON.stringify(entry.settings)
      renderCanvases({ bitmap: entry.bitmap, settings: entry.settings, isLowRes: false })
    }
  }

  const redo = () => {
    if (historyIndex < historyStack.length - 1) {
      isUndoingRedoing.current = true
      const nextIndex = historyIndex + 1
      setHistoryIndex(nextIndex)
      const entry = historyStack[nextIndex]
      setImgSettings(entry.settings)
      if (entry.bitmap) {
         sourceBitmapRef.current = entry.bitmap
         setPricingEstimate(calculatePricing(entry.bitmap.width, entry.bitmap.height, 0))
      }
      if (maskCanvasRef.current) {
         maskCanvasRef.current.getContext('2d').clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
      }
      lastSavedSettings.current = JSON.stringify(entry.settings)
      renderCanvases({ bitmap: entry.bitmap, settings: entry.settings, isLowRes: false })
    }
  }

  // Projects save/load logic
  const saveProjectToCloud = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to save your project.', 'error')
      return
    }
    if (!media) return;
    const name = prompt('Enter a name for your project:', exportName || 'My Project')
    if (!name) return

    setBusy('Saving project to cloud...')
    try {
      const projectData = {
        imgSettings,
        mediaInfo: {
          type: media.type,
          filename: media.file.name,
          bytes: media.bytes,
        },
        quality,
        format,
        exportName,
        trimStart,
        trimEnd,
        videoSpeed,
        tool
      }

      const res = await fetch(`${apiBaseUrl}/api/projects/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('enhix_token')}`
        },
        body: JSON.stringify({ name, projectData })
      })

      if (!res.ok) throw new Error('Failed to save project')
      showToast('Project saved successfully!', 'success')
    } catch (e) {
      setError('Save project failed: ' + e.message)
      showToast('Failed to save project', 'error')
    } finally {
      setBusy(null)
    }
  }

  const openProjectsModal = async () => {
    if (!isAuthenticated) {
      showToast('Please sign in to load projects.', 'error')
      return
    }
    setShowProjectsModal(true)
    setProjectsLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('enhix_token')}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjectsList(data.projects || [])
    } catch (e) {
      showToast('Could not load projects list', 'error')
    } finally {
      setProjectsLoading(false)
    }
  }

  const deleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('enhix_token')}`
        }
      })
      if (!res.ok) throw new Error('Failed to delete project')
      setProjectsList(prev => prev.filter(p => p.id !== id))
      showToast('Project deleted successfully', 'success')
    } catch (e) {
      showToast('Could not delete project', 'error')
    }
  }

  const loadProject = async (project) => {
    setShowProjectsModal(false)
    setBusy('Loading project settings...')
    try {
      const data = project.data
      if (!data) throw new Error('Invalid project data')

      // Set editor states
      setImgSettings(data.imgSettings)
      setQuality(data.quality)
      setFormat(data.format)
      setExportName(data.exportName)
      setTrimStart(data.trimStart || 0)
      setTrimEnd(data.trimEnd || 0)
      setVideoSpeed(data.videoSpeed || 1)
      if (data.tool) setTool(data.tool)

      // Retrieve project media
      if (data.mediaInfo && data.mediaInfo.filename) {
        setBusy(`Retrieving project media: ${data.mediaInfo.filename}...`)
        try {
          const res = await fetch(`${apiBaseUrl}/api/media/${encodeURIComponent(data.mediaInfo.filename)}`)
          if (!res.ok) throw new Error('Media file not found on server')
          const blob = await res.blob()
          const file = new File([blob], data.mediaInfo.filename, { type: blob.type })
          
          if (data.mediaInfo.type === 'video') {
            setMedia({ 
              type: 'video', 
              file, 
              url: URL.createObjectURL(file), 
              bytes: file.size 
            })
            setCurrentTime(0)
            setVideoDuration(0)
          } else {
            await loadImage(file)
          }
          showToast('Project loaded successfully!', 'success')
        } catch (mediaErr) {
          console.error(mediaErr)
          showToast('Settings loaded, but project media could not be fetched from cloud. Please upload locally.', 'warning', 6000)
        }
      } else {
        showToast('Settings loaded. No media was associated with this project.', 'success')
      }
    } catch (e) {
      setError('Load project failed: ' + e.message)
      showToast('Failed to load project', 'error')
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = videoSpeed
    }
  }, [videoSpeed])

  const canEditImage = media?.type === 'image' && !!sourceBitmapRef.current

  const headerTitle = useMemo(() => {
    return media ? (media.type === 'image' ? 'Image Editor 💖' : 'Video Editor 🎬') : 'Photo & Video Magic ✨'
  }, [media])

  async function loadImage(file) {
    setBusy('Loading image…')
    setError('')
    try {
      const url = URL.createObjectURL(file)
      const img = await new Promise((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = reject
        el.src = url
      })
      const bitmap = await createImageBitmap(img)
      originalBitmapRef.current = await createImageBitmap(img) // Create a separate pristine copy
      sourceBitmapRef.current = bitmap
      lastOriginalBlobSize.current = file.size
      setPricingEstimate(calculatePricing(bitmap.width, bitmap.height, 0))

      setMedia({ type: 'image', file, url, bytes: file.size })
      setImgSettings(() => ({
        ...defaultImageSettings(),
        quality: 0.85,
        format: 'image/jpeg'
      }))
      setQuality(85)
      setFormat('image/jpeg')
      setTool('adjust')

      
      await renderCanvases({ bitmap, settings: { ...defaultImageSettings(), quality: 0.85, format: 'image/jpeg' } })
      await estimateOutput()
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(null)
    }
  }

  const highResRenderTimeoutRef = useRef(null)

  async function renderCanvases({ bitmap, settings, isLowRes = false }) {
    const beforeCanvas = beforeCanvasRef.current
    const afterCanvas = afterCanvasRef.current
    if (!beforeCanvas || !afterCanvas) return

    const maxW = isLowRes ? 400 : 1200
    const maxH = isLowRes ? 300 : 900
    
    await renderEditedImageToCanvas({
      sourceBitmap: originalBitmapRef.current || bitmap,
      outCanvas: beforeCanvas,
      settings: { ...defaultImageSettings(), cropEnabled: settings.cropEnabled, crop: settings.crop, rotate: settings.rotate, flipX: settings.flipX, flipY: settings.flipY },
      maxW,
      maxH
    })

    await renderEditedImageToCanvas({
      sourceBitmap: bitmap,
      outCanvas: afterCanvas,
      settings,
      maxW,
      maxH
    })
  }

  function estimateOutput() {
    if (!canEditImage) return
    if (estimateOutputTimeoutRef.current) clearTimeout(estimateOutputTimeoutRef.current)
    estimateOutputTimeoutRef.current = setTimeout(async () => {
      const canvas = afterCanvasRef.current
      if (!canvas) return
      const mime = format
      const q = quality / 100
      const blob = await canvasToBlob(canvas, mime, q)
      setEstimatedOutBytes(blob?.size || 0)
    }, 400)
  }

  
  useEffect(() => {
    if (!media || !sourceBitmapRef.current) return
    const s = { ...imgSettings, quality: quality / 100, format }
    
    // Low-resolution preview for immediate UI response
    renderCanvases({ bitmap: sourceBitmapRef.current, settings: s, isLowRes: true })

    // Debounce the high-resolution render to avoid blocking the main thread while dragging sliders
    if (highResRenderTimeoutRef.current) clearTimeout(highResRenderTimeoutRef.current)
    highResRenderTimeoutRef.current = setTimeout(() => {
      renderCanvases({ bitmap: sourceBitmapRef.current, settings: s, isLowRes: false }).then(() => estimateOutput())
    }, 200)
    
    return () => {
      if (highResRenderTimeoutRef.current) clearTimeout(highResRenderTimeoutRef.current)
    }
  }, [media, imgSettings, quality, format])

  useEffect(() => {
     if (tool === 'remove' && afterCanvasRef.current && maskCanvasRef.current) {
        
        maskCanvasRef.current.width = afterCanvasRef.current.width;
        maskCanvasRef.current.height = afterCanvasRef.current.height;
     }
  }, [tool, afterCanvasRef.current?.width])

  const drawVideoFrame = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
    try {
        const bitmap = await createImageBitmap(videoRef.current)
        sourceBitmapRef.current = bitmap
        const s = { ...imgSettings, quality: quality / 100, format }
        // Low-resolution rendering during playback for high FPS video preview
        await renderCanvases({ bitmap, settings: s, isLowRes: true })
    } catch (err) {
      console.error(err)
    }
    
    if (!videoRef.current.paused && !videoRef.current.ended) {
        rafRef.current = requestAnimationFrame(drawVideoFrame)
    }
  }, [imgSettings, quality, format])

  const handlePointerDown = (e) => {
     if (tool === 'text') {
        if (!imgSettings.textEnabled) return;
        isDraggingText.current = true;
        handlePointerMove(e);
        return;
     }
     if (tool !== 'remove' || !canEditImage || !maskCanvasRef.current || !afterCanvasRef.current) return
     isDrawingMask.current = true
     handlePointerMove(e)
  }

  const handlePointerMove = (e) => {
     if (tool === 'text' && isDraggingText.current && afterCanvasRef.current) {
        const bounds = afterCanvasRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(100, ((e.clientX - bounds.left) / bounds.width) * 100))
        const y = Math.max(0, Math.min(100, ((e.clientY - bounds.top) / bounds.height) * 100))
        setImgSettings(s => ({ ...s, textX: x, textY: y }));
        return;
     }

     if (!isDrawingMask.current || tool !== 'remove' || !maskCanvasRef.current) return
     const bounds = afterCanvasRef.current.getBoundingClientRect()
     const scaleX = afterCanvasRef.current.width / bounds.width;
     const scaleY = afterCanvasRef.current.height / bounds.height;
     const x = (e.clientX - bounds.left) * scaleX
     const y = (e.clientY - bounds.top) * scaleY

     const ctx = maskCanvasRef.current.getContext('2d')
     ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'
     ctx.beginPath()
     ctx.arc(x, y, brushSize, 0, Math.PI * 2)
     ctx.fill()
  }

  const handlePointerUp = () => {
     if (isDraggingText.current) {
         isDraggingText.current = false;
     }
     isDrawingMask.current = false

     if (tool === 'remove' && maskCanvasRef.current && sourceBitmapRef.current) {
        const mCtx = maskCanvasRef.current.getContext('2d')
        const mData = mCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
        let markedPixels = 0
        for (let i = 0; i < mData.data.length; i += 4) {
           if (mData.data[i] > 50 && mData.data[i+3] > 10) {
              markedPixels++
           }
        }
        const w = sourceBitmapRef.current.width
        const h = sourceBitmapRef.current.height
        const ratio = markedPixels / (maskCanvasRef.current.width * maskCanvasRef.current.height)
        const maskArea = w * h * ratio
        setPricingEstimate(calculatePricing(w, h, maskArea))
        if (markedPixels > 0) {
           setRemoveSubTool('erase')
        }
     }
  }

  const executeGenerativeFill = async () => {
     if (!maskCanvasRef.current || !sourceBitmapRef.current) return;
     
     // Abort any running AI processes
     if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
     }
     aiAbortControllerRef.current = new AbortController();
     const signal = aiAbortControllerRef.current.signal;

     setIsGeneratingFill(true);
     setAiProgress(10);
     setError('');
     
     try {
       const originalBmp = sourceBitmapRef.current;
       const maskBmp = await createImageBitmap(maskCanvasRef.current);
       
       if (signal.aborted) return;
       setAiProgress(30);

       // Step 1: Create a low-res preview version of image and mask for fast feedback (< 1s)
       const lowResSize = computeCanvasSizeFit(originalBmp.width, originalBmp.height, 400, 300);
       
       const lowResCanvas = document.createElement('canvas');
       lowResCanvas.width = lowResSize.w;
       lowResCanvas.height = lowResSize.h;
       const lowResCtx = lowResCanvas.getContext('2d');
       lowResCtx.drawImage(originalBmp, 0, 0, lowResSize.w, lowResSize.h);
       const lowResBmp = await createImageBitmap(lowResCanvas);

       const lowResMaskCanvas = document.createElement('canvas');
       lowResMaskCanvas.width = lowResSize.w;
       lowResMaskCanvas.height = lowResSize.h;
       const lowResMaskCtx = lowResMaskCanvas.getContext('2d');
       lowResMaskCtx.drawImage(maskCanvasRef.current, 0, 0, lowResSize.w, lowResSize.h);
       const lowResMaskBmp = await createImageBitmap(lowResMaskCanvas);

       if (signal.aborted) return;
       setAiProgress(50);

       // Run inpainting on low resolution (instantly generated)
       const lowResResult = await processObjectRemovalInpaint(lowResBmp, lowResMaskBmp, cv);
       
       if (signal.aborted) return;
       setAiProgress(75);

       // Display low-res preview immediately
       sourceBitmapRef.current = lowResResult;
       const s = { ...imgSettings, quality: quality / 100, format };
       await renderCanvases({ bitmap: lowResResult, settings: s });
       pushToHistory(lowResResult, s);

       // Step 2: Run high-resolution inpainting in the background
       setTimeout(async () => {
          try {
             if (signal.aborted) return;
             const highResResult = await processObjectRemovalInpaint(originalBmp, maskBmp, cv);
             if (signal.aborted) return;

             // Lazily replace preview with the high-resolution result
             sourceBitmapRef.current = highResResult;
             await renderCanvases({ bitmap: highResResult, settings: s });
             setHistoryStack(prev => {
                const next = [...prev];
                if (next.length > 0) {
                   next[next.length - 1] = {
                      ...next[next.length - 1],
                      bitmap: highResResult
                   };
                }
                return next;
             });
             
             // Clear Mask Canvas after success
             if (maskCanvasRef.current) {
                const ctx = maskCanvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
             }
             
             setAiProgress(100);
             setIsGeneratingFill(false);
             showToast('Generative fill completed successfully at full resolution!');
          } catch (e) {
             console.error('Background high-res inpainting failed:', e);
             if (!signal.aborted) {
                setIsGeneratingFill(false);
                setError('High-resolution generative fill failed.');
             }
          }
       }, 50);

     } catch (e) {
       if (!signal.aborted) {
          setError(e.message || 'Generative Fill failed.');
          setIsGeneratingFill(false);
       }
     }
  }

  const executeSemanticMatting = async () => {
     if (!sourceBitmapRef.current) return;
     
     // Abort any running AI processes
     if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
     }
     aiAbortControllerRef.current = new AbortController();
     const signal = aiAbortControllerRef.current.signal;

     setIsExtracting(true);
     setAiProgress(10);
     setError('');
     
     try {
       const originalBmp = sourceBitmapRef.current;
       
       // Step 1: Create a low-res preview version of image for fast segmenting (< 5s)
       const lowResSize = computeCanvasSizeFit(originalBmp.width, originalBmp.height, 400, 300);
       
       const lowResCanvas = document.createElement('canvas');
       lowResCanvas.width = lowResSize.w;
       lowResCanvas.height = lowResSize.h;
       const lowResCtx = lowResCanvas.getContext('2d');
       lowResCtx.drawImage(originalBmp, 0, 0, lowResSize.w, lowResSize.h);
       const lowResBmp = await createImageBitmap(lowResCanvas);

       if (signal.aborted) return;
       setAiProgress(20);

       // Run semantic matting on low-resolution image
       const lowResResult = await processSemanticMatting(lowResBmp, (progress) => {
          if (!signal.aborted) {
             setAiProgress(20 + Math.round(progress * 40));
          }
       });

       if (signal.aborted) return;
       setAiProgress(70);

       // Display low-res preview immediately
       sourceBitmapRef.current = lowResResult;
       const s = { ...imgSettings, quality: quality / 100, format };
       await renderCanvases({ bitmap: lowResResult, settings: s });
       pushToHistory(lowResResult, s);

       // Step 2: Run high-resolution matting in the background
       setTimeout(async () => {
          try {
             if (signal.aborted) return;
             const highResResult = await processSemanticMatting(originalBmp, (progress) => {
                // Background progress (optional)
             });
             if (signal.aborted) return;

             // Lazily replace preview with the high-resolution result
             sourceBitmapRef.current = highResResult;
             await renderCanvases({ bitmap: highResResult, settings: s });
             setHistoryStack(prev => {
                const next = [...prev];
                if (next.length > 0) {
                   next[next.length - 1] = {
                      ...next[next.length - 1],
                      bitmap: highResResult
                   };
                }
                return next;
             });
             
             setAiProgress(100);
             setIsExtracting(false);
             showToast('Subject extracted successfully at full resolution!');
          } catch (e) {
             console.error('Background high-res matting failed:', e);
             if (!signal.aborted) {
                setIsExtracting(false);
                setError('High-resolution subject extraction failed.');
             }
          }
       }, 50);

     } catch (e) {
       if (!signal.aborted) {
          setError(e.message || 'Extract Subject failed.');
          setIsExtracting(false);
       }
     }
  }

  const executeLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch(`${apiBaseUrl}/api/auth/logout`, { method: 'POST' });
    } catch (e) {
      // Ignored
    }
    localStorage.removeItem('enhix_token')
    localStorage.removeItem('enhix_user')
    sessionStorage.clear()
    
    setIsLoggingOut(false)
    setShowLogoutModal(false)
    setShowSettings(false)
    setIsAuthenticated(false)
    setShowLanding(true)
    
    setLogoutToast('Logged out successfully')
    setTimeout(() => setLogoutToast(''), 3000)
  }

  function onFile(file) {
    if (!file) return
    if (file.type.startsWith('image/')) loadImage(file)
    else if (file.type.startsWith('video/')) {
      setMedia({ type: 'video', file, url: URL.createObjectURL(file), bytes: file.size })
      setTool('video')
    } else {
      setError('Unsupported file.')
    }
  }

  async function downloadMedia() {
    if (media?.type === 'video') {
       if (!media.url) return;
       const a = document.createElement('a')
       a.href = media.url
       a.download = `${exportName || 'enhix-video'}.mp4`
       a.click()
       return;
    }

    if (!canEditImage) return
    setBusy('Preparing download…')
    setError('')
    try {
      const canvas = afterCanvasRef.current
      const mime = format
      const q = quality / 100
      const blob = await canvasToBlob(canvas, mime, q)
      if (!blob) throw new Error('Export failed.')
      const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${exportName || 'enhix-edit'}.${ext}`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
      showToast('Media downloaded successfully!', 'success');
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(null)
    }
  }

  const handleCloudUpload = async (retryData = null) => {
    setError('')
    
    let fileToUpload = retryData ? retryData.fileToUpload : null
    let nameToUpload = retryData ? retryData.nameToUpload : null
    
    if (!retryData) {
      try {
        if (media.type === 'image') {
          const canvas = afterCanvasRef.current
          const mime = format
          const q = quality / 100
          fileToUpload = await canvasToBlob(canvas, mime, q)
          const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
          nameToUpload = `${exportName || 'enhix-edit'}.${ext}`
        } else {
          fileToUpload = media.file
          nameToUpload = media.file.name || 'video-edit.mp4'
        }
      } catch (e) {
        setError('Failed to prepare media: ' + e.message)
        return
      }
    }

    setLastUploadData({ fileToUpload, nameToUpload })
    setUploadProgress(0)
    
    try {
      const response = await uploadToBackend(fileToUpload, nameToUpload, (progress) => {
        setUploadProgress(progress)
      })
      setUploadProgress(null)
      showToast('Uploaded Successfully', 'success', 1500)
    } catch (e) {
      setUploadProgress(null)
      setError('Upload failed: ' + e.message)
      showToast('Upload failed. Try again.', 'error')
    }
  }

  const estVideoBytes = media && media.type === 'video' ? Math.floor(media.bytes * Math.pow(quality / 100, 1.5)) : estimatedOutBytes;

  return (
    <>
      <AnimatePresence>
        {oauthLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl"
          >
             <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
             <p className="text-slate-200 text-lg font-bold tracking-wider font-['Space_Grotesk']">{oauthLoading}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-8 py-4 rounded-full shadow-2xl border backdrop-blur-md font-bold text-base tracking-wide flex items-center gap-3 ${
              toast.type === 'error' 
                ? 'bg-rose-500/90 text-white border-rose-400 dark:bg-rose-900/90 dark:border-rose-700' 
                : 'bg-emerald-500/90 text-white border-emerald-400 dark:bg-emerald-900/90 dark:border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? '🚫' : '✨'} {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLanding && !showAuth && (
          <Landing key="landing" onEnter={() => {
             if (isAuthenticated) {
                setShowLanding(false);
             } else {
                setShowAuth(true);
                setShowLanding(false);
             }
          }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuth && (
          <Auth key="auth" onBack={() => { setShowAuth(false); setShowLanding(true); }} onLogin={() => { setIsAuthenticated(true); setShowAuth(false); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProjectsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 text-slate-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative flex h-[500px] w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0a0a0a]/95 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-black text-white font-['Space_Grotesk'] flex items-center gap-2">
                  <span>📂</span> Cloud Saved Projects
                </h3>
                <button
                  onClick={() => setShowProjectsModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  ✖️
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {projectsLoading ? (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading projects...</span>
                    </div>
                  </div>
                ) : projectsList.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                    <span className="text-4xl mb-2">📦</span>
                    <div className="font-bold">No saved projects found</div>
                    <p className="text-xs max-w-xs mt-1">Start editing and click "Save Project" to backup your work here.</p>
                  </div>
                ) : (
                  projectsList.map(project => (
                    <div 
                      key={project.id} 
                      className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white text-sm">{project.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Media: {project.data?.mediaInfo?.filename || 'Unknown'} • Updated {new Date(project.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadProject(project)}
                          className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 transition"
                        >
                          Load 📂
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20 text-rose-300 text-xs font-bold px-3 py-2 transition"
                        >
                          Delete 🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGallery && (
          <CloudGallery key="gallery" onClose={() => setShowGallery(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <Settings 
            key="settings" 
            onClose={() => setShowSettings(false)} 
            onLogout={() => setShowLogoutModal(true)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <motion.div 
              className="w-[400px] bg-[#1c1c1e] border border-white/10 rounded-2xl p-8 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h2 className="text-2xl font-bold text-white mb-2">Sign out of Enhix?</h2>
              <p className="text-[#8e8e93] text-sm mb-8">You will need to sign in again to access your projects and professional workspace.</p>
              <div className="flex gap-4 justify-end">
                <button onClick={() => setShowLogoutModal(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/10 transition text-sm font-semibold">
                  Cancel
                </button>
                <button 
                  onClick={executeLogout}
                  disabled={isLoggingOut}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff453a] to-[#ff6961] text-white transition hover:opacity-90 text-sm font-semibold shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isLoggingOut ? 'Signing out...' : 'Logout'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {logoutToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-full text-sm font-semibold shadow-lg backdrop-blur z-[100]"
          >
            {logoutToast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="min-h-full font-['Quicksand'] bg-[#030303] relative overflow-hidden text-slate-100 transition-colors duration-500 selection:bg-pink-500/30"
        initial={{ opacity: 0, y: 20 }}
        animate={(!showLanding && !showAuth) ? { opacity: 1, y: 0 } : { opacity: 0, y: 20, pointerEvents: 'none' }}
        transition={{ duration: 0.8, delay: 0.4 }}
        style={{ display: (showLanding || showAuth) ? 'none' : 'block' }}
      >
        {/* Cinematic Animated Aurora Background */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
          <motion.div 
            className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-pink-600/30 blur-[120px]"
            animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/30 blur-[150px]"
            animate={{ x: [0, -100, 0], y: [0, -50, 0], scale: [1, 1.3, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div 
            className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-purple-600/20 blur-[100px]"
            animate={{ x: [0, 50, 0], y: [0, 100, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          />
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />
        </div>

        <div className="relative z-20 border-b border-white/10 bg-white/5 backdrop-blur-xl transition-colors duration-500">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="text-3xl sm:text-4xl font-black font-['Space_Grotesk'] bg-gradient-to-r from-pink-500 via-purple-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-sm flex items-center tracking-tight cursor-default pb-2"
              whileHover={{ scale: 1.05 }}
            >
              ENHIX ✨
            </motion.div>
            <div className="leading-tight hidden sm:block ml-2 border-l border-white/20 pl-4 py-1">
              <div className="text-sm font-bold text-slate-200">{headerTitle}</div>
              <div className="text-[11px] font-bold text-pink-400 uppercase tracking-widest mt-0.5">Professional Engine</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {media && (
              <BubbleButton
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveProjectToCloud}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition hover:bg-white/20"
              >
                Save Project 💾
              </BubbleButton>
            )}
            <BubbleButton
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openProjectsModal}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition hover:bg-white/20"
            >
              Load Project 📂
            </BubbleButton>
            <BubbleButton
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGallery(true)}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition hover:bg-white/20"
            >
              Cloud Render ☁️
            </BubbleButton>
            <BubbleButton
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-sm font-bold text-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] transition hover:bg-white/20 ml-2"
              title="Settings"
            >
              ⚙️
            </BubbleButton>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLogoutModal(true)}
              className="group relative flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm font-bold text-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all duration-300 hover:border-[#ff453a]/50 hover:bg-[#ff453a]/10 hover:shadow-[0_0_20px_rgba(255,69,58,0.2)] ml-2 overflow-hidden"
              title="Sign Out"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff453a]/0 via-[#ff453a]/10 to-[#ff453a]/0 opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-in-out -translate-x-full" />
              <div className="relative flex items-center justify-center w-4 h-4 text-[#ff453a] transition-transform duration-300 group-hover:scale-110">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full relative z-10">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" className="transition-transform duration-300 group-hover:translate-x-1" />
                  <line x1="21" y1="12" x2="9" y2="12" className="transition-transform duration-300 group-hover:translate-x-1" />
                </svg>
              </div>
              <span className="relative z-10 text-[#ff453a] group-hover:text-red-400 transition-colors">Sign Out</span>
            </motion.button>
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr_320px]">
        {}
        <aside className="space-y-4">
          <TiltWrapper maxTilt={3} scale={1.01}>
            <SpotlightCard className="p-4 transition-colors duration-500">
            <div className="mb-4 px-2 text-sm font-extrabold text-pink-400 uppercase tracking-widest font-['Comfortaa']">Tools ✨</div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {TOOLS.map((t) => (
                <BubbleButton
                  key={t.id}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setTool(t.id)}
                  className={[
                    'rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all shadow-sm border',
                    tool === t.id
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-white/20 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                      : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                  ].join(' ')}
                >
                  {t.label}
                </BubbleButton>
              ))}
            </div>
          </SpotlightCard>
          </TiltWrapper>

          {!media ? <Dropzone onFile={onFile} autoStartCamera={autoStartCamera} onCancelCamera={() => setAutoStartCamera(false)} /> : null}

          {media ? (
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-black/30 p-4 text-xs text-slate-700 dark:text-slate-300 shadow-sm transition-colors duration-500 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Loaded</span>
                <span className="text-slate-500 dark:text-slate-400 font-bold">{media.type.toUpperCase()}</span>
              </div>
              <div className="mt-1 truncate text-slate-500 dark:text-slate-400">{media.file.name}</div>
              <div className="mt-2 flex items-center justify-between">
                <span>Size</span>
                <span className="tabular-nums font-bold text-pink-500 dark:text-rose-400">{formatBytes(media.bytes)}</span>
              </div>
            </div>
          ) : null}
        </aside>

        {}
        <section className="space-y-3 relative z-10">
          <SpotlightCard className="p-5 transition-colors duration-500">
            <div className="flex items-center justify-between gap-2 px-2 pb-4">
              <div className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest font-['Comfortaa']">Canvas 🎨</div>
              <div className="flex items-center gap-2">
                {media?.type !== 'video' && (
                  <Toggle checked={beforeAfterOn} onChange={setBeforeAfterOn} label="View Original" />
                )}
              </div>
            </div>

            <div className="h-[54vh] min-h-[360px] w-full">
              {!media ? (
                <div className="flex h-full items-center justify-center rounded-[1.5rem] bg-white/5 text-sm font-bold text-slate-400 shadow-inner border border-dashed border-white/10 transition-colors duration-500 hover:bg-white/10 hover:border-white/20">
                  Upload an image or video to start editing
                </div>
              ) : media.type === 'image' || media.type === 'video' ? (
                <div className="relative flex h-full w-full flex-col items-center justify-center">
                  <div className="relative flex h-full w-full flex-1 min-h-0 items-center justify-center"
                       style={{ touchAction: 'none' }}
                       onPointerDown={handlePointerDown}
                       onPointerMove={handlePointerMove}
                       onPointerUp={handlePointerUp}
                       onPointerLeave={handlePointerUp}>
                    <BeforeAfter
                      beforeCanvasRef={beforeCanvasRef}
                      afterCanvasRef={afterCanvasRef}
                      enabled={beforeAfterOn}
                    />
                    {tool === 'remove' && canEditImage && (
                       <canvas ref={maskCanvasRef} className="absolute inset-0 m-auto z-20 pointer-events-none" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    )}
                  </div>
                  {media.type === 'video' && (
                     <div className="w-full flex-shrink-0 pt-2 absolute bottom-2 z-10 opacity-60 hover:opacity-100 transition-opacity">
                       <video
                         ref={videoRef}
                         src={media.url}
                         controls
                         playsInline
                         crossOrigin="anonymous"
                         className="w-full h-10 object-cover rounded-xl shadow"
                         onLoadedMetadata={(e) => {
                             setVideoDuration(e.target.duration)
                             if (!trimEnd) setTrimEnd(e.target.duration)
                         }}
                         onTimeUpdate={(e) => {
                             setCurrentTime(e.target.currentTime)
                         }}
                         onLoadedData={(e) => {
                             setVideoDuration(e.target.duration)
                             if (!trimEnd) setTrimEnd(e.target.duration)
                             createImageBitmap(videoRef.current).then(bmp => {
                                 sourceBitmapRef.current = bmp
                                 originalBitmapRef.current = bmp
                                 const s = { ...imgSettings, quality: quality / 100, format }
                                 renderCanvases({ bitmap: bmp, settings: s, isLowRes: false })
                                 setPricingEstimate(calculatePricing(bmp.width, bmp.height, 0))
                             }).catch(()=>{})
                         }}
                         onPlay={() => {
                             cancelAnimationFrame(rafRef.current)
                             rafRef.current = requestAnimationFrame(drawVideoFrame)
                         }}
                         onPause={() => {
                             cancelAnimationFrame(rafRef.current)
                             createImageBitmap(videoRef.current).then(bmp => {
                                sourceBitmapRef.current = bmp
                                const s = { ...imgSettings, quality: quality / 100, format }
                                renderCanvases({ bitmap: bmp, settings: s, isLowRes: false })
                             }).catch(()=>{})
                         }}
                         onSeeked={() => {
                             setCurrentTime(videoRef.current.currentTime)
                             createImageBitmap(videoRef.current).then(bmp => {
                                sourceBitmapRef.current = bmp
                                const s = { ...imgSettings, quality: quality / 100, format }
                                renderCanvases({ bitmap: bmp, settings: s, isLowRes: false })
                             }).catch(()=>{})
                         }}
                       />
                     </div>
                  )}
                </div>
              ) : null}
            </div>
            {media?.type === 'video' && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <span>Timeline Layers</span>
                     <div className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] animate-pulse"></div>
                  </div>
                  <div className="flex gap-2 text-slate-500 text-[10px]">
                    <button 
                      onClick={() => { if(videoRef.current) videoRef.current.currentTime = trimStart }} 
                      className="hover:text-white transition"
                    >
                      {(() => {
                        const secs = currentTime
                        const m = Math.floor(secs / 60).toString().padStart(2, '0')
                        const s = Math.floor(secs % 60).toString().padStart(2, '0')
                        const ms = Math.floor((secs % 1) * 100).toString().padStart(2, '0')
                        return `${m}:${s}.${ms}`
                      })()}
                    </button>
                    <span>/</span>
                    <button 
                      onClick={() => { if(videoRef.current) videoRef.current.currentTime = trimEnd }} 
                      className="hover:text-white transition"
                    >
                      {(() => {
                        const secs = videoDuration
                        const m = Math.floor(secs / 60).toString().padStart(2, '0')
                        const s = Math.floor(secs % 60).toString().padStart(2, '0')
                        const ms = Math.floor((secs % 1) * 100).toString().padStart(2, '0')
                        return `${m}:${s}.${ms}`
                      })()}
                    </button>
                  </div>
                </div>
                <div 
                  ref={timelineRef}
                  onMouseDown={handleTimelineMouseDown}
                  className="flex flex-col gap-1 overflow-hidden rounded-xl border border-white/5 bg-black/20 p-2 h-32 relative group cursor-ew-resize select-none"
                >
                   {/* Playhead */}
                   <div className="absolute left-[80px] right-2 top-0 bottom-0 pointer-events-none z-20">
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-red-500 transition-colors"
                        style={{ left: `${(currentTime / (videoDuration || 1)) * 100}%` }}
                      >
                         <div className="w-2 h-2 -translate-x-[3px] rounded-sm bg-red-500" />
                      </div>
                   </div>
                   
                   {/* Video Layer */}
                   <div className="flex items-center w-full h-8 bg-white/5 rounded pl-2 text-[10px] text-slate-400 font-bold border border-white/5 hover:bg-white/10 transition-colors relative overflow-hidden">
                      <div className="w-16 flex-shrink-0 flex items-center gap-2">
                        <span>👁️ V1</span>
                      </div>
                      <div className="flex-1 h-full ml-2 relative">
                        <div 
                          className="h-6 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 rounded-sm border border-blue-400/50 absolute top-1 bottom-1 overflow-hidden group/clip"
                          style={{ 
                            left: `${(trimStart / (videoDuration || 1)) * 100}%`, 
                            width: `${(( (trimEnd || videoDuration) - trimStart) / (videoDuration || 1)) * 100}%` 
                          }}
                        >
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white z-10" />
                           <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white z-10" />
                           {media ? <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-repeat-x bg-contain opacity-40 mix-blend-screen" /> : null}
                        </div>
                      </div>
                   </div>

                   {/* Adjustment Layer (Color Grading / Filters) */}
                   <div className="flex items-center w-full h-8 bg-white/5 rounded pl-2 text-[10px] text-slate-400 font-bold border border-white/5 hover:bg-white/10 transition-colors relative overflow-hidden">
                      <div className="w-16 flex-shrink-0 flex items-center gap-2">
                        <span>✨ FX1</span>
                      </div>
                      <div className="flex-1 h-full ml-2 relative">
                        <div 
                          className="h-6 bg-gradient-to-r from-pink-500/80 to-purple-500/80 rounded-sm border border-pink-400/50 absolute top-1 bottom-1 overflow-hidden group/clip"
                          style={{ 
                            left: `${(trimStart / (videoDuration || 1)) * 100}%`, 
                            width: `${(( (trimEnd || videoDuration) - trimStart) / (videoDuration || 1)) * 100}%` 
                          }}
                        >
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white z-10" />
                           <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white z-10" />
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/clip:opacity-100 transition text-[8px] text-white">LUT: {imgSettings.lut || 'Cinematic Teal'}</div>
                        </div>
                      </div>
                   </div>

                   {/* Audio Layer */}
                   <div className="flex items-center w-full h-8 bg-white/5 rounded pl-2 text-[10px] text-slate-400 font-bold border border-white/5 hover:bg-white/10 transition-colors relative overflow-hidden">
                      <div className="w-16 flex-shrink-0 flex items-center gap-2">
                        <span>🔊 A1</span>
                      </div>
                      <div className="flex-1 h-full ml-2 relative">
                        <div 
                          className="h-6 bg-gradient-to-r from-emerald-500/80 to-teal-500/80 rounded-sm border border-emerald-400/50 absolute top-1 bottom-1 flex items-end gap-[1px] px-1 pb-1 overflow-hidden"
                          style={{ 
                            left: `${(trimStart / (videoDuration || 1)) * 100}%`, 
                            width: `${(( (trimEnd || videoDuration) - trimStart) / (videoDuration || 1)) * 100}%` 
                          }}
                        >
                           {[40, 60, 85, 30, 95, 20, 50, 45, 75, 80, 55, 65, 35, 90, 25, 45, 70, 55, 85, 30, 65, 40, 75, 50, 90, 35, 60, 45, 80, 25, 55, 70, 85, 40, 95, 30, 65, 50, 75, 45, 90, 35, 60, 40, 85, 55, 70, 45, 80, 25, 50, 65, 35, 90, 40, 75, 55, 85, 30, 60].map((val, i) => (
                             <div key={i} className="flex-1 bg-white/50 rounded-t" style={{ height: `${20 + (val * 0.8)}%` }} />
                           ))}
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </SpotlightCard>
          {busy ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm backdrop-blur-md">
              <Spinner label={busy} />
            </div>
          ) : null}
          {uploadProgress !== null && (
            <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 shadow-xl backdrop-blur-md flex flex-col items-center justify-center gap-3 w-64">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-slate-200">Uploading: {uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 flex flex-col gap-2">
              <div>{error}</div>
              {lastUploadData && (
                <button
                  type="button"
                  onClick={() => handleCloudUpload(lastUploadData)}
                  className="w-full py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition duration-200"
                >
                  Retry Upload 🔄
                </button>
              )}
            </div>
          ) : null}
        </section>

        {}
        <aside className="space-y-4 relative z-10">
          <TiltWrapper maxTilt={3} scale={1.01}>
            <SpotlightCard className="p-5 transition-colors duration-500 text-slate-200">
            <div className="mb-4 space-y-2">
              <div className="text-sm font-extrabold text-indigo-400 uppercase tracking-widest font-['Comfortaa']">Controls ⚙️</div>
              {media ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5 border border-white/5">
                    <button
                      type="button"
                      disabled={historyIndex <= 0}
                      onClick={undo}
                      title="Undo"
                      className="px-2 py-1 text-xs font-bold text-slate-300 disabled:opacity-40 disabled:pointer-events-none hover:text-white transition-colors"
                    >
                      Undo ↩️
                    </button>
                    <div className="w-px h-3 bg-white/10" />
                    <button
                      type="button"
                      disabled={historyIndex >= historyStack.length - 1}
                      onClick={redo}
                      title="Redo"
                      className="px-2 py-1 text-xs font-bold text-slate-300 disabled:opacity-40 disabled:pointer-events-none hover:text-white transition-colors"
                    >
                      Redo ↪️
                    </button>
                  </div>
                  <BubbleButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setImgSettings((s) => {
                        const base = { ...s }
                        if (tool === 'adjust') {
                          return { ...base, brightness: 0, contrast: 0, saturation: 0, vibrance: 0, exposure: 0, hue: 0, sharpness: 0, smartLightning: 0 }
                        } else if (tool === 'effects') {
                          return { ...base, enhance: 0, retouch: 0, structure: 0, texture: 0, grain: 0, fade: 0 }
                        } else if (tool === 'filters') {
                          return { ...base, filter: 'none' }
                        } else if (tool === 'beauty') {
                          return { ...base, beauty: 'none', funny: 'none' }
                        } else if (tool === 'text') {
                          return { ...base, text: '', textEnabled: false, textOpacity: 100, textGradientEnabled: false, textGradientColor: '#ff0000', textShadowBlur: 0, textGlowColor: '#00ffff', textOutlineWidth: 0, textOutlineColor: '#000000', textLetterSpacing: 0, textRotation: 0 }
                        } else if (tool === 'video') {
                          return { ...base, vhs: 0, crt: 0, chromatic: 0, vignette: 0, bloom: 0, invert: 0, emboss: 0, edgeDetect: 0, staticNoise: 0, posterize: 0 }
                        } else if (tool === 'crop') {
                          return { ...base, cropEnabled: false, rotate: 0, flipX: false, flipY: false }
                        }
                        return base
                      })
                      if (tool === 'remove' && maskCanvasRef.current) {
                         maskCanvasRef.current.getContext('2d').clearRect(0,0, maskCanvasRef.current.width, maskCanvasRef.current.height);
                      }
                      setIsExtracting(false);
                      setIsGeneratingFill(false);
                      setAiProgress(0);
                      setBusy(null);
                      if (sourceBitmapRef.current) {
                         setPricingEstimate(calculatePricing(sourceBitmapRef.current.width, sourceBitmapRef.current.height, 0));
                      } else {
                         setPricingEstimate(null);
                      }
                      if (aiAbortControllerRef.current) {
                         aiAbortControllerRef.current.abort();
                         aiAbortControllerRef.current = null;
                      }
                    }}
                    className="rounded-full bg-pink-100 dark:bg-rose-900/40 px-3 py-1 text-[11px] font-bold text-pink-500 dark:text-rose-300 shadow-sm transition hover:bg-pink-200 dark:hover:bg-rose-900/60"
                  >
                    Reset 🧹
                  </BubbleButton>
                  <BubbleButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setMedia(null)
                      sourceBitmapRef.current = null
                      originalBitmapRef.current = null
                      setError('')
                      setAutoStartCamera(true)
                    }}
                    className="rounded-full bg-purple-100 dark:bg-purple-900/40 px-3 py-1 text-[11px] font-bold text-purple-600 dark:text-purple-300 shadow-sm transition hover:bg-purple-200 dark:hover:bg-purple-900/60"
                  >
                    Retake 📸
                  </BubbleButton>
                  <BubbleButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setMedia(null)
                      sourceBitmapRef.current = null
                      originalBitmapRef.current = null
                      setError('')
                      setAutoStartCamera(false)
                    }}
                    className="rounded-full bg-blue-100 dark:bg-indigo-900/40 px-3 py-1 text-[11px] font-bold text-blue-600 dark:text-indigo-300 shadow-sm transition hover:bg-blue-200 dark:hover:bg-indigo-900/60"
                  >
                    Change 📂
                  </BubbleButton>
                </div>
              ) : null}
            </div>

            {!media ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Upload a file to unlock tools.
              </div>
            ) : (
              <div className="space-y-4">
                {tool === 'compress' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-medium text-slate-700 dark:text-slate-200">File name</label>
                       <input
                         value={exportName}
                         onChange={(e) => setExportName(e.target.value)}
                         className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                       />
                     </div>
                    <Slider
                      label="Quality (%)"
                      value={quality}
                      min={10}
                      max={100}
                      step={1}
                      onChange={(v) => setQuality(v)}
                      hint="Higher = better quality, larger file. Lower = more compression."
                    />
                    {media.type === 'video' ? (
                       <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-2">
                           {['video/mp4', 'video/webm'].map(f => (
                             <button
                               key={f} type="button" onClick={() => setFormat(f)}
                               className={['rounded-2xl px-3 py-2 text-xs font-semibold shadow-sm transition', format === f ? 'bg-gradient-to-br from-fuchsia-500 to-rose-400 text-white' : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800'].join(' ')}
                             >
                               {f === 'video/mp4' ? 'MP4' : 'WEBM'}
                             </button>
                           ))}
                         </div>
                         <BytesRow beforeBytes={media.bytes} afterBytes={estVideoBytes} />
                         <button
                           type="button"
                           onClick={async () => {
                             setBusy('Compressing video... (Using ultra-fast encoding!)')
                             setError('')
                             try {
                               const resultBlob = await processVideo(media.file, { trimStart: 0, trimEnd: 0, quality, speed: 1, format }, (log) => console.log('FFmpeg:', log.message))
                               const resultUrl = URL.createObjectURL(resultBlob)
                               const ext = format === 'video/webm' ? 'webm' : format === 'image/gif' ? 'gif' : 'mp4'
                               setMedia({ type: 'video', file: new File([resultBlob], `output.${ext}`, { type: format }), url: resultUrl, bytes: resultBlob.size })
                               
                               
                               const a = document.createElement('a')
                               a.href = resultUrl
                               a.download = `enhix-compressed.${ext}`
                               a.click()
                               showToast('Video compression completed & downloaded!', 'success');
                             } catch(e) {
                               setError(e?.message || 'Video compression failed.')
                             } finally {
                               setBusy(null)
                             }
                           }}
                           className="w-full rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-400 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                         >
                           Apply Video Compression 🗜️
                         </button>
                       </div>
                    ) : (
                       <div className="space-y-4">
                         <BytesRow beforeBytes={media.bytes} afterBytes={estVideoBytes} />
                         <button
                            type="button"
                            onClick={downloadMedia}
                            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                          >
                            Export Compressed Image ✨
                          </button>
                       </div>
                    )}
                  </div>
                ) : null}

                {tool === 'adjust' ? (
                  <>
                    <Slider label="Brightness" value={imgSettings.brightness} min={-100} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, brightness: v }))} />
                    <Slider label="Contrast" value={imgSettings.contrast} min={-100} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, contrast: v }))} />
                    <Slider label="Smart Lightning" value={imgSettings.smartLightning || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, smartLightning: v }))} hint="Recover dark shadows dynamically." />
                    <Slider label="Exposure" value={imgSettings.exposure} min={-100} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, exposure: v }))} />
                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full col-span-full"></div>
                    <Slider label="Saturation" value={imgSettings.saturation} min={-100} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, saturation: v }))} />
                    <Slider label="Vibrance" value={imgSettings.vibrance || 0} min={-100} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, vibrance: v }))} hint="Boosts dull colors without hurting skin tones." />
                    <Slider label="Hue" value={imgSettings.hue} min={-180} max={180} onChange={(v) => setImgSettings((s) => ({ ...s, hue: v }))} />
                    <Slider label="Sharpness" value={imgSettings.sharpness} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, sharpness: v }))} />
                  </>
                ) : null}

                {tool === 'effects' ? (
                  <div className="space-y-4">
                    {analysisStage ? (
                      <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-[1.5rem] border border-white/10 shadow-inner min-h-[160px]">
                         <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#ec4899] mb-4"></div>
                         <h4 className="text-sm font-bold text-white text-center animate-pulse">{analysisStage}</h4>
                      </div>
                    ) : !imgSettings.adaptiveProfile ? (
                       <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-[1.5rem] border border-white/10 shadow-inner">
                          <div className="text-4xl mb-4 animate-bounce">🤖</div>
                          <h4 className="text-lg font-bold text-white mb-2">Adaptive AI Engine</h4>
                          <p className="text-slate-400 text-xs text-center mb-6 leading-relaxed">Analyze this image's RGB distribution, dynamic range, and exposure to generate a custom recovery profile.</p>
                          <BubbleButton
                            onClick={runAIAnalysis}
                            className="w-full rounded-full bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-transform hover:scale-105"
                          >
                            Run Image Analysis ✨
                          </BubbleButton>
                       </div>
                    ) : (
                       <div className="space-y-4">
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
                             <div className="flex items-center gap-2">
                                <span className="text-emerald-400 text-lg drop-shadow-[0_0_5px_#10b981]">✓</span>
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Image Analyzed</span>
                             </div>
                             <BubbleButton onClick={() => {
                               setImgSettings(s => {
                                 const ns = {...s, adaptiveProfile: null, enhance: 0};
                                 renderCanvases({ bitmap: sourceBitmapRef.current, settings: ns });
                                 return ns;
                               });
                             }} className="text-[10px] text-slate-400 hover:text-white px-3 py-1 rounded-full bg-white/5">Reset</BubbleButton>
                          </div>
                          <Slider label="AI Intensity 🔥" value={imgSettings.enhance || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, enhance: v }))} hint="Scales the adaptive AI profile strength." />
                          <div className="h-px bg-white/10 w-full my-4"></div>
                          <Slider label="Skin Retouching" value={imgSettings.retouch || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, retouch: v }))} />
                          <Slider label="Structure" value={imgSettings.structure || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, structure: v }))} />
                          <Slider label="Texture" value={imgSettings.texture || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, texture: v }))} />
                        </div>
                     )}
                     <div className="h-px bg-white/10 w-full my-4"></div>
                     <Slider label="Grain" value={imgSettings.grain || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, grain: v }))} />
                     <Slider label="Fade" value={imgSettings.fade || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, fade: v }))} />
                  </div>
                ) : null}

                {tool === 'remove' ? (
                  <div className="space-y-4">
                    {media.type !== 'image' ? (
                       <div className="text-sm text-slate-400">Semantic AI Removal is only available for images.</div>
                    ) : (
                       <div className="space-y-4">
                         {/* Segmented Tab Control */}
                         <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                           <button
                             type="button"
                             onClick={() => setRemoveSubTool('erase')}
                             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                               removeSubTool === 'erase'
                                 ? 'bg-[#0a84ff] text-white shadow-md'
                                 : 'text-slate-400 hover:text-white'
                             }`}
                           >
                             🎨 Erase Object
                           </button>
                           <button
                             type="button"
                             onClick={() => setRemoveSubTool('bg')}
                             className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                               removeSubTool === 'bg'
                                 ? 'bg-[#0a84ff] text-white shadow-md'
                                 : 'text-slate-400 hover:text-white'
                             }`}
                           >
                             🪄 Remove Background
                           </button>
                         </div>

                         {removeSubTool === 'erase' ? (
                           /* ERASE OBJECT MODE */
                           <div className="space-y-4">
                             <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center text-lg shadow-[0_0_10px_rgba(10,132,255,0.3)]">🎨</div>
                                <h4 className="text-white font-bold text-sm">Object Eraser & Generative Fill</h4>
                                <p className="text-[11px] text-slate-400">Brush over any object (e.g. switchboard, wires, text) and erase it with context-aware AI.</p>
                             </div>

                             <div className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-2">
                               <label className="text-xs text-slate-300 font-medium">Brush Size: {brushSize}px</label>
                               <input
                                 type="range"
                                 min="5"
                                 max="80"
                                 value={brushSize}
                                 onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                 className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#0a84ff]"
                               />
                             </div>

                             {pricingEstimate && (
                               <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5 text-xs text-slate-300">
                                 <span>Estimated Cost:</span>
                                 <span className="font-mono text-purple-400 font-bold">{pricingEstimate} credits</span>
                                </div>
                             )}

                             {(isExtracting || isGeneratingFill) && (
                               <div className="space-y-2 bg-black/20 p-3 rounded-lg border border-white/5">
                                 <div className="flex justify-between text-xs text-slate-300">
                                   <span>AI Processing...</span>
                                   <span className="font-bold text-[#0a84ff]">{aiProgress}%</span>
                                 </div>
                                 <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                   <div 
                                     className="bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] h-full transition-all duration-350"
                                     style={{ width: `${aiProgress}%` }}
                                   />
                                 </div>
                                </div>
                             )}

                             <button
                               type="button"
                               disabled={isExtracting || isGeneratingFill}
                               onClick={executeGenerativeFill}
                               className={`w-full rounded-xl bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 flex justify-center items-center gap-2 ${
                                 (isExtracting || isGeneratingFill) ? 'opacity-50 cursor-not-allowed' : ''
                               }`}
                             >
                               {isGeneratingFill ? (
                                 <>
                                   <span className="animate-spin mr-1">⌛</span>
                                   <span>Erasing Object...</span>
                                 </>
                               ) : (
                                 <>
                                   <span>Erase Marked Object</span> 🎨
                                 </>
                               )}
                             </button>
                           </div>
                         ) : (
                           /* REMOVE BACKGROUND MODE */
                           <div className="space-y-4">
                             <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] flex items-center justify-center text-lg shadow-[0_0_10px_rgba(10,132,255,0.3)]">🪄</div>
                                <h4 className="text-white font-bold text-sm">Semantic Subject Extraction</h4>
                                <p className="text-[11px] text-slate-400">Uses local AI to automatically segment the foreground subject and strip away the background.</p>
                             </div>

                             <div className="space-y-2">
                               <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5">
                                 <span className="text-xs text-slate-300 font-medium">Edge Refinement</span>
                                 <Toggle checked={true} onChange={() => {}} label="" />
                                </div>
                               <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-white/5">
                                 <span className="text-xs text-slate-300 font-medium">Contextual Relighting</span>
                                 <Toggle checked={true} onChange={() => {}} label="" />
                                </div>
                             </div>

                             {pricingEstimate && (
                               <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg border border-white/5 text-xs text-slate-300">
                                 <span>Estimated Cost:</span>
                                 <span className="font-mono text-purple-400 font-bold">{(parseFloat(pricingEstimate)).toFixed(3)} credits</span>
                               </div>
                             )}

                             {(isExtracting || isGeneratingFill) && (
                               <div className="space-y-2 bg-black/20 p-3 rounded-lg border border-white/5">
                                 <div className="flex justify-between text-xs text-slate-300">
                                   <span>AI Processing...</span>
                                   <span className="font-bold text-[#0a84ff]">{aiProgress}%</span>
                                 </div>
                                 <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                   <div 
                                     className="bg-gradient-to-r from-[#0a84ff] to-[#5e5ce6] h-full transition-all duration-350"
                                     style={{ width: `${aiProgress}%` }}
                                   />
                                 </div>
                               </div>
                             )}

                             <button
                               type="button"
                               disabled={isExtracting || isGeneratingFill}
                               onClick={executeSemanticMatting}
                               className={`w-full rounded-xl bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90 flex justify-center items-center gap-2 ${
                                 (isExtracting || isGeneratingFill) ? 'opacity-50 cursor-not-allowed' : ''
                               }`}
                             >
                               {isExtracting ? (
                                 <>
                                    <span className="animate-spin mr-1">⌛</span>
                                    <span>Removing Background...</span>
                                 </>
                               ) : (
                                 <>
                                   <span>Remove Background</span> ✨
                                 </>
                               )}
                             </button>
                           </div>
                         )}
                       </div>
                    )}
                  </div>
                ) : null}

                {tool === 'filters' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'bw', label: 'B&W' },
                      { id: 'sepia', label: 'Sepia' },
                      { id: 'vintage', label: 'Vintage' },
                      { id: 'cool', label: 'Cool' },
                      { id: 'warm', label: 'Warm' },
                      { id: 'dramatic', label: 'Dramatic' },
                      { id: 'summer', label: 'Summer' },
                      { id: 'winter', label: 'Winter' },
                      { id: 'cyberpunk', label: 'Cyberpunk' },
                      { id: 'noir', label: 'Noir' },
                      { id: 'posterize', label: 'Posterize' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setImgSettings((s) => ({ ...s, filter: f.id }))}
                        className={[
                          'rounded-2xl px-2 py-3 text-sm font-semibold shadow-sm transition flex items-center justify-center',
                          (imgSettings.filter || 'none') === f.id
                            ? 'bg-gradient-to-br from-fuchsia-500 to-rose-400 text-white'
                            : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800'
                        ].join(' ')}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {tool === 'beauty' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Beauty Filter</label>
                      <select
                        value={imgSettings.beauty || 'none'}
                        onChange={(e) => setImgSettings((s) => ({ ...s, beauty: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                      >
                         <option value="none">None</option>
                         <option value="soft">Soft Smooth</option>
                         <option value="glow">Radiant Glow</option>
                         <option value="vibrant">Vibrant Warmth</option>
                         <option value="airbrush">Flawless Airbrush</option>
                         <option value="porcelain">Porcelain Skin</option>
                         <option value="sunny">Sun-Kissed</option>
                         <option value="peach">Peachy Keen</option>
                         <option value="crystal">Crystal Clear</option>
                         <option value="matte">Modern Matte</option>
                         <option value="angelic">Angelic Aura</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Funny Filter</label>
                      <select
                        value={imgSettings.funny || 'none'}
                        onChange={(e) => setImgSettings((s) => ({ ...s, funny: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                      >
                         <option value="none">None</option>
                         <option value="bulge">Bulge (Fisheye)</option>
                         <option value="pinch">Pinch</option>
                         <option value="swirl">Swirl</option>
                         <option value="pixelate">Pixelate</option>
                         <option value="wave">Wave</option>
                         <option value="ripple">Ripple</option>
                         <option value="mirror-left">Mirror Left</option>
                         <option value="mirror-top">Mirror Top</option>
                         <option value="stretch">Stretch</option>
                         <option value="squish">Squish</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                {tool === 'text' ? (
                  <div className="space-y-4">
                    <Toggle checked={imgSettings.textEnabled} onChange={(v) => {
                       if (v && media?.type !== 'image') {
                           showToast('Text overlays are currently only supported for photos!', 'error');
                           return;
                       }
                       setImgSettings((s) => ({ ...s, textEnabled: v }));
                    }} label="Enable Text Overlay" />
                    {imgSettings.textEnabled && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Enter your text here..."
                          value={imgSettings.text || ''}
                          onChange={(e) => setImgSettings((s) => ({ ...s, text: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                        />
                        <select
                          value={imgSettings.fontFamily || 'Arial'}
                          onChange={(e) => setImgSettings((s) => ({ ...s, fontFamily: e.target.value }))}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                        >
                          <option value="Arial">Arial</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Courier New">Courier New</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Verdana">Verdana</option>
                          <option value="Comic Sans MS">Comic Sans MS</option>
                          <option value="Impact">Impact</option>
                          <option value="Trebuchet MS">Trebuchet MS</option>
                          <option value="Palatino">Palatino</option>
                          <option value="Garamond">Garamond</option>
                          <option value="Bookman">Bookman</option>
                        </select>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Color</span>
                          <input type="color" value={imgSettings.color || '#ffffff'} onChange={(e) => setImgSettings((s) => ({ ...s, color: e.target.value }))} className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700 shadow-sm" />
                        </div>
                        <Slider label="Font Size" value={imgSettings.fontSize || 48} min={10} max={200} step={1} onChange={(v) => setImgSettings((s) => ({ ...s, fontSize: v }))} />
                        <Slider label="Position X (%)" value={imgSettings.textX} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, textX: v }))} />
                        <Slider label="Position Y (%)" value={imgSettings.textY} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, textY: v }))} />
                        <Slider label="Opacity (%)" value={imgSettings.textOpacity ?? 100} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, textOpacity: v }))} />
                        <Slider label="Rotation (deg)" value={imgSettings.textRotation || 0} min={-180} max={180} step={1} onChange={(v) => setImgSettings((s) => ({ ...s, textRotation: v }))} />
                        <Slider label="Letter Spacing" value={imgSettings.textLetterSpacing || 0} min={-20} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, textLetterSpacing: v }))} />
                        
                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <Toggle checked={imgSettings.textGradientEnabled} onChange={(v) => setImgSettings((s) => ({ ...s, textGradientEnabled: v }))} label="Enable Gradient Color" />
                          {imgSettings.textGradientEnabled && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Secondary Color</span>
                                <input type="color" value={imgSettings.textGradientColor || '#ff0000'} onChange={(e) => setImgSettings((s) => ({ ...s, textGradientColor: e.target.value }))} className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700 shadow-sm" />
                              </div>
                          )}
                        </div>
                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <Slider label="Neon Glow / Shadow blur" value={imgSettings.textShadowBlur || 0} min={0} max={50} onChange={(v) => setImgSettings((s) => ({ ...s, textShadowBlur: v }))} />
                          {imgSettings.textShadowBlur > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Glow Color</span>
                                <input type="color" value={imgSettings.textGlowColor || '#00ffff'} onChange={(e) => setImgSettings((s) => ({ ...s, textGlowColor: e.target.value }))} className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700 shadow-sm" />
                              </div>
                          )}
                        </div>
                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 pb-3 border-b">
                          <Slider label="Outline Width" value={imgSettings.textOutlineWidth || 0} min={0} max={20} onChange={(v) => setImgSettings((s) => ({ ...s, textOutlineWidth: v }))} />
                          {imgSettings.textOutlineWidth > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Outline Color</span>
                                <input type="color" value={imgSettings.textOutlineColor || '#000000'} onChange={(e) => setImgSettings((s) => ({ ...s, textOutlineColor: e.target.value }))} className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700 shadow-sm" />
                              </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Toggle checked={imgSettings.bold} onChange={(v) => setImgSettings((s) => ({ ...s, bold: v }))} label="Bold" />
                          <Toggle checked={imgSettings.italic} onChange={(v) => setImgSettings((s) => ({ ...s, italic: v }))} label="Italic" />
                          <Toggle checked={imgSettings.underline} onChange={(v) => setImgSettings((s) => ({ ...s, underline: v }))} label="Underline" />
                          <Toggle checked={imgSettings.strikethrough} onChange={(v) => setImgSettings((s) => ({ ...s, strikethrough: v }))} label="Strikethrough" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                {tool === 'crop' ? (
                  <>
                    <Toggle
                      checked={imgSettings.cropEnabled}
                      onChange={(v) => setImgSettings((s) => ({ ...s, cropEnabled: v }))}
                      label="Enable crop"
                    />
                    {imgSettings.cropEnabled ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setImgSettings((s) => ({ ...s, crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } }))}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Custom
                          </button>
                          <button
                            type="button"
                            onClick={() => setImgSettings((s) => ({ ...s, crop: { x: 0.2, y: 0.2, w: 0.6, h: 0.6 } }))}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            1:1
                          </button>
                          <button
                            type="button"
                            onClick={() => setImgSettings((s) => ({ ...s, crop: { x: 0.05, y: 0.25, w: 0.9, h: 0.5 } }))}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            16:9
                          </button>
                        </div>
                        <Slider label="Crop X" value={Math.round(imgSettings.crop.x * 100)} min={0} max={90} onChange={(v) => setImgSettings((s) => ({ ...s, crop: { ...s.crop, x: v / 100 } }))} />
                        <Slider label="Crop Y" value={Math.round(imgSettings.crop.y * 100)} min={0} max={90} onChange={(v) => setImgSettings((s) => ({ ...s, crop: { ...s.crop, y: v / 100 } }))} />
                        <Slider label="Crop W" value={Math.round(imgSettings.crop.w * 100)} min={10} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, crop: { ...s.crop, w: v / 100 } }))} />
                        <Slider label="Crop H" value={Math.round(imgSettings.crop.h * 100)} min={10} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, crop: { ...s.crop, h: v / 100 } }))} />
                      </div>
                    ) : null}

                    <Slider label="Rotate" value={imgSettings.rotate} min={-180} max={180} onChange={(v) => setImgSettings((s) => ({ ...s, rotate: v }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <Toggle checked={imgSettings.flipX} onChange={(v) => setImgSettings((s) => ({ ...s, flipX: v }))} label="Flip horizontal" />
                      <Toggle checked={imgSettings.flipY} onChange={(v) => setImgSettings((s) => ({ ...s, flipY: v }))} label="Flip vertical" />
                    </div>
                  </>
                ) : null}

                {tool === 'export' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-200">File name</label>
                      <input
                        value={exportName}
                        onChange={(e) => setExportName(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(media.type === 'video' ? [
                        { v: 'video/mp4', l: 'MP4' },
                        { v: 'video/webm', l: 'WEBM' },
                        { v: 'image/gif', l: 'GIF' }
                      ] : [
                        { v: 'image/jpeg', l: 'JPG' },
                        { v: 'image/png', l: 'PNG' },
                        { v: 'image/webp', l: 'WEBP' }
                      ]).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setFormat(o.v)}
                          className={[
                            'rounded-2xl px-3 py-2 text-xs font-semibold shadow-sm transition',
                            format === o.v
                              ? 'bg-gradient-to-br from-fuchsia-500 to-rose-400 text-white'
                              : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800'
                          ].join(' ')}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                    <Slider label="Quality" value={quality} min={30} max={100} onChange={setQuality} />
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                      Estimated size: <span className="font-semibold">{formatBytes(estVideoBytes)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={downloadMedia}
                        className="w-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={handleCloudUpload}
                        className="w-1/2 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      >
                        Upload to Cloud API
                      </button>
                    </div>
                  </>
                ) : null}
                {tool === 'video' ? (
                  <div className="space-y-4">
                    {media.type !== 'video' ? (
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        This is an image. Video tools are not applicable.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Slider label="Trim Start (s)" value={Math.round(trimStart * 10) / 10} min={0} max={videoRef.current?.duration || 100} step={0.1} onChange={(v) => { setTrimStart(v); if (videoRef.current) videoRef.current.currentTime = v; }} />
                        <Slider label="Trim End (s)" value={Math.round((trimEnd || (videoRef.current?.duration || 100)) * 10) / 10} min={0} max={videoRef.current?.duration || 100} step={0.1} onChange={(v) => setTrimEnd(v)} />
                        <Slider label="Video Speed" value={videoSpeed} min={0.1} max={10.0} step={0.1} onChange={(v) => setVideoSpeed(v)} hint="Adjust playback and export speed" />
                        
                        <div className="h-px bg-slate-200 dark:bg-slate-700 w-full col-span-full my-4"></div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Advanced Video Effects</div>
                        <Slider label="VHS Glitch" value={imgSettings.vhs || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, vhs: v }))} />
                        <Slider label="CRT Scanlines" value={imgSettings.crt || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, crt: v }))} />
                        <Slider label="Chromatic Aberration" value={imgSettings.chromatic || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, chromatic: v }))} />
                        <Slider label="Vignette" value={imgSettings.vignette || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, vignette: v }))} />
                        <Slider label="Bloom (Glow)" value={imgSettings.bloom || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, bloom: v }))} />
                        <Slider label="Invert Colors" value={imgSettings.invert || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, invert: v }))} />
                        <Slider label="Emboss" value={imgSettings.emboss || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, emboss: v }))} />
                        <Slider label="Edge Detect" value={imgSettings.edgeDetect || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, edgeDetect: v }))} />
                        <Slider label="Static Noise" value={imgSettings.staticNoise || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, staticNoise: v }))} />
                        <Slider label="Pop Art (Posterize)" value={imgSettings.posterize || 0} min={0} max={100} onChange={(v) => setImgSettings((s) => ({ ...s, posterize: v }))} />

                        <button
                          type="button"
                          onClick={async () => {
                            setBusy('Recording embedded effects... (Please wait)')
                            setError('')
                            try {
                              const stream = afterCanvasRef.current.captureStream(30)
                              const audioStream = videoRef.current.captureStream ? videoRef.current.captureStream() : videoRef.current.mozCaptureStream ? videoRef.current.mozCaptureStream() : null;
                              if (audioStream && audioStream.getAudioTracks().length > 0) {
                                  stream.addTrack(audioStream.getAudioTracks()[0]);
                              }
                              const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
                              const chunks = []
                              recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
                              
                              const recordingRec = new Promise(resolve => {
                                 recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
                              })
                              
                              videoRef.current.currentTime = trimStart || 0
                              videoRef.current.play()
                              recorder.start()
    
                              await new Promise(resolve => {
                                 const checkTime = () => {
                                   if (videoRef.current.ended || (trimEnd && videoRef.current.currentTime >= trimEnd)) {
                                     videoRef.current.pause()
                                     recorder.stop()
                                     videoRef.current.removeEventListener('timeupdate', checkTime)
                                     resolve()
                                   }
                                 }
                                 videoRef.current.addEventListener('timeupdate', checkTime)
                              })
    
                              setBusy('Converting to MP4 format...')
                              const webmBlob = await recordingRec
                              const resultBlob = await processVideo(new File([webmBlob], 'output.webm', { type: 'video/webm' }), { trimStart: 0, trimEnd: 0, quality, speed: videoSpeed }, (log) => console.log('FFmpeg:', log.message))
                              const resultUrl = URL.createObjectURL(resultBlob)
                              
                              setMedia({ type: 'video', file: new File([resultBlob], 'output.mp4', { type: 'video/mp4' }), url: resultUrl, bytes: resultBlob.size })
                            } catch(e) {
                              setError(e?.message || 'Video processing failed.')
                            } finally {
                              setBusy(null)
                            }
                          }}
                          className="w-full rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-400 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                          Process & Embed Effects
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </SpotlightCard>
          </TiltWrapper>

          {media?.type === 'image' ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-xs text-slate-300 shadow-sm backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Compression preview</span>
                <span className="text-slate-500 dark:text-slate-400">{formatBytes(media.bytes)} → {formatBytes(estimatedOutBytes)}</span>
              </div>
              <div className="mt-2">
                <BytesRow beforeBytes={media.bytes} afterBytes={estimatedOutBytes} />
              </div>
            </div>
          ) : null}
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-col justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 md:flex-row">
          <span>© {new Date().getFullYear()} Enhix · Photo & Video Editor</span>
          <span className="flex gap-3">
            <a className="hover:text-slate-900 dark:hover:text-slate-50" href="#">About</a>
            <a className="hover:text-slate-900 dark:hover:text-slate-50" href="#">Contact</a>
            <a className="hover:text-slate-900 dark:hover:text-slate-50" href="#">Instagram</a>
            <a className="hover:text-slate-900 dark:hover:text-slate-50" href="#">YouTube</a>
          </span>
        </div>
      </footer>
      </motion.div>
    </>
  )
}

export default App