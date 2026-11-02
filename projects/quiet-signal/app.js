const storageKey = 'quiet-signal-v1';
const circumference = 2 * Math.PI * 105;
const display = document.querySelector('#timer-display');
const progressRing = document.querySelector('#ring-progress');
const timerStatus = document.querySelector('#timer-status');
const startButton = document.querySelector('#start-timer');
const taskList = document.querySelector('#task-list');
let state = loadState();
let selectedMinutes = state.selectedMinutes || 25;
let secondsLeft = state.secondsLeft ?? selectedMinutes * 60;
let timerHandle = null;
let undoSnapshot = null;
const taskFeedback = document.querySelector('#task-feedback');
const undoTaskChange = document.querySelector('#undo-task-change');

function offerUndo(message, tasksBeforeChange) {
  undoSnapshot = tasksBeforeChange;
  taskFeedback.textContent = message;
  undoTaskChange.setAttribute('aria-label', message.startsWith('Completed') ? 'Undo clearing completed tasks' : 'Undo task deletion');
  undoTaskChange.hidden = false;
}

function clearUndo() {
  undoSnapshot = null;
  taskFeedback.textContent = '';
  undoTaskChange.hidden = true;
}

document.querySelectorAll('[data-minutes]').forEach(button => {
  const active = Number(button.dataset.minutes) === selectedMinutes;
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
});

function loadState() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return { tasks: Array.isArray(value.tasks) ? value.tasks : [], sessions: Number(value.sessions) || 0, selectedMinutes: Number(value.selectedMinutes) || 25, secondsLeft: Number.isInteger(value.secondsLeft) ? value.secondsLeft : 25 * 60 };
  } catch { return { tasks: [], sessions: 0, selectedMinutes: 25, secondsLeft: 25 * 60 }; }
}

function saveState() {
  state.selectedMinutes = selectedMinutes;
  state.secondsLeft = secondsLeft;
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function updateTimer() {
  const total = selectedMinutes * 60;
  display.textContent = formatTime(secondsLeft);
  progressRing.style.strokeDasharray = String(circumference);
  progressRing.style.strokeDashoffset = String(circumference * (1 - (total - secondsLeft) / total));
  document.querySelector('#timer-mode').textContent = timerHandle ? 'YOU ARE IN A FOCUS BLOCK' : secondsLeft < total ? 'A SMALL PAUSE IS OKAY' : 'READY WHEN YOU ARE';
  startButton.firstChild.textContent = timerHandle ? 'Pause focus ' : 'Begin focus ';
}

function startTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
    timerStatus.textContent = 'Timer paused. Pick it up when you are ready.';
    updateTimer();
    saveState();
    return;
  }
  if (secondsLeft <= 0) secondsLeft = selectedMinutes * 60;
  timerStatus.textContent = 'Focus block in progress.';
  timerHandle = window.setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      secondsLeft = 0;
      clearInterval(timerHandle);
      timerHandle = null;
      state.sessions++;
      document.querySelector('#session-count').textContent = String(state.sessions);
      timerStatus.textContent = 'Focus block complete. Take a moment before the next one.';
    }
    updateTimer();
    saveState();
  }, 1000);
  updateTimer();
}

function renderTasks() {
  taskList.replaceChildren();
  const tasks = state.tasks;
  document.querySelector('#empty-note').hidden = tasks.length > 0;
  const completed = tasks.filter(task => task.done).length;
  document.querySelector('#task-progress').textContent = `${completed} / ${tasks.length}`;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  document.querySelector('#progress-value').textContent = `${percent}%`;
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  for (const task of tasks) {
    const item = document.createElement('li');
    item.className = `task-item${task.done ? ' done' : ''}`;
    item.dataset.taskId = task.id;
    const toggle = document.createElement('button');
    toggle.className = 'task-toggle';
    toggle.type = 'button';
    toggle.textContent = '✓';
    toggle.setAttribute('aria-label', `${task.done ? 'Mark as not done' : 'Mark as done'}: ${task.text}`);
    toggle.setAttribute('aria-pressed', String(task.done));
    toggle.addEventListener('click', () => {
      clearUndo();
      task.done = !task.done;
      saveState();
      renderTasks();
      taskList.querySelector(`[data-task-id="${CSS.escape(task.id)}"] .task-toggle`)?.focus();
      taskFeedback.textContent = task.done ? 'Task marked done.' : 'Task marked not done.';
    });
    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;
    const remove = document.createElement('button');
    remove.className = 'task-delete';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Delete task: ${task.text}`);
    remove.addEventListener('click', () => {
      const tasksBeforeChange = state.tasks.slice();
      state.tasks = state.tasks.filter(entry => entry.id !== task.id);
      offerUndo('Task deleted.', tasksBeforeChange);
      saveState();
      renderTasks();
      undoTaskChange.focus();
    });
    item.append(toggle, text, remove);
    taskList.append(item);
  }
}

startButton.addEventListener('click', startTimer);
document.querySelector('#reset-timer').addEventListener('click', () => {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
  secondsLeft = selectedMinutes * 60;
  timerStatus.textContent = 'Your timer is paused.';
  updateTimer();
  saveState();
});
document.querySelectorAll('[data-minutes]').forEach(button => button.addEventListener('click', () => {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
  selectedMinutes = Number(button.dataset.minutes);
  secondsLeft = selectedMinutes * 60;
  document.querySelectorAll('[data-minutes]').forEach(preset => {
    const active = preset === button;
    preset.classList.toggle('active', active);
    preset.setAttribute('aria-pressed', String(active));
  });
  timerStatus.textContent = 'New focus length selected.';
  updateTimer();
  saveState();
}));
document.querySelector('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#task-input');
  const text = input.value.trim();
  if (!text) return;
  clearUndo();
  state.tasks.push({ id: crypto.randomUUID(), text, done: false });
  input.value = '';
  saveState();
  renderTasks();
  taskFeedback.textContent = 'Task added.';
  input.focus();
});
undoTaskChange.addEventListener('click', () => {
  if (!undoSnapshot) return;
  state.tasks = undoSnapshot;
  clearUndo();
  saveState();
  renderTasks();
  document.querySelector('#task-input').focus();
});
document.querySelector('#clear-completed').addEventListener('click', () => {
  const tasksBeforeChange = state.tasks.slice();
  if (!tasksBeforeChange.some(task => task.done)) return;
  state.tasks = state.tasks.filter(task => !task.done);
  offerUndo('Completed tasks cleared.', tasksBeforeChange);
  saveState();
  renderTasks();
  undoTaskChange.focus();
});
document.querySelector('#session-count').textContent = String(state.sessions);
document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date()).toUpperCase();
updateTimer();
renderTasks();
