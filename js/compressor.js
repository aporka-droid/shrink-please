export const LIMITS = { bytes: 30 * 1024 * 1024, pixels: 40_000_000, dimension: 16384 };
export const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Check the signature as well as decoding: file extensions and MIME labels are not trustworthy.
async function detectType(file) {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg';
  if ([137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)) return 'image/png';
  if (String.fromCharCode(...b.slice(0,4)) === 'RIFF' && String.fromCharCode(...b.slice(8,12)) === 'WEBP') return 'image/webp';
  throw new Error('Please choose a JPG, PNG or WebP image. This file type isn’t supported.');
}

export async function decodeFile(file) {
  if (file.size > LIMITS.bytes) throw new Error('That image is too large. Choose a file under 30 MB.');
  const type = await detectType(file);
  let image;
  try {
    image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This image couldn’t be opened. It may be damaged or unsupported by your browser.');
  }
  if (!image.width || !image.height || image.width * image.height > LIMITS.pixels || Math.max(image.width,image.height) > LIMITS.dimension) {
    image.close();
    throw new Error('This image is too large to process safely. Use an image under 40 megapixels and 16,384 pixels per side.');
  }
  return { file, type, image, width: image.width, height: image.height };
}

export async function compress(source, { width, height, type, quality }) {
  if (![width,height].every(n => Number.isInteger(n) && n > 0) || width > source.width || height > source.height) throw new Error('Enter valid dimensions within the original image size.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser couldn’t create an image canvas. Try a smaller image.');
    if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,width,height); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source.image,0,0,width,height);
    const blob = await new Promise((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Encoding failed. Try a smaller image.')),type,quality / 100));
    if (blob.type !== type) throw new Error('Your browser doesn’t support this output format. Please choose another format.');
    return { blob, width, height, type: blob.type };
  } finally { canvas.width = 0; canvas.height = 0; }
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function downloadName(filename, type) {
  const base = filename.replace(/\.[^.]+$/, '') || 'image';
  return `${base}-compressed.${EXTENSIONS[type]}`;
}

export function downloadResult(result, filename) {
  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = downloadName(filename,result.type);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Allow the browser time to start reading the Blob before releasing this URL.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
