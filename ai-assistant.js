/* Ayan.dev AI assistant. Its API key stays in the server environment. */

(function () {
  'use strict';

  /* ===================== config ===================== */
  const CONFIG = { maxHistoryMessages: 16 };

  const UI_TEXT = {
    en: {
      title: 'Ask about Ayan',
      subtitle: 'AI assistant · online',
      placeholder: 'Ask me anything about Ayan…',
      welcome: "Hi! I'm Ayan's AI assistant. Ask me about his projects, skills, or how to work with him.",
      suggestions: ['Who is Ayan?', 'What can he do?', 'How much would a project cost?'],
      error: 'Could not reach the assistant. Try again, or contact Ayan through the Contact section.',
      timeout: 'The assistant is taking longer than expected. Try again or contact Ayan through the Contact section.',
      configError: 'The assistant is not connected yet. Use the Contact section to reach Ayan.',
      close: 'Close assistant', conversation: 'Conversation',
      copy: 'Copy',
      copied: 'Copied',
    },
    ru: {
      title: 'Спросить про Ayan',
      subtitle: 'AI-ассистент · онлайн',
      placeholder: 'Спросите что-нибудь об Ayan…',
      welcome: 'Привет! Я AI-ассистент Ayan. Спросите про его проекты, навыки или как с ним начать работу.',
      suggestions: ['Кто такой Ayan?', 'Что он умеет?', 'Сколько будет стоить проект?'],
      error: 'Не удалось связаться с ассистентом. Попробуйте ещё раз или напишите Ayan через раздел Contact.',
      timeout: 'Ассистент отвечает дольше обычного. Попробуйте ещё раз или напишите Ayan через раздел Contact.',
      configError: 'Ассистент пока не подключён. Напишите Ayan через раздел Contact.',
      close: 'Закрыть ассистента', conversation: 'Диалог',
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
    launcher.type = 'button';
    launcher.id = 'ai-launcher';
    launcher.setAttribute('aria-label', t.title);
    launcher.setAttribute('aria-controls', 'ai-panel');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = `
      <span class="ai-launcher-prompt">&gt;</span>
      <span class="ai-launcher-text" id="ai-launcher-text"></span>
      <span class="ai-launcher-caret"></span>
      <i class="fa-solid fa-xmark ai-launcher-close-icon" aria-hidden="true"></i>
    `;

    const panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', t.conversation);
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    panel.innerHTML = `
      <div class="ai-header">
        <div class="ai-avatar"><i class="fa-solid fa-robot" aria-hidden="true"></i></div>
        <div>
          <div class="ai-title">${t.title}</div>
          <div class="ai-subtitle"><span class="ai-status-dot"></span>${t.subtitle}</div>
        </div>
        <button class="ai-header-close" id="ai-close" type="button" aria-label="${t.close}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
      <div class="ai-messages" id="ai-messages" role="log" aria-label="${t.conversation}"></div>
      <div class="ai-suggestions" id="ai-suggestions"></div>
      <div class="ai-input-row">
        <textarea id="ai-input" rows="1" aria-label="${t.placeholder}" placeholder="${t.placeholder}"></textarea>
        <button id="ai-send" type="button" aria-label="Send"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button>
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
    document.addEventListener('portfolio:language-changed', () => {
      state.lang = getLang();
      const nextText = UI_TEXT[state.lang];
      els.launcher.setAttribute('aria-label', nextText.title);
      els.panel.setAttribute('aria-label', nextText.conversation);
      els.messages.setAttribute('aria-label', nextText.conversation);
      els.close.setAttribute('aria-label', nextText.close);
      els.input.setAttribute('aria-label', nextText.placeholder);
      els.input.setAttribute('placeholder', nextText.placeholder);
      const title = els.panel.querySelector('.ai-title');
      if (title) title.textContent = nextText.title;
      startLauncherTyping();
    });

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
    const aiTab = document.querySelector('#editor-tabs button[data-tab="ai"]');
    const otherTabs = document.querySelectorAll('#editor-tabs button[data-tab]:not([data-tab="ai"])');
    const editorWindow = document.querySelector('.editor-window');
    const embedSlot = document.getElementById('ai-embed-slot');
    if (!aiTab || !editorWindow || !embedSlot) return;

    aiTab.addEventListener('click', () => {
      document.querySelectorAll('#editor-tabs button[data-tab]').forEach((tab) => {
        tab.classList.remove('active');
        tab.setAttribute('aria-pressed', 'false');
      });
      aiTab.classList.add('active');
      aiTab.setAttribute('aria-pressed', 'true');
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
    const history = state.messages.slice(-CONFIG.maxHistoryMessages);
    const payload = {
      messages: [
        { role: 'system', content: window.buildAyanSystemPrompt() },
        ...history.map((message) => ({ role: message.role, content: message.content })),
      ],
    };

    appendTypingIndicator();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.reply !== 'string') throw new Error('Assistant unavailable');
      const reply = result.reply.trim();
      if (!reply) throw new Error('Empty assistant reply');
      removeTypingIndicator();
      appendAssistantBubble(reply, true);
      state.messages.push({ role: 'assistant', content: reply });
    } catch (error) {
      removeTypingIndicator();
      appendAssistantBubble(error.name === 'AbortError' ? t.timeout : t.error, false);
    } finally {
      clearTimeout(timeoutId);
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
    els.panel.inert = false;
    els.panel.setAttribute('aria-hidden', 'false');
    els.launcher.setAttribute('aria-expanded', 'true');
    els.panel.classList.add('open');
    els.launcher.classList.add('open');
    els.launcher.classList.remove('attention');
    setTimeout(() => { if (state.open) els.input.focus(); }, 260);
  }

  function closePanel() {
    state.open = false;
    els.panel.classList.remove('open');
    els.launcher.classList.remove('open');
    els.launcher.setAttribute('aria-expanded', 'false');
    els.panel.setAttribute('aria-hidden', 'true');
    els.panel.inert = true;
    const focusTarget = state.mode === 'embedded'
      ? document.querySelector('#editor-tabs button[data-tab="about"]')
      : els.launcher;
    focusTarget?.focus();
  }

  function wireEvents() {
    els.launcher.addEventListener('click', () => (state.open ? closePanel() : openPanel()));
    els.close.addEventListener('click', () => {
      if (state.mode === 'embedded') {
        const aboutTab = document.querySelector('#editor-tabs button[data-tab="about"]');
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
