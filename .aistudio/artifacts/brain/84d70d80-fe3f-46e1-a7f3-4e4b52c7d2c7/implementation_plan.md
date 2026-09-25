# Implementation Plan - Maroonot Maximum Smoothness & Performance Optimization

Optimize the Maroonot platform across desktop and mobile devices for 60 FPS animations, smooth scrolling, instant interaction latency, and low CPU/GPU footprint, strictly preserving all existing visual design, typography, brand colors, layout, and functionality.

---

## User Review Required

> [!IMPORTANT]
> - **Visual Identity Untouched**: All colors, fonts, layout grids, hero designs, and user flows remain 100% intact.
> - **Mobile Adaptive Rendering**: On mobile devices, video autoplay is optimized with an IntersectionObserver and poster fallback to prevent device heating and battery drain; PDF viewer pages offscreen will be windowed/lazy-loaded to achieve butter-smooth 60 FPS scrolling without memory spikes.
> - **Hardware Acceleration**: Heavy CSS filters (such as `blur(120px)`) and Framer Motion loops will be GPU-promoted (`transform: translate3d(0,0,0)`, `content-visibility: auto`) and throttled when offscreen.

---

## Proposed Changes

### 1. CSS & Rendering Pipeline (`src/index.css`)
- **GPU-Accelerate Blurred Ambient Mesh**:
  - Add `will-change: transform`, `transform: translateZ(0)`, and `contain: strict` to heavy decorative gradient blobs (`.ambient-mesh-glow`).
  - Optimize the custom animated gradient blobs to use hardware-accelerated `transform` and `opacity` rather than repainting filter properties.
- **Scroll & Paint Optimization**:
  - Apply `content-visibility: auto` and `contain-intrinsic-size` to below-the-fold sections (e.g., Curriculum Modules, Student Reviews, FAQ) so mobile browsers only layout and paint elements visible in the viewport.
  - Implement `@media (hover: none) and (pointer: coarse)` mobile optimizations to disable unnecessary heavy hover recalculations.

### 2. Layout & Global Background (`src/components/layout/Layout.tsx`)
- **Offscreen Throttling**:
  - Throttled backdrop-blur headers with hardware acceleration layer to eliminate scroll stutter in mobile Safari/Chrome.
  - Optimize the animated gradient canvas/elements so they pause rendering when the user is scrolled far down or when tab is inactive (`requestAnimationFrame` / document visibility check).

### 3. Hero Video & Media Optimization (`src/pages/Home.tsx`)
- **Mobile-Smart Video Loading**:
  - Add `preload="none"` or `preload="metadata"` with an `IntersectionObserver` so the hero video doesn't block critical page load on slow mobile cellular networks.
  - Use poster frame on mobile while loading to give instantaneous First Contentful Paint (FCP).
  - Automatically pause the video loop when scrolled out of view to save 30-40% GPU/CPU overhead while reading down the page.

### 4. Interactive Components & Framer Motion (`src/components/ReviewsSection.tsx`, `src/pages/YearSelection.tsx`)
- **Motion Optimization**:
  - On mobile devices, replace continuous infinite-loop CPU animations with GPU-composited CSS keyframes or static snapshots.
  - Use Framer Motion's `layout="position"` or CSS transforms instead of layout-triggering properties (`width`, `height`, `top`).
  - Wrap review carousel in touch-optimized, hardware-accelerated flex track.

### 5. Document Viewer Smoothness & Memory Footprint (`src/pages/ModuleViewer.tsx`)
- **Virtual Page Rendering**:
  - Implement lightweight viewport windowing for multi-page documents: only render the active page plus 1 page buffer (previous/next) while displaying lightweight skeleton placeholders for faraway pages.
  - Drastically slashes DOM node count on 50+ page PDFs, eliminating mobile crashes and scroll lag.
  - Ensure zoom and mobile fullscreen gestures remain silky-smooth at 60 FPS.

### 6. Security Event Throttling (`src/components/security/SecurityProtection.tsx`)
- **Throttling DevTools & Key Listeners**:
  - Throttle resize and keyboard event listeners so they don't fire continuously on every frame during touch scrolls or pinch-to-zoom on mobile.

---

## Verification Plan

### Automated Build & Lint Verification
- Run `npm run lint` (`lint_applet`) to ensure clean TypeScript checks and zero syntax errors.
- Run `npm run build` (`compile_applet`) to verify bundle optimization and production build integrity.

### Performance & Visual Fidelity Checks
- **Visual Parity**: Verify side-by-side that every color, gradient, card design, and typography match the current live version.
- **Mobile Viewport Testing**: Test on simulated mobile screen dimensions (375px - 430px) ensuring fluid touch scrolling with zero dropped frames.
- **Desktop Fluidity**: Confirm hero animations, module expansion, and smooth review controls run effortlessly.
- **PDF Viewer Responsiveness**: Verify loading a multi-page PDF renders instantly and scrolls without memory stutter.
