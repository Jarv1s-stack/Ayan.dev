document.addEventListener('DOMContentLoaded', function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ===================== crash-safe storage (private mode / sandboxed frames) ===================== */
  const memStore = {};
  function safeGet(store, key) {
    try { return window[store].getItem(key); } catch (e) { return (key in memStore) ? memStore[key] : null; }
  }
  function safeSet(store, key, val) {
    memStore[key] = val;
    try { window[store].setItem(key, val); } catch (e) { /* fall back to memory only */ }
  }

  /* ===================== shared mouse tracker (live bg + cursor glow) ===================== */
  const mouse = { x: null, y: null, active: false };
  if (isFinePointer) {
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { mouse.active = false; });
  }

  /* ===================== i18n ===================== */
  const translations = {
    en: {
      nav_home: 'Home', nav_about: 'About', nav_skills: 'Skills', nav_resume: 'Journey', nav_projects: 'Projects', nav_fluctlight: 'Fluctlight AI', nav_contact: 'Contact',
      cmdk_hint: 'Quick nav',
      hero_avail: 'Open to opportunities',
      welcome_hello: "Hello, I'm",
      welcome_contact: 'Contact Me', welcome_learn: 'Learn More',
      about_eyebrow: 'Who I am', about_title: 'About me',
      about_content: 'I am a <span class="hl">front-end developer</span> who creates websites quickly and efficiently. Passionate about building interactive, AI-powered and user-friendly web applications.',
      about_fullname: 'Fullname', about_dob: 'Date of birth', about_address: 'Address', about_telegram: 'Telegram',
      about_stats: 'Projects complete', about_certs: 'Certificates earned', about_tools: 'Design tools',
      about_download_cv: 'Download CV', about_my_projects: 'My Projects',
      projects_eyebrow: 'Selected work', projects_title: 'Projects', projects_desc: 'A selection of things I have built — from AI systems and full-stack products to polished interfaces.',
      project_live: 'Live experiment', project_open: 'Open project', project_source: 'View source', project_fluctlight_title: 'Fluctlight AI', project_fluctlight_desc: 'My personal AI with a living 3D light-field interface, voice input and voice replies. Ask it to understand who I am and what I can build.', project_ayan_desc: 'A hand-built developer portfolio with a console-inspired interface, motion, certificates and a clear way to start a conversation.', project_indrive_desc: 'An AI-powered inDrive assistant for ride management, smart booking, route optimization and driver support.', project_game_desc: 'A game health monitoring platform with AI insights, player analytics and performance optimization.', project_jarvis_desc: 'A local, offline-first Windows assistant with voice control, file handling and automation through local AI models.', project_event_title: 'Event Platform', project_event_desc: 'A full-stack web application for creating and managing events end-to-end.', project_bots_title: 'Telegram bots', project_bots_desc: 'Useful Telegram bots, including a Kazakh-language ticket-summary bot with numbered inline actions.', project_landing_title: 'Landing pages', project_landing_desc: 'Custom animated landing pages built from scratch — no page-builder templates.', fluctlight_eyebrow: 'My personal AI', fluctlight_title: 'Meet Fluctlight AI', fluctlight_desc: 'This is my AI — a living interface that helps you understand who I am, what I build and whether I am the right person for your project.', fluctlight_hint: 'Ask about my skills, projects, services or collaboration.', fluctlight_open: 'Open full experience',
      skills_eyebrow: 'Capabilities', skills_title: 'My Skills',
      skills_desc: 'I have expertise in various web technologies and design tools that help me build modern, polished web applications from concept to code.',
      skills_tab_dev: 'Development', skills_tab_design: 'Design Tools', skill_chatbot: 'ChatBot Development',
      resume_eyebrow: 'git log --graph', resume_title: 'My Journey',
      resume_desc: 'A changelog of courses, certificates and milestones along the way.',
      resume_certificates: 'Certificates', resume_skills: 'Skills', resume_professional: 'Professional Certificate',
      tag_responsive: 'Responsive Design',
      contact_eyebrow: 'Say hello', contact_title: 'Get In Touch',
      contact_desc: 'Feel free to reach out to me for any questions or opportunities.',
      contact_location: 'Location', contact_email: 'Email', contact_phone: 'Phone', contact_localtime: 'Local time in Almaty',
      contact_form_name: 'Your Name', contact_form_phone: 'Your Phone', contact_form_email: 'Your Email',
      contact_form_telegram: 'Telegram (optional)', contact_form_subject: 'Subject', contact_form_message: 'Your Message',
      contact_form_submit: 'Send Message',
      footer_role: 'Frontend & ChatBot Developer', footer_rights: 'All rights reserved.',
      modal_prev: 'Prev', modal_next: 'Next',
      roles: ['Frontend Developer', 'AI / ChatBot Developer', 'UI Systems Builder'],
      toast_sent: 'Message sent — I\u2019ll get back to you soon!',
      toast_fail: 'Could not send message. Please try again later.',
      toast_copied: 'Email copied to clipboard',
      toast_easter: 'Achievement unlocked: curious mind \u{1F3AE}',
      cmdk_placeholder: 'Type a command or search…',
      cmdk_nav: 'Navigate', cmdk_actions: 'Actions', cmdk_empty: 'No results found.',
      cmd_home: 'Go to Home', cmd_about: 'Go to About', cmd_skills: 'Go to Skills', cmd_journey: 'Go to Journey', cmd_projects: 'Go to Projects', cmd_fluctlight: 'Go to Fluctlight AI', cmd_contact: 'Go to Contact',
      cmd_theme: 'Toggle light / dark theme', cmd_lang: 'Switch language (EN / RU)', cmd_copy: 'Copy email address',
      cmd_gh: 'Open GitHub profile', cmd_li: 'Open LinkedIn profile', cmd_tg: 'Open Telegram',
      boot_title: 'Booting Ayan.dev...',
      boot_task_projects: 'Loading Projects', boot_task_ai: 'Loading Fluctlight AI', boot_task_creativity: 'Loading Creativity',
      boot_welcome: 'Welcome, Human.', boot_skip: 'press any key to skip'
    },
    ru: {
      nav_home: 'Главная', nav_about: 'Обо мне', nav_skills: 'Навыки', nav_resume: 'Путь', nav_projects: 'Проекты', nav_fluctlight: 'Fluctlight AI', nav_contact: 'Контакты',
      cmdk_hint: 'Навигация',
      hero_avail: 'Открыт для предложений',
      welcome_hello: 'Привет, я',
      welcome_contact: 'Связаться', welcome_learn: 'Узнать больше',
      about_eyebrow: 'Кто я', about_title: 'Обо мне',
      about_content: 'Я <span class="hl">frontend-разработчик</span>, который быстро и качественно создаёт сайты. Люблю создавать интерактивные, AI-ориентированные и удобные веб-приложения.',
      about_fullname: 'Полное имя', about_dob: 'Дата рождения', about_address: 'Адрес', about_telegram: 'Телеграм',
      about_stats: 'Завершено проектов', about_certs: 'Получено сертификатов', about_tools: 'Инструменты дизайна',
      about_download_cv: 'Скачать резюме', about_my_projects: 'Мои проекты',
      projects_eyebrow: 'Избранные работы', projects_title: 'Проекты', projects_desc: 'Подборка моих работ — от AI-систем и full-stack продуктов до продуманных интерфейсов.', project_live: 'Живой эксперимент', project_open: 'Открыть проект', project_source: 'Открыть исходник', project_fluctlight_title: 'Fluctlight AI', project_fluctlight_desc: 'Мой персональный ИИ с живым 3D-интерфейсом светового поля, голосовым вводом и ответами. Спросите его, кто я и что умею создавать.', project_ayan_desc: 'Авторское портфолио разработчика в стиле консоли: анимации, сертификаты и понятный путь к сотрудничеству.', project_indrive_desc: 'AI-помощник для inDrive: управление поездками, умное бронирование, оптимизация маршрутов и поддержка водителей.', project_game_desc: 'Платформа мониторинга здоровья игр с AI-инсайтами, аналитикой игроков и оптимизацией производительности.', project_jarvis_desc: 'Локальный офлайн-помощник для Windows с голосовым управлением, файлами и автоматизацией на локальных AI-моделях.', project_event_title: 'Event Platform', project_event_desc: 'Full-stack приложение для создания и управления мероприятиями от начала до конца.', project_bots_title: 'Telegram-боты', project_bots_desc: 'Полезные Telegram-боты, включая бота для сводки тикетов на казахском языке с кнопками действий.', project_landing_title: 'Landing pages', project_landing_desc: 'Кастомные анимированные лендинги, созданные с нуля — без шаблонов конструкторов.', fluctlight_eyebrow: 'Мой персональный ИИ', fluctlight_title: 'Познакомьтесь с Fluctlight AI', fluctlight_desc: 'Это мой ИИ — живая система, которая поможет понять, кто я, что создаю и подхожу ли я для вашего проекта.', fluctlight_hint: 'Спросите о моих навыках, проектах, услугах или сотрудничестве.', fluctlight_open: 'Открыть полностью',
      skills_eyebrow: 'Возможности', skills_title: 'Мои навыки',
      skills_desc: 'У меня есть опыт в различных веб-технологиях и инструментах дизайна, которые помогают создавать современные приложения от идеи до кода.',
      skills_tab_dev: 'Разработка', skills_tab_design: 'Дизайн', skill_chatbot: 'Разработка чат-ботов',
      resume_eyebrow: 'git log --graph', resume_title: 'Мой путь',
      resume_desc: 'Хронология курсов, сертификатов и важных этапов.',
      resume_certificates: 'Сертификаты', resume_skills: 'Навыки', resume_professional: 'Профессиональный сертификат',
      tag_responsive: 'Адаптивная вёрстка',
      contact_eyebrow: 'Написать мне', contact_title: 'Свяжитесь со мной',
      contact_desc: 'Буду рад ответить на вопросы или обсудить сотрудничество.',
      contact_location: 'Локация', contact_email: 'Email', contact_phone: 'Телефон', contact_localtime: 'Местное время в Алматы',
      contact_form_name: 'Ваше имя', contact_form_phone: 'Ваш телефон', contact_form_email: 'Ваш email',
      contact_form_telegram: 'Телеграм (необязательно)', contact_form_subject: 'Тема', contact_form_message: 'Сообщение',
      contact_form_submit: 'Отправить',
      footer_role: 'Frontend & ChatBot Developer', footer_rights: 'Все права защищены.',
      modal_prev: 'Назад', modal_next: 'Далее',
      roles: ['Frontend-разработчик', 'AI / ChatBot разработчик', 'UI Systems Builder'],
      toast_sent: 'Сообщение отправлено — скоро отвечу!',
      toast_fail: 'Не удалось отправить сообщение. Попробуйте позже.',
      toast_copied: 'Email скопирован',
      toast_easter: 'Достижение получено: любопытный ум \u{1F3AE}',
      cmdk_placeholder: 'Введите команду или запрос…',
      cmdk_nav: 'Навигация', cmdk_actions: 'Действия', cmdk_empty: 'Ничего не найдено.',
      cmd_home: 'Перейти на Главную', cmd_about: 'Перейти в Обо мне', cmd_skills: 'Перейти в Навыки', cmd_journey: 'Перейти в Путь', cmd_projects: 'Перейти в Проекты', cmd_fluctlight: 'Перейти в Fluctlight AI', cmd_contact: 'Перейти в Контакты',
      cmd_theme: 'Переключить тему', cmd_lang: 'Сменить язык (EN / RU)', cmd_copy: 'Скопировать email',
      cmd_gh: 'Открыть GitHub', cmd_li: 'Открыть LinkedIn', cmd_tg: 'Открыть Telegram',
      boot_title: 'Загрузка Ayan.dev...',
      boot_task_projects: 'Загрузка проектов', boot_task_ai: 'Загрузка Fluctlight AI', boot_task_creativity: 'Загрузка креативности',
      boot_welcome: 'Добро пожаловать, Человек.', boot_skip: 'нажмите любую клавишу, чтобы пропустить'
    }
  };

  let currentLang = safeGet('localStorage', 'lang') || 'en';
  const langToggle = document.getElementById('lang-toggle');
  langToggle.value = currentLang;

  function applyTranslations(lang) {
    const dict = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.documentElement.setAttribute('lang', lang);
  }

  function setLang(lang) {
    currentLang = lang;
    safeSet('localStorage', 'lang', lang);
    langToggle.value = lang;
    applyTranslations(lang);
    restartRoleTyping();
    buildCommandList();
  }
  applyTranslations(currentLang);
  langToggle.addEventListener('change', e => setLang(e.target.value));

  /* ===================== theme ===================== */
  const themeToggle = document.getElementById('theme-toggle');
  const currentTheme = safeGet('localStorage', 'theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);
  function updateThemeIcon(theme) {
    themeToggle.innerHTML = `<i class="fas fa-${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
  }
  function toggleTheme() {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    safeSet('localStorage', 'theme', newTheme);
    updateThemeIcon(newTheme);
  }
  themeToggle.addEventListener('click', toggleTheme);

  /* ===================== boot sequence ===================== */
  (function initBoot() {
    const bootScreen = document.getElementById('boot-screen');
    if (!bootScreen) return;

    const alreadyPlayed = safeGet('sessionStorage', 'bootPlayed') === '1';
    if (alreadyPlayed || reduceMotion) {
      safeSet('sessionStorage', 'bootPlayed', '1');
      bootScreen.remove();
      return;
    }

    document.body.style.overflow = 'hidden';
    const t = translations[currentLang];
    const titleEl = document.getElementById('boot-title-text');
    const tasksEl = document.getElementById('boot-tasks');
    const welcomeEl = document.getElementById('boot-welcome');
    const skipEl = document.getElementById('boot-skip');
    skipEl.textContent = t.boot_skip;

    const tasks = [
      { label: t.boot_task_projects, icon: 'fa-folder-tree' },
      { label: t.boot_task_ai, icon: 'fa-brain' },
      { label: t.boot_task_creativity, icon: 'fa-wand-magic-sparkles' }
    ];
    tasksEl.innerHTML = tasks.map(task =>
      `<div class="boot-task">
        <span class="boot-task-label"><i class="fa-solid ${task.icon}"></i>${task.label}</span>
        <span class="boot-bar"><span class="boot-bar-fill"></span></span>
        <span class="boot-pct">0%</span>
      </div>`
    ).join('');
    const taskRows = tasksEl.querySelectorAll('.boot-task');

    let skipped = false;
    function onSkip() { skipped = true; }
    document.addEventListener('keydown', onSkip, { once: true });
    bootScreen.addEventListener('click', onSkip, { once: true });

    function typeText(el, text, speed) {
      return new Promise(resolve => {
        let i = 0;
        el.textContent = '';
        (function step() {
          if (skipped) { el.textContent = text; resolve(); return; }
          i++;
          el.textContent = text.slice(0, i);
          if (i < text.length) setTimeout(step, speed);
          else resolve();
        })();
      });
    }

    function animateTask(row, duration) {
      return new Promise(resolve => {
        row.classList.add('show');
        const fill = row.querySelector('.boot-bar-fill');
        const pctEl = row.querySelector('.boot-pct');
        if (skipped) { fill.style.width = '100%'; pctEl.textContent = '100%'; resolve(); return; }
        const start = performance.now();
        fill.style.transitionDuration = duration + 'ms';
        requestAnimationFrame(() => { fill.style.width = '100%'; });
        (function tick(now) {
          if (skipped) { fill.style.width = '100%'; pctEl.textContent = '100%'; resolve(); return; }
          const p = Math.min(1, (now - start) / duration);
          pctEl.textContent = Math.round(p * 100) + '%';
          if (p < 1) requestAnimationFrame(tick); else resolve();
        })(start);
      });
    }

    async function runBoot() {
      await typeText(titleEl, t.boot_title, 32);
      for (const row of taskRows) {
        await animateTask(row, 620 + Math.random() * 260);
      }
      welcomeEl.textContent = t.boot_welcome;
      welcomeEl.classList.add('show');
      await new Promise(r => setTimeout(r, skipped ? 200 : 750));
      bootScreen.classList.add('fade-out');
      await new Promise(r => setTimeout(r, 550));
      document.body.style.overflow = '';
      safeSet('sessionStorage', 'bootPlayed', '1');
      bootScreen.remove();
    }
    runBoot();
  })();

  /* ===================== header / scroll progress / active nav ===================== */
  const header = document.querySelector('header');
  const progressBar = document.getElementById('scroll-progress');
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav a');
  const toTopBtn = document.getElementById('to-top');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    header.classList.toggle('scrolled', scrollY > 40);
    toTopBtn.classList.toggle('show', scrollY > 500);

    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = docHeight > 0 ? `${(scrollY / docHeight) * 100}%` : '0%';

    let current = sections[0]?.id;
    sections.forEach(sec => {
      if (scrollY >= sec.offsetTop - 140) current = sec.id;
    });
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${current}`));
  }, { passive: true });

  toTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ===================== smooth nav + mobile menu ===================== */
  const nav = document.getElementById('nav');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
      nav.classList.remove('active');
      mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    });
  });
  mobileMenuBtn.addEventListener('click', () => {
    nav.classList.toggle('active');
    const isActive = nav.classList.contains('active');
    mobileMenuBtn.innerHTML = `<i class="fas fa-${isActive ? 'times' : 'bars'}"></i>`;
  });

  /* ===================== scroll reveal ===================== */
  const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
  if (reduceMotion) {
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ===================== stat count-up ===================== */
  const statEls = document.querySelectorAll('[data-count]');
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (reduceMotion) { el.textContent = target + '+'; statIO.unobserve(el); return; }
      let start = 0;
      const duration = 1100;
      const startTime = performance.now();
      function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        el.textContent = Math.round(progress * target) + (progress === 1 ? '+' : '');
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      statIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  statEls.forEach(el => statIO.observe(el));

  /* ===================== skills tabs + animated bars ===================== */
  const tabBtns = document.querySelectorAll('.skills-tab-btn');
  const panels = { dev: document.getElementById('panel-dev'), design: document.getElementById('panel-design') };

  function animateBars(panel) {
    panel.querySelectorAll('.progress').forEach(bar => {
      const pct = bar.getAttribute('data-pct');
      requestAnimationFrame(() => { bar.style.width = pct + '%'; });
    });
  }
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(panels).forEach(p => p.classList.remove('active'));
      const target = panels[btn.dataset.tab];
      target.classList.add('active');
      animateBars(target);
    });
  });
  const skillsSectionIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateBars(document.querySelector('.skills-panel.active'));
        skillsSectionIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  const skillsSection = document.getElementById('skills');
  if (skillsSection) skillsSectionIO.observe(skillsSection);

  /* ===================== hero: role typing ===================== */
  const roleTarget = document.getElementById('typed-role');
  let roleTimeout;
  function typeRoles() {
    const roles = translations[currentLang].roles;
    let roleIndex = 0, charIndex = 0, deleting = false;
    roleTarget.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'type-cursor';
    const textSpan = document.createElement('span');
    roleTarget.appendChild(textSpan);
    roleTarget.appendChild(cursor);

    function tick() {
      const word = roles[roleIndex];
      if (!deleting) {
        charIndex++;
        textSpan.textContent = word.slice(0, charIndex);
        if (charIndex === word.length) {
          deleting = true;
          roleTimeout = setTimeout(tick, 1600);
          return;
        }
        roleTimeout = setTimeout(tick, 62);
      } else {
        charIndex--;
        textSpan.textContent = word.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          roleIndex = (roleIndex + 1) % roles.length;
        }
        roleTimeout = setTimeout(tick, 32);
      }
    }
    tick();
  }
  function restartRoleTyping() {
    clearTimeout(roleTimeout);
    if (reduceMotion) {
      roleTarget.textContent = translations[currentLang].roles[0];
      return;
    }
    typeRoles();
  }
  restartRoleTyping();

  /* ===================== hero: editor code typing ===================== */
  const codeSnippets = {
    about: [
      'const developer = {',
      '  name: "Ayan Abdimutalip",',
      '  role: "Frontend & AI Developer",',
      '  location: "Almaty, KZ",',
      '  stack: ["React", "JS", "AI APIs"],',
      '  status: "available",',
      '  hireable: true',
      '};',
      '',
      '// let\'s build something great'
    ],
    skills: [
      'const skills = {',
      '  frontend: ["React", "JS", "TS", "CSS"],',
      '  ai: ["Prompt Eng", "LLM APIs", "RAG"],',
      '  design: ["Figma", "Illustrator"],',
      '  learning: true',
      '};',
      '',
      '// scroll to Skills for the full breakdown'
    ],
    contact: [
      'const contact = {',
      '  email: "ayanabdimutalip@gmail.com",',
      '  telegram: "@ayanabdimutalip",',
      '  location: "Almaty, KZ",',
      '  replyTime: "usually same day"',
      '};',
      '',
      '// say hello — see the Contact section'
    ]
  };
  let currentCodeLines = codeSnippets.about;
  const typeTarget = document.getElementById('type-target');
  let typeTimeout;

  function highlight(raw) {
    let html = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/(\/\/.*)$/gm, '<span class="c">$1</span>');
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="s">$1</span>');
    html = html.replace(/\b(const|true|false|return)\b/g, '<span class="k">$1</span>');
    html = html.replace(/(^|\s)([a-zA-Z_]\w*)(?=:)/g, '$1<span class="p">$2</span>');
    return html;
  }

  function typeCode(lines) {
    currentCodeLines = lines || currentCodeLines;
    const fullCode = currentCodeLines.join('\n');
    clearTimeout(typeTimeout);
    if (reduceMotion) {
      typeTarget.innerHTML = highlight(fullCode);
      return;
    }
    let i = 0;
    typeTarget.textContent = '';
    const caret = document.createElement('span');
    caret.className = 'type-caret';
    function step() {
      i++;
      typeTarget.textContent = fullCode.slice(0, i);
      typeTarget.appendChild(caret);
      if (i < fullCode.length) {
        const c = fullCode[i - 1];
        const delay = c === '\n' ? 90 : (Math.random() * 18 + 10);
        typeTimeout = setTimeout(step, delay);
      } else {
        typeTimeout = setTimeout(() => { typeTarget.innerHTML = highlight(fullCode); }, 300);
      }
    }
    step();
  }
  typeCode(codeSnippets.about);

  /* editor tabs: about.js / skills.json / contact.md swap the typed code.
     The 4th tab (ai.chat) is handled by ai-assistant.js — it owns the
     "active" class there too, since it needs to also toggle the embedded
     chat panel in lockstep. Here we just react to the 3 "code" tabs. */
  document.querySelectorAll('#editor-tabs span[data-tab]').forEach((tabEl) => {
    tabEl.addEventListener('click', () => {
      if (tabEl.dataset.tab === 'ai') return;
      document.querySelectorAll('#editor-tabs span[data-tab]').forEach((t) => t.classList.remove('active'));
      tabEl.classList.add('active');
      typeCode(codeSnippets[tabEl.dataset.tab] || codeSnippets.about);
    });
  });

  /* ===================== sitewide live background: network canvas ===================== */
  const canvas = document.getElementById('net-canvas');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, nodes;
    const LINK_DIST = 130;
    const MOUSE_DIST = 160;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.round((w * h) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3
      }));
    }
    resize();
    window.addEventListener('resize', resize);

    const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5eead4';

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const color = accent();

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        /* nodes gently drift away from the cursor, like the network "feels" you move through it */
        if (mouse.active && mouse.x !== null) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_DIST && dist > 0.01) {
            const force = (1 - dist / MOUSE_DIST) * 0.6;
            n.x += (dx / dist) * force;
            n.y += (dy / dist) * force;
          }
        }
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = (1 - dist / LINK_DIST) * 0.32;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      /* cursor-to-node links: the network reaches toward you */
      if (mouse.active && mouse.x !== null) {
        nodes.forEach(n => {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_DIST) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = (1 - dist / MOUSE_DIST) * 0.55;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      nodes.forEach(n => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }
    draw();

    /* brighten the network while the hero is on screen */
    const heroEl = document.getElementById('home');
    if (heroEl) {
      const heroIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => document.body.classList.toggle('in-hero', entry.isIntersecting));
      }, { threshold: 0.35 });
      heroIO.observe(heroEl);
    }
  }

  /* ===================== mouse fx: cursor glow ===================== */
  const cursorGlow = document.getElementById('cursor-glow');
  if (cursorGlow && isFinePointer && !reduceMotion) {
    (function loop() {
      if (mouse.x !== null) {
        cursorGlow.style.transform = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%, -50%)`;
        cursorGlow.classList.toggle('active', mouse.active);
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ===================== mouse fx: magnetic buttons ===================== */
  if (isFinePointer && !reduceMotion) {
    const magneticEls = document.querySelectorAll('.btn, .icon-btn, .kbd-hint, .submit-btn, .skills-tab-btn, .copy-btn');
    const PULL = 0.35, MAX_PULL = 14;
    magneticEls.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        const dx = Math.max(-MAX_PULL, Math.min(MAX_PULL, relX * PULL));
        const dy = Math.max(-MAX_PULL, Math.min(MAX_PULL, relY * PULL));
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ===================== GitHub live stats ===================== */
  const ghLiveText = document.getElementById('gh-live-text');
  fetch('https://api.github.com/users/ayanabdimutalip')
    .then(r => { if (!r.ok) throw new Error('gh error'); return r.json(); })
    .then(data => {
      ghLiveText.textContent = `${data.public_repos} repos · ${data.followers} followers`;
    })
    .catch(() => {
      ghLiveText.textContent = 'view profile';
    });

  /* ===================== local time (Almaty) ===================== */
  const localTimeEl = document.getElementById('local-time');
  function updateLocalTime() {
    if (!localTimeEl) return;
    try {
      localTimeEl.textContent = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(new Date());
    } catch (e) { /* noop */ }
  }
  updateLocalTime();
  setInterval(updateLocalTime, 1000);

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ===================== copy email ===================== */
  const copyEmailBtn = document.getElementById('copy-email');
  copyEmailBtn?.addEventListener('click', () => {
    const email = document.getElementById('email-text').textContent.trim();
    navigator.clipboard?.writeText(email).then(() => {
      showToast(translations[currentLang].toast_copied);
    }).catch(() => {});
  });

  /* ===================== toasts ===================== */
  function showToast(message, type = 'success') {
    const stack = document.getElementById('toast-stack');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}"></i><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.remove(), 320);
    }, 3600);
  }
  window.showToast = showToast;

  /* ===================== certificate modal ===================== */
  const certData = [
    { id: 'Advanced-React', title: 'Advanced React' },
    { id: 'Front-End-Developer-Capstone', title: 'Front-End Developer Capstone' },
    { id: 'Coding-Interview-Preparation', title: 'Coding Interview Preparation' },
    { id: 'HTML-and-CSS-in-depth', title: 'HTML and CSS in depth' },
    { id: 'Introduction-to-Front-End-Development', title: 'Introduction to Front-End Development' },
    { id: 'Version-Control', title: 'Version Control' },
    { id: 'Principles-of-UX-UI-Design', title: 'Principles of UX/UI Design' },
    { id: 'Programming-with-JavaScript', title: 'Programming with JavaScript' },
    { id: 'React-Basics', title: 'React Basics' },
    { id: 'Meta-Front-End-Developer', title: 'Meta Front-End Developer' }
  ];
  const modal = document.getElementById('certificateModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalImage = document.getElementById('modalImage');
  let modalIndex = 0;

  function openModal(id) {
    modalIndex = certData.findIndex(c => c.id === id);
    renderModal();
    modal.classList.add('open');
  }
  function renderModal() {
    const cert = certData[modalIndex];
    modalTitle.textContent = cert.title;
    modalImage.src = `${cert.id}.png`;
    modalImage.alt = cert.title;
  }
  function closeModal() { modal.classList.remove('open'); }
  document.querySelectorAll('[data-cert]').forEach(card => {
    card.addEventListener('click', () => openModal(card.getAttribute('data-cert')));
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.getElementById('modal-prev').addEventListener('click', () => {
    modalIndex = (modalIndex - 1 + certData.length) % certData.length; renderModal();
  });
  document.getElementById('modal-next').addEventListener('click', () => {
    modalIndex = (modalIndex + 1) % certData.length; renderModal();
  });
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') document.getElementById('modal-prev').click();
    if (e.key === 'ArrowRight') document.getElementById('modal-next').click();
  });

  /* ===================== command palette ===================== */
  const cmdkOverlay = document.getElementById('cmdk-overlay');
  const cmdkInput = document.getElementById('cmdk-input');
  const cmdkList = document.getElementById('cmdk-list');
  let cmdItems = [];
  let cmdActiveIndex = 0;

  function buildCommandList() {
    const t = translations[currentLang];
    cmdItems = [
      { group: t.cmdk_nav, icon: 'fa-house', label: t.cmd_home, run: () => scrollToId('home') },
      { group: t.cmdk_nav, icon: 'fa-user', label: t.cmd_about, run: () => scrollToId('about') },
      { group: t.cmdk_nav, icon: 'fa-code', label: t.cmd_skills, run: () => scrollToId('skills') },
      { group: t.cmdk_nav, icon: 'fa-code-branch', label: t.cmd_journey, run: () => scrollToId('resume') },
      { group: t.cmdk_nav, icon: 'fa-folder-open', label: t.cmd_projects, run: () => scrollToId('projects') },
      { group: t.cmdk_nav, icon: 'fa-atom', label: t.cmd_fluctlight, run: () => scrollToId('fluctlight') },
      { group: t.cmdk_nav, icon: 'fa-envelope', label: t.cmd_contact, run: () => scrollToId('contact') },
      { group: t.cmdk_actions, icon: 'fa-circle-half-stroke', label: t.cmd_theme, run: toggleTheme },
      { group: t.cmdk_actions, icon: 'fa-language', label: t.cmd_lang, run: () => setLang(currentLang === 'en' ? 'ru' : 'en') },
      { group: t.cmdk_actions, icon: 'fa-copy', label: t.cmd_copy, run: () => copyEmailBtn?.click() },
      { group: t.cmdk_actions, icon: 'fa-brands fa-github', label: t.cmd_gh, run: () => window.open('https://github.com/ayanabdimutalip', '_blank') },
      { group: t.cmdk_actions, icon: 'fa-brands fa-linkedin', label: t.cmd_li, run: () => window.open('https://www.linkedin.com/in/ayan-abdimutalip-5a5b5a2b5/', '_blank') },
      { group: t.cmdk_actions, icon: 'fa-brands fa-telegram', label: t.cmd_tg, run: () => window.open('https://t.me/ayanabdimutalip', '_blank') }
    ];
    cmdkInput.placeholder = t.cmdk_placeholder;
    renderCmdList('');
  }
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  }
  function renderCmdList(query) {
    const q = query.trim().toLowerCase();
    const filtered = cmdItems.filter(it => it.label.toLowerCase().includes(q));
    cmdkList.innerHTML = '';
    cmdActiveIndex = 0;
    if (!filtered.length) {
      cmdkList.innerHTML = `<div class="cmdk-empty">${translations[currentLang].cmdk_empty}</div>`;
      return;
    }
    let lastGroup = null;
    filtered.forEach((item, i) => {
      if (item.group !== lastGroup) {
        const label = document.createElement('div');
        label.className = 'cmdk-group-label';
        label.textContent = item.group;
        cmdkList.appendChild(label);
        lastGroup = item.group;
      }
      const row = document.createElement('div');
      row.className = 'cmdk-item' + (i === 0 ? ' active' : '');
      row.innerHTML = `<i class="fa-solid ${item.icon}"></i><span>${item.label}</span>`;
      row.addEventListener('click', () => { item.run(); closeCmdk(); });
      row.addEventListener('mouseenter', () => setActiveCmdRow(i));
      row.dataset.index = i;
      cmdkList.appendChild(row);
    });
    cmdkList._filtered = filtered;
  }
  function setActiveCmdRow(i) {
    cmdActiveIndex = i;
    cmdkList.querySelectorAll('.cmdk-item').forEach(row => {
      row.classList.toggle('active', parseInt(row.dataset.index, 10) === i);
    });
  }
  function openCmdk() {
    cmdkOverlay.classList.add('open');
    cmdkInput.value = '';
    renderCmdList('');
    setTimeout(() => cmdkInput.focus(), 30);
  }
  function closeCmdk() { cmdkOverlay.classList.remove('open'); }

  document.getElementById('cmdk-trigger').addEventListener('click', openCmdk);
  cmdkOverlay.addEventListener('click', (e) => { if (e.target === cmdkOverlay) closeCmdk(); });
  cmdkInput.addEventListener('input', (e) => renderCmdList(e.target.value));
  cmdkInput.addEventListener('keydown', (e) => {
    const filtered = cmdkList._filtered || [];
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveCmdRow(Math.min(cmdActiveIndex + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveCmdRow(Math.max(cmdActiveIndex - 1, 0)); }
    if (e.key === 'Enter') { const it = filtered[cmdActiveIndex]; if (it) { it.run(); closeCmdk(); } }
    if (e.key === 'Escape') closeCmdk();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      cmdkOverlay.classList.contains('open') ? closeCmdk() : openCmdk();
    }
  });
  buildCommandList();

  /* ===================== contact form ===================== */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('.submit-btn');
      submitBtn.disabled = true;

      const formData = {
        name: this.querySelector('input[name="name"]').value,
        phone: this.querySelector('input[name="phone"]').value || 'Not provided',
        email: this.querySelector('input[name="email"]').value,
        telegram: this.querySelector('input[name="telegram"]').value || 'Not provided',
        subject: this.querySelector('input[name="subject"]').value,
        message: this.querySelector('textarea[name="message"]').value
      };
      const message = `New Client Inquiry:\n\nName: ${formData.name}\nPhone: ${formData.phone}\nEmail: ${formData.email}\nTelegram: ${formData.telegram}\nSubject: ${formData.subject}\nMessage: ${formData.message}`;

      // NOTE: keeping the same Telegram Bot API approach as before.
      // See the message accompanying this file about moving these
      // credentials out of client-side code.
      const BOT_TOKEN = '8156472399:AAE8bC_yX9JcylpFD7wMXKPWo_5gLhElIXE';
      const CHAT_ID = '6768870909';
      const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

      fetch(TELEGRAM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message })
      })
        .then(response => response.json())
        .then(data => {
          submitBtn.disabled = false;
          if (data.ok) {
            showToast(translations[currentLang].toast_sent);
            contactForm.reset();
          } else {
            showToast(translations[currentLang].toast_fail, 'error');
          }
        })
        .catch(() => {
          submitBtn.disabled = false;
          showToast(translations[currentLang].toast_fail, 'error');
        });
    });
  }

  /* ===================== easter egg: konami code ===================== */
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiPos = 0;
  document.addEventListener('keydown', (e) => {
    konamiPos = (e.key === konami[konamiPos]) ? konamiPos + 1 : 0;
    if (konamiPos === konami.length) {
      konamiPos = 0;
      showToast(translations[currentLang].toast_easter);
      document.body.animate(
        [{ filter: 'hue-rotate(0deg)' }, { filter: 'hue-rotate(360deg)' }],
        { duration: 900, easing: 'ease' }
      );
    }
  });
});