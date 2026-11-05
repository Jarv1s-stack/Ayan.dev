/* Fluctlight: stream the answer, prepare Fish Audio in parallel, and reveal
   each character against Fish Audio's word timestamps. Provider keys stay server-side. */

const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatStatus = document.getElementById('chatStatus');

const history = [];
const MAX_HISTORY_MESSAGES = 16;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_SPEECH_CHUNK = 360;
let busy = false;
let speechToken = 0;
let audioContext = null;
let activeSource = null;
let speechQueue = [];
let queueCursor = 0;
let queueWaiters = [];
let speechDone = false;
let fullReply = '';
let renderedReply = '';

function setStatus(state, message) {
  document.body.dataset.state = state;
  chatStatus.textContent = message;
}

function prepareAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function notifyQueue() {
  for (const wake of queueWaiters.splice(0)) wake();
}

function stopVoiceOutput() {
  speechToken += 1;
  window.speechSynthesis?.cancel();
  try { activeSource?.stop(); } catch {}
  activeSource = null;
  notifyQueue();
  window.Fluctlight?.setSpeaking(false);
  return speechToken;
}

function replaceOutput(text) {
  renderedReply = text;
  chatLog.textContent = text;
  chatLog.scrollTop = chatLog.scrollHeight;
}

function appendOutput(text) {
  if (!text) return;
  renderedReply += text;
  chatLog.textContent = renderedReply;
  chatLog.scrollTop = chatLog.scrollHeight;
}

function cleanStreamText(raw) {
  let clean = String(raw || '')
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*?<\/think(?:ing)?\s*>/gi, '')
    .replace(/<think(?:ing)?\b[^>]*>[\s\S]*$/gi, '')
    .replace(/<\/(?:think|thinking)\s*>/gi, '');
  for (const tag of ['<thinking>', '<think>']) {
    for (let length = 1; length < tag.length; length += 1) {
      const suffix = tag.slice(0, length);
      if (clean.toLowerCase().endsWith(suffix)) clean = clean.slice(0, -length);
    }
  }
  return clean;
}

function nextSpeechBoundary(text, force = false) {
  const sentence = /[.!?…][”"'»)]*\s+/u.exec(text);
  if (sentence) return sentence.index + sentence[0].length;
  if (text.length >= MAX_SPEECH_CHUNK) {
    const splitAt = text.lastIndexOf(' ', MAX_SPEECH_CHUNK);
    return splitAt > 100 ? splitAt + 1 : MAX_SPEECH_CHUNK;
  }
  return force && text.trim() ? text.length : 0;
}

function queueSpeech(text, token) {
  const clean = text.trim();
  if (!clean || token !== speechToken) return;
  const slot = { text, promise: requestFishAudio(clean, token) };
  speechQueue.push(slot);
  notifyQueue();
  slot.promise.catch(() => {});
}

async function requestFishAudio(text, token) {
  const response = await fetch(new URL('../../api/tts', location.href), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok || !response.body) throw new Error('voice_unavailable');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const audioParts = [];
  const alignments = new Map();
  let buffer = '';
  let ended = false;

  const consumeFrame = (frame) => {
    const line = frame.split(/\r?\n/).find((item) => item.startsWith('data:'));
    if (!line) return;
    const raw = line.slice(5).trim();
    if (!raw || raw === '[DONE]') return;
    let event;
    try { event = JSON.parse(raw); } catch { return; }
    if (event.audio_base64) audioParts.push(decodeBase64(event.audio_base64));
    if (event.alignment && Number.isFinite(Number(event.chunk_seq))) {
      alignments.set(Number(event.chunk_seq), {
        offset: Number(event.chunk_audio_offset_sec) || 0,
        alignment: event.alignment,
      });
    }
    if (token !== speechToken) ended = true;
  };

  while (!ended) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || '';
    for (const frame of frames) consumeFrame(frame);
  }
  buffer += decoder.decode();
  if (buffer.trim()) consumeFrame(buffer);
  if (token !== speechToken) throw new Error('speech_cancelled');
  const bytes = concatBytes(audioParts);
  if (!bytes.length) throw new Error('voice_empty_audio');

  const context = prepareAudio();
  if (!context) throw new Error('audio_context_unavailable');
  const audioBuffer = await context.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return { audioBuffer, timeline: buildTimeline(text, alignments, audioBuffer.duration) };
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(parts) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function normalizedMap(value) {
  const chars = [];
  const positions = [];
  for (let index = 0; index < value.length; index += 1) {
    const normalized = value[index].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    if (/[\p{L}\p{N}]/u.test(normalized)) {
      chars.push(normalized);
      positions.push(index);
    }
  }
  return { value: chars.join(''), positions };
}

function buildTimeline(text, alignments, duration) {
  const source = normalizedMap(text);
  const timeline = [];
  let searchFrom = 0;
  const chunks = [...alignments.entries()].sort(([left], [right]) => left - right);
  for (const [, item] of chunks) {
    for (const segment of item.alignment?.segments || []) {
      const phrase = normalizedMap(String(segment.text || '')).value;
      if (!phrase) continue;
      const found = source.value.indexOf(phrase, searchFrom);
      if (found < 0) continue;
      const last = found + phrase.length - 1;
      const from = timeline.length ? timeline[timeline.length - 1].to : 0;
      const to = Math.max(from, source.positions[last] + 1);
      timeline.push({
        start: Math.max(0, item.offset + Number(segment.start || 0)),
        end: Math.max(0, item.offset + Number(segment.end || 0)),
        from,
        to,
      });
      searchFrom = last + 1;
    }
  }

  if (!timeline.length) {
    return [{ start: 0, end: Math.max(0.5, duration), from: 0, to: text.length }];
  }
  if (timeline[timeline.length - 1].to < text.length) {
    timeline[timeline.length - 1].to = text.length;
  }
  return timeline;
}

function revealCountAt(timeline, elapsed, length) {
  let count = 0;
  for (const segment of timeline) {
    if (elapsed >= segment.end) {
      count = Math.max(count, segment.to);
      continue;
    }
    if (elapsed >= segment.start) {
      const span = Math.max(0.035, segment.end - segment.start);
      const progress = Math.max(0, Math.min(1, (elapsed - segment.start) / span));
      count = Math.max(count, Math.floor(segment.from + (segment.to - segment.from) * progress));
    }
    break;
  }
  return Math.min(length, count);
}

function playFishAudio(item, text, token) {
  return new Promise((resolve, reject) => {
    const context = prepareAudio();
    if (!context || token !== speechToken) { reject(new Error('speech_cancelled')); return; }
    const source = context.createBufferSource();
    source.buffer = item.audioBuffer;
    source.connect(context.destination);
    activeSource = source;
    const startAt = context.currentTime + 0.035;
    let visible = 0;
    let raf = 0;
    const paint = () => {
      if (token !== speechToken) { cancelAnimationFrame(raf); resolve(); return; }
      const elapsed = Math.max(0, context.currentTime - startAt);
      const next = revealCountAt(item.timeline, elapsed, text.length);
      if (next > visible) {
        appendOutput(text.slice(visible, next));
        visible = next;
        window.Fluctlight?.pulse(0.08);
      }
      if (elapsed < item.audioBuffer.duration) raf = requestAnimationFrame(paint);
      else {
        if (visible < text.length) appendOutput(text.slice(visible));
        window.Fluctlight?.setSpeaking(false);
      }
    };
    source.onended = () => {
      cancelAnimationFrame(raf);
      if (token === speechToken) {
        if (visible < text.length) appendOutput(text.slice(visible));
        window.Fluctlight?.setSpeaking(false);
      }
      if (activeSource === source) activeSource = null;
      resolve();
    };
    try {
      source.start(startAt);
      window.Fluctlight?.setThinking(false);
      window.Fluctlight?.setTyping(false);
      window.Fluctlight?.setSpeaking(true);
      setStatus('speaking', 'Говорю…');
      raf = requestAnimationFrame(paint);
    } catch (error) { reject(error); }
  });
}

function playBrowserSpeech(text, token) {
  if (!('speechSynthesis' in window) || token !== speechToken) {
    typeText(text, token);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const lang = /[а-яё]/i.test(text) ? 'ru' : 'en';
    const voice = speechSynthesis.getVoices().find((item) => item.lang?.toLowerCase().startsWith(lang));
    utterance.lang = voice?.lang || (lang === 'ru' ? 'ru-RU' : 'en-US');
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    let shown = 0;
    let raf = 0;
    const paint = () => {
      if (token !== speechToken) { resolve(); return; }
      const step = Math.min(text.length, shown + 2);
      if (step > shown) { appendOutput(text.slice(shown, step)); shown = step; }
      if (shown < text.length) raf = requestAnimationFrame(paint);
    };
    utterance.onstart = () => {
      setStatus('speaking', 'Говорю…');
      window.Fluctlight?.setThinking(false);
      window.Fluctlight?.setTyping(false);
      window.Fluctlight?.setSpeaking(true);
      paint();
    };
    utterance.onboundary = () => window.Fluctlight?.pulse(0.25);
    utterance.onend = utterance.onerror = () => {
      cancelAnimationFrame(raf);
      if (token === speechToken) {
        if (shown < text.length) appendOutput(text.slice(shown));
        window.Fluctlight?.setSpeaking(false);
        window.Fluctlight?.setTyping(false);
      }
      resolve();
    };
    speechSynthesis.speak(utterance);
  });
}

function typeText(text, token) {
  return new Promise((resolve) => {
    let index = 0;
    const step = () => {
      if (token !== speechToken || index >= text.length) { resolve(); return; }
      appendOutput(text.slice(index, index + 2));
      index += 2;
      window.setTimeout(step, 28);
    };
    step();
  });
}

async function playSpeechQueue(token) {
  while (token === speechToken) {
    if (queueCursor >= speechQueue.length) {
      if (speechDone) return;
      await new Promise((resolve) => queueWaiters.push(resolve));
      continue;
    }
    const slot = speechQueue[queueCursor++];
    try {
      const item = await slot.promise;
      if (token !== speechToken) return;
      await playFishAudio(item, slot.text, token);
    } catch {
      if (token !== speechToken) return;
      window.Fluctlight?.setSpeaking(false);
      await playBrowserSpeech(slot.text, token);
    }
  }
}

async function readAssistantStream(messages, token) {
  const response = await fetch(new URL('../../api/chat', location.href), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
    signal: AbortSignal.timeout(55_000),
  });
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'assistant_unavailable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let rawReply = '';
  let cleanedSent = '';
  let pendingSpeech = '';
  let finished = false;

  const consumeFrame = (frame) => {
    const data = frame.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
    if (!data) return;
    if (data === '[DONE]') { finished = true; return; }
    const payload = JSON.parse(data);
    if (payload.error) throw new Error('assistant_provider_error');
    const delta = payload.choices?.[0]?.delta?.content;
    if (typeof delta !== 'string' || !delta) return;
    rawReply += delta;
    const cleaned = cleanStreamText(rawReply);
    if (!cleaned.startsWith(cleanedSent)) {
      cleanedSent = cleaned;
      pendingSpeech = cleaned;
      return;
    }
    const fresh = cleaned.slice(cleanedSent.length);
    cleanedSent = cleaned;
    if (!fresh) return;
    pendingSpeech += fresh;
    fullReply = cleaned;
    window.Fluctlight?.setThinking(false);
    window.Fluctlight?.setTyping(true);
    let boundary = nextSpeechBoundary(pendingSpeech);
    while (boundary) {
      const speech = pendingSpeech.slice(0, boundary);
      pendingSpeech = pendingSpeech.slice(boundary);
      queueSpeech(speech, token);
      boundary = nextSpeechBoundary(pendingSpeech);
    }
  };

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || '';
    for (const frame of frames) consumeFrame(frame);
  }
  buffer += decoder.decode();
  if (buffer.trim()) consumeFrame(buffer);
  fullReply = cleanStreamText(rawReply).trim();
  const leftover = pendingSpeech;
  if (leftover.trim()) queueSpeech(leftover, token);
  if (!fullReply) throw new Error('assistant_empty_reply');
  return fullReply;
}

async function askAI(userText, token) {
  history.push({ role: 'user', content: userText });
  setStatus('thinking', 'Думаю…');
  window.Fluctlight?.setThinking(true);
  chatLog.dataset.streaming = 'true';
  const player = playSpeechQueue(token);

  try {
    const reply = await readAssistantStream(history.slice(-MAX_HISTORY_MESSAGES), token);
    history.push({ role: 'assistant', content: reply });
    while (history.length > MAX_HISTORY_MESSAGES) history.shift();
    speechDone = true;
    notifyQueue();
    await player;
    if (token === speechToken && renderedReply.length < reply.length) appendOutput(reply.slice(renderedReply.length));
  } catch {
    speechDone = true;
    notifyQueue();
    await player;
    if (token === speechToken && fullReply && renderedReply.length < fullReply.length) appendOutput(fullReply.slice(renderedReply.length));
    else if (token === speechToken && !renderedReply) replaceOutput('Сейчас не получилось ответить. Попробуй ещё раз чуть позже.');
    setStatus('error', 'Ответ не получен');
    window.Fluctlight?.setThinking(false);
  } finally {
    if (token === speechToken) {
      chatLog.dataset.streaming = 'false';
      window.Fluctlight?.setThinking(false);
      window.Fluctlight?.setSpeaking(false);
      window.Fluctlight?.setTyping(false);
    }
  }
}

async function submitMessage(value) {
  const text = value.trim();
  if (!text || busy) return;
  if (text.length > MAX_MESSAGE_LENGTH) {
    setStatus('error', 'Сократи сообщение до 2000 символов');
    return;
  }

  busy = true;
  chatInput.disabled = true;
  prepareAudio();
  const token = stopVoiceOutput();
  speechQueue = [];
  queueCursor = 0;
  queueWaiters = [];
  speechDone = false;
  fullReply = '';
  replaceOutput('');
  chatLog.dataset.streaming = 'true';
  chatInput.value = '';
  await askAI(text, token);
  speechDone = true;
  busy = false;
  chatInput.disabled = false;
  chatInput.focus();
  if (token === speechToken) setStatus('idle', 'Готов к сообщению.');
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitMessage(chatInput.value);
});

chatInput.addEventListener('input', () => window.Fluctlight?.pulse(0.025));
setStatus('idle', 'Готов к сообщению.');
