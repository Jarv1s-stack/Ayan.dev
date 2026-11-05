/* Fluctlight chat client. Provider credentials stay on the server. */

const $ = (id) => document.getElementById(id);
const chatLog = $('chatLog');
const chatForm = $('chatForm');
const chatInput = $('chatInput');
const sendBtn = $('sendBtn');
const micBtn = $('micBtn');
const voiceBtn = $('voiceBtn');
const chatStatus = $('chatStatus');
const chatStatusText = $('chatStatusText');
const chatSuggestions = $('chatSuggestions');

const history = [];
const MAX_HISTORY_MESSAGES = 16;
const MAX_MESSAGE_LENGTH = 2000;
let busy = false;
let voiceEnabled = true;
let listening = false;
let activeAudio = null;
let activeAudioUrl = null;
let audioPulse = null;
let speechToken = 0;

function setStatus(state, text) {
  chatStatus.dataset.state = state;
  chatStatusText.textContent = text;
}

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + (role === 'user' ? 'msg--user' : 'msg--ai');
  const textNode = document.createTextNode(text);
  el.appendChild(textNode);
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  return { el, textNode };
}

function stopVoiceOutput() {
  speechToken += 1;
  window.speechSynthesis?.cancel();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute('src');
    activeAudio.load();
    activeAudio = null;
  }
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
  activeAudioUrl = null;
  clearInterval(audioPulse);
  audioPulse = null;
  window.Fluctlight?.setSpeaking(false);
  return speechToken;
}

function finishAudio(audio, token) {
  if (token !== speechToken || activeAudio !== audio) return;
  clearInterval(audioPulse);
  audioPulse = null;
  activeAudio = null;
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
  activeAudioUrl = null;
  window.Fluctlight?.setSpeaking(false);
  if (!busy && !listening) setStatus('idle', 'Готов к вопросу');
}

function playBrowserSpeech(text, token) {
  if (!('speechSynthesis' in window) || token !== speechToken || !voiceEnabled) {
    setStatus('idle', 'Ответ готов');
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  const lang = /[а-яё]/i.test(text) ? 'ru' : 'en';
  const voice = voices.find((item) => item.lang?.toLowerCase().startsWith(lang) && /natural|online|google/i.test(item.name))
    || voices.find((item) => item.lang?.toLowerCase().startsWith(lang));
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || (lang === 'ru' ? 'ru-RU' : 'en-US');
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.pitch = 1.02;

  const finish = () => {
    if (token !== speechToken) return;
    window.Fluctlight?.setSpeaking(false);
    if (!busy && !listening) setStatus('idle', 'Готов к вопросу');
  };
  utterance.onstart = () => {
    if (token !== speechToken) return;
    setStatus('speaking', 'Говорит · голос браузера');
    window.Fluctlight?.setThinking(false);
    window.Fluctlight?.setSpeaking(true);
  };
  utterance.onboundary = () => window.Fluctlight?.pulse(0.38);
  utterance.onend = finish;
  utterance.onerror = finish;
  window.speechSynthesis.speak(utterance);
}

async function speakReply(text) {
  if (!voiceEnabled) return;
  const token = stopVoiceOutput();

  try {
    const response = await fetch(new URL('../../api/tts', location.href), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 1400) }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) throw new Error('voice_unavailable');
    const audioBlob = await response.blob();
    if (token !== speechToken || !voiceEnabled) return;

    activeAudioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(activeAudioUrl);
    activeAudio = audio;
    audio.preload = 'auto';
    audio.addEventListener('play', () => {
      if (token !== speechToken) return;
      setStatus('speaking', 'Говорит · Fish Audio');
      window.Fluctlight?.setThinking(false);
      window.Fluctlight?.setSpeaking(true);
      audioPulse = window.setInterval(() => window.Fluctlight?.pulse(0.3), 260);
    }, { once: true });
    audio.addEventListener('ended', () => finishAudio(audio, token), { once: true });
    audio.addEventListener('error', () => finishAudio(audio, token), { once: true });
    await audio.play();
  } catch {
    if (token !== speechToken || !voiceEnabled) return;
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.removeAttribute('src');
      activeAudio.load();
      activeAudio = null;
    }
    if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = null;
    clearInterval(audioPulse);
    audioPulse = null;
    window.Fluctlight?.setSpeaking(false);
    playBrowserSpeech(text, token);
  }
}

function sanitizeReply(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim();
}

async function askAI(userText) {
  history.push({ role: 'user', content: userText });
  setStatus('thinking', 'Думает…');
  window.Fluctlight?.setThinking(true);

  const { el: aiEl, textNode } = addMessage('ai', '');
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  aiEl.appendChild(cursor);

  try {
    const response = await fetch(new URL('../../api/chat', location.href), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-MAX_HISTORY_MESSAGES) }),
      signal: AbortSignal.timeout(35_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'assistant_unavailable');

    const reply = sanitizeReply(payload.reply);
    if (!reply) throw new Error('assistant_empty_reply');
    textNode.data = reply;
    history.push({ role: 'assistant', content: reply });
    chatLog.scrollTop = chatLog.scrollHeight;
    window.Fluctlight?.setThinking(false);
    await speakReply(reply);
  } catch {
    textNode.data = 'Сейчас не получилось ответить. Попробуй ещё раз чуть позже.';
    setStatus('idle', 'Ответ не получен');
    window.Fluctlight?.setThinking(false);
  } finally {
    cursor.remove();
  }
}

async function submitMessage(value) {
  const text = value.trim();
  if (!text || busy) return;
  if (text.length > MAX_MESSAGE_LENGTH) {
    setStatus('idle', 'Сократи сообщение до 2000 символов');
    return;
  }

  busy = true;
  sendBtn.disabled = true;
  chatSuggestions.hidden = true;
  stopVoiceOutput();
  chatInput.value = '';
  addMessage('user', text);
  await askAI(text);
  busy = false;
  sendBtn.disabled = false;
  if (!listening && chatStatus.dataset.state !== 'speaking') setStatus('idle', 'Готов к вопросу');
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitMessage(chatInput.value);
});

chatSuggestions.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => submitMessage(button.dataset.prompt));
});

addMessage('ai', 'Я — цифровой клон Аяна. Спроси меня о моих проектах, навыках или идее, которую хочешь сделать.');

voiceBtn.addEventListener('click', () => {
  voiceEnabled = !voiceEnabled;
  voiceBtn.setAttribute('aria-pressed', String(voiceEnabled));
  voiceBtn.title = voiceEnabled ? 'Озвучивать ответы' : 'Озвучивание выключено';
  voiceBtn.setAttribute('aria-label', voiceBtn.title);
  if (!voiceEnabled) {
    stopVoiceOutput();
    if (!busy) setStatus('idle', 'Озвучивание выключено');
  } else if (!busy) {
    setStatus('idle', 'Готов к вопросу');
  }
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en-US' : 'ru-RU';

  recognition.onstart = () => {
    listening = true;
    micBtn.setAttribute('aria-pressed', 'true');
    setStatus('listening', 'Слушаю…');
    window.Fluctlight?.setListening(true);
  };
  recognition.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += transcript;
      else interim += transcript;
    }
    chatInput.value = (final + interim).trim();
    if (final.trim()) {
      recognition.stop();
      submitMessage(final);
    }
  };
  recognition.onend = () => {
    listening = false;
    micBtn.setAttribute('aria-pressed', 'false');
    window.Fluctlight?.setListening(false);
    if (!busy && chatStatus.dataset.state === 'listening') setStatus('idle', 'Готов к вопросу');
  };
  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') setStatus('idle', 'Разреши доступ к микрофону');
  };
  micBtn.addEventListener('click', () => {
    if (busy) return;
    if (listening) {
      recognition.stop();
      return;
    }
    stopVoiceOutput();
    window.speechSynthesis?.cancel();
    chatInput.value = '';
    try { recognition.start(); } catch { setStatus('idle', 'Микрофон уже включён'); }
  });
} else {
  micBtn.disabled = true;
  micBtn.title = 'Голосовой ввод доступен в Chrome и Edge';
  micBtn.setAttribute('aria-label', micBtn.title);
}
