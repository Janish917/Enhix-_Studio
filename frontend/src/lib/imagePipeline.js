import { removeBackground } from '@imgly/background-removal';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function defaultImageSettings() {
  return {
    
    brightness: 0, 
    contrast: 0, 
    saturation: 0, 
    vibrance: 0, 
    exposure: 0, 
    hue: 0, 
    sharpness: 0, 

    
    enhance: 0, 
    retouch: 0, 
    structure: 0, 
    texture: 0, 
    grain: 0, 
    fade: 0, 
    smartLightning: 0, 
    filter: 'none',

    
    beauty: 'none',
    funny: 'none',

    
    textEnabled: false,
    text: '',
    fontFamily: 'Arial',
    fontSize: 48,
    color: '#ffffff',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    textOpacity: 100,
    textGradientEnabled: false,
    textGradientColor: '#ff0000',
    textShadowBlur: 0,
    textGlowColor: '#00ffff',
    textOutlineWidth: 0,
    textOutlineColor: '#000000',
    textLetterSpacing: 0,
    textRotation: 0,
    textX: 50,
    textY: 50,

    
    vhs: 0,
    crt: 0,
    chromatic: 0,
    vignette: 0,
    bloom: 0,
    invert: 0,
    emboss: 0,
    edgeDetect: 0,
    staticNoise: 0,
    posterize: 0,

    
    rotate: 0, 
    flipX: false,
    flipY: false,

    
    cropEnabled: false,
    crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },

    
    quality: 0.85, 
    format: 'image/jpeg' 
  }
}

export function computeCanvasSizeFit(srcW, srcH, maxW, maxH) {
  const s = Math.min(maxW / srcW, maxH / srcH, 1)
  return { w: Math.max(1, Math.round(srcW * s)), h: Math.max(1, Math.round(srcH * s)), scale: s }
}

export async function analyzeImageProfile(bitmap) {
  const maxDim = 150;
  const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const numPixels = data.length / 4;

  let totalR = 0, totalG = 0, totalB = 0;
  let totalLum = 0, totalSat = 0;
  const hist = new Array(256).fill(0);
  let skinPixels = 0;
  let diffSum = 0;
  let diffCount = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      
      totalR += r;
      totalG += g;
      totalB += b;
      
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLum += lum;
      hist[Math.min(255, Math.floor(lum))]++;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const chroma = maxC - minC;
      totalSat += maxC === 0 ? 0 : (chroma / maxC) * 255;

      // Skin Tone Heuristic Rule
      if (r > 95 && g > 40 && b > 20 && (r - g) > 15 && r > g && r > b) {
         skinPixels++;
      }

      // Horizontal adjacent difference for texture frequency / noise
      if (x < w - 1) {
         const nextIdx = idx + 4;
         const nr = data[nextIdx];
         const ng = data[nextIdx+1];
         const nb = data[nextIdx+2];
         const nLum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
         diffSum += Math.abs(lum - nLum);
         diffCount++;
      }
    }
  }

  const avgR = totalR / numPixels;
  const avgG = totalG / numPixels;
  const avgB = totalB / numPixels;
  const avgLum = totalLum / numPixels;
  const avgSat = totalSat / numPixels;
  const skinRatio = skinPixels / numPixels;
  const avgDiff = diffCount > 0 ? diffSum / diffCount : 0;

  let lumVarSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumVarSum += Math.pow(lum - avgLum, 2);
  }
  const stdDevLum = Math.sqrt(lumVarSum / numPixels);

  // Compute Percentiles for Dynamic Range
  let lowPercentile = 0;
  let highPercentile = 255;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += hist[i];
    if (sum >= numPixels * 0.05 && lowPercentile === 0) {
      lowPercentile = i;
    }
    if (sum >= numPixels * 0.95 && highPercentile === 255) {
      highPercentile = i;
    }
  }
  const dynamicRange = highPercentile - lowPercentile;

  // Scene Classification
  let scene = 'standard';
  if (skinRatio > 0.08) {
    scene = 'portrait';
  } else if (avgLum < 55) {
    scene = 'lowlight';
  } else if (avgLum > 175) {
    scene = 'bright';
  } else {
    let greenBlueCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (g > r * 1.1 && g > b * 0.9) greenBlueCount++;
      else if (b > r * 1.2 && b > g * 0.9) greenBlueCount++;
    }
    const natureRatio = greenBlueCount / numPixels;
    if (natureRatio > 0.2) {
      scene = 'landscape';
    }
  }

  const profile = {
    scene,
    avgLum,
    avgSat,
    stdDevLum,
    dynamicRange,
    avgDiff,
    skinRatio,
    
    brightnessOffset: 0,
    contrastOffset: 0,
    exposureOffset: 0,
    saturationOffset: 0,
    vibranceOffset: 0,
    highlightsOffset: 0,
    shadowsOffset: 0,
    temperatureOffset: 0,
    tintOffset: 0,

    smartLightningOffset: 0,
    structureOffset: 0,
    textureOffset: 0,
    sharpnessOffset: 0,
    retouchOffset: 0,
    noiseReductionOffset: 0
  };

  // Adaptive scene heuristics
  if (scene === 'lowlight') {
    profile.exposureOffset = 25;
    profile.brightnessOffset = 10;
    profile.shadowsOffset = 40;
    profile.highlightsOffset = -10;
    profile.smartLightningOffset = 50;
    profile.noiseReductionOffset = 40;
    profile.contrastOffset = 15;
    profile.vibranceOffset = 15;
    profile.temperatureOffset = 5;
  } else if (scene === 'bright') {
    profile.exposureOffset = -10;
    profile.highlightsOffset = -35;
    profile.shadowsOffset = 10;
    profile.contrastOffset = 15;
    profile.smartLightningOffset = 15;
    profile.sharpnessOffset = 10;
    profile.structureOffset = 5;
  } else if (scene === 'portrait') {
    profile.retouchOffset = 45;
    profile.textureOffset = -15;
    profile.structureOffset = 5;
    profile.sharpnessOffset = 15;
    profile.shadowsOffset = 15;
    profile.highlightsOffset = -5;
    profile.exposureOffset = 5;
    profile.vibranceOffset = 10;
    if (avgR > avgG && avgG > avgB) {
       profile.temperatureOffset = 3;
    }
  } else if (scene === 'landscape') {
    profile.structureOffset = 25;
    profile.textureOffset = 15;
    profile.sharpnessOffset = 25;
    profile.contrastOffset = 20;
    profile.vibranceOffset = 20;
    profile.saturationOffset = 5;
    profile.highlightsOffset = -15;
    profile.shadowsOffset = 15;
    profile.smartLightningOffset = 25;
  } else {
    profile.contrastOffset = 10;
    profile.sharpnessOffset = 15;
    profile.structureOffset = 10;
    profile.smartLightningOffset = 20;
    profile.vibranceOffset = 10;
    profile.shadowsOffset = 10;
    profile.highlightsOffset = -10;
  }

  // Fine-tune profile
  if (dynamicRange < 100) {
    profile.contrastOffset += 15;
    profile.structureOffset += 10;
  } else if (dynamicRange > 220) {
    profile.highlightsOffset -= 15;
    profile.shadowsOffset += 15;
    profile.smartLightningOffset += 15;
  }

  if (avgDiff < 3) {
    profile.sharpnessOffset += 20;
    profile.structureOffset += 15;
  } else if (avgDiff > 25) {
    profile.sharpnessOffset -= 10;
    profile.noiseReductionOffset += 25;
  }

  return profile;
}

function applyFunnyFilter(imageData, type) {
  if (!type || type === 'none') return imageData;
  const { data, width, height } = imageData
  const out = new Uint8ClampedArray(data.length)
  const cx = width / 2
  const cy = height / 2
  const maxRadius = Math.min(width, height) / 2

  for(let i = 0; i<data.length; i++) out[i] = data[i]

  if (type === 'pixelate') {
     const size = 15;
     for (let y = 0; y < height; y++) {
       for (let x = 0; x < width; x++) {
         const bx = Math.floor(x/size)*size;
         const by = Math.floor(y/size)*size;
         const srcI = (by * width + bx) * 4;
         const dstI = (y * width + x) * 4;
         out[dstI] = data[srcI];
         out[dstI+1] = data[srcI+1];
         out[dstI+2] = data[srcI+2];
         out[dstI+3] = data[srcI+3];
       }
     }
     return new ImageData(out, width, height);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let srcX = x;
      let srcY = y;
      
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (type === 'wave') {
         srcX = x + Math.sin(y / 20) * 15;
      } else if (type === 'ripple') {
         srcX = x + Math.sin(dist / 10) * 10;
         srcY = y + Math.cos(dist / 10) * 10;
      } else if (type === 'mirror-left') {
         srcX = x > cx ? width - x : x;
      } else if (type === 'mirror-top') {
         srcY = y > cy ? height - y : y;
      } else if (type === 'stretch') {
         srcX = cx + (dx * 0.5);
      } else if (type === 'squish') {
         srcX = cx + (dx * 1.5);
      } else {
          if (dist < maxRadius) {
            const r = dist / maxRadius
            let a = Math.atan2(dy, dx)
            let rn = r;
    
            if (type === 'bulge') {
                rn = Math.pow(r, 1.6)
            } else if (type === 'pinch') {
                rn = Math.pow(r, 0.5)
            } else if (type === 'swirl') {
                a += (1 - r) * 2;
            }
            
            srcX = Math.round(cx + rn * maxRadius * Math.cos(a))
            srcY = Math.round(cy + rn * maxRadius * Math.sin(a))
          }
      }

      srcX = Math.max(0, Math.min(width - 1, Math.round(srcX)));
      srcY = Math.max(0, Math.min(height - 1, Math.round(srcY)));
        
      const srcI = (srcY * width + srcX) * 4
      const dstI = (y * width + x) * 4
      out[dstI] = data[srcI]
      out[dstI+1] = data[srcI+1]
      out[dstI+2] = data[srcI+2]
      out[dstI+3] = data[srcI+3]
    }
  }
  return new ImageData(out, width, height)
}

function applyConvolutions(imageData, settings) {
  const enhScale = clamp((settings.enhance || 0) / 100, 0, 1)
  const offsets = settings.adaptiveProfile || {};
  
  const autoSharp = (offsets.sharpnessOffset || 0) * enhScale;
  const autoStruct = (offsets.structureOffset || 0) * enhScale;
  const autoTexture = (offsets.textureOffset || 0) * enhScale;
  const autoRetouch = (offsets.retouchOffset || 0) * enhScale;
  const autoNoiseReduction = (offsets.noiseReductionOffset || 0) * enhScale;

  const sharpAmt = clamp(((settings.sharpness + autoSharp) / 100) + (enhScale * 0.15), 0, 1)
  const structAmt = clamp(((settings.structure + autoStruct) / 100) + (enhScale * 0.10), 0, 1)
  const textureAmt = clamp(((settings.texture || 0) + autoTexture) / 100 + (enhScale * 0.05), 0, 1)
  let retouchAmt = clamp(((settings.retouch || 0) + autoRetouch) / 100 + (enhScale * 0.10), 0, 1)
  const noiseReductAmt = clamp(autoNoiseReduction / 100, 0, 1)
  
  if (settings.beauty && settings.beauty !== 'none') {
      const b = settings.beauty;
      if (b === 'soft') { retouchAmt = Math.max(retouchAmt, 0.7); }
      if (b === 'glow') { retouchAmt = Math.max(retouchAmt, 0.9); }
      if (b === 'vibrant') { retouchAmt = Math.max(retouchAmt, 0.7); }
      if (b === 'airbrush') { retouchAmt = Math.max(retouchAmt, 1.0); }
      if (b === 'porcelain') { retouchAmt = Math.max(retouchAmt, 0.9); }
      if (b === 'sunny') { retouchAmt = Math.max(retouchAmt, 0.6); }
      if (b === 'peach') { retouchAmt = Math.max(retouchAmt, 0.8); }
      if (b === 'crystal') { retouchAmt = Math.max(retouchAmt, 0.8); }
      if (b === 'matte') { retouchAmt = Math.max(retouchAmt, 0.9); }
      if (b === 'angelic') { retouchAmt = Math.max(retouchAmt, 1.0); }
  }

  if (sharpAmt <= 0 && structAmt <= 0 && textureAmt <= 0 && retouchAmt <= 0 && noiseReductAmt <= 0) return imageData

  // 1. Sharpening/Laplacian Convolution Kernel
  const sAmt = sharpAmt * 0.8 + structAmt * 0.6 + textureAmt * 0.4;
  const kSharp = [
    -sAmt * 0.5, -sAmt, -sAmt * 0.5,
    -sAmt,       1 + sAmt * 6, -sAmt,
    -sAmt * 0.5, -sAmt, -sAmt * 0.5
  ];

  // 2. Smoothing/Denoising Kernel
  const rAmt = retouchAmt * 0.7 + noiseReductAmt * 0.6;
  const w = rAmt / 9;
  const kSmooth = [
    w, w, w,
    w, 1 - rAmt + w, w,
    w, w, w
  ];

  const { data, width, height } = imageData
  const out = new Uint8ClampedArray(data.length)
  const widthMinus1 = width - 1
  const heightMinus1 = height - 1
  
  for (let y = 0; y < height; y++) {
    const yOffset = y * width;
    for (let x = 0; x < width; x++) {
      const o = (yOffset + x) * 4
      const or = data[o], og = data[o+1], ob = data[o+2], oa = data[o+3];
      
      if (oa === 0) {
         out[o] = 0; out[o+1] = 0; out[o+2] = 0; out[o+3] = 0;
         continue;
      }

      // Convolve
      let sr = 0, sg = 0, sb = 0;
      let smr = 0, smg = 0, smb = 0;
      
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        let yy = y + ky
        if (yy < 0) yy = 0; else if (yy > heightMinus1) yy = heightMinus1
        const yyOffset = yy * width
        
        for (let kx = -1; kx <= 1; kx++) {
          let xx = x + kx
          if (xx < 0) xx = 0; else if (xx > widthMinus1) xx = widthMinus1
          
          const p = (yyOffset + xx) * 4
          const alpha = data[p + 3] / 255
          
          const ws = kSharp[ki];
          const wm = kSmooth[ki];
          ki++;
          
          sr += data[p] * ws * alpha;
          sg += data[p+1] * ws * alpha;
          sb += data[p+2] * ws * alpha;
          
          smr += data[p] * wm * alpha;
          smg += data[p+1] * wm * alpha;
          smb += data[p+2] * wm * alpha;
        }
      }

      // Skin Tone detection
      const isSkin = or > 95 && og > 40 && ob > 20 && (or - og) > 15 && or > og && or > ob;
      
      // Calculate local contrast/edge distance
      const edgeDist = Math.abs(or - smr) + Math.abs(og - smg) + Math.abs(ob - smb);
      
      let finalR = or;
      let finalG = og;
      let finalB = ob;

      if (isSkin) {
         // Smooth blemishes, protect pores/texture and high-contrast facial edges
         const smoothBlend = Math.max(0, Math.min(1, retouchAmt * (1 - edgeDist / 50)));
         finalR = or * (1 - smoothBlend) + smr * smoothBlend;
         finalG = og * (1 - smoothBlend) + smg * smoothBlend;
         finalB = ob * (1 - smoothBlend) + smb * smoothBlend;

         // Keep natural pores by layering subtle micro-sharpening
         const sharpBlend = sharpAmt * 0.15;
         finalR += (sr - or) * sharpBlend;
         finalG += (sg - og) * sharpBlend;
         finalB += (sb - ob) * sharpBlend;
      } else {
         // Background/Objects: selective noise reduction or crisp details
         if (noiseReductAmt > 0 && edgeDist < 12) {
            finalR = or * (1 - noiseReductAmt) + smr * noiseReductAmt;
            finalG = og * (1 - noiseReductAmt) + smg * noiseReductAmt;
            finalB = ob * (1 - noiseReductAmt) + smb * noiseReductAmt;
         } else {
            finalR = sr;
            finalG = sg;
            finalB = sb;
         }
      }

      out[o] = finalR < 0 ? 0 : (finalR > 255 ? 255 : finalR);
      out[o+1] = finalG < 0 ? 0 : (finalG > 255 ? 255 : finalG);
      out[o+2] = finalB < 0 ? 0 : (finalB > 255 ? 255 : finalB);
      out[o+3] = oa;
    }
  }
  return new ImageData(out, width, height)
}

function applyAdjustments(imageData, settings) {
  const { data } = imageData
  
  const enhAmt = (settings.enhance || 0) / 100
  const offsets = settings.adaptiveProfile || {};
  
  const autoBright = (offsets.brightnessOffset || 0) * enhAmt;
  const bright = Math.max(0, 1 + ((settings.brightness + autoBright) / 100) * 0.6 + (enhAmt * 0.05))
  
  const autoExpo = (offsets.exposureOffset || 0) * enhAmt;
  const exposure = Math.max(0, 1 + ((settings.exposure + autoExpo) / 100) * 0.5)
  const totalMult = bright * exposure

  const autoCont = (offsets.contrastOffset || 0) * enhAmt;
  const cont = Math.max(0, 1 + ((settings.contrast + autoCont) / 100) * 0.6 + (enhAmt * 0.1))
  
  const autoSat = (offsets.saturationOffset || 0) * enhAmt;
  const sat = Math.max(0, 1 + ((settings.saturation + autoSat) / 100) * 1.0)
  const hue = settings.hue || 0
  
  const autoVib = (offsets.vibranceOffset || 0) * enhAmt;
  const vibranceVal = ((settings.vibrance + autoVib) / 100) + (enhAmt * 0.2)
  const hasVibrance = vibranceVal !== 0
  
  const hasMult = totalMult !== 1
  const hasCont = cont !== 1
  const hasSat = sat !== 1
  
  const hasHue = hue !== 0
  const hasFilter = settings.filter && settings.filter !== 'none'
  const hasFade = (settings.fade || 0) > 0
  const hasGrain = (settings.grain || 0) > 0
  
  const autoLight = (offsets.smartLightningOffset || 0) * enhAmt;
  const lightAmt = clamp(((settings.smartLightning + autoLight) / 100) + (enhAmt * 0.3), 0, 1)
  const hasLightning = lightAmt > 0
  const hasBeauty = settings.beauty && settings.beauty !== 'none'

  // Dynamic ranges / highlights / shadows
  const autoHigh = (offsets.highlightsOffset || 0) * enhAmt;
  const highAmt = autoHigh / 100;
  
  const autoShadow = (offsets.shadowsOffset || 0) * enhAmt;
  const shadowAmt = autoShadow / 100;

  // Temperature / Tint offsets
  const autoTemp = (offsets.temperatureOffset || 0) * enhAmt;
  const tempVal = autoTemp * 0.4;
  const autoTint = (offsets.tintOffset || 0) * enhAmt;
  const tintVal = autoTint * 0.4;

  const hasHighShadow = (highAmt !== 0 || shadowAmt !== 0);
  const hasTempTint = (tempVal !== 0 || tintVal !== 0);

  if (!hasMult && !hasCont && !hasSat && !hasVibrance && !hasHue && !hasFilter && !hasFade && !hasGrain && !hasLightning && !hasBeauty && !hasHighShadow && !hasTempTint && enhAmt === 0) return imageData

  // Pre-calculate beauty settings
  let tr = 0, tg = 0, tb = 0, str = 0;
  const b_type = settings.beauty;
  if (hasBeauty) {
    if (b_type === 'soft') { tr=255; tg=240; tb=230; str=0.06; }
    else if (b_type === 'glow') { tr=255; tg=230; tb=210; str=0.10; }
    else if (b_type === 'vibrant') { tr=255; tg=210; tb=170; str=0.10; }
    else if (b_type === 'airbrush') { tr=255; tg=245; tb=240; str=0.05; }
    else if (b_type === 'porcelain') { tr=240; tg=245; tb=255; str=0.08; }
    else if (b_type === 'sunny') { tr=255; tg=220; tb=150; str=0.12; }
    else if (b_type === 'peach') { tr=255; tg=210; tb=180; str=0.10; }
    else if (b_type === 'crystal') { tr=220; tg=240; tb=255; str=0.08; }
    else if (b_type === 'angelic') { tr=255; tg=250; tb=240; str=0.10; }
  }

  const cosA = Math.cos(hue * Math.PI / 180)
  const sinA = Math.sin(hue * Math.PI / 180)
  const hueMat = [
    0.213 + cosA*0.787 - sinA*0.213,  0.715 - cosA*0.715 - sinA*0.715,  0.072 - cosA*0.072 + sinA*0.928,
    0.213 - cosA*0.213 + sinA*0.143,  0.715 + cosA*0.285 + sinA*0.140,  0.072 - cosA*0.072 - sinA*0.283,
    0.213 - cosA*0.213 - sinA*0.787,  0.715 - cosA*0.715 + sinA*0.715,  0.072 + cosA*0.928 + sinA*0.072
  ]

  const filterType = settings.filter || 'none'
  const fadeAmt = (settings.fade || 0) / 100
  const grainAmt = (settings.grain || 0) / 100

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i+1]
    let b = data[i+2]

    // Scene and region analytics
    const lum = 0.299*r + 0.587*g + 0.114*b;
    const isSkin = r > 95 && g > 40 && b > 20 && (r - g) > 15 && r > g && r > b;
    const isSky = b > r * 1.15 && b > g * 1.1 && lum > 70;
    const isFoliage = g > r * 1.1 && g > b * 1.0 && lum > 40;

    // Region-specific color enhancements
    if (enhAmt > 0) {
      if (isSkin) {
         r = r * 1.02;
         g = g * 0.99;
         b = b * 0.96;
      } else if (isSky) {
         b = b * 1.05;
         r = r * 0.97;
      } else if (isFoliage) {
         g = g * 1.04;
         b = b * 0.97;
      }
    }
    
    // Highlights & Shadows dynamic corrections
    if (hasHighShadow) {
       const hMask = Math.max(0, Math.min(1, (lum - 100) / 155));
       const hFactor = 1 + highAmt * hMask * hMask;
       
       const sMask = Math.max(0, Math.min(1, (155 - lum) / 155));
       const sFactor = shadowAmt * sMask * sMask * 75;
       
       r = r * hFactor + sFactor;
       g = g * hFactor + sFactor;
       b = b * hFactor + sFactor;
    }

    // Temperature & Tint
    if (hasTempTint) {
       r += tempVal;
       g += tintVal * 0.5;
       b -= tempVal;
    }
    
    if (hasLightning) {
       const l = 0.3*r + 0.59*g + 0.11*b;
       const fill = lightAmt * 127.5;
       const shadowMask = 1 - (l / 255);
       const smoothMask = shadowMask * shadowMask;
       const liftAmt = fill * smoothMask;
       
       r += liftAmt;
       g += liftAmt;
       b += liftAmt;
    }

    if (hasMult) {
      r *= totalMult
      g *= totalMult
      b *= totalMult
    }

    if (hasCont) {
      r = (r - 128) * cont + 128
      g = (g - 128) * cont + 128
      b = (b - 128) * cont + 128
    }

    if (hasSat) {
      const l = 0.299 * r + 0.587 * g + 0.114 * b
      r = l + sat * (r - l)
      g = l + sat * (g - l)
      b = l + sat * (b - l)
    }

    if (hasVibrance) {
      const maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
      const minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
      const curSat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      const vibSat = 1 + (vibranceVal * (1 - curSat > 0 ? 1 - curSat : 0));
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const vr = l + vibSat * (r - l);
      const vg = l + vibSat * (g - l);
      const vb = l + vibSat * (b - l);
      r = vr; g = vg; b = vb;
    }

    if (hasHue) {
      const nr = r * hueMat[0] + g * hueMat[1] + b * hueMat[2]
      const ng = r * hueMat[3] + g * hueMat[4] + b * hueMat[5]
      const nb = r * hueMat[6] + g * hueMat[7] + b * hueMat[8]
      r = nr; g = ng; b = nb;
    }

    if (hasFilter) {
      if (filterType === 'bw') {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = l;
      } else if (filterType === 'sepia') {
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = tr; g = tg; b = tb;
      } else if (filterType === 'vintage') {
        const tr = 0.393 * r + 0.769 * g + 0.189 * b;
        const tg = 0.349 * r + 0.686 * g + 0.168 * b;
        const tb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = tr * 0.9 + 20; g = tg * 0.9 + 20; b = tb * 0.9 + 40;
      } else if (filterType === 'cool') {
        b = b * 1.2; r = r * 0.9;
      } else if (filterType === 'warm') {
        r = r * 1.2; g = g * 1.1; b = b * 0.8;
      } else if (filterType === 'dramatic') {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r = l + 0.2 * (r - l); g = l + 0.2 * (g - l); b = l + 0.2 * (b - l);
        r = (r - 128) * 1.5 + 128; g = (g - 128) * 1.5 + 128; b = (b - 128) * 1.5 + 128;
      } else if (filterType === 'summer') {
        r = r * 1.15; g = g * 1.1; b = b * 0.9;
      } else if (filterType === 'winter') {
        r = r * 0.9; b = b * 1.15;
      } else if (filterType === 'cyberpunk') {
        r = r * 1.4; if (r > 255) r = 255;
        g = g * 0.6;
        b = b * 1.4; if (b > 255) b = 255;
      } else if (filterType === 'noir') {
        let l2 = 0.299*r + 0.587*g + 0.114*b;
        l2 = (l2 - 128)*1.5 + 128;
        r = g = b = l2;
      } else if (filterType === 'posterize') {
        r = Math.floor(r / 64) * 64 + 32; g = Math.floor(g / 64) * 64 + 32; b = Math.floor(b / 64) * 64 + 32;
      }
    }

    if (hasBeauty) {
      if (str > 0) {
        r = r * (1 - str) + (tr * str);
        g = g * (1 - str) + (tg * str);
        b = b * (1 - str) + (tb * str);
      }
      if (b_type === 'matte') {
        r = (r - 128) * 0.93 + 128 + 8;
        g = (g - 128) * 0.93 + 128 + 8;
        b = (b - 128) * 0.93 + 128 + 8;
      }
    }

    if (hasFade) {
      const lift = fadeAmt * 80;
      const oneMinusPctR = 1 - r/255;
      const oneMinusPctG = 1 - g/255;
      const oneMinusPctB = 1 - b/255;
      r = r + lift * (oneMinusPctR * oneMinusPctR);
      g = g + lift * (oneMinusPctG * oneMinusPctG);
      b = b + lift * (oneMinusPctB * oneMinusPctB);
    }

    if (hasGrain) {
       const noise = (Math.random() - 0.5) * grainAmt * 80;
       r += noise; g += noise; b += noise;
    }

    data[i] = r < 0 ? 0 : (r > 255 ? 255 : r)
    data[i+1] = g < 0 ? 0 : (g > 255 ? 255 : g)
    data[i+2] = b < 0 ? 0 : (b > 255 ? 255 : b)
  }
  return imageData
}

function applyVideoEffects(imageData, settings) {
  const vhsStr = settings.vhs || 0;
  const crtStr = settings.crt || 0;
  const chromeStr = settings.chromatic || 0;
  const vigStr = settings.vignette || 0;
  const bloomStr = settings.bloom || 0;
  const invStr = settings.invert || 0;
  const embStr = settings.emboss || 0;
  const edgeStr = settings.edgeDetect || 0;
  const noiseStr = settings.staticNoise || 0;
  const popStr = settings.posterize || 0;

  if (vhsStr === 0 && crtStr === 0 && chromeStr === 0 && vigStr === 0 && bloomStr === 0 &&
      invStr === 0 && embStr === 0 && edgeStr === 0 && noiseStr === 0 && popStr === 0) {
    return imageData;
  }

  const { data, width, height } = imageData;
  const out = new Uint8ClampedArray(data.length);
  out.set(data);
  const cx = width / 2;
  const cy = height / 2;

  
  if (embStr > 0 || edgeStr > 0) {
    const orig = new Uint8ClampedArray(out);
    const embAmt = embStr / 100;
    const edgeAmt = edgeStr / 100;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        let r = orig[i], g = orig[i+1], b = orig[i+2];

        if (embAmt > 0) {
           const idx00 = ((y-1)*width + (x-1))*4;
           const idx22 = ((y+1)*width + (x+1))*4;
           r += ((orig[idx00] - orig[idx22]) * embAmt) + (128 * embAmt);
           g += ((orig[idx00+1] - orig[idx22+1]) * embAmt) + (128 * embAmt);
           b += ((orig[idx00+2] - orig[idx22+2]) * embAmt) + (128 * embAmt);
        }

        if (edgeAmt > 0) {
           const left = (y*width + (x-1))*4;
           const right = (y*width + (x+1))*4;
           const top = ((y-1)*width + x)*4;
           const bot = ((y+1)*width + x)*4;
           const edgeR = (4 * orig[i] - orig[left] - orig[right] - orig[top] - orig[bot]) * edgeAmt;
           const edgeG = (4 * orig[i+1] - orig[left+1] - orig[right+1] - orig[top+1] - orig[bot+1]) * edgeAmt;
           const edgeB = (4 * orig[i+2] - orig[left+2] - orig[right+2] - orig[top+2] - orig[bot+2]) * edgeAmt;
           r = r * (1 - edgeAmt) + Math.abs(edgeR);
           g = g * (1 - edgeAmt) + Math.abs(edgeG);
           b = b * (1 - edgeAmt) + Math.abs(edgeB);
        }
        
        out[i] = r; out[i+1] = g; out[i+2] = b;
      }
    }
  }

  
  const time = Date.now();
  const chromeOffset = Math.floor(chromeStr / 5);
  const popLevels = popStr > 0 ? Math.max(2, 10 - Math.floor(popStr / 10)) : 0;
  const popScale = popStr > 0 ? (256 / popLevels) : 0;
  const vigFactor = vigStr / 100;
  const invFactor = invStr / 100;
  const noiseScale = noiseStr * 2.5;

  for (let y = 0; y < height; y++) {
    
    let xShift = 0;
    if (vhsStr > 0) {
      if (Math.random() < 0.05) xShift = Math.floor((Math.random() - 0.5) * (vhsStr / 2));
      if (Math.sin(y * 0.1 + time * 0.01) > 0.9) xShift += Math.floor(vhsStr / 10);
    }
    
    
    let crtMult = 1.0;
    if (crtStr > 0 && y % 3 === 0) {
      crtMult = 1.0 - (crtStr / 200); 
    }

    const dy = (y - cy) / cy;
    const dy2 = dy * dy;

    for (let x = 0; x < width; x++) {
      let srcX = x - xShift;
      if (srcX < 0) srcX = 0; else if (srcX >= width) srcX = width - 1;
      
      const i = (y * width + srcX) * 4;
      const o = (y * width + x) * 4;

      let r = out[i];
      let g = out[i+1];
      let b = out[i+2];

      
      if (chromeStr > 0) {
         let offsetR = srcX - chromeOffset;
         if (offsetR < 0) offsetR = 0; else if (offsetR >= width) offsetR = width - 1;
         let offsetB = srcX + chromeOffset;
         if (offsetB < 0) offsetB = 0; else if (offsetB >= width) offsetB = width - 1;
         
         r = out[(y * width + offsetR) * 4];
         b = out[(y * width + offsetB) * 4 + 2];
      }

      
      r *= crtMult; g *= crtMult; b *= crtMult;

      
      if (invStr > 0) {
         r = r * (1 - invFactor) + (255 - r) * invFactor;
         g = g * (1 - invFactor) + (255 - g) * invFactor;
         b = b * (1 - invFactor) + (255 - b) * invFactor;
      }

      
      if (popStr > 0) {
         r = Math.floor(r / 256 * popLevels) * popScale;
         g = Math.floor(g / 256 * popLevels) * popScale;
         b = Math.floor(b / 256 * popLevels) * popScale;
      }

      
      if (noiseStr > 0) {
         const noise = (Math.random() - 0.5) * noiseScale;
         r += noise; g += noise; b += noise;
      }

      
      if (vigStr > 0) {
           const dx = (x - cx) / cx;
           const dist = Math.sqrt(dx*dx + dy2);
           const vigVal = 1 - (dist * vigFactor);
           const vig = vigVal < 0 ? 0 : vigVal;
           r *= vig; g *= vig; b *= vig;
      }

      data[o] = r < 0 ? 0 : (r > 255 ? 255 : r);
      data[o+1] = g < 0 ? 0 : (g > 255 ? 255 : g);
      data[o+2] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }
  }

  
  if (bloomStr > 0) {
      const bloomAmt = bloomStr / 100;
      for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4;
              let lum = (data[i] + data[i+1] + data[i+2]) / 3;
              if (lum > 200) {
                 data[i] += lum * bloomAmt;
                 data[i+1] += lum * bloomAmt;
                 data[i+2] += lum * bloomAmt;
              }
          }
      }
  }

  return new ImageData(data, width, height);
}

export async function renderEditedImageToCanvas({
  sourceBitmap,
  outCanvas,
  settings,
  maxW,
  maxH
}) {
  const ctx = outCanvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  const srcW = sourceBitmap.width
  const srcH = sourceBitmap.height
  const { w, h, scale } = computeCanvasSizeFit(srcW, srcH, maxW, maxH)
  outCanvas.width = w
  outCanvas.height = h

  ctx.save()
  ctx.clearRect(0, 0, w, h)

  
  let sx = 0, sy = 0, sw = srcW, sh = srcH
  if (settings.cropEnabled) {
    sx = clamp(settings.crop.x, 0, 1) * srcW
    sy = clamp(settings.crop.y, 0, 1) * srcH
    sw = clamp(settings.crop.w, 0.01, 1) * srcW
    sh = clamp(settings.crop.h, 0.01, 1) * srcH
    
    if (sx + sw > srcW) sw = srcW - sx
    if (sy + sh > srcH) sh = srcH - sy
  }

  
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = sw
  tempCanvas.height = sh
  const tctx = tempCanvas.getContext('2d')
  tctx.drawImage(sourceBitmap, sx, sy, sw, sh, 0, 0, sw, sh)

  
  const cx = w / 2
  const cy = h / 2
  ctx.translate(cx, cy)
  const rad = (settings.rotate * Math.PI) / 180
  ctx.rotate(rad)
  ctx.scale(settings.flipX ? -1 : 1, settings.flipY ? -1 : 1)

  
  const dw = (sw * scale)
  const dh = (sh * scale)
  ctx.drawImage(tempCanvas, 0, 0, sw, sh, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()

  
  
  let imgData = ctx.getImageData(0, 0, w, h)
  imgData = applyAdjustments(imgData, settings)

  imgData = applyConvolutions(imgData, settings)
  
  if (settings.funny && settings.funny !== 'none') {
    imgData = applyFunnyFilter(imgData, settings.funny)
  }

  imgData = applyVideoEffects(imgData, settings)

  ctx.putImageData(imgData, 0, 0)

  
  if (settings.textEnabled && settings.text) {
    ctx.save()
    const fontSize = settings.fontSize || 48
    const fontFamily = settings.fontFamily || 'Arial'
    const weight = settings.bold ? 'bold' : 'normal'
    const style = settings.italic ? 'italic' : 'normal'
    
    ctx.font = `${style} ${weight} ${fontSize}px ${fontFamily}`
    ctx.globalAlpha = (settings.textOpacity ?? 100) / 100
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    
    if ('letterSpacing' in ctx) {
      ctx.letterSpacing = `${settings.textLetterSpacing || 0}px`
    }

    const tx = w * ((settings.textX ?? 50) / 100)
    const ty = h * ((settings.textY ?? 50) / 100)

    ctx.translate(tx, ty)
    if (settings.textRotation) {
      ctx.rotate((settings.textRotation * Math.PI) / 180)
    }

    if (settings.textShadowBlur > 0) {
      ctx.shadowColor = settings.textGlowColor || '#00ffff'
      ctx.shadowBlur = settings.textShadowBlur
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
    }

    if (settings.textGradientEnabled) {
      const metrics = ctx.measureText(settings.text)
      const gradWidth = Math.max(10, metrics.width)
      const gradient = ctx.createLinearGradient(-gradWidth/2, 0, gradWidth/2, 0)
      gradient.addColorStop(0, settings.color || '#ffffff')
      gradient.addColorStop(1, settings.textGradientColor || '#ff0000')
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = settings.color || '#ffffff'
    }

    
    ctx.fillText(settings.text, 0, 0)

    if (settings.textOutlineWidth > 0) {
      ctx.lineWidth = settings.textOutlineWidth;
      ctx.strokeStyle = settings.textOutlineColor || '#000000';
      const oldShadowBlur = ctx.shadowBlur;
      ctx.shadowBlur = 0;
      ctx.strokeText(settings.text, 0, 0);
      ctx.shadowBlur = oldShadowBlur;
    }

    if (settings.underline || settings.strikethrough) {
       const metrics = ctx.measureText(settings.text)
       const textWidth = metrics.width
       const th = Math.max(1, fontSize * 0.08)
       
       if (settings.underline) {
          const uy = fontSize * 0.4
          ctx.fillRect(-textWidth/2, uy, textWidth, th)
       }
       if (settings.strikethrough) {
          ctx.fillRect(-textWidth/2, -th/2, textWidth, th)
       }
    }
    ctx.restore()
  }
}

export async function canvasToBlob(canvas, mime, quality) {
  const q = mime === 'image/png' ? 1 : clamp(quality, 0.05, 1)
  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, q))
}

export async function processObjectRemovalInpaint(sourceBitmap, maskBitmap, cv) {
  const width = sourceBitmap.width;
  const height = sourceBitmap.height;
  
  // 1. Draw original and mask on temporary high-res canvas/buffers
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(sourceBitmap, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, width, height);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  maskCtx.drawImage(maskBitmap, 0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);

  // 2. Find bounding box of the mask to isolate inpainting area
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let hasMask = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = maskData.data[idx];
      const a = maskData.data[idx + 3];
      if (r > 50 && a > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasMask = true;
      }
    }
  }

  if (!hasMask) {
    return await createImageBitmap(sourceBitmap);
  }

  // 3. Add margin to bounding box for context, clamped to image boundaries
  const margin = 100;
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(width - 1, maxX + margin);
  maxY = Math.min(height - 1, maxY + margin);

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  // 4. Crop src and mask to bounding box
  const cropSrcCanvas = document.createElement('canvas');
  cropSrcCanvas.width = boxW;
  cropSrcCanvas.height = boxH;
  const cropSrcCtx = cropSrcCanvas.getContext('2d');
  cropSrcCtx.drawImage(srcCanvas, minX, minY, boxW, boxH, 0, 0, boxW, boxH);
  const cropSrcData = cropSrcCtx.getImageData(0, 0, boxW, boxH);

  const cropMaskCanvas = document.createElement('canvas');
  cropMaskCanvas.width = boxW;
  cropMaskCanvas.height = boxH;
  const cropMaskCtx = cropMaskCanvas.getContext('2d');
  cropMaskCtx.drawImage(maskCanvas, minX, minY, boxW, boxH, 0, 0, boxW, boxH);
  const cropMaskData = cropMaskCtx.getImageData(0, 0, boxW, boxH);

  // 5. Setup OpenCV Mats for the cropped area
  const srcMat4 = cv.matFromImageData(cropSrcData);
  const srcMat3 = new cv.Mat();
  const maskMat = new cv.Mat(boxH, boxW, cv.CV_8UC1);
  const outMat3 = new cv.Mat();
  const outMat4 = new cv.Mat();

  cv.cvtColor(srcMat4, srcMat3, cv.COLOR_RGBA2RGB);

  for (let i = 0; i < cropMaskData.data.length; i += 4) {
     const r = cropMaskData.data[i];
     const a = cropMaskData.data[i+3];
     const isMask = r > 50 && a > 10;
     maskMat.data[i/4] = isMask ? 255 : 0;
  }

  // 6. Perform inpainting on the cropped Mat
  cv.inpaint(srcMat3, maskMat, outMat3, 5, cv.INPAINT_TELEA);
  cv.cvtColor(outMat3, outMat4, cv.COLOR_RGB2RGBA);

  const inpaintedBoxData = outMat4.data;

  // 7. Blend the inpainted cropped box back into the high-res original imageData using mask as weight
  for (let y = 0; y < boxH; y++) {
    for (let x = 0; x < boxW; x++) {
      const cropIdx = (y * boxW + x) * 4;
      const maskAlpha = cropMaskData.data[cropIdx + 3] / 255.0;
      const maskVal = cropMaskData.data[cropIdx] / 255.0;
      const weight = maskAlpha * maskVal;

      if (weight > 0) {
        const origX = minX + x;
        const origY = minY + y;
        const origIdx = (origY * width + origX) * 4;

        srcData.data[origIdx] = inpaintedBoxData[cropIdx] * weight + srcData.data[origIdx] * (1 - weight);
        srcData.data[origIdx + 1] = inpaintedBoxData[cropIdx + 1] * weight + srcData.data[origIdx + 1] * (1 - weight);
        srcData.data[origIdx + 2] = inpaintedBoxData[cropIdx + 2] * weight + srcData.data[origIdx + 2] * (1 - weight);
        srcData.data[origIdx + 3] = inpaintedBoxData[cropIdx + 3] * weight + srcData.data[origIdx + 3] * (1 - weight);
      }
    }
  }

  // 8. Clean up OpenCV Mats
  srcMat4.delete();
  srcMat3.delete();
  maskMat.delete();
  outMat3.delete();
  outMat4.delete();

  // 9. Put the modified original imageData back onto the canvas and return the high-res ImageBitmap
  srcCtx.putImageData(srcData, 0, 0);
  return await createImageBitmap(srcCanvas);
}

export async function processSemanticMatting(bitmap, progressCallback) {
  // Convert bitmap to canvas to draw / convert to blob
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  
  // Obtain blob of the image to send to the img.ly AI model
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  
  // Call img.ly background removal library
  const processedBlob = await removeBackground(blob, {
    progress: (state, progress) => {
      // Log progress (can be seen in console)
      console.log(`[AI Matting] State: ${state}, Progress: ${Math.round(progress * 100)}%`);
      if (progressCallback) {
        progressCallback(progress);
      }
    }
  });
  
  // Load processed blob back into ImageBitmap
  const img = new Image();
  const url = URL.createObjectURL(processedBlob);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  URL.revokeObjectURL(url);
  
  return await createImageBitmap(img);
}

