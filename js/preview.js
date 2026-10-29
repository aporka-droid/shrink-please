export function createPreview() {
  const container = document.querySelector('#comparison');
  const original = document.querySelector('#original-image');
  const processed = document.querySelector('#processed-image');
  const slider = document.querySelector('#comparison-slider');
  let originalURL, processedURL;
  slider.addEventListener('input', () => container.style.setProperty('--split', `${slider.value}%`));
  return {
    setOriginal(file) {
      if (originalURL) URL.revokeObjectURL(originalURL);
      originalURL = URL.createObjectURL(file);
      original.src = originalURL;
      slider.value = 50;
      container.style.setProperty('--split','50%');
    },
    setResult(result) {
      if (processedURL) URL.revokeObjectURL(processedURL);
      processedURL = URL.createObjectURL(result.blob);
      processed.src = processedURL;
      container.style.aspectRatio = `${result.width} / ${result.height}`;
      container.hidden = false;
      document.querySelector('#preview-empty').hidden = true;
    },
    clear() {
      original.removeAttribute('src'); processed.removeAttribute('src');
      if (originalURL) URL.revokeObjectURL(originalURL);
      if (processedURL) URL.revokeObjectURL(processedURL);
      originalURL = processedURL = null;
      container.hidden = true;
      document.querySelector('#preview-empty').hidden = false;
    }
  };
}
