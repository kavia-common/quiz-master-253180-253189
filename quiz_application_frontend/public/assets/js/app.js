/**
 * GK Quiz - Vanilla JS
 * - 15 GK questions auto-load on start
 * - One-at-a-time flow, 10s timer per question
 * - Progress bar updates
 * - Results + save attendee name
 * - Scoreboard persisted in localStorage with ranks and clear option
 * - Royal Purple theme, responsive, with subtle animations
 */

/* Constants for storage namespacing */
const SCOREBOARD_KEY = 'quizGK_scoreboard_v1';

/* Questions dataset: array of at least 15 MCQs with answerIndex */
// PUBLIC_INTERFACE
const gkQuestions = [
  { id: 1, question: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], answerIndex: 2 },
  { id: 2, question: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"], answerIndex: 1 },
  { id: 3, question: "Who wrote the play 'Romeo and Juliet'?", options: ["Mark Twain", "William Shakespeare", "Charles Dickens", "Jane Austen"], answerIndex: 1 },
  { id: 4, question: "What is the largest ocean on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"], answerIndex: 3 },
  { id: 5, question: "Which element has the chemical symbol 'O'?", options: ["Gold", "Oxygen", "Osmium", "Oganesson"], answerIndex: 1 },
  { id: 6, question: "In which year did World War II end?", options: ["1945", "1939", "1918", "1963"], answerIndex: 0 },
  { id: 7, question: "Which country is known as the Land of the Rising Sun?", options: ["China", "Japan", "Thailand", "South Korea"], answerIndex: 1 },
  { id: 8, question: "What is the smallest prime number?", options: ["1", "2", "3", "5"], answerIndex: 1 },
  { id: 9, question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], answerIndex: 2 },
  { id: 10, question: "Which gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], answerIndex: 2 },
  { id: 11, question: "Which continent is the Sahara Desert located on?", options: ["Asia", "Africa", "Australia", "South America"], answerIndex: 1 },
  { id: 12, question: "What is H2O commonly known as?", options: ["Salt", "Water", "Hydrogen Peroxide", "Oxygen"], answerIndex: 1 },
  { id: 13, question: "Which instrument has keys, pedals, and strings?", options: ["Guitar", "Violin", "Piano", "Flute"], answerIndex: 2 },
  { id: 14, question: "What is the boiling point of water at sea level?", options: ["90°C", "100°C", "110°C", "120°C"], answerIndex: 1 },
  { id: 15, question: "Who is known as the 'Father of Computers'?", options: ["Alan Turing", "Bill Gates", "Charles Babbage", "Steve Jobs"], answerIndex: 2 },
];

/* ---- State Management ---- */
const State = {
  currentIndex: 0,
  score: 0,
  total: gkQuestions.length,
  selectedIndex: null,
  timerEnabled: true,
  timeLeft: 10,
  timerId: null,
};

/* ---- DOM Helpers ---- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const formatDateTime = (iso) => {
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

/* ---- Storage Helpers ---- */
// PUBLIC_INTERFACE
function loadScoreboard() {
  /** Load attendees list from localStorage, sorted by score desc then date asc */
  const raw = localStorage.getItem(SCOREBOARD_KEY);
  let list = [];
  if (raw) {
    try { list = JSON.parse(raw); } catch { list = []; }
  }
  list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime();
  });
  return list;
}

// PUBLIC_INTERFACE
function saveEntry(entry) {
  /** Save a single attendee entry to localStorage scoreboard */
  const list = loadScoreboard();
  list.push(entry);
  localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(list));
}

// PUBLIC_INTERFACE
function clearStorage() {
  /** Clear only quiz-related scoreboard entries */
  localStorage.removeItem(SCOREBOARD_KEY);
}

/* ---- Rendering ---- */
// PUBLIC_INTERFACE
function hideAll() {
  /** Hide all screens */
  ['#home-screen', '#instructions-screen', '#quiz-screen', '#result-screen', '#scoreboard-screen'].forEach(sel => {
    const node = $(sel);
    if (node) {
      node.classList.add('hidden');
      node.setAttribute('aria-hidden', 'true');
    }
  });
}

// PUBLIC_INTERFACE
function renderHome() {
  /** Render home screen */
  hideAll();
  const home = $('#home-screen');
  home.classList.remove('hidden');
  home.setAttribute('aria-hidden', 'false');
  home.classList.add('fade-in');
}

// PUBLIC_INTERFACE
function renderInstructions() {
  /** Render instructions screen */
  hideAll();
  const screen = $('#instructions-screen');
  screen.classList.remove('hidden');
  screen.setAttribute('aria-hidden', 'false');
  screen.classList.add('slide-in-up');
}

// PUBLIC_INTERFACE
function renderQuestion() {
  /** Render current question with options, progress, and timer */
  hideAll();
  const quiz = $('#quiz-screen');
  quiz.classList.remove('hidden');
  quiz.setAttribute('aria-hidden', 'false');
  quiz.classList.add('slide-in-up');

  const q = gkQuestions[State.currentIndex];
  $('#question-text').textContent = `${State.currentIndex + 1}. ${q.question}`;

  const optionsWrap = $('#options-wrap');
  optionsWrap.innerHTML = '';
  State.selectedIndex = null;

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'btn option-btn';
    btn.type = 'button';
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = opt;
    btn.addEventListener('click', () => selectOption(idx, btn));
    optionsWrap.appendChild(btn);
  });

  $('#next-btn').disabled = true;
  updateProgressBar();

  if (State.timerEnabled) {
    startTimer();
  } else {
    stopTimer();
    $('#timer-value').textContent = '∞';
  }
}

// PUBLIC_INTERFACE
function renderResult() {
  /** Show result summary, name input, and optional confetti on high score */
  hideAll();
  stopTimer();

  const resultEl = $('#result-summary');
  const wrong = State.total - State.score;
  resultEl.textContent = `You scored ${State.score} out of ${State.total}. Correct: ${State.score}, Wrong: ${wrong}`;

  const res = $('#result-screen');
  res.classList.remove('hidden');
  res.setAttribute('aria-hidden', 'false');
  res.classList.add('slide-in-up');

  // Confetti on high score (>= 13/15)
  if (State.score >= 13) launchConfetti();
}

// PUBLIC_INTERFACE
function renderScoreboard() {
  /** Render scoreboard with ranks, sorted by score desc and date asc */
  hideAll();
  const wrap = $('#scoreboard-list');
  wrap.innerHTML = '';

  const data = loadScoreboard();
  if (data.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No entries yet. Play a quiz to add your score!';
    p.className = 'subtitle';
    wrap.appendChild(p);
  } else {
    data.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      const rank = document.createElement('div');
      rank.className = 'rank';
      rank.textContent = `#${idx + 1}`;
      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = item.name;
      const score = document.createElement('div');
      score.className = 'score';
      score.textContent = `${item.score}/${item.total}`;
      const date = document.createElement('div');
      date.className = 'date';
      date.textContent = formatDateTime(item.dateISO);

      row.append(rank, name, score, date);
      wrap.appendChild(row);
    });
  }

  const screen = $('#scoreboard-screen');
  screen.classList.remove('hidden');
  screen.setAttribute('aria-hidden', 'false');
  screen.classList.add('slide-in-up');
}

/* ---- Handlers ---- */
// PUBLIC_INTERFACE
function selectOption(idx, btnEl) {
  /** Select an option and enable next */
  State.selectedIndex = idx;
  $$('#options-wrap .option-btn').forEach(el => {
    el.classList.remove('selected');
    el.setAttribute('aria-selected', 'false');
  });
  btnEl.classList.add('selected');
  btnEl.setAttribute('aria-selected', 'true');
  $('#next-btn').disabled = false;
}

// PUBLIC_INTERFACE
function nextQuestion(auto = false) {
  /**
   * Move to next question. If auto and no selection, counts as wrong by default.
   * If selected and correct, increment score.
   */
  stopTimer();
  const q = gkQuestions[State.currentIndex];
  if (!auto && State.selectedIndex !== null) {
    if (State.selectedIndex === q.answerIndex) {
      State.score += 1;
    }
  } else {
    // auto-advance or no selection: wrong; no score increment
  }

  State.currentIndex += 1;

  if (State.currentIndex >= State.total) {
    renderResult();
  } else {
    renderQuestion();
  }
}

// PUBLIC_INTERFACE
function submitName(e) {
  /** Save the result with the attendee name and show scoreboard */
  e.preventDefault();
  const nameInput = $('#attendee-name');
  const name = (nameInput.value || '').trim();
  if (name.length < 2) {
    nameInput.focus();
    nameInput.setCustomValidity('Please enter at least 2 characters');
    nameInput.reportValidity();
    return;
  }
  nameInput.setCustomValidity('');

  const entry = {
    name,
    score: State.score,
    total: State.total,
    dateISO: new Date().toISOString(),
  };
  saveEntry(entry);
  renderScoreboard();
}

// PUBLIC_INTERFACE
function clearScoreboard() {
  /** Clear scoreboard and re-render */
  clearStorage();
  renderScoreboard();
}

// PUBLIC_INTERFACE
function retryQuiz() {
  /** Reset state and go to home */
  resetState();
  renderHome();
}

/* ---- Timer ---- */
function startTimer() {
  stopTimer();
  State.timeLeft = 10;
  $('#timer-value').textContent = String(State.timeLeft);
  State.timerId = setInterval(() => {
    State.timeLeft -= 1;
    $('#timer-value').textContent = String(State.timeLeft);
    if (State.timeLeft <= 0) {
      // time up, auto next (wrong if no selection)
      nextQuestion(true);
    }
  }, 1000);
}
function stopTimer() {
  if (State.timerId) {
    clearInterval(State.timerId);
    State.timerId = null;
  }
}

/* ---- Progress ---- */
function updateProgressBar() {
  const pct = Math.round(((State.currentIndex) / State.total) * 100);
  $('#progress-bar').style.width = `${pct}%`;
}

/* ---- Confetti (lightweight) ---- */
function launchConfetti() {
  const canvas = $('#confetti-canvas');
  const ctx = canvas.getContext('2d');
  resizeCanvas();
  let particles = [];
  const colors = ['#a78bfa', '#8b5cf6', '#10B981', '#FBBF24', '#F472B6'];
  const gravity = 0.15;
  const drag = 0.005;

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -Math.random() * 40,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 2 + 2,
      size: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
    });
  }

  let animId;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.vy += gravity;
      p.vx *= (1 - drag);
      p.x += p.vx;
      p.y += p.vy;
      p.opacity -= 0.007;
      ctx.globalAlpha = Math.max(p.opacity, 0);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    particles = particles.filter(p => p.opacity > 0 && p.y < canvas.height + 20);
    if (particles.length > 0) {
      animId = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animId);
    }
  }
  tick();

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas, { once: true });
}

/* ---- Flow Control ---- */
function resetState() {
  State.currentIndex = 0;
  State.score = 0;
  State.total = gkQuestions.length;
  State.selectedIndex = null;
  State.timeLeft = 10;
  stopTimer();
}

function startQuizFlow() {
  resetState();
  renderQuestion();
}

/* ---- Event Wiring ---- */
function wireEvents() {
  $('#start-quiz').addEventListener('click', renderInstructions);
  $('#begin-quiz').addEventListener('click', startQuizFlow);
  $('#cancel-instructions').addEventListener('click', renderHome);

  $('#next-btn').addEventListener('click', () => nextQuestion(false));
  $('#name-form').addEventListener('submit', submitName);
  $('#view-scoreboard').addEventListener('click', renderScoreboard);
  $('#retry-quiz').addEventListener('click', retryQuiz);

  $('#nav-home').addEventListener('click', renderHome);
  $('#nav-scoreboard').addEventListener('click', renderScoreboard);
  $('#back-home').addEventListener('click', renderHome);
  $('#clear-scoreboard').addEventListener('click', clearScoreboard);
}

/* ---- Startup ---- */
document.addEventListener('DOMContentLoaded', () => {
  wireEvents();
  renderHome(); // home -> instructions -> quiz uses gkQuestions by default
});
