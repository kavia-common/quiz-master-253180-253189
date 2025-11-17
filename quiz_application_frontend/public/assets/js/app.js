/**
 * Royal Purple Quiz App - Vanilla JS
 * - Screens: Home, Quiz, Result, Scoreboard, Attendees
 * - 10s per-question timer, progress bar, transitions
 * - localStorage persistence for scoreboard and attendees
 * - Keyboard navigation: 1-4 / arrows to select, Enter for Next
 * - Confetti on high score (>= 8)
 *
 * Storage keys:
 *  - quiz_scoreboard: [{ name, score, date }]
 *  - quiz_attendees:  [{ name, score, date }]
 */

(function () {
  'use strict';

  // Constants
  const STORAGE_KEYS = {
    SCOREBOARD: 'quiz_scoreboard',
    ATTENDEES: 'quiz_attendees',
  };
  const QUESTION_TIME = 10; // seconds
  const HIGH_SCORE_THRESHOLD = 8;

  // Sample Questions
  /** @type {{id:number,question:string,options:string[],answerIndex:number}[]} */
  const QUESTIONS = [
    { id: 1, question: 'What does HTML stand for?', options: ['Hyperlinks and Text Markup Language', 'Home Tool Markup Language', 'Hyper Text Markup Language', 'Hyperlink Text Management Language'], answerIndex: 2 },
    { id: 2, question: 'Which CSS property controls the text size?', options: ['font-size', 'text-style', 'text-size', 'font-style'], answerIndex: 0 },
    { id: 3, question: 'Inside which HTML element do we put the JavaScript?', options: ['<javascript>', '<script>', '<js>', '<scripting>'], answerIndex: 1 },
    { id: 4, question: 'Which of the following is not a JavaScript data type?', options: ['Undefined', 'Number', 'Boolean', 'Float'], answerIndex: 3 },
    { id: 5, question: 'Which symbol is used for comments in JavaScript (single line)?', options: ['//', '/*', '#', '<!-- -->'], answerIndex: 0 },
    { id: 6, question: 'What does CSS stand for?', options: ['Creative Style System', 'Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets'], answerIndex: 1 },
    { id: 7, question: 'Which HTML attribute is used to define inline styles?', options: ['styles', 'font', 'style', 'class'], answerIndex: 2 },
    { id: 8, question: 'What keyword declares a block-scoped variable in JS?', options: ['var', 'let', 'const', 'both let and const'], answerIndex: 3 },
    { id: 9, question: 'Which method converts JSON string to object?', options: ['JSON.parse()', 'JSON.stringify()', 'JSON.toObject()', 'JSON.convert()'], answerIndex: 0 },
    { id: 10, question: 'Which is used to add a class in JS?', options: ['el.setClass()', 'el.addClass()', 'el.classList.add()', 'el.className.add()'], answerIndex: 2 },
  ];

  // Elements
  const screens = {
    home: document.getElementById('screen-home'),
    quiz: document.getElementById('screen-quiz'),
    result: document.getElementById('screen-result'),
    scoreboard: document.getElementById('screen-scoreboard'),
    attendees: document.getElementById('screen-attendees'),
  };

  const navHome = document.getElementById('navHome');
  const navScoreboard = document.getElementById('navScoreboard');

  // Home
  const btnStartQuiz = document.getElementById('btnStartQuiz');
  const btnViewScoreboard = document.getElementById('btnViewScoreboard');

  // Quiz
  const questionNumberEl = document.getElementById('questionNumber');
  const questionTotalEl = document.getElementById('questionTotal');
  const timerValueEl = document.getElementById('timerValue');
  const progressBarEl = document.getElementById('progressBar');
  const questionTextEl = document.getElementById('questionText');
  const optionsListEl = document.getElementById('optionsList');
  const btnNext = document.getElementById('btnNext');

  // Result
  const statTotalEl = document.getElementById('statTotal');
  const statCorrectEl = document.getElementById('statCorrect');
  const statWrongEl = document.getElementById('statWrong');
  const statScoreEl = document.getElementById('statScore');
  const playerNameInput = document.getElementById('playerName');
  const btnSaveScore = document.getElementById('btnSaveScore');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnGoHomeFromResult = document.getElementById('btnGoHomeFromResult');

  // Scoreboard
  const scoreboardBody = document.getElementById('scoreboardBody');
  const btnClearScoreboard = document.getElementById('btnClearScoreboard');
  const btnShowAttendees = document.getElementById('btnShowAttendees');
  const btnBackHomeFromBoard = document.getElementById('btnBackHomeFromBoard');

  // Attendees
  const attendeesBody = document.getElementById('attendeesBody');
  const btnBackToBoard = document.getElementById('btnBackToBoard');
  const btnClearAttendees = document.getElementById('btnClearAttendees');
  const btnBackHomeFromAttendees = document.getElementById('btnBackHomeFromAttendees');

  // Confetti
  const confettiCanvas = document.getElementById('confetti-canvas');
  const ctx = confettiCanvas.getContext('2d');
  let confettiPieces = [];
  let confettiAnimationId = null;

  // Quiz state
  let currentIndex = 0;
  let selectedIndex = -1;
  let correctCount = 0;
  let wrongCount = 0;
  let timeLeft = QUESTION_TIME;
  let timerId = null;

  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // PUBLIC_INTERFACE
  function showScreen(name) {
    /** Show screen by name and hide others with transitions */
    Object.values(screens).forEach(s => s.classList.remove('active'));
    const target = screens[name];
    if (target) target.classList.add('active');
  }

  // STORAGE HELPERS
  function getArray(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setArray(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {
      // ignore storage errors
    }
  }

  // Scoreboard sorting: score desc, then date asc
  function sortEntries(entries) {
    return [...entries].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  // Render Scoreboard
  function renderScoreboard() {
    const board = sortEntries(getArray(STORAGE_KEYS.SCOREBOARD));
    scoreboardBody.innerHTML = '';
    if (board.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No scores yet. Be the first!';
      scoreboardBody.appendChild(empty);
      return;
    }
    board.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      const date = new Date(entry.date);
      row.innerHTML = `
        <div>${i + 1}</div>
        <div>${escapeHtml(entry.name || 'Anonymous')}</div>
        <div>${entry.score}</div>
        <div>${date.toLocaleString()}</div>
      `;
      scoreboardBody.appendChild(row);
    });
  }

  // Render Attendees
  function renderAttendees() {
    const list = getArray(STORAGE_KEYS.ATTENDEES);
    const sorted = list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    attendeesBody.innerHTML = '';
    if (sorted.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No attendees yet.';
      attendeesBody.appendChild(empty);
      return;
    }
    sorted.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'table-row';
      const date = new Date(entry.date);
      row.innerHTML = `
        <div>${i + 1}</div>
        <div>${escapeHtml(entry.name || 'Anonymous')}</div>
        <div>${entry.score}</div>
        <div>${date.toLocaleString()}</div>
      `;
      attendeesBody.appendChild(row);
    });
  }

  // Escape HTML to avoid any injection
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // QUIZ FUNCTIONS
  function resetQuizState() {
    currentIndex = 0;
    selectedIndex = -1;
    correctCount = 0;
    wrongCount = 0;
    timeLeft = QUESTION_TIME;
    clearTimer();
    updateProgressBar();
    questionTotalEl.textContent = String(QUESTIONS.length);
  }

  function startQuiz() {
    resetQuizState();
    showScreen('quiz');
    renderQuestion();
    startTimer();
  }

  function renderQuestion() {
    const q = QUESTIONS[currentIndex];
    if (!q) return;

    questionNumberEl.textContent = String(currentIndex + 1);
    questionTextEl.textContent = q.question;
    optionsListEl.innerHTML = '';

    q.options.forEach((text, idx) => {
      const li = document.createElement('li');
      li.className = 'option';
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = String(idx);
      li.innerHTML = `
        <span class="option-key">${idx + 1}</span>
        <span class="option-text">${escapeHtml(text)}</span>
      `;
      li.addEventListener('click', () => selectOption(idx));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectOption(idx);
        }
      });
      optionsListEl.appendChild(li);
    });

    selectedIndex = -1;
    timeLeft = QUESTION_TIME;
    timerValueEl.textContent = String(timeLeft);
    updateProgressBar();
  }

  function selectOption(idx) {
    selectedIndex = idx;
    // update UI selection highlight
    [...optionsListEl.children].forEach((li, i) => {
      li.setAttribute('aria-selected', String(i === idx));
    });
  }

  function nextQuestion() {
    // check answer
    const q = QUESTIONS[currentIndex];
    if (!q) return;

    const isCorrect = selectedIndex === q.answerIndex;
    if (selectedIndex === -1) {
      // count as wrong if no selection
      wrongCount++;
    } else if (isCorrect) {
      correctCount++;
      markOptionsFeedback(q.answerIndex, selectedIndex, true);
    } else {
      wrongCount++;
      markOptionsFeedback(q.answerIndex, selectedIndex, false);
    }

    clearTimer();

    // brief pause to show feedback if selected
    const pause = selectedIndex !== -1 ? 450 : 0;

    setTimeout(() => {
      // advance
      if (currentIndex < QUESTIONS.length - 1) {
        currentIndex++;
        renderQuestion();
        startTimer();
      } else {
        showResults();
      }
    }, pause);
  }

  function markOptionsFeedback(correctIdx, selectedIdx, isCorrect) {
    [...optionsListEl.children].forEach((li, i) => {
      li.classList.remove('correct', 'incorrect');
      if (i === correctIdx) li.classList.add('correct');
      if (selectedIdx !== correctIdx && i === selectedIdx) li.classList.add('incorrect');
    });
  }

  function startTimer() {
    clearTimer();
    timerId = setInterval(() => {
      timeLeft--;
      timerValueEl.textContent = String(timeLeft);
      if (timeLeft <= 0) {
        clearTimer();
        // time up => wrong
        wrongCount++;
        // auto-advance
        setTimeout(() => {
          if (currentIndex < QUESTIONS.length - 1) {
            currentIndex++;
            renderQuestion();
            startTimer();
          } else {
            showResults();
          }
        }, 150);
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function updateProgressBar() {
    const progress = (currentIndex / QUESTIONS.length) * 100;
    progressBarEl.style.width = `${progress}%`;
    progressBarEl.setAttribute('aria-valuenow', String(Math.round(progress)));
  }

  function showResults() {
    showScreen('result');
    const total = QUESTIONS.length;
    const score = correctCount; // 1 point per correct
    statTotalEl.textContent = String(total);
    statCorrectEl.textContent = String(correctCount);
    statWrongEl.textContent = String(wrongCount);
    statScoreEl.textContent = String(score);
    playerNameInput.value = '';
    // confetti if high score
    if (score >= HIGH_SCORE_THRESHOLD) {
      startConfetti();
      setTimeout(stopConfetti, 3000);
    }
  }

  // Save result
  function saveScore() {
    const nameRaw = playerNameInput.value.trim();
    const name = nameRaw.length ? nameRaw : 'Anonymous';
    const score = correctCount;
    const entry = {
      name,
      score,
      date: new Date().toISOString(),
    };
    const board = getArray(STORAGE_KEYS.SCOREBOARD);
    board.push(entry);
    setArray(STORAGE_KEYS.SCOREBOARD, board);

    const attendees = getArray(STORAGE_KEYS.ATTENDEES);
    attendees.push(entry);
    setArray(STORAGE_KEYS.ATTENDEES, attendees);

    renderScoreboard();
    showScreen('scoreboard');
  }

  // Keyboard navigation
  function handleKeydown(e) {
    if (!screens.quiz.classList.contains('active')) return;
    const key = e.key;
    const totalOptions = optionsListEl.children.length;

    if (['1','2','3','4'].includes(key)) {
      const idx = parseInt(key, 10) - 1;
      if (idx < totalOptions) selectOption(idx);
    } else if (key === 'ArrowDown' || key === 'ArrowRight') {
      const next = selectedIndex < totalOptions - 1 ? selectedIndex + 1 : 0;
      selectOption(next);
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      const prev = selectedIndex > 0 ? selectedIndex - 1 : totalOptions - 1;
      selectOption(prev);
    } else if (key === 'Enter') {
      nextQuestion();
    }
  }

  // Confetti implementation (simple, no external libs)
  function startConfetti() {
    const colors = ['#8B5CF6', '#C4B5FD', '#7C3AED', '#10B981', '#F59E0B', '#EF4444'];
    confettiPieces = Array.from({ length: 140 }).map(() => ({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 0.5 + 0.5,
      tilt: Math.random() * 10,
      tiltAngleIncrement: Math.random() * 0.07 + 0.05,
      tiltAngle: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    function draw() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiPieces.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.ellipse(p.x + p.tilt, p.y, p.r, p.r / 2, p.tilt, 0, Math.PI * 2);
        ctx.fill();
      });
      update();
      confettiAnimationId = requestAnimationFrame(draw);
    }

    function update() {
      confettiPieces.forEach(p => {
        p.tiltAngle += p.tiltAngleIncrement;
        p.y += (Math.cos(p.d) + 1 + p.r / 4);
        p.x += Math.sin(p.d);
        p.tilt = Math.sin(p.tiltAngle) * 8;

        if (p.y > confettiCanvas.height + 20) {
          p.y = -10;
          p.x = Math.random() * confettiCanvas.width;
        }
      });
    }

    if (!confettiAnimationId) draw();
  }

  function stopConfetti() {
    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  // Event bindings
  document.addEventListener('keydown', handleKeydown);

  navHome.addEventListener('click', () => {
    stopConfetti();
    showScreen('home');
  });
  navScoreboard.addEventListener('click', () => {
    stopConfetti();
    renderScoreboard();
    showScreen('scoreboard');
  });

  btnStartQuiz.addEventListener('click', startQuiz);
  btnViewScoreboard.addEventListener('click', () => {
    renderScoreboard();
    showScreen('scoreboard');
  });

  btnNext.addEventListener('click', nextQuestion);

  btnSaveScore.addEventListener('click', saveScore);
  btnPlayAgain.addEventListener('click', startQuiz);
  btnGoHomeFromResult.addEventListener('click', () => {
    showScreen('home');
  });

  btnClearScoreboard.addEventListener('click', () => {
    setArray(STORAGE_KEYS.SCOREBOARD, []);
    renderScoreboard();
  });
  btnShowAttendees.addEventListener('click', () => {
    renderAttendees();
    showScreen('attendees');
  });
  btnBackHomeFromBoard.addEventListener('click', () => {
    showScreen('home');
  });

  btnBackToBoard.addEventListener('click', () => {
    renderScoreboard();
    showScreen('scoreboard');
  });
  btnClearAttendees.addEventListener('click', () => {
    setArray(STORAGE_KEYS.ATTENDEES, []);
    renderAttendees();
  });
  btnBackHomeFromAttendees.addEventListener('click', () => {
    showScreen('home');
  });

  // Initialize
  (function init() {
    questionTotalEl.textContent = String(QUESTIONS.length);
    statTotalEl.textContent = String(QUESTIONS.length);
    showScreen('home');
  })();

})();
