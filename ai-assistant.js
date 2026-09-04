/* ============================================================
   Ayan.dev — AI Assistant
   Self-contained chat widget: talks to OpenRouter's chat-completions
   API DIRECTLY from the browser (no proxy), renders markdown,
   remembers the conversation for the session.

   WARNING: CONFIG.apiKey below ships inside this JS file and is
   readable by anyone who opens devtools on your site. Anyone can
   copy it and use your OpenRouter quota/billing. Only keep it here
   if this file truly never goes anywhere public (no GitHub, no
   hosting, no sharing the folder). See cloudflare-worker.js if you
   ever want the safer, key-hidden setup back.
   ============================================================ */

(function () {
  'use strict';

  /* ===================== config ===================== */
  const CONFIG = {
    // Your OpenRouter API key, used directly from the browser. Exposed to
    // anyone who views page source / devtools — see warning above.
    // Get one at https://openrouter.ai/keys
    apiKey: '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',
    model: 'openrouter/free', // бесплатная модель на OpenRouter
    useReasoning: false, // nemotron умеет "думать" перед ответом — дольше, но точнее; включай при желании
    maxHistoryMessages: 16, // how many past turns are sent back to the model
  };

  const UI_TEXT = {
    en: {
      title: 'Ask about Ayan',
      subtitle: 'AI assistant · online',
      placeholder: 'Ask me anything about Ayan…',
      welcome: "Hi! I'm Ayan's AI assistant. Ask me about his projects, skills, or how to work with him.",
      suggestions: ['Who is Ayan?', 'What can he do?', 'How much would a project cost?'],
      error: "Something went wrong reaching the assistant. Please try again in a moment, or reach Ayan directly via the Contact section.",
      timeout: "The assistant is taking too long to respond (40s+) — the model or the proxy is likely stuck. Try again, or reach Ayan directly via the Contact section.",
      configError: 'The assistant is not configured yet — set CONFIG.apiKey in ai-assistant.js.',
      copy: 'Copy',
      copied: 'Copied',
    },
    ru: {
      title: 'Спросить про Ayan',
      subtitle: 'AI-ассистент · онлайн',
      placeholder: 'Спросите что-нибудь об Ayan…',
      welcome: 'Привет! Я AI-ассистент Ayan. Спросите про его проекты, навыки или как с ним начать работу.',
      suggestions: ['Кто такой Ayan?', 'Что он умеет?', 'Сколько будет стоить проект?'],
      error: 'Не удалось связаться с ассистентом. Попробуйте ещё раз чуть позже или напишите Ayan напрямую в разделе Contact.',
      timeout: 'Ассистент отвечает слишком долго (40+ секунд) — похоже, модель или прокси зависли. Попробуйте ещё раз или напишите Ayan напрямую в разделе Contact.',
      configError: 'Ассистент ещё не настроен — укажите CONFIG.apiKey в ai-assistant.js.',
      copy: 'Копировать',
      copied: 'Скопировано',
    },
  };

  function getLang() {
    const htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang === 'ru' || htmlLang === 'en') return htmlLang;
    try {
      const stored = window.localStorage.getItem('lang');
      if (stored === 'ru' || stored === 'en') return stored;
    } catch (e) { /* ignore */ }
    return 'en';
  }

  /* ===================== tiny markdown renderer ===================== */
  /* Supports: fenced code blocks, inline code, bold, italic, links,
     unordered/ordered lists, tables, paragraphs. No dependency. */
  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function renderInline(text) {
    let out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return out;
  }

  function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let i = 0;
    let listBuffer = null; // { type: 'ul'|'ol', items: [] }

    function flushList() {
      if (!listBuffer) return;
      const tag = listBuffer.type;
      html += `<${tag}>` + listBuffer.items.map((it) => `<li>${renderInline(it)}</li>`).join('') + `</${tag}>`;
      listBuffer = null;
    }

    while (i < lines.length) {
      const line = lines[i];

      // fenced code block
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        flushList();
        const lang = fence[1] || 'text';
        const codeLines = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { codeLines.push(lines[i]); i++; }
        i++; // skip closing fence
        const code = escapeHtml(codeLines.join('\n'));
        const id = 'aicode_' + Math.random().toString(36).slice(2, 9);
        html += `<div class="ai-code-block"><div class="ai-code-head"><span>${escapeHtml(lang)}</span>` +
          `<button class="ai-code-copy" data-copy-target="${id}"><i class="fa-regular fa-copy"></i></button></div>` +
          `<pre><code id="${id}">${code}</code></pre></div>`;
        continue;
      }

      // table (a line with | followed by a separator line of ---)
      if (/^\s*\|.*\|\s*$/.test(line) && lines[i + 1] && /^\s*\|?[\s:-]+\|[\s:|-]*$/.test(lines[i + 1])) {
        flushList();
        const headerCells = line.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim()));
          i++;
        }
        html += '<table><thead><tr>' + headerCells.map((c) => `<th>${renderInline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rows.map((r) => '<tr>' + r.map((c) => `<td>${renderInline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
        continue;
      }

      // unordered list
      const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (ulMatch) {
        if (!listBuffer || listBuffer.type !== 'ul') { flushList(); listBuffer = { type: 'ul', items: [] }; }
        listBuffer.items.push(ulMatch[1]);
        i++; continue;
      }

      // ordered list
      const olMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (olMatch) {
        if (!listBuffer || listBuffer.type !== 'ol') { flushList(); listBuffer = { type: 'ol', items: [] }; }
        listBuffer.items.push(olMatch[1]);
        i++; continue;
      }

      flushList();

      // headings
      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        const level = Math.min(heading[1].length + 2, 6); // keep small inside a chat bubble
        html += `<p style="font-weight:700;margin-top:4px;">${renderInline(heading[2])}</p>`;
        i++; continue;
      }

      if (line.trim() === '') { i++; continue; }

      // paragraph: gather until blank line / next block
      const paraLines = [line];
      i++;
      while (i < lines.length && lines[i].trim() !== '' && !/^```/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])) {
        paraLines.push(lines[i]); i++;
      }
      html += `<p>${renderInline(paraLines.join(' '))}</p>`;
    }
    flushList();
    return html;
  }

  /* ===================== state ===================== */
  const state = {
    lang: getLang(),
    open: false,
    mode: 'floating', // 'floating' (corner pill) | 'embedded' (hero ai.chat tab)
    everOpened: false,
    messages: [], // { role: 'user' | 'assistant', content: string }
    loading: false,
  };
  const reduceMotionLocal = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===================== DOM building ===================== */
  let els = {};
  let launcherTimeout;

  function buildWidget() {
    const t = UI_TEXT[state.lang];

    const launcher = document.createElement('button');
    launcher.id = 'ai-launcher';
    launcher.setAttribute('aria-label', t.title);
    launcher.innerHTML = `
      <span class="ai-launcher-prompt">&gt;</span>
      <span class="ai-launcher-text" id="ai-launcher-text"></span>
      <span class="ai-launcher-caret"></span>
      <i class="fa-solid fa-xmark ai-launcher-close-icon"></i>
    `;

    const panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-header">
        <div class="ai-avatar"><i class="fa-solid fa-robot"></i></div>
        <div>
          <div class="ai-title">${t.title}</div>
          <div class="ai-subtitle"><span class="ai-status-dot"></span>${t.subtitle}</div>
        </div>
        <button class="ai-header-close" id="ai-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ai-messages" id="ai-messages"></div>
      <div class="ai-suggestions" id="ai-suggestions"></div>
      <div class="ai-input-row">
        <textarea id="ai-input" rows="1" placeholder="${t.placeholder}"></textarea>
        <button id="ai-send" aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    els = {
      launcher,
      panel,
      launcherText: launcher.querySelector('#ai-launcher-text'),
      messages: panel.querySelector('#ai-messages'),
      suggestions: panel.querySelector('#ai-suggestions'),
      input: panel.querySelector('#ai-input'),
      send: panel.querySelector('#ai-send'),
      close: panel.querySelector('#ai-close'),
    };

    renderWelcome();
    wireEvents();
    wireEditorTabs();
    startLauncherTyping();

    // Draw the eye once, a couple seconds in — only if nobody has
    // interacted with the assistant yet and motion isn't disabled.
    if (!reduceMotionLocal) {
      setTimeout(() => {
        if (state.everOpened || state.mode === 'embedded') return;
        els.launcher.classList.add('attention');
        setTimeout(() => els.launcher.classList.remove('attention'), 3000);
      }, 2800);
    }
  }

  /* ===================== launcher: rotating typed prompt ===================== */
  function startLauncherTyping() {
    clearTimeout(launcherTimeout);
    const t = UI_TEXT[state.lang];
    const phrases = t.suggestions;
    if (!els.launcherText) return;
    if (reduceMotionLocal) { els.launcherText.textContent = phrases[0]; return; }
    let pi = 0, ci = 0, deleting = false;
    function tick() {
      if (state.mode === 'embedded') return; // pill is hidden while embedded
      const word = phrases[pi];
      if (!deleting) {
        ci++;
        els.launcherText.textContent = word.slice(0, ci);
        if (ci === word.length) { deleting = true; launcherTimeout = setTimeout(tick, 1800); return; }
        launcherTimeout = setTimeout(tick, 45);
      } else {
        ci--;
        els.launcherText.textContent = word.slice(0, ci);
        if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; }
        launcherTimeout = setTimeout(tick, 28);
      }
    }
    tick();
  }
  function stopLauncherTyping() { clearTimeout(launcherTimeout); }

  /* ===================== mount targets: floating pill vs. hero tab ===================== */
  function ensureFloating() {
    if (els.panel.parentElement !== document.body) document.body.appendChild(els.panel);
    els.panel.classList.remove('ai-panel-embedded');
    els.launcher.classList.remove('is-hidden');
    if (state.mode !== 'floating') {
      state.mode = 'floating';
      startLauncherTyping();
    }
  }

  function ensureEmbedded(slotEl) {
    if (!slotEl) return;
    if (els.panel.parentElement !== slotEl) slotEl.appendChild(els.panel);
    els.panel.classList.add('ai-panel-embedded');
    els.panel.classList.remove('open');
    state.open = false;
    els.launcher.classList.add('is-hidden');
    els.launcher.classList.remove('attention');
    if (state.mode !== 'embedded') {
      state.mode = 'embedded';
      state.everOpened = true;
      stopLauncherTyping();
    }
    setTimeout(() => els.input && els.input.focus(), 220);
  }

  function wireEditorTabs() {
    const aiTab = document.querySelector('#editor-tabs span[data-tab="ai"]');
    const otherTabs = document.querySelectorAll('#editor-tabs span[data-tab]:not([data-tab="ai"])');
    const editorWindow = document.querySelector('.editor-window');
    const embedSlot = document.getElementById('ai-embed-slot');
    if (!aiTab || !editorWindow || !embedSlot) return;

    aiTab.addEventListener('click', () => {
      document.querySelectorAll('#editor-tabs span[data-tab]').forEach((t) => t.classList.remove('active'));
      aiTab.classList.add('active');
      editorWindow.classList.add('ai-active');
      ensureEmbedded(embedSlot);
    });
    otherTabs.forEach((tabEl) => {
      tabEl.addEventListener('click', () => {
        editorWindow.classList.remove('ai-active');
        if (state.mode === 'embedded') ensureFloating(); // stays closed, just moves back to the corner
      });
    });
  }

  /* Single entry point for every "open the assistant" trigger — the
     corner pill and the command palette both call this. */
  window.openAyanAI = function () {
    if (state.mode === 'embedded') {
      els.panel.scrollIntoView({ behavior: reduceMotionLocal ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => els.input && els.input.focus(), reduceMotionLocal ? 0 : 320);
      return;
    }
    ensureFloating();
    openPanel();
  };

  function renderWelcome() {
    const t = UI_TEXT[state.lang];
    appendAssistantBubble(t.welcome, false);
    els.suggestions.innerHTML = '';
    t.suggestions.forEach((s) => {
      const chip = document.createElement('button');
      chip.className = 'ai-suggestion-chip';
      chip.textContent = s;
      chip.addEventListener('click', () => {
        els.input.value = s;
        sendMessage();
      });
      els.suggestions.appendChild(chip);
    });
  }

  function scrollToBottom() {
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function appendUserBubble(text) {
    const row = document.createElement('div');
    row.className = 'ai-msg user';
    row.innerHTML = `<div class="ai-bubble"></div>`;
    row.querySelector('.ai-bubble').textContent = text;
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function appendAssistantBubble(initialText, isMarkdown) {
    const row = document.createElement('div');
    row.className = 'ai-msg assistant';
    const bubble = document.createElement('div');
    bubble.className = 'ai-bubble';
    bubble.innerHTML = isMarkdown === false ? escapeHtml(initialText) : renderMarkdown(initialText || '');
    row.appendChild(bubble);
    els.messages.appendChild(row);
    scrollToBottom();
    return bubble;
  }

  function appendTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'ai-msg assistant';
    row.id = 'ai-typing-row';
    row.innerHTML = '<div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>';
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const row = document.getElementById('ai-typing-row');
    if (row) row.remove();
  }

  /* code-copy buttons: event delegation, survives re-renders */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.ai-code-copy');
    if (!btn) return;
    const target = document.getElementById(btn.getAttribute('data-copy-target'));
    if (!target) return;
    navigator.clipboard.writeText(target.textContent).then(() => {
      const t = UI_TEXT[state.lang];
      const original = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> ${t.copied}`;
      setTimeout(() => { btn.innerHTML = original; }, 1500);
    });
  });

  /* ===================== streaming client ===================== */
  async function streamAssistantReply() {
    const t = UI_TEXT[state.lang];

    if (!CONFIG.apiKey || CONFIG.apiKey.includes('ВСТАВЬТЕ_СЮДА')) {
      appendAssistantBubble(t.configError, false);
      return;
    }

    const history = state.messages.slice(-CONFIG.maxHistoryMessages);
    const payload = {
      model: CONFIG.model,
      stream: true,
      messages: [
        { role: 'system', content: window.buildAyanSystemPrompt() },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      reasoning: { enabled: !!CONFIG.useReasoning },
    };

    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    appendTypingIndicator();

    let bubble = null;
    let fullText = '';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40s safety timeout

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.apiKey}`,
          // Recommended by OpenRouter for attribution / their leaderboard —
          // harmless to keep, safe to remove.
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Ayan.dev AI Assistant',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch (e) { /* ignore */ }
        throw new Error(`OpenRouter API responded ${res.status}: ${detail.slice(0, 500)}`);
      }
      if (!res.body) throw new Error('Response has no body (streaming not supported here)');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // last (possibly incomplete) line stays in buffer

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          let parsed;
          try { parsed = JSON.parse(data); } catch (e) { continue; }
          const delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
          // Skip reasoning tokens (delta.reasoning) — only stream the final answer.
          const chunkText = delta && delta.content;
          if (!chunkText) continue;

          if (!bubble) {
            removeTypingIndicator();
            bubble = appendAssistantBubble('', true);
          }
          fullText += chunkText;
          bubble.innerHTML = renderMarkdown(fullText);
          scrollToBottom();
        }
      }

      if (!bubble) { removeTypingIndicator(); throw new Error('Empty stream'); }
      state.messages.push({ role: 'assistant', content: fullText });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      removeTypingIndicator();
      if (bubble) return; // partial content already shown, don't overwrite it with an error
      const isTimeout = err && err.name === 'AbortError';
      appendAssistantBubble(isTimeout ? t.timeout : t.error, false);
      console.error('[ai-assistant] request failed:', err);
    }
  }

  /* ===================== send flow ===================== */
  function autosizeInput() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 110) + 'px';
  }

  function sendMessage() {
    const text = els.input.value.trim();
    if (!text || state.loading) return;

    els.suggestions.innerHTML = '';
    appendUserBubble(text);
    state.messages.push({ role: 'user', content: text });

    els.input.value = '';
    autosizeInput();
    setLoading(true);

    streamAssistantReply().finally(() => setLoading(false));
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    els.send.disabled = isLoading;
  }

  function openPanel() {
    state.open = true;
    state.everOpened = true;
    els.panel.classList.add('open');
    els.launcher.classList.add('open');
    els.launcher.classList.remove('attention');
    setTimeout(() => els.input.focus(), 260);
  }

  function closePanel() {
    state.open = false;
    els.panel.classList.remove('open');
    els.launcher.classList.remove('open');
  }

  function wireEvents() {
    els.launcher.addEventListener('click', () => (state.open ? closePanel() : openPanel()));
    els.close.addEventListener('click', () => {
      if (state.mode === 'embedded') {
        const aboutTab = document.querySelector('#editor-tabs span[data-tab="about"]');
        if (aboutTab) aboutTab.click();
      } else {
        closePanel();
      }
    });
    els.send.addEventListener('click', sendMessage);
    els.input.addEventListener('input', autosizeInput);
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.open) closePanel();
    });
  }

  document.addEventListener('DOMContentLoaded', buildWidget);
})();
