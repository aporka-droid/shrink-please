import { decodeFile, compress, formatBytes, downloadResult, EXTENSIONS } from './compressor.js';
import { createPreview } from './preview.js';

const $ = id => document.getElementById(id);
const preview = createPreview();
let source = null, result = null, locked = true, revision = 0, uploadRevision = 0, timer, errorTimer;
const workstation = document.querySelector('.workstation');

$('privacy-dismiss').addEventListener('click', () => { $('privacy-consent').hidden = true; });

function announce(text) { $('status').textContent = text; }
function showError(error) {
  $('error').textContent = error.message || 'Something went wrong. Please try another image.';
  $('error').hidden = false;
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => $('error').hidden = true, 9000);
}
function busy(value) {
  workstation.classList.toggle('processing', value);
  workstation.setAttribute('aria-busy', String(value));
  $('download').disabled = value || !result;
}
function outputType() { return $('format').value === 'original' ? source.type : $('format').value; }
function updateFormat() {
  const png = outputType() === 'image/png';
  $('quality').disabled = png;
  $('quality-value').textContent = png ? 'Lossless' : `${$('quality').value}%`;
  $('quality-hint').textContent = png ? 'PNG is lossless. Resize or choose WebP for smaller files.' : 'A sweet spot between size and detail.';
  $('jpeg-note').hidden = outputType() !== 'image/jpeg';
}
function renderResult() {
  preview.setResult(result);
  $('results').hidden = false;
  $('empty-bottom').hidden = true;
  const reduction = (1 - result.blob.size / source.file.size) * 100;
  const value = Math.abs(reduction);
  $('savings-number').textContent = `${value < 1 ? value.toFixed(1) : Math.round(value)}%`;
  $('savings-label').textContent = reduction < 0 ? 'LARGER' : reduction === 0 ? 'SAME SIZE' : 'SMALLER';
  document.querySelector('.savings').classList.toggle('larger', reduction < 0);
  $('original-size').textContent = formatBytes(source.file.size);
  $('output-size').textContent = formatBytes(result.blob.size);
  $('original-dimensions').textContent = `${source.width} × ${source.height} · ${EXTENSIONS[source.type].toUpperCase()}`;
  $('output-dimensions').textContent = `${result.width} × ${result.height} · ${EXTENSIONS[result.type].toUpperCase()}`;
  $('preview-caption').textContent = 'Drag the divider to see the difference.';
  announce(`Image ready. ${formatBytes(result.blob.size)}, ${value.toFixed(1)} percent ${reduction < 0 ? 'larger' : 'smaller'}. ${result.width} by ${result.height} pixels.`);
}
async function processImage(id) {
  if (!source || id !== revision) return;
  const current = source;
  try {
    const next = await compress(current, { width: Number($('width').value), height: Number($('height').value), type: outputType(), quality: Number($('quality').value) });
    if (id !== revision || source !== current) return;
    result = next;
    renderResult();
  } catch (error) { if (id === revision) { result = null; showError(error); announce('Image processing failed. Change your settings or choose another image.'); } }
  finally { if (id === revision) busy(false); }
}
function schedule() {
  clearTimeout(timer);
  const id = ++revision;
  busy(true);
  timer = setTimeout(() => processImage(id), 180);
}
async function loadFiles(files) {
  if (!files.length) return;
  if (files.length > 1) { showError(new Error('Choose one image at a time.')); return; }
  const uploadId = ++uploadRevision;
  // Invalidate any in-flight encoding immediately, including while the next file decodes.
  ++revision; clearTimeout(timer); busy(true); announce('Opening your image.');
  try {
    const next = await decodeFile(files[0]);
    if (uploadId !== uploadRevision) { next.image.close(); return; }
    if (source) source.image.close();
    source = next; result = null;
    preview.clear(); preview.setOriginal(source.file);
    $('error').hidden = true;
    $('results').hidden = true;
    $('empty-bottom').hidden = false;
    $('dropzone').hidden = true; $('settings').hidden = false;
    $('filename').textContent = source.file.name; $('filename').title = source.file.name;
    $('width').value = source.width; $('height').value = source.height;
    $('width').max = source.width; $('height').max = source.height;
    $('format').value = 'original'; $('quality').value = 78;
    $('quality').style.setProperty('--quality', '78%');
    locked = true; $('lock').setAttribute('aria-pressed','true');
    updateFormat(); schedule();
  } catch (error) { if (uploadId === uploadRevision) { busy(false); showError(error); } }
  finally { $('file-input').value = ''; }
}
$('file-input').addEventListener('change', e => loadFiles(e.target.files));
$('dropzone').addEventListener('click', () => $('file-input').click());
$('replace').addEventListener('click', () => $('file-input').click());
let dragDepth = 0;
workstation.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; $('dropzone').classList.add('dragging'); });
workstation.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
workstation.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropzone').classList.remove('dragging'); } });
workstation.addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; $('dropzone').classList.remove('dragging'); loadFiles(e.dataTransfer.files); });
// Prevent the browser navigating away when a file misses the workspace.
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
$('format').addEventListener('change', () => { updateFormat(); schedule(); });
$('quality').addEventListener('input', () => { $('quality-value').textContent = `${$('quality').value}%`; $('quality').style.setProperty('--quality', `${$('quality').value}%`); schedule(); });
$('lock').addEventListener('click', () => { locked = !locked; $('lock').setAttribute('aria-pressed',String(locked)); if (locked) resize('width'); });
function resize(axis) {
  if (!source) return;
  const value = Number($(axis).value);
  if (!Number.isFinite(value) || value <= 0) {
    ++revision; clearTimeout(timer); result = null; busy(false); announce('Enter a width and height of at least one pixel.'); return;
  }
  $(axis).value = Math.min(source[axis], Math.max(1,Math.round(value)));
  if (locked) {
    const other = axis === 'width' ? 'height' : 'width';
    $(other).value = Math.max(1,Math.round(Number($(axis).value) * source[other] / source[axis]));
  }
  schedule();
}
for (const axis of ['width','height']) $(axis).addEventListener('input', () => resize(axis));
$('reset-size').addEventListener('click', () => { $('width').value = source.width; $('height').value = source.height; schedule(); });
$('download').addEventListener('click', () => { if (result && ! $('download').disabled) { downloadResult(result,source.file.name); announce('Your compressed image has been downloaded.'); } });
$('another').addEventListener('click', reset);
function reset() {
  ++revision; ++uploadRevision; clearTimeout(timer);
  if (source) source.image.close();
  source = result = null; preview.clear(); busy(false);
  $('settings').hidden = true; $('dropzone').hidden = false; $('results').hidden = true; $('empty-bottom').hidden = false;
  $('preview-caption').textContent = 'A little less size. All the possibility.';
  $('error').hidden = true;
  $('dropzone').focus(); announce('Ready for another image.');
}
window.addEventListener('pagehide', () => { ++revision; ++uploadRevision; clearTimeout(timer); preview.clear(); if (source) source.image.close(); source = result = null; });
// A restored back/forward-cache page must not retain controls for released resources.
window.addEventListener('pageshow', e => { if (e.persisted) reset(); });
