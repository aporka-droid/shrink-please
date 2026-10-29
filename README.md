# Shrink Please

A free, private image compressor in the **please.** collection. Built with HTML, plain CSS, JavaScript modules, File/Blob APIs and Canvas. No dependencies, accounts, analytics, network requests or image uploads.

## Run locally

Serve this folder with any static HTTP server (JavaScript modules require HTTP, rather than opening the HTML as a file). For example, with Python installed:

```sh
python -m http.server 8080
```

Open http://localhost:8080. Alternatively use an editor’s static preview server.

## Deploy to Vercel

Import this folder as a project. Select **Other** as the framework, leave the build command empty, and use `.` as the output directory. No environment variables or install step are required.

## Behavior

- Process one JPG, PNG or WebP at a time; drag a replacement onto the workspace or use Replace.
- The original format and dimensions are retained by default, with quality set to 78% for JPEG/WebP.
- PNG encoding is lossless and disables the quality control. Resizing still resamples pixels.
- Lock dimensions to retain the original aspect ratio (rounding to whole pixels). Unlock to change proportions. Upscaling is prevented.
- JPEG flattens transparent areas onto white. PNG/WebP preserve alpha where supported.
- Output MIME types are checked after encoding; unsupported encoders produce a clear error.
- Compare the images with the slider or keyboard arrow keys. Download the actual output Blob with a matching extension.
- Results report actual encoded sizes, including when output grows. Canvas re-encoding does not guarantee smaller files.
- Files over 30 MiB, decoded images over 40 million pixels, and sides over 16,384 pixels are rejected. Decoding also depends on the browser’s memory limits.
- Animated PNG/WebP are flattened to a still frame. Canvas output does not retain original metadata. Browser decoding applies orientation; color handling depends on the browser.
- Debouncing and revision checks prevent old encodes from replacing current results. Replaced preview URLs, bitmaps and canvases are released.

## Files

`index.html` — semantic interface and metadata  
`css/style.css` — responsive design and reduced-motion support  
`js/app.js` — events and application state  
`js/compressor.js` — validation, decoding, encoding and downloads  
`js/preview.js` — comparison and preview resource lifecycle  
`assets/favicon.svg` — circular italic initial, matching the please. collection

## Verification

With the local server running, open `/tests/browser.html`. It runs browser-native encoder checks and integration checks against the actual app in a 390-pixel iframe. Tests include transparency, quality, file limits, dimensions, replacing files, stale asynchronous work, invalid input, comparison controls and responsive overflow. `tests/sample.png` and `tests/sample.jpg` are synthetic fixtures for manual upload/download checks.
