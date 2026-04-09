/**
 * MNIST-style preprocessing pipeline.
 *
 * MNIST digits are:
 *   – 28×28 grayscale images
 *   – White digit on black background
 *   – Digit is fit within a 20×20 box, centered by center-of-mass
 *     inside the 28×28 frame (giving ~4px padding)
 *
 * Pipeline:
 *   1. Read pixel data from the 280×280 source canvas
 *   2. Find bounding box of non-black pixels (the drawn digit)
 *   3. Crop tightly around the digit
 *   4. Scale the crop to fit inside a 20×20 area (preserve aspect ratio)
 *   5. Compute center of mass and place digit so its center-of-mass
 *      aligns with the center of the 28×28 image
 *   6. Convert to grayscale, normalize to [0.01, 1.0]
 */

export function processCanvas(sourceCanvas) {
  // ── 1. Read source pixel data ──────────────────────────────────────
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, sw, sh).data;

  // ── 2. Find bounding box of the drawn digit ───────────────────────
  let minX = sw, minY = sh, maxX = 0, maxY = 0;
  const THRESHOLD = 30; // pixel brightness threshold to count as "drawn"

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = (y * sw + x) * 4;
      const r = srcData[idx];
      const g = srcData[idx + 1];
      const b = srcData[idx + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      if (brightness > THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If nothing was drawn, return a blank (all 0.01) array
  if (maxX <= minX || maxY <= minY) {
    console.warn('[MNIST Debug] Canvas appears blank — no drawn pixels detected.');
    const blank = new Array(784).fill(0.01);
    return { array: blank, dataUrl: '' };
  }

  // Add a small margin around the bounding box (2px in source resolution)
  const margin = 4;
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(sw - 1, maxX + margin);
  maxY = Math.min(sh - 1, maxY + margin);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  console.log(`[MNIST Debug] Bounding box: (${minX},${minY}) → (${maxX},${maxY})  crop: ${cropW}×${cropH}`);

  // ── 3. Crop the digit onto a temporary canvas ──────────────────────
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');
  cropCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  // ── 4. Scale to fit within 20×20, preserving aspect ratio ──────────
  const fitSize = 20;
  const scale = Math.min(fitSize / cropW, fitSize / cropH);
  const scaledW = Math.round(cropW * scale);
  const scaledH = Math.round(cropH * scale);

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = scaledW;
  scaledCanvas.height = scaledH;
  const scaledCtx = scaledCanvas.getContext('2d');
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = 'medium';
  scaledCtx.drawImage(cropCanvas, 0, 0, scaledW, scaledH);

  // ── 5. Compute center of mass and place on 28×28 canvas ────────────
  const scaledData = scaledCtx.getImageData(0, 0, scaledW, scaledH).data;

  let massX = 0, massY = 0, totalMass = 0;
  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const idx = (y * scaledW + x) * 4;
      const brightness = 0.299 * scaledData[idx] + 0.587 * scaledData[idx + 1] + 0.114 * scaledData[idx + 2];
      massX += x * brightness;
      massY += y * brightness;
      totalMass += brightness;
    }
  }

  // Center of mass of the scaled digit
  const comX = totalMass > 0 ? massX / totalMass : scaledW / 2;
  const comY = totalMass > 0 ? massY / totalMass : scaledH / 2;

  // Place digit so its center-of-mass sits at (14, 14) — center of 28×28
  const targetSize = 28;
  const offsetX = Math.round(14 - comX);
  const offsetY = Math.round(14 - comY);

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetSize;
  finalCanvas.height = targetSize;
  const finalCtx = finalCanvas.getContext('2d');

  // Black background
  finalCtx.fillStyle = '#000000';
  finalCtx.fillRect(0, 0, targetSize, targetSize);

  // Draw the scaled digit centered by center-of-mass
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'medium';
  finalCtx.drawImage(scaledCanvas, offsetX, offsetY);

  // ── 6. Extract, convert to grayscale, normalize ────────────────────
  const finalData = finalCtx.getImageData(0, 0, targetSize, targetSize).data;
  const array = new Array(targetSize * targetSize);

  for (let i = 0; i < finalData.length; i += 4) {
    const r = finalData[i];
    const g = finalData[i + 1];
    const b = finalData[i + 2];

    // Luminance-weighted grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Canvas is already white-on-black (matching MNIST convention).
    // No inversion needed — gray=255 for strokes, gray=0 for background.
    // Normalize to [0.01, 1.0]
    const normalized = (gray / 255.0) * 0.99 + 0.01;
    array[i / 4] = normalized;
  }

  // ── 7. Debug logging ───────────────────────────────────────────────
  const nonBg = array.filter(v => v > 0.05).length;
  console.log('[MNIST Debug] First 50 values:', array.slice(0, 50));
  console.log(`[MNIST Debug] Non-background pixels (>0.05): ${nonBg} / ${array.length}`);
  console.log(`[MNIST Debug] Max: ${Math.max(...array).toFixed(4)}  Min: ${Math.min(...array).toFixed(4)}`);
  console.log(`[MNIST Debug] Center-of-mass offset: dx=${offsetX}, dy=${offsetY}`);
  console.log(`[MNIST Debug] Scaled digit size: ${scaledW}×${scaledH}`);

  const dataUrl = finalCanvas.toDataURL();
  return { array, dataUrl };
}
