export function processCanvas(sourceCanvas) {
  // Create an off-screen canvas to scale down the image
  const targetSize = 28;
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = targetSize;
  offscreenCanvas.height = targetSize;
  const ctx = offscreenCanvas.getContext('2d');

  // Ensure solid black background just in case
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Draw the source canvas onto the 28x28 canvas
  // The source canvas should ideally have a black background and white strokes
  ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);

  // Extract the image data
  const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
  const data = imageData.data;

  // Convert to grayscale 1D array of floats [0-1]
  // In our canvas, white is the stroke, black is the bg.
  // MNIST typically expects white stroke (1.0) and black bg (0.0).
  const grayscaleArray = new Float32Array(targetSize * targetSize);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Simple luminance calculation or just take RED since it's white on black
    const luminance = (r + g + b) / 3;
    // Normalize to 0.0 - 1.0
    const normalized = luminance / 255.0;
    
    const pixelIndex = i / 4;
    grayscaleArray[pixelIndex] = normalized;
  }

  return {
    array: Array.from(grayscaleArray),
    dataUrl: offscreenCanvas.toDataURL() // Useful for debugging or visualizing the scaled down version
  };
}
