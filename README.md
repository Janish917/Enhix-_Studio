# ENHIX

ENHIX is a browser-based photo editor that implements custom computational photography pipelines and generative AI tools client-side. Built on React and Vite, it uses WebGPU and WASM runtimes to run heavy image processing tasks directly in the user's browser, eliminating server-side rendering lag.

## Key Features

### Intelligent AI Photo Enhancement
Instead of applying global, static filters, the app performs a local diagnostic pass on the image's pixels. It detects exposure, white balance, and noise levels, then classifies the scene (e.g., portrait, landscape, low-light) to apply custom tuning offsets.
* **Skin Retouching:** Applies edge-preserving skin smoothing for portraits while keeping hair, eyes, and pores sharp to prevent a "plastic" filter look.
* **Scene-Specific Color & Lighting:** Compresses highlights in bright outdoor photos, boosts shadow detail in low-light shots, and enriches colors in skies and foliage.

### Generative Fill & Object Eraser
* **Context-Aware Inpainting:** Brush over unwanted elements using the red mask tool. The editor removes the object and reconstructs the background by matching the original texture, lighting, and shadow patterns.
* **Dual-Resolution Execution:** AI tasks run on a split pipeline. A low-resolution preview renders in under 5 seconds, while the full-resolution asset processes in the background.

### Fast Subject Extraction
* **Background Removal:** Isolates subjects from their backgrounds using lightweight browser-based matting.
* **Active Task Cancellation:** All background processes support instant cancellation (using AbortControllers) if settings change or the image is reset.

### Canvas History (Undo / Redo)
* Tracks adjustments and destructive AI stages by keeping immutable image references in a stack.
* Instantly restores sliders, brush masks, and dynamic cost metrics when navigating back and forth.

---

## Technical Stack

* **Frontend:** React, TailwindCSS, Vite
* **Execution:** ONNX Runtime Web (WebGPU/WASM), `@imgly/background-removal`
* **Backend Helper:** Node.js, Express (used for basic asset routing)

---

## Local Setup

### 1. Run the Backend

```bash
cd backend-nodejs
npm install
npm start
```

### 2. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```
