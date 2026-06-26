
const defaultScores = { listening: 60, empathy: 58, probing: 52, safety: 62 };

const scenarioMeta = {
  burnout: {
    name: '燃え尽き・モチベーション低下',
    persona: '田中さん（28歳）',
    avatar: '😔',
    tags: ['疲弊', 'モチベーション低下', '残業'],
    context: '残業が続き、以前より反応が薄くなっている部下です。最初は「問題ない」と言いがちです。',
    tip: '解決策を急がず、まず安心感と温度感の確認を優先してください。',
    starter: 'ありがとう。無理に何か出さなくても大丈夫だから、今日は最近の様子を少し聞かせてもらえる？'
  },
  conflict: {
    name: 'チーム内人間関係の悩み',
    persona: '佐藤さん（32歳）',
    avatar: '😟',
    tags: ['人間関係', 'チーム', '言いづらさ'],
    context: '同僚との関係が悪化し、仕事のしづらさとストレスが高まっています。',
    tip: '誰が悪いかを決めるより先に、どんな場面で何が起きているかを整理してください。',
    starter: '話しづらいことなら無理にまとめなくて大丈夫です。最近やりづらさを感じる場面があれば、話せる範囲で教えてください。'
  },
  career: {
    name: 'キャリアの方向性・成長の悩み',
    persona: '鈴木さん（25歳）',
    avatar: '🤔',
    tags: ['キャリア', '将来不安', '転職予兆'],
    context: '入社3年目前後で、このまま今の部署にいてよいのか迷い始めています。',
    tip: '否定や引き留めに急がず、どの場面で迷いが強くなるかを聞いてください。',
    starter: '将来のことを考えているんだね。まだ整理しきれてなくても大丈夫だから、どんな時にその気持ちが強くなるのか聞かせてもらえる？'
  },
  performance: {
    name: '業務パフォーマンスの課題',
    persona: '高橋さん（35歳）',
    avatar: '😰',
    tags: ['ミス増加', '自信低下', 'プレッシャー'],
    context: '最近のミス増加で自信を失い、プライドもあり弱みを出しづらい状態です。',
    tip: '責めるより、何が難しくなっているのかを一緒に言語化する姿勢が有効です。',
    starter: '最近しんどさややりづらさがあるようにも見えていて、少し気になっていました。どんな場面が一番つらいか聞かせてもらえる？'
  },
  worklife: {
    name: '仕事と私生活のバランス',
    persona: '中村さん（30歳）',
    avatar: '😓',
    tags: ['育児', '両立', '限界'],
    context: '仕事と家庭の両立に限界を感じつつも、迷惑をかけたくない思いが強い部下です。',
    tip: '「大変ですがなんとか」は要注意です。罪悪感を受け止めてから具体的な配慮へ進んでください。',
    starter: 'なんとかやっていると言いながら、かなり頑張っている感じも伝わってきます。いま一番負担が大きいのはどのあたりですか？'
  }
};

const openingMessages = {
  burnout: 'あ、部長、お時間いただいてありがとうございます。えっと...特に何も問題はないんですが、1on1ということで...',
  conflict: 'はい、呼んでいただいてありがとうございます。えーと...何でしょうか？',
  career: 'あ、はい。お時間ありがとうございます。実は、少し相談したいことがあって...',
  performance: '失礼します。呼んでいただきましたが...何かありましたでしょうか？',
  worklife: 'お時間いただいてありがとうございます。最近はまあ、なんとかやっています。'
};

if (!window.__PERSISTENCE__) {
  console.error('[App] window.__PERSISTENCE__ が未定義です。persistence.global.js の読み込みに失敗した可能性があります。');
}
if (!window.__COURSE_SESSIONS__ || !window.__COURSE_SESSIONS__.length) {
  console.error('[App] window.__COURSE_SESSIONS__ が未定義です。data.global.js の読み込みに失敗した可能性があります。');
}

const _fallbackDefaultState = () => ({
  currentCourseId: 1, completedCourses: [], currentScenarioId: 'burnout',
  practiceLogs: [], reviews: [], prepMemo: null, previousPrepMemo: null,
  coachMessages: [], coachSummary: null, coachPhase: 0
});

const {
  createDefaultState: buildInitialState,
  getPersistenceLabel,
  initializePersistence,
  loadAppState,
  saveAppState,
  appendPracticeLog,
  appendReview,
  appendPrepMemo
} = window.__PERSISTENCE__ || {
  createDefaultState: _fallbackDefaultState,
  getPersistenceLabel: () => 'ブラウザ保存（フォールバック）',
  initializePersistence: async () => {},
  loadAppState: async () => _fallbackDefaultState(),
  saveAppState: (s) => { try { localStorage.setItem('oneOnOneCoachingAppStateV2', JSON.stringify(s)); } catch {} },
  appendPracticeLog: () => {},
  appendReview: () => {},
  appendPrepMemo: () => {}
};

const courseSessions = window.__COURSE_SESSIONS__ || [];
const state = buildInitialState();
let currentScenario = state.currentScenarioId || 'burnout';
let messages = [];
let turnCount = 0;
let isLoading = false;
let sessionActive = false;

function getById(id) {
  return document.getElementById(id);
}

function setText(target, value) {
  if (target) target.textContent = value;
}

function setHtml(target, value) {
  if (target) target.innerHTML = value;
}

function dispatchAppAction(action, payload) {
  const actions = window.__APP_ACTIONS__ || {};
  try {
    if (typeof actions[action] === 'function') {
      return actions[action](payload);
    }
    if (action === 'switchTab') return switchTab(payload);
    if (action === 'openCourse') return openCourse(payload);
    if (action === 'nextCourse') return goToNextCourse();
    if (action === 'markCourseComplete') return markCourseComplete();
    if (action === 'courseToCoach') return seedCoachFromCourse();
    if (action === 'startPractice') return startSession();
    if (action === 'endSession') return endSession();
    if (action === 'sendMessage') return sendMessage();
    if (action === 'insertStarter') return insertStarterText();
    if (action === 'replayScenario') return startSession();
    if (action === 'practiceToCoach') return seedCoachFromScenario();
    if (action === 'generateExample') return generateResponseExample();
    if (action === 'coachStarter') return window.__coachStarter && window.__coachStarter(payload);
    if (action === 'coachMemo') return sendCoachMessage();
    if (action === 'resetCoach') return resetCoachFlow();
    if (action === 'coachToReview') return switchTab('review');
    if (action === 'saveReview') return saveReview();
  } catch (error) {
    console.error('[App] action failed:', action, error);
  }
}

function flashButtonText(button, text, resetText, delayMs = 1200) {
  if (!button) return;
  button.textContent = text;
  window.setTimeout(() => {
    if (button) button.textContent = resetText;
  }, delayMs);
}

function insertStarterText() {
  const input = getById('userInput');
  const button = getById('insertStarterButton');
  const starter = scenarioMeta[currentScenario] && scenarioMeta[currentScenario].starter;
  if (!input || !starter) return;
  input.value = starter;
  autoResize(input);
  input.focus();
  input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  flashButtonText(button, '入力しました', '最初の一言の例を入れる');
}

const navButtons = Array.from(document.querySelectorAll('.nav-button'));
const sections = {
  overview: document.getElementById('overviewSection'),
  course: document.getElementById('courseSection'),
  practice: document.getElementById('practiceSection'),
  examples: document.getElementById('examplesSection'),
  prep: document.getElementById('prepSection'),
  review: document.getElementById('reviewSection'),
  dashboard: document.getElementById('dashboardSection')
};

const els = {
  courseSidebar: document.getElementById('courseSidebar'),
  courseTitle: document.getElementById('courseTitle'),
  courseIntro: document.getElementById('courseIntro'),
  courseGoals: document.getElementById('courseGoals'),
  courseSignals: document.getElementById('courseSignals'),
  courseEmployeeLine: document.getElementById('courseEmployeeLine'),
  courseCoachLine: document.getElementById('courseCoachLine'),
  courseOptions: document.getElementById('courseOptions'),
  courseFeedbackBox: document.getElementById('courseFeedbackBox'),
  courseStatusBadge: document.getElementById('courseStatusBadge'),
  markCompleteButton: document.getElementById('markCompleteButton'),
  scenarioSelect: document.getElementById('scenarioSelect'),
  scenarioPersona: document.getElementById('scenarioPersona'),
  scenarioContext: document.getElementById('scenarioContext'),
  scenarioTags: document.getElementById('scenarioTags'),
  scenarioTip: document.getElementById('scenarioTip'),
  completedCount: document.getElementById('completedCount'),
  practiceCount: document.getElementById('practiceCount'),
  priorityChip: document.getElementById('priorityChip'),
  homeCompletedStat: document.getElementById('homeCompletedStat'),
  homePracticeStat: document.getElementById('homePracticeStat'),
  homeNextActions: document.getElementById('homeNextActions'),
  homePrepMemo: document.getElementById('homePrepMemo'),
  homeLatestReview: document.getElementById('homeLatestReview'),
  dashboardCompleted: document.getElementById('dashboardCompleted'),
  dashboardPractice: document.getElementById('dashboardPractice'),
  dashboardWeakness: document.getElementById('dashboardWeakness'),
  dashboardReviews: document.getElementById('dashboardReviews'),
  dashboardScores: document.getElementById('dashboardScores'),
  dashboardActions: document.getElementById('dashboardActions'),
  reviewHistory: document.getElementById('reviewHistory'),
  exampleInput: document.getElementById('exampleInput'),
  exampleQuickButtons: Array.from(document.querySelectorAll('.example-quick-button')),
  exampleOutput: document.getElementById('exampleOutput'),
  exampleLearningNote: document.getElementById('exampleLearningNote'),
  coachPhaseLabel: document.getElementById('coachPhaseLabel'),
  coachStarterButtons: Array.from(document.querySelectorAll('#coachStarterGrid .starter-button')),
  coachChatBox: document.getElementById('coachChatBox'),
  coachInput: document.getElementById('coachInput'),
  courseOverviewButtons: Array.from(document.querySelectorAll('#courseOverviewGrid .course-overview-card'))
};

window.__APP_ACTIONS__ = {
  switchTab,
  openCourse,
  nextCourse: goToNextCourse,
  markCourseComplete,
  courseToCoach: seedCoachFromCourse,
  startPractice: startSession,
  endSession,
  sendMessage,
  insertStarter: insertStarterText,
  replayScenario: startSession,
  practiceToCoach: seedCoachFromScenario,
  generateExample: generateResponseExample,
  coachStarter(text) {
    els.coachInput.value = text || '';
    autoResize(els.coachInput);
    els.coachInput.focus();
  },
  coachMemo: sendCoachMessage,
  resetCoach: resetCoachFlow,
  restoreCoach: restorePreviousPrepMemo,
  coachToReview() {
    switchTab('review');
  },
  saveReview
};

// boot() が失敗しても doLogin は使えるようトップレベルで先出し登録
window.doLogin = doLogin;
window.__completeLogin = completeLogin;

try {
  boot();
} catch (bootError) {
  console.error('[App] boot() の実行中に例外が発生しました:', bootError);
}

function isLocalPreview() {
  return window.location.protocol === 'file:';
}

function showLoginError(message) {
  const errEl = document.getElementById('lg-err');
  const btn = document.getElementById('lg-btn');
  const gate = document.getElementById('login-gate');
  if (errEl) errEl.textContent = message;
  if (btn) {
    btn.disabled = false;
    btn.textContent = '続ける';
  }
  if (gate) gate.style.display = '';
}

async function completeLogin(email) {
  localStorage.setItem('user_email', email);
  const gate = document.getElementById('login-gate');
  if (gate) gate.style.display = 'none';
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('initApp timeout')), 12000)
    );
    await Promise.race([initApp(), timeout]);
  } catch (error) {
    console.error('App initialization failed after login.', error);
    localStorage.removeItem('user_email');
    showLoginError('初期化に失敗しました。ページを再読み込みしてください。');
  }
}

function boot() {
  window.__APP_READY__ = true;
  window.__appDispatch = dispatchAppAction;
  window.doLogin = doLogin;
  window.__completeLogin = completeLogin;
  window.__switchTab = switchTab;
  window.__openCourse = openCourse;
  window.__goToNextCourse = goToNextCourse;
  window.__markCourseComplete = markCourseComplete;
  window.__seedCoachFromCourse = seedCoachFromCourse;
  window.__startSession = startSession;
  window.__endSession = endSession;
  window.__sendMessage = sendMessage;
  window.__insertStarter = insertStarterText;
  window.__seedCoachFromScenario = seedCoachFromScenario;
  window.__generateResponseExample = generateResponseExample;
  window.__coachStarter = function (text) {
    els.coachInput.value = text || '';
    autoResize(els.coachInput);
    els.coachInput.focus();
  };
  window.__sendCoachMessage = sendCoachMessage;
  window.__resetCoachFlow = resetCoachFlow;
  window.__restorePreviousPrepMemo = restorePreviousPrepMemo;
  window.__saveReview = saveReview;
  window.startCheckout = startCheckout;
  window.openPortal = openPortal;

  const input = document.getElementById('lg-email');
  if (input) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') doLogin();
    });
  }

  const email = localStorage.getItem('user_email');
  if (email) {
    completeLogin(email);
  } else {
    if (input) setTimeout(() => input.focus(), 100);
  }

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  if (sessionId && !isLocalPreview()) {
    fetch('/api/stripe/session?session_id=' + sessionId)
      .then((response) => response.json())
      .then((data) => {
        if (data.customerId) {
          localStorage.setItem('stripe_customer_id', data.customerId);
          localStorage.removeItem('trial_start_date');
        }
        window.history.replaceState({}, '', '/');
        return initApp();
      })
      .catch(() => initApp().catch(() => {
        showLoginError('アプリの初期化に失敗しました。ページを再読み込みしてください。');
      }));
  }
}

function doLogin() {
  const email = document.getElementById('lg-email').value.trim();
  const errEl = document.getElementById('lg-err');
  const btn = document.getElementById('lg-btn');
  errEl.textContent = '';
  if (!email || !email.includes('@')) {
    errEl.textContent = '有効なメールアドレスを入力してください';
    return;
  }
  btn.disabled = true;
  btn.textContent = '確認中...';

  if (isLocalPreview()) {
    completeLogin(email);
    return;
  }

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        errEl.textContent = data.error;
        btn.disabled = false;
        btn.textContent = '続ける';
        return;
      }
      if (data.customerId) localStorage.setItem('stripe_customer_id', data.customerId);
      fetch('/api/sheets/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status: data.status })
      }).catch(() => {});
      completeLogin(email);
    })
    .catch(() => {
      errEl.textContent = '通信エラーが発生しました。再度お試しください。';
      btn.disabled = false;
      btn.textContent = '続ける';
    });
}

async function initApp() {
  await initializePersistence();
  await hydrateState();

  if (!localStorage.getItem('trial_start_date')) {
    localStorage.setItem('trial_start_date', Date.now().toString());
  }

  const subscribed = !!localStorage.getItem('stripe_customer_id');
  const elapsed = Date.now() - parseInt(localStorage.getItem('trial_start_date') || '0', 10);
  const trialActive = elapsed < 30 * 24 * 60 * 60 * 1000;
  const trialBar = document.getElementById('trial-bar');
  const paySection = document.getElementById('pay-section');
  const portalWrap = document.getElementById('portal-wrap');

  if (trialBar) trialBar.classList.add('hidden');
  if (paySection) paySection.classList.add('hidden');
  if (portalWrap) portalWrap.classList.add('hidden');

  if (subscribed) {
    if (portalWrap) portalWrap.classList.remove('hidden');
  } else if (trialActive) {
    const days = Math.ceil((30 * 24 * 60 * 60 * 1000 - elapsed) / (24 * 60 * 60 * 1000));
    if (trialBar) { trialBar.classList.remove('hidden'); trialBar.textContent = '無料トライアル中 - あと ' + days + ' 日'; }
  } else {
    if (paySection) paySection.classList.remove('hidden');
  }

  bindEvents();
  renderAll();
}

function isAuthorized() {
  if (localStorage.getItem('stripe_customer_id')) return true;
  const elapsed = Date.now() - parseInt(localStorage.getItem('trial_start_date') || '0', 10);
  return elapsed < 30 * 24 * 60 * 60 * 1000;
}

function startCheckout() {
  const btn = document.getElementById('pay-btn');
  btn.disabled = true;
  btn.textContent = '処理中...';
  fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    .then((response) => response.json())
    .then((data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('エラー: ' + (data.error || '不明'));
        btn.disabled = false;
        btn.textContent = '利用継続の設定へ進む';
      }
    })
    .catch((error) => {
      alert('通信エラー: ' + error.message);
      btn.disabled = false;
      btn.textContent = '利用継続の設定へ進む';
    });
}

function openPortal() {
  const customerId = localStorage.getItem('stripe_customer_id');
  if (!customerId) {
    alert('お客様情報が見つかりません。');
    return;
  }
  fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId })
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.url) window.location.href = data.url;
    })
    .catch(() => alert('通信エラーが発生しました。'));
}

function bindEvents() {
  if (window.__oneOnOneBound) return;
  window.__oneOnOneBound = true;

  window.__appDispatch = dispatchAppAction;

  navButtons.forEach((button) => {
    button.onclick = () => dispatchAppAction('switchTab', button.dataset.tab);
  });
  els.courseOverviewButtons.forEach((button) => {
    button.onclick = () => dispatchAppAction('openCourse', Number(button.dataset.courseId));
  });
  els.coachStarterButtons.forEach((button) => {
    button.onclick = () => dispatchAppAction('coachStarter', button.dataset.starter || button.textContent.trim());
  });

  const actionButtons = [
    ['jumpCoachButton', 'switchTab', 'prep'],
    ['startCourseButton', 'switchTab', 'course'],
    ['jumpPracticeButton', 'switchTab', 'practice'],
    ['jumpExamplesButton', 'switchTab', 'examples'],
    ['markCompleteButton', 'markCourseComplete'],
    ['nextCourseButton', 'nextCourse'],
    ['courseToCoachButton', 'courseToCoach'],
    ['startPracticeButton', 'startPractice'],
    ['endSessionButton', 'endSession'],
    ['sendBtn', 'sendMessage'],
    ['insertStarterButton', 'insertStarter'],
    ['replayScenarioButton', 'replayScenario'],
    ['practiceToCoachButton', 'practiceToCoach'],
    ['generateExampleButton', 'generateExample'],
    ['sendCoachButton', 'coachMemo'],
    ['resetCoachButton', 'resetCoach'],
    ['restoreCoachButton', 'restoreCoach'],
    ['coachToReviewButton', 'coachToReview'],
    ['saveReviewButton', 'saveReview']
  ];
  actionButtons.forEach(([id, action, payload]) => {
    const el = getById(id);
    if (!el) return;
    el.onclick = () => dispatchAppAction(action, payload);
  });

  if (els.scenarioSelect) {
    els.scenarioSelect.addEventListener('change', () => {
      currentScenario = els.scenarioSelect.value;
      state.currentScenarioId = currentScenario;
      saveState();
      renderScenario();
    });
  }
  const userInput = getById('userInput');
  if (userInput) {
    userInput.addEventListener('keydown', handleKeydown);
    userInput.addEventListener('input', function () { autoResize(this); });
  }

  els.exampleQuickButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (els.exampleInput) els.exampleInput.value = button.dataset.example;
      generateResponseExample(button.dataset.example);
    });
  });
}

async function loadState() {
  return loadAppState();
}

function saveState() {
  saveAppState(state);
}

async function hydrateState() {
  const loaded = await loadState();
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, loaded);
  currentScenario = state.currentScenarioId || 'burnout';
}

function switchTab(tabId) {
  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabId));
  Object.entries(sections).forEach(([key, section]) => {
    if (section) section.classList.toggle('active', key === tabId);
  });
}

function renderCourseSidebar() {
  if (!els.courseSidebar) return;
  els.courseSidebar.innerHTML = '';
  courseSessions.forEach((session) => {
    const button = document.createElement('button');
    button.className = 'course-button';
    if (session.id === state.currentCourseId) button.classList.add('active');
    if (state.completedCourses.includes(session.id)) button.classList.add('done');
    button.innerHTML =
      '<span class="course-no">' + session.id + '</span>' +
      '<span class="course-copy"><strong>' + escapeHtml(session.title) + '</strong><small>' + escapeHtml(session.intro) + '</small></span>' +
      '<span class="course-state">' + (state.completedCourses.includes(session.id) ? '完了' : '未完了') + '</span>';
    button.addEventListener('click', () => {
      state.currentCourseId = session.id;
      saveState();
      renderCourseSidebar();
      renderCourse();
      switchTab('course');
    });
    els.courseSidebar.appendChild(button);
  });
}

function renderCourse() {
  const session = courseSessions.find((item) => item.id === state.currentCourseId) || courseSessions[0];
  if (!session) { console.warn('[App] renderCourse: courseSessions が空のため描画をスキップします。'); return; }
  els.courseOverviewButtons.forEach((button) => {
    button.classList.toggle('active', Number(button.dataset.courseId) === session.id);
    button.classList.toggle('done', state.completedCourses.includes(Number(button.dataset.courseId)));
  });
  setText(els.courseTitle, session.id + '. ' + session.title);
  setText(els.courseIntro, session.intro);
  setText(els.courseEmployeeLine, session.employee);
  setText(els.courseCoachLine, session.coach);
  setText(els.courseStatusBadge, state.completedCourses.includes(session.id) ? '完了済み' : '未完了');
  if (els.markCompleteButton) {
    els.markCompleteButton.textContent = state.completedCourses.includes(session.id) ? 'この回は完了済みです' : 'この回を完了にする';
  }
  setHtml(els.courseGoals, session.goals.map((goal, index) => itemRow(index, goal)).join(''));
  setHtml(els.courseSignals, session.signals.map((signal, index) => itemRow(index, signal)).join(''));
  if (els.courseOptions) els.courseOptions.innerHTML = '';
  if (els.courseFeedbackBox) {
    els.courseFeedbackBox.classList.add('hidden');
    els.courseFeedbackBox.innerHTML = '';
  }

  session.options.forEach((option) => {
    if (!els.courseOptions) return;
    const button = document.createElement('button');
    button.className = 'option-button';
    button.innerHTML = '<strong>' + escapeHtml(option.label) + '</strong><div style="margin-top:8px;">' + escapeHtml(option.body) + '</div>';
    button.addEventListener('click', () => {
      Array.from(els.courseOptions.children).forEach((child) => child.classList.remove('selected'));
      button.classList.add('selected');
      if (!els.courseFeedbackBox) return;
      els.courseFeedbackBox.classList.remove('hidden');
      els.courseFeedbackBox.innerHTML =
        '<h3>' + escapeHtml(option.label) + '</h3>' +
        '<div class="message-box coach-box" style="margin-top:12px;"><div class="message-label">講評</div><p>' + escapeHtml(option.feedback) + '</p></div>' +
        '<div class="message-box" style="margin-top:12px;"><div class="message-label">なぜそうなのか</div><p>' + escapeHtml(option.insight) + '</p></div>';
    });
    els.courseOptions.appendChild(button);
  });
}

function goToNextCourse() {
  const currentIndex = courseSessions.findIndex((session) => session.id === state.currentCourseId);
  const next = courseSessions[Math.min(currentIndex + 1, courseSessions.length - 1)];
  if (!next) return;
  state.currentCourseId = next.id;
  saveState();
  renderCourseSidebar();
  renderCourse();
}

function openCourse(courseId) {
  const numericId = Number(courseId);
  if (!Number.isFinite(numericId)) return;
  const exists = courseSessions.some((session) => session.id === numericId);
  if (!exists) return;
  state.currentCourseId = numericId;
  saveState();
  renderCourseSidebar();
  renderCourse();
  switchTab('course');
  getById('courseTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function markCourseComplete() {
  const button = els.markCompleteButton;
  const currentId = state.currentCourseId;
  const wasCompleted = state.completedCourses.includes(currentId);
  if (!state.completedCourses.includes(state.currentCourseId)) {
    state.completedCourses.push(state.currentCourseId);
  }
  saveState();
  renderAll();
  if (button) {
    button.textContent = wasCompleted ? 'この回は完了済みです' : '完了にしました';
  }
  if (!wasCompleted) {
    window.setTimeout(() => {
      if (els.markCompleteButton) {
        els.markCompleteButton.textContent = 'この回は完了済みです';
      }
    }, 1200);
  }
}

function renderScenarioSelect() {
  if (!els.scenarioSelect) return;
  els.scenarioSelect.innerHTML = Object.entries(scenarioMeta).map(([key, item]) => {
    return '<option value="' + key + '">' + escapeHtml(item.name) + '</option>';
  }).join('');
  els.scenarioSelect.value = currentScenario;
}

function renderScenario() {
  const scenario = scenarioMeta[currentScenario];
  if (!scenario) return;
  setText(els.scenarioPersona, scenario.persona);
  setText(els.scenarioContext, scenario.context);
  setText(els.scenarioTip, scenario.tip);
  setHtml(els.scenarioTags, scenario.tags.map((tag) => '<span class="tag">' + escapeHtml(tag) + '</span>').join(''));
}

function resetPracticePanel() {
  getById('feedbackPanel')?.classList.add('hidden');
  getById('feedbackLoading')?.classList.add('hidden');
  getById('feedbackContent')?.classList.add('hidden');
  getById('feedbackActions')?.classList.add('hidden');
  setHtml(getById('feedbackContent'), '');
}

function startSession() {
  if (!isAuthorized()) {
    getById('pay-section')?.classList.remove('hidden');
    switchTab('overview');
    getById('pay-section')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const scenario = scenarioMeta[currentScenario];
  const userInput = getById('userInput');
  if (!scenario) return;
  messages = [];
  turnCount = 0;
  sessionActive = true;
  setText(getById('personaAvatar'), scenario.avatar);
  setText(getById('personaName'), scenario.persona);
  setText(getById('personaRole'), scenario.name);
  setText(getById('turnCounter'), '0 ターン');
  setHtml(getById('chatMessages'), '<div class="system-msg">1on1が始まりました。最初の一言で安心感を作ることを意識してください。</div>');
  if (userInput) {
    userInput.value = '';
    autoResize(userInput);
  }
  resetPracticePanel();
  addMessage('assistant', openingMessages[currentScenario]);
}

function addMessage(role, content) {
  const scenario = scenarioMeta[currentScenario];
  const chatEl = getById('chatMessages');
  if (!scenario || !chatEl) return;
  const div = document.createElement('div');
  div.className = 'chat-message ' + role;
  div.innerHTML =
    '<div class="msg-avatar">' + (role === 'assistant' ? scenario.avatar : '👔') + '</div>' +
    '<div class="msg-bubble">' + escapeHtml(content) + '</div>';
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  messages.push({ role, content });
  if (role === 'user') {
    turnCount += 1;
    setText(getById('turnCounter'), turnCount + ' ターン');
  }
}

function showTyping() {
  const chatEl = getById('chatMessages');
  if (!chatEl) return;
  const div = document.createElement('div');
  div.className = 'typing-indicator';
  div.id = 'typingIndicator';
  div.innerHTML =
    '<div class="msg-avatar">' + scenarioMeta[currentScenario].avatar + '</div>' +
    '<div class="typing-dots"><span></span><span></span><span></span></div>';
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function hideTyping() {
  const el = getById('typingIndicator');
  if (el) el.remove();
}

async function sendMessage() {
  const input = getById('userInput');
  const sendBtn = getById('sendBtn');
  const text = (input && input.value.trim()) || '';
  if (!sessionActive) {
    alert('先にシナリオを開始してください。');
    return;
  }
  if (!text || isLoading || !input) return;

  input.value = '';
  autoResize(input);
  isLoading = true;
  if (sendBtn) sendBtn.disabled = true;
  addMessage('user', text);
  showTyping();

  if (isLocalPreview()) {
    await delay(350);
    hideTyping();
    addMessage('assistant', generateLocalScenarioReply(currentScenario, text, messages));
    isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
    return;
  }

  const apiMessages = messages
    .filter((message, index) => !(index === 0 && message.role === 'assistant'))
    .map((message) => ({ role: message.role, content: message.content }));

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', scenario: currentScenario, messages: apiMessages })
    });
    const data = await response.json();
    hideTyping();
    if (!response.ok || !data.reply) {
      const fallbackReply = generateLocalScenarioReply(currentScenario, text, messages);
      addMessage('assistant', fallbackReply);
    } else {
      addMessage('assistant', data.reply);
    }
  } catch {
    hideTyping();
    addMessage('assistant', generateLocalScenarioReply(currentScenario, text, messages));
  }

  isLoading = false;
  if (sendBtn) sendBtn.disabled = false;
  input.focus();
}

async function endSession() {
  if (!sessionActive || messages.length < 2) {
    alert('もう少し会話してからセッションを終了してください。');
    return;
  }

  const feedbackPanel = getById('feedbackPanel');
  const loading = getById('feedbackLoading');
  const contentEl = getById('feedbackContent');
  const actions = getById('feedbackActions');
  if (!feedbackPanel || !loading || !contentEl || !actions) return;
  feedbackPanel.classList.remove('hidden');
  loading.classList.remove('hidden');
  contentEl.classList.add('hidden');
  actions.classList.add('hidden');
  feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  await delay(300);
  const feedback = buildLocalFeedback(currentScenario, messages);
  const createdAtIso = new Date().toISOString();
  const scores = extractScores(feedback);
  const practiceLogPayload = {
    clientLogId: createClientLogId(),
    scenarioId: currentScenario,
    transcript: messages.map((item) => ({ role: item.role, content: item.content })),
    feedback,
    scores,
    createdAtIso
  };
  loading.classList.add('hidden');
  contentEl.classList.remove('hidden');
  actions.classList.remove('hidden');
  contentEl.innerHTML = formatFeedback(feedback);

  state.practiceLogs.unshift({
    scenarioId: currentScenario,
    createdAt: new Date().toLocaleString('ja-JP'),
    scores,
    clientLogId: practiceLogPayload.clientLogId
  });
  state.practiceLogs = state.practiceLogs.slice(0, 30);
  saveState();
  appendPracticeLog(practiceLogPayload);
  renderMetrics();
  renderHomeOverview();
}

function extractScores(text) {
  const scoreMap = { listening: 0, empathy: 0, probing: 0, safety: 0 };
  const listeningMatch = text.match(/傾聴力[：:]\s*(\d+)/);
  const probingMatch = text.match(/質問力[：:]\s*(\d+)/);
  const empathyMatch = text.match(/共感力[：:]\s*(\d+)/);
  const safetyMatch = text.match(/心理的安全性[：:]\s*(\d+)/);
  scoreMap.listening = normalizeTwentyScore(listeningMatch ? Number(listeningMatch[1]) : 12);
  scoreMap.probing = normalizeTwentyScore(probingMatch ? Number(probingMatch[1]) : 11);
  scoreMap.empathy = normalizeTwentyScore(empathyMatch ? Number(empathyMatch[1]) : 12);
  scoreMap.safety = normalizeTwentyScore(safetyMatch ? Number(safetyMatch[1]) : 12);
  return scoreMap;
}

function normalizeTwentyScore(value) {
  const safeValue = Number.isNaN(value) ? 12 : value;
  return Math.max(20, Math.min(100, Math.round((safeValue / 20) * 100)));
}

function formatFeedback(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function seedCoachFromCourse() {
  const session = courseSessions.find((item) => item.id === state.currentCourseId) || courseSessions[0];
  switchTab('prep');
  sendCoachMessage('いま講座の「' + session.title + '」を見ています。次の1on1で、どこを一番意識するか整理したいです。');
}

function seedCoachFromScenario() {
  const scenario = scenarioMeta[currentScenario];
  switchTab('prep');
  sendCoachMessage('ケース練習の「' + scenario.name + '」を見て、実際の1on1では何を優先して聞くべきか整理したいです。');
}

function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClientLogId() {
  return 'plog_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function createClientReviewId() {
  return 'rev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function createClientPrepId() {
  return 'prep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function nextUniqueReply(lastAssistant, candidates) {
  return candidates.find((candidate) => candidate !== lastAssistant?.content) || candidates[candidates.length - 1];
}

function analyzeManagerUtterance(text) {
  return {
    offtopic: containsAny(text, ['夕飯', 'ご飯', 'ランチ', '天気', '週末', '映画', '趣味']),
    directive: containsAny(text, ['しましょう', 'してみましょう', 'すべき', 'した方が', '休みに', '休んだ方', '検討してみましょう', '変えましょう', '減らしましょう']),
    scene: containsAny(text, ['どんな', 'どこ', '場面', '一番', 'いつ', '最近', '何が起き', 'どういう時']),
    feeling: containsAny(text, ['気持ち', '不安', '焦り', 'しんど', 'つら', '辛', '怖い', '余裕']),
    support: containsAny(text, ['助か', '必要', '理想', 'どうな', '楽', '配慮', '相談', '頼', '手伝']),
    actor: containsAny(text, ['誰', '相手', 'その人']),
    side: containsAny(text, ['私生活', 'どちら', '業務の方', '仕事の方', '家庭']),
    growth: containsAny(text, ['将来', '成長', '何を目指', 'この先']),
    quit: containsAny(text, ['転職', '辞め', '退職']),
    broad: containsAny(text, ['教えて', '聞かせ', 'ありますか', 'ですか', 'どうですか', '話せる範囲'])
  };
}

function getConversationStage(messageList) {
  return Math.max(0, messageList.filter((item) => item.role === 'assistant').length - 1);
}

function pickStageReply(lastAssistant, stage, stages) {
  const safeIndex = Math.max(0, Math.min(stage, stages.length - 1));
  return nextUniqueReply(lastAssistant, stages[safeIndex]);
}

function replyBurnout(move, stage, lastAssistant) {
  if (move.directive) {
    if (containsAny(lastAssistant?.content || '', ['疲れ', '余裕', 'しんど'])) {
      return pickStageReply(lastAssistant, stage, [
        ['助かる気持ちはあります。ただ、急に休むとか大きく変えるより、まず今どこで無理が出ているのかを一緒に見てもらえるとありがたいです。'],
        ['そうできたら楽にはなると思います。でも、いきなり休むより先に、何が一番きついのかを整理して相談したいです。']
      ]);
    }
    return pickStageReply(lastAssistant, stage, [
      ['そうしてもらえたら助かる気持ちはあります。ただ、いきなり大きく変えるより、まず何が一番しんどいのかを一緒に見てもらえると話しやすいです。'],
      ['少し調整できたら助かりますが、その前にどこで一番きつくなるのかを分かってもらえるとありがたいです。'],
      ['変える話に行く前に、今どこまで無理が出ているかを聞いてもらえると少し助かります。']
    ]);
  }
  if (move.feeling) {
    return pickStageReply(lastAssistant, stage, [
      ['正直、まだ大丈夫だとは思いたいんですが、前より余裕がなくなってきている感じはあります。'],
      ['今のまま続くとしんどいなとは思っています。ただ、弱音だと思われるのも少し気になります。'],
      ['疲れているのは事実なんですが、それを言うことで評価が下がる気がして少し言いづらいです。']
    ]);
  }
  if (move.support) {
    return pickStageReply(lastAssistant, stage, [
      ['急ぎの依頼が重なる時に、優先順位を一緒に見てもらえたり、少し相談しやすかったりするとかなり違うと思います。'],
      ['全部を減らすというより、詰まり始めた時に相談できる感じがあると助かります。'],
      ['一人で抱え込まなくていいと言ってもらえるだけでも、かなり違うと思います。']
    ]);
  }
  if (move.scene || move.broad) {
    return pickStageReply(lastAssistant, stage, [
      ['繁忙の時期が続いていて、家に帰る頃にはかなり疲れています。大丈夫と言えば大丈夫なんですが、前より余裕は減っています。'],
      ['夕方以降に急ぎの依頼が重なる時が一番きついです。自分だけ遅れている感じもして、少し焦ります。'],
      ['表向きは回せているんですが、回復しにくくなっていて、このままだと危ない感じはあります。']
    ]);
  }
  return pickStageReply(lastAssistant, stage, [
    ['そうですね……自分でもまだ整理しきれていないんですが、疲れが抜けにくくなっている感じはあります。'],
    ['表向きは回せているんですが、前より回復しにくくなっている感じがあります。'],
    ['気力で回している部分が増えていて、このままだと少し危ない感じはあります。']
  ]);
}

function replyConflict(move, stage, lastAssistant) {
  if (move.directive) {
    return pickStageReply(lastAssistant, stage, [
      ['そこまで一気に決めるというより、まず何が起きているのかを落ち着いて聞いてもらえるとありがたいです。'],
      ['対処を決める前に、自分がどこで一番しんどくなるのかを分かってもらいたい感じです。'],
      ['解決策を急がれると余計に構えてしまうので、先に状況を聞いてもらえると助かります。']
    ]);
  }
  if (move.actor) {
    return pickStageReply(lastAssistant, stage, [
      ['特定の一人というより、その場にいる時に毎回身構える感じが強いです。'],
      ['相手はいますが、その人だけというより会議全体の空気としてしんどい感じです。']
    ]);
  }
  if (move.feeling) {
    return pickStageReply(lastAssistant, stage, [
      ['大きな衝突ではないんですが、話す前から少し構えてしまう感じがあります。'],
      ['必要以上に身構えてしまって、仕事そのものより関わることに疲れてきています。'],
      ['言い返せないまま終わることが多くて、終わった後にずっと残る感じがあります。']
    ]);
  }
  if (move.support) {
    return pickStageReply(lastAssistant, stage, [
      ['少なくとも、最初から否定される感じがなくて、一度受け止めてもらえるだけでもかなり話しやすくなると思います。'],
      ['全部変わらなくても、最後まで話を切られずに聞いてもらえるだけで違うと思います。'],
      ['自分の受け取り方だけの問題ではないと確認できるだけでも少し楽になります。']
    ]);
  }
  if (move.scene || move.broad) {
    return pickStageReply(lastAssistant, stage, [
      ['最近は少しやりづらさを感じています。大きな衝突があるわけではないんですが、前より話しにくいです。'],
      ['打ち合わせで意見を出しても、すぐ否定されることが続いていて、その後は話しづらくなっています。'],
      ['露骨な言い合いではないんですが、話す前から構えてしまうことが増えています。']
    ]);
  }
  return pickStageReply(lastAssistant, stage, [
    ['大きな衝突があったわけではないんですが、最近は少しやりづらさを感じています。'],
    ['露骨な言い合いではないんですが、話す前から構えてしまうことが増えています。'],
    ['必要以上に身構えてしまって、会議の前から少し消耗する感じがあります。']
  ]);
}

function replyCareer(move, stage, lastAssistant) {
  if (move.directive) {
    return pickStageReply(lastAssistant, stage, [
      ['方向をすぐ決めたいというより、いま何に迷っているのかをもう少し話したい気持ちの方が近いです。'],
      ['結論を出す前に、自分がどこに引っかかっているのかを聞いてもらいたい感じです。'],
      ['今は決めるというより、このままでいいのか迷う理由をもう少し話したいです。']
    ]);
  }
  if (move.quit) {
    return 'すぐに辞めたいと決めているわけではないです。ただ、このままでいいのか考えることは増えています。';
  }
  if (move.growth || move.support) {
    return pickStageReply(lastAssistant, stage, [
      ['もっと成長している実感がほしいんだと思います。ただ、何を変えたいかはまだはっきりしていません。'],
      ['少しでも今後の見通しが見えると、迷いはかなり減ると思います。'],
      ['何を積めば前に進んでいる感じになるのかが見えると、落ち着く気がします。']
    ]);
  }
  if (move.feeling) {
    return pickStageReply(lastAssistant, stage, [
      ['答えがないまま考え続けている感じで、少し落ち着かないです。'],
      ['この先のイメージが持ちにくくて、何となく不安が続いています。'],
      ['不満というより、先が見えにくい感じがずっと残っています。']
    ]);
  }
  if (move.scene || move.broad) {
    return pickStageReply(lastAssistant, stage, [
      ['今の働き方のままでいいのか迷っています。転職したいと決めているわけではないんですが、考えることは増えました。'],
      ['同じ作業が続く時に、このままでいいのかなと考えることが増えました。'],
      ['何を変えたいのかはまだ曖昧なんですが、このままでいいのか考えることは増えています。']
    ]);
  }
  return pickStageReply(lastAssistant, stage, [
    ['転職したいと決めているわけではないんですが、今の働き方のままでいいのか迷っています。'],
    ['今すぐ答えがあるわけではないんですが、この先のイメージが持ちにくくなっています。'],
    ['何を変えたいのかはまだ曖昧なんですが、このままでいいのか考えることは増えています。']
  ]);
}

function replyPerformance(move, stage, lastAssistant) {
  if (move.directive) {
    return pickStageReply(lastAssistant, stage, [
      ['そうした方がいいのかもしれませんが、正直いまは「できていない」と言われた感じになって少し身構えてしまいます。'],
      ['改善しないといけないのは分かるんですが、先に何が崩れているのかを聞いてもらえると助かります。'],
      ['対策を決める前に、どこで手が止まりやすいのかを分かってもらいたいです。']
    ]);
  }
  if (move.feeling) {
    return pickStageReply(lastAssistant, stage, [
      ['最近は少し空回りしている感じがあって、前よりうまく進められていない気がします。'],
      ['また失敗するかもしれないと思うと、前より手が止まりやすくなっています。'],
      ['焦るほど確認が雑になって、自信がさらに下がる感じがあります。']
    ]);
  }
  if (move.support) {
    return pickStageReply(lastAssistant, stage, [
      ['一人で抱え込まずに途中で確認できたり、優先順位を整理できたりすると、かなり進めやすくなると思います。'],
      ['早めに相談しても大丈夫だと感じられると、かなり違うと思います。'],
      ['途中で詰まりを共有しても責められない感じがあると助かります。']
    ]);
  }
  if (move.scene || move.broad) {
    return pickStageReply(lastAssistant, stage, [
      ['最近は少し空回りしている感じがあって、前よりうまく進められていない気がします。'],
      ['確認が甘くなって同じミスをしてしまう時があって、そのたびに自信が下がります。'],
      ['集中しきれないまま進めてしまって、結果的にミスにつながることがあります。']
    ]);
  }
  return pickStageReply(lastAssistant, stage, [
    ['最近は少し空回りしている感じがあって、前よりうまく進められていない気がします。'],
    ['集中しきれないまま進めてしまって、結果的にミスにつながることがあります。'],
    ['また失敗するかもしれないと思って、前より手が止まりやすくなっています。']
  ]);
}

function replyWorklife(move, stage, lastAssistant) {
  if (move.directive) {
    if (containsAny(lastAssistant?.content || '', ['迷惑', '相談', 'ためら'])) {
      return pickStageReply(lastAssistant, stage, [
        ['休めたら助かるのは本当です。ただ、急に休むとなると周りにしわ寄せが行きそうで、それも気になっています。'],
        ['そうしたい気持ちはありますが、明日すぐ休むとなると引き継ぎも気になって、簡単には決めにくいです。'],
        ['休むこと自体より、朝に崩れた時にどう相談できるかを一緒に考えてもらえる方が今は助かります。']
      ]);
    }
    if (containsAny(lastAssistant?.content || '', ['朝', '送り迎え', '急な対応'])) {
      return pickStageReply(lastAssistant, stage, [
        ['休めたら助かるのは本当です。ただ、急に休むより、朝に崩れた時の動き方を少し変えられると現実的かなと思っています。'],
        ['そうできたら楽にはなると思いますが、毎回休むわけにもいかないので、まずは朝の負担をどう減らせるかを考えたいです。']
      ]);
    }
    return pickStageReply(lastAssistant, stage, [
      ['そうできたら助かる気持ちはあります。ただ、すぐにそこまで決めるというより、今のしんどさをもう少し分かってもらえると助かります。'],
      ['休めたら楽にはなると思うんですが、まずは今の負担がどこに偏っているのかを聞いてもらえるとありがたいです。'],
      ['すぐに結論を決めるより、何が崩れやすいのかを一緒に見てもらえると少し話しやすいです。']
    ]);
  }
  if (move.side) {
    return 'どちらもありますが、きっかけは朝の家庭側で、その影響が仕事にそのまま残る感じです。';
  }
  if (move.support) {
    return pickStageReply(lastAssistant, stage, [
      ['急なことが起きる前提で少し相談できたり、朝に少し余白を持てたりすると、かなり気持ちが違うと思います。'],
      ['全部を軽くするのは難しくても、朝に崩れた時の相談先があるだけでかなり違うと思います。'],
      ['迷惑をかける前提ではなく、共有していいものだと思えると少し楽になります。']
    ]);
  }
  if (move.feeling) {
    return pickStageReply(lastAssistant, stage, [
      ['何とか回してはいるんですが、余裕はかなり少なくなってきています。'],
      ['周りに迷惑をかけたくない気持ちが強くて、相談するのも少しためらっています。'],
      ['表面上は回せていても、少し崩れると一気に苦しくなる感覚があります。']
    ]);
  }
  if (move.scene || move.broad) {
    return pickStageReply(lastAssistant, stage, [
      ['何とか回してはいるんですが、余裕はかなり少なくなってきています。'],
      ['朝の送り迎えと急な対応が重なる日に、一気に余裕がなくなります。'],
      ['朝は子どもの支度と送り迎えがあって、少し予定がずれるだけでその後が全部押してしまいます。']
    ]);
  }
  return pickStageReply(lastAssistant, stage, [
    ['何とか回してはいるんですが、余裕はかなり少なくなってきています。'],
    ['表面上は回せていても、少し崩れると一気に苦しくなる感覚があります。'],
    ['なんとか回しているつもりでも、少しずつ余裕が削られている感じはあります。']
  ]);
}

function generateLocalScenarioReply(scenarioId, userText, messageList) {
  const text = userText.trim();
  const lastAssistant = [...messageList].reverse().find((item) => item.role === 'assistant');
  const move = analyzeManagerUtterance(text);
  const stage = getConversationStage(messageList);

  if (move.offtopic) {
    return 'その話もできますが、いまは仕事のしづらさの話を少し整理できると助かります。最近いちばん引っかかる場面から話してもいいですか。';
  }
  if (scenarioId === 'burnout') return replyBurnout(move, stage, lastAssistant);
  if (scenarioId === 'conflict') return replyConflict(move, stage, lastAssistant);
  if (scenarioId === 'career') return replyCareer(move, stage, lastAssistant);
  if (scenarioId === 'performance') return replyPerformance(move, stage, lastAssistant);
  if (scenarioId === 'worklife') return replyWorklife(move, stage, lastAssistant);
  return lastAssistant?.content || '少し整理しながら話せると助かります。';
}

window.__generatePracticeReply = generateLocalScenarioReply;

function buildLocalFeedback(scenarioId, messageList) {
  const userTurns = messageList.filter((item) => item.role === 'user').map((item) => item.content).join('\n');
  const askedSpecific = /どんな|どこ|いつ|一番|最近/.test(userTurns);
  const showedEmpathy = /気にな|大変|しんど|無理に|ありがとう|そうなんですね/.test(userTurns);
  const avoidedRush = /決めつけ|こうすべき|頑張って/.test(userTurns) === false;

  const listening = showedEmpathy ? 15 : 11;
  const probing = askedSpecific ? 14 : 10;
  const empathy = showedEmpathy ? 16 : 12;
  const safety = avoidedRush ? 15 : 11;

  const nextStep = askedSpecific
    ? '次は、相手が出した言葉を短く受け止めたうえで、その場面の重さをもう半歩だけ具体化してください。'
    : '次は、「どんな時」「どこが一番」にあたる質問を一つだけ足して、相手の状況を具体に下ろしてください。';

  return [
    '総評',
    '相手の状態を急いで結論づけず、整理しながら聞こうとする土台はできています。次は、出てきた言葉を一段だけ具体化する質問を増やすと、1on1の質が安定します。',
    '',
    '良かった点',
    showedEmpathy ? '最初に安心感を作ろうとしていたこと。' : '会話を前に進めようとする姿勢はありました。',
    askedSpecific ? '相手の負担が出やすい場面を具体化しようとしていたこと。' : '話題を広げすぎず、一点ずつ進めようとしていたこと。',
    '',
    '次の改善点',
    nextStep,
    '',
    '傾聴力: ' + listening,
    '質問力: ' + probing,
    '共感力: ' + empathy,
    '心理的安全性: ' + safety
  ].join('\n');
}

function renderPrepOutput() {
  const output = getById('prepOutput');
  if (!output) return;
  if (!state.prepMemo) {
    output.innerHTML = '<div class="prep-item"><div class="bullet">1</div><div>ここに4点メモが表示されます。3番の「最初の一言」は口に出して使い、1・2・4は自分の頭の中のメモとして見返してください。</div></div>';
    return;
  }
  output.innerHTML =
    prepMemoRow('今日の着地点', state.prepMemo.purpose, 1) +
    prepMemoRow('最初に見たいこと', state.prepMemo.focus, 2) +
    prepMemoRow('口に出す最初の一言', state.prepMemo.openingLine, 3) +
    prepMemoRow('自分の中で急がないこと', state.prepMemo.holdBack, 4);
}

function generateResponseExample(prefilledText) {
  const text = (prefilledText || (els.exampleInput && els.exampleInput.value) || '').trim();
  if (!text) return;
  const result = buildResponseExample(text);
  if (els.exampleInput) els.exampleInput.value = text;
  if (!els.exampleOutput || !els.exampleLearningNote) return;
  els.exampleOutput.innerHTML = [
    { label: 'まず返す一言', value: result.opening },
    { label: '次に聞く一問', value: result.question },
    { label: '避けたい返し方', value: result.avoid },
    { label: 'この言葉の見どころ', value: result.focus },
    { label: '次に確認したいこと', value: result.nextCheck }
  ].map((item, index) => {
    return '<div class="detail-item"><div class="bullet">' + (index + 1) + '</div><div><strong>' + item.label + '</strong><div style="margin-top:6px;">' + escapeHtml(item.value) + '</div></div></div>';
  }).join('');
  els.exampleLearningNote.classList.remove('muted');
  els.exampleLearningNote.innerHTML = '<strong>学びのポイント</strong><div style="margin-top:8px;">' + escapeHtml(result.learning) + '</div>';
}

function buildResponseExample(text) {
  if (text.includes('言っても変わらない')) {
    return {
      opening: 'そう感じていたんですね。言っても変わらないと思うくらい、かなり引っかかっていたことがあるのだと思います。',
      question: '何がいちばん「変わらない」と感じさせたのか、少し聞かせてもらえますか。',
      avoid: '事情があるから仕方ないよ / 先に言ってくれればよかったのに',
      focus: '不満そのものより、「あきらめ」や「失望」が出ていることに注目します。',
      nextCheck: '評価への不満なのか、上司への不信感なのか、相談しても無駄だと感じた体験なのかを見分けます。',
      learning: '強い言葉の裏にある失望感を先に受け止めると、防御的なやりとりになりにくくなります。'
    };
  }
  if (text.includes('向いてない')) {
    return {
      opening: 'そう感じる時があるんですね。すぐに否定せずに、その感覚が出る場面を一緒に見たいです。',
      question: '最近だと、どんな場面で「向いていないかも」と感じることが多いですか。',
      avoid: 'そんなことないよ / とにかく慣れれば大丈夫だよ',
      focus: '意欲がないと決めつけず、自信低下や比較不安が混ざっていないかを見ます。',
      nextCheck: '仕事の内容が合わないのか、周囲との比較で苦しくなっているのか、失敗体験が残っているのかを確かめます。',
      learning: '自己評価の低い言葉は、励ます前に「どこでそう感じるのか」を具体化すると学びになります。'
    };
  }
  if (text.includes('忙')) {
    return {
      opening: '忙しさの中でかなり負担がかかっていそうですね。まずは、どこがいちばん重いのかを整理したいです。',
      question: '忙しさの中でも、特に負担が大きいのはどの業務や時間帯ですか。',
      avoid: 'みんな忙しいよ / じゃあ仕事を減らそうか',
      focus: '「忙しい」をそのまま受け取らず、仕事量なのか、気持ちの重さなのかを見ます。',
      nextCheck: '業務量、人間関係、優先順位の混乱、期待プレッシャーのどれが近いかを見分けます。',
      learning: '抽象的な言葉は、すぐ解決に行く前に「どこで」「何が」重いのかへ下ろすのが基本です。'
    };
  }
  if (text.includes('しんど') || text.includes('疲')) {
    return {
      opening: '少ししんどさや疲れが溜まっていそうで、そこは気になっています。',
      question: '最近いちばん負担が大きいのは、どんな場面ですか。',
      avoid: 'じゃあ休んで / とりあえず頑張ろう',
      focus: '「大丈夫」よりも、「疲れ」「しんどさ」に本音のサインが出ていないかを見ます。',
      nextCheck: '疲れの原因が仕事量なのか、人間関係なのか、期待の重さなのかを確かめます。',
      learning: '表面の安心させる言葉より、後ろに続く小さな弱音を拾うと、次の一問が自然に決まります。'
    };
  }
  if (text.includes('大丈夫') || text.includes('問題ありません')) {
    return {
      opening: '大丈夫と言いながら、まだ言葉にしきれていないこともあるかもしれないと感じています。',
      question: '最近の様子を振り返ると、少しでも負担が出やすいのはどんな場面ですか。',
      avoid: '問題ないならよかった / じゃあ今日はここまでにしよう',
      focus: '「大丈夫」は本音とは限りません。短く閉じる返答の奥に、遠慮や警戒がないかを見ます。',
      nextCheck: '本当に問題がないのか、話す準備がまだできていないだけなのかを見極めます。',
      learning: '否定せずに少しだけ具体化すると、相手が本音を出しやすくなります。'
    };
  }
  return {
    opening: 'その言葉の奥に、まだ整理できていない気持ちがありそうですね。',
    question: '最近だと、どんな場面でその感じがいちばん強く出ますか。',
    avoid: 'それはこうすればいいよ / 気にしすぎじゃないかな',
    focus: '結論を急がず、相手がどの言葉を選んだかと、少しにじむ感情に注目します。',
    nextCheck: '事実の困りごとなのか、気持ちの重さなのか、その両方なのかを整理します。',
    learning: '返し方を考える前に、相手の言葉のどこに本音のサインがあるかを見るのが1on1の学びになります。'
  };
}

function resetCoachFlow() {
  if (state.prepMemo) {
    state.previousPrepMemo = { ...state.prepMemo };
  }
  state.coachMessages = [];
  state.coachSummary = null;
  state.coachPhase = 0;
  state.prepMemo = null;
  if (els.coachInput) els.coachInput.value = '';
  saveState();
  renderCoachSection();
  renderPrepOutput();
  renderHomeOverview();
  renderMetrics();
}

function restorePreviousPrepMemo() {
  if (!state.previousPrepMemo) return;
  state.prepMemo = { ...state.previousPrepMemo };
  state.coachSummary = {
    intent: state.prepMemo.intent || 'general',
    purpose: state.prepMemo.purpose || '',
    focus: state.prepMemo.focus || '',
    openingLine: state.prepMemo.openingLine || '',
    firstQuestion: state.prepMemo.firstQuestion || '',
    holdBack: state.prepMemo.holdBack || ''
  };
  state.coachMessages = [];
  state.coachPhase = 3;
  if (els.coachInput) els.coachInput.value = '';
  saveState();
  renderCoachSection();
  renderPrepOutput();
  renderHomeOverview();
  renderMetrics();
}

function sendCoachMessage(prefilledText) {
  const text = (prefilledText || (els.coachInput && els.coachInput.value) || '').trim();
  if (!text) return;
  if (state.prepMemo) {
    state.previousPrepMemo = { ...state.prepMemo };
  }
  state.coachMessages = [{ role: 'user', content: text }];
  state.coachPhase = 3;
  state.coachSummary = buildCoachSummary(text);
  state.coachMessages.push({ role: 'assistant', content: buildCoachReply(state.coachSummary, state.coachPhase) });
  const prepPayload = {
    clientPrepId: createClientPrepId(),
    ...state.coachSummary,
    sourceContext: text,
    createdAtIso: new Date().toISOString()
  };
  state.prepMemo = { ...state.coachSummary, clientPrepId: prepPayload.clientPrepId };
  if (els.coachInput) els.coachInput.value = '';
  saveState();
  appendPrepMemo(prepPayload);
  renderCoachSection();
  renderPrepOutput();
  renderHomeOverview();
  renderMetrics();
}

function buildCoachSummary(text) {
  const lastReview = state.reviews[0];
  const intent = detectCoachIntent(text);
  const purpose = detectPurpose(text);
  const focus = detectFocus(text);
  const risk = detectRisk(text, lastReview);
  return {
    intent,
    purpose,
    focus,
    openingLine: buildOpeningLine(focus),
    firstQuestion: buildFirstQuestion(focus),
    holdBack: risk
  };
}

function detectCoachIntent(text) {
  if (text.includes('最初の一言')) return 'opening';
  if (text.includes('踏み込')) return 'boundary';
  if (text.includes('ゴール') || text.includes('目指す')) return 'goal';
  if (text.includes('急がない') || text.includes('手放す')) return 'holdback';
  if (text.includes('確かめたい') || text.includes('何を知れれば')) return 'focus';
  if (text.includes('退職') || text.includes('辞め')) return 'retention';
  return 'general';
}

function detectPurpose(text) {
  if (text.includes('最初の一言')) return '相手が構えすぎずに話し始められる入り方を先に整えたい';
  if (text.includes('踏み込')) return 'どこまで聞くと有効で、どこから急ぎすぎになるかの線を先に決めたい';
  if (text.includes('ゴール') || text.includes('目指す')) return '今回の1on1を、何を持ち帰れれば十分かで定義したい';
  if (text.includes('急がない') || text.includes('手放す')) return '今回あえて結論を出さないことを決め、面談の圧を下げたい';
  if (text.includes('確かめたい') || text.includes('何を知れれば')) return '今回いちばん確認すべき一点を先に絞りたい';
  if (text.includes('退職') || text.includes('辞め')) return '離職予兆を軽く扱わず、まず今の状態を見極めたい';
  if (text.includes('若手') || text.includes('自信')) return '自信低下と意欲低下を決めつけずに見分けたい';
  if (text.includes('話しすぎ')) return '自分が話しすぎず、相手の言葉を引き出す面談にしたい';
  if (text.includes('忙') || text.includes('負担')) return '忙しさの中で何が一番負担かを見極めたい';
  return '今回の1on1で何を確認する面談にするかを先に固めたい';
}

function detectFocus(text) {
  if (text.includes('最初の一言')) return '相手が話しやすくなる入り方';
  if (text.includes('踏み込')) return '踏み込みすぎないための確認ポイント';
  if (text.includes('ゴール') || text.includes('目指す')) return '今回持ち帰れれば十分な着地点';
  if (text.includes('急がない') || text.includes('手放す')) return '今回は答えを出さずに置いておく論点';
  if (text.includes('確かめたい') || text.includes('何を知れれば')) return '今回いちばん先に確認したい一点';
  if (text.includes('退職') || text.includes('辞め')) return '本音の重さ';
  if (text.includes('若手') || text.includes('自信')) return '向いていないと感じる場面';
  if (text.includes('話しすぎ')) return '相手が話しやすくなる入り方';
  if (text.includes('忙') || text.includes('負担')) return '一番しんどい場面';
  return '今回いちばん確かめたいこと';
}

function detectRisk(text, lastReview) {
  if (text.includes('最初の一言')) return '説明を長くしすぎず、最初の一言のあとにすぐ問いを重ねすぎない';
  if (text.includes('踏み込') || text.includes('退職')) return '結論や引き止めを急がず、まず背景確認を優先する';
  if (text.includes('ゴール') || text.includes('目指す')) return '全部を解決しようとせず、今日の到達点を広げすぎない';
  if (text.includes('急がない') || text.includes('手放す')) return '助言、評価、正しさの説明をすぐに出さない';
  if (text.includes('確かめたい') || text.includes('何を知れれば')) return '論点を増やしすぎず、最初の一点が見えるまでは広げない';
  if (text.includes('話しすぎ')) return '自分が補足しすぎず、問いのあとに一呼吸置く';
  if (lastReview && lastReview.reflection) return '前回の反省である「' + lastReview.reflection + '」を繰り返さない';
  return '相手の整理より先に答えを置かない';
}

function buildOpeningLine(focus) {
  if (focus === '踏み込みすぎないための確認ポイント') return '最近の仕事の様子を見ていて、少し気になっていることがあります。今日は無理のない範囲で、今の状況を聞かせてもらえたらうれしいです。';
  if (focus === '今回持ち帰れれば十分な着地点') return '今日は全部を整理しきるより、まず今いちばん大事そうなことから聞かせてもらえたらと思っています。';
  if (focus === '今回は答えを出さずに置いておく論点') return '今日は結論を急がずに、今どうなっているかを一緒に整理する時間にできたらと思っています。';
  if (focus === '今回いちばん先に確認したい一点') return '今日は、いま気になっていることから順番に聞かせてもらえたらと思っています。';
  if (focus === '本音の重さ') return '最近の様子を見ていて、少し気になっていることがあります。今日は今の感じを聞かせてもらえたらうれしいです。';
  if (focus === '向いていないと感じる場面') return '無理に前向きにしなくて大丈夫なので、最近気になっていることから聞かせてください。';
  if (focus === '相手が話しやすくなる入り方') return '今日は、最近どんなふうに感じているかを無理のないところから聞かせてもらえたらと思っています。';
  if (focus === '一番しんどい場面') return '最近かなり頑張っているように見えていて、少し気になっています。いま一番負担が大きいところから聞かせてもらえますか。';
  return '今日は、いま気になっていることを無理のないところから聞かせてもらえたらと思っています。';
}

function buildFirstQuestion(focus) {
  if (focus === '踏み込みすぎないための確認ポイント') return '今の段階で、話しても大丈夫そうなのはどのあたりからですか。';
  if (focus === '今回持ち帰れれば十分な着地点') return '今の時点で、今日いちばんはっきりさせたいことは何でしょう。';
  if (focus === '今回は答えを出さずに置いておく論点') return '今すぐ結論を出さなくてよいとしたら、まず何から話すのがよさそうですか。';
  if (focus === '今回いちばん先に確認したい一点') return 'いま一番ひっかかっているのは、どんなことですか。';
  if (focus === '本音の重さ') return '最近、気持ちが揺れやすいのはどんな場面ですか。';
  if (focus === '向いていないと感じる場面') return 'そう感じる場面は、最近だとどんな時が多いですか。';
  if (focus === '相手が話しやすくなる入り方') return '最近の状況を振り返ると、どこから話すのがいちばん話しやすそうですか。';
  if (focus === '一番しんどい場面') return '忙しさの中でも、特にしんどさが出やすいのはどんな時ですか。';
  return '今回の1on1で、まず何がわかると一番前に進みそうですか。';
}

function buildCoachReply(summary, phase) {
  const phaseIntros = {
    opening: [
      '最初に整えたいのは、相手が身構えずに話し始められる入口です。',
      '次に見たいのは、最初から深掘りしすぎず、どこからなら話しやすそうかという点です。',
      '入り方としては、短い一言を置いてから、一問だけ開く流れが合います。',
      '最後は、説明しすぎず、相手の反応を待つ余白を自分の中に残しておくのが大事です。'
    ],
    boundary: [
      '最初に決めたいのは、どこまで聞くかより、どこまでなら相手が話しやすそうかです。',
      '次に見たいのは、事実確認の範囲なのか、本音に触れる話なのか、その境目です。',
      '入り方としては、安全さを先に置いて、話せる範囲を相手に決めてもらう流れが合います。',
      '最後は、今日は聞かないことも先に持っておくと軸がぶれません。'
    ],
    goal: [
      '最初に決めたいのは、今回の1on1で何を持ち帰れれば十分かです。',
      '次に見たいのは、いま相手の状態を全部扱うのでなく、今回見る範囲をどこまでにするかです。',
      '入り方としては、到達点を小さく置いて、質問も一つに絞る流れが合います。',
      '最後は、全部を前進させようとせず、今日の役割を小さく定義しておくと安定します。'
    ],
    holdback: [
      '最初に決めたいのは、今日は急がないことを決めて、相手が話しやすい余白を作ることです。',
      '次に見たいのは、まだ言葉にしきれていない部分が残っていないかです。',
      '入り方としては、答えを出す質問より、整理を促す質問を一つ置く流れが合います。',
      '最後は、助言や評価を急がないことを、自分の中で先に決めておくのが効きます。'
    ],
    focus: [
      '最初に決めたいのは、今回の1on1で最初に確認すべき一点を絞ることです。',
      '次に見たいのは、論点を増やさず、その一点に近い場面だけを思い浮かべることです。',
      '入り方としては、最初の一言を短く置いてから、その一点につながる一問だけを開く流れが合います。',
      '最後は、最初の一点が見えるまでは話を広げすぎないと決めておくとぶれません。'
    ]
  };

  const intro = phaseIntros[summary.intent];
  const replies = [
    (intro ? intro[0] + ' ' : '') + '今回の1on1では「' + summary.purpose + '」が見えれば十分そうです。右側の1と2は、自分の頭の中をそろえるためのメモとして使ってください。',
    (intro ? intro[1] + ' ' : '') + '最初に見たいことは「' + summary.focus + '」です。ここが先に定まると、会話の途中で論点が増えにくくなります。',
    (intro ? intro[2] + ' ' : '') + '実際に口に出すのは、「' + summary.openingLine + '」くらいで十分です。必要なら次の一問として「' + summary.firstQuestion + '」を続けてください。',
    (intro ? intro[3] + ' ' : '') + '最後に、自分の中では「' + summary.holdBack + '」を持っておくと進めやすいです。右側の4点メモは、3だけを口に出し、1・2・4は自分の準備メモとして使ってください。'
  ];
  return replies[Math.min(phase, replies.length - 1)];
}

function renderCoachSection() {
  if (!els.coachPhaseLabel || !els.coachChatBox) return;
  const restoreButton = getById('restoreCoachButton');
  if (restoreButton) {
    restoreButton.classList.toggle('hidden', !state.previousPrepMemo);
  }
  els.coachPhaseLabel.textContent = state.prepMemo
    ? '面談メモができました。口に出すのは3番だけで十分です。'
    : '1. ボタンを選ぶ 2. 気になることを書く 3. 面談メモを作る、の順で進めます。';

  if (!state.coachMessages.length) {
    if (state.prepMemo) {
      els.coachChatBox.innerHTML =
        '<div class="coach-chat-row coach-chat-system"><div class="coach-bubble">直近の面談前メモを表示しています。新しく作り直すと、この欄も最新内容に入れ替わります。</div></div>';
      return;
    }
    els.coachChatBox.innerHTML = '<div class="coach-chat-row coach-chat-system"><div class="coach-bubble">まずは上のボタンを1つ選ぶか、下の入力欄に今気になっていることを書いてください。作られる4点メモのうち、実際に口に出すのは3番の「最初の一言」だけです。</div></div>';
    return;
  }

  els.coachChatBox.innerHTML = state.coachMessages.map((message) => {
    const klass = message.role === 'user' ? 'coach-chat-user' : 'coach-chat-ai';
    return '<div class="coach-chat-row ' + klass + '"><div class="coach-bubble">' + escapeHtml(message.content) + '</div></div>';
  }).join('');
}

function saveReview() {
  const signalEl = getById('reviewSignal');
  const reflectionEl = getById('reviewReflection');
  const nextActionEl = getById('reviewNextAction');
  if (!signalEl || !reflectionEl || !nextActionEl) return;
  const signal = signalEl.value.trim();
  const reflection = reflectionEl.value.trim();
  const nextAction = nextActionEl.value.trim();
  if (!signal && !reflection && !nextAction) return;
  const createdAt = new Date();
  const reviewPayload = {
    clientReviewId: createClientReviewId(),
    signal,
    reflection,
    nextAction,
    createdAtIso: createdAt.toISOString()
  };
  state.reviews.unshift({
    signal,
    reflection,
    nextAction,
    createdAt: createdAt.toLocaleString('ja-JP'),
    clientReviewId: reviewPayload.clientReviewId
  });
  state.reviews = state.reviews.slice(0, 8);
  signalEl.value = '';
  reflectionEl.value = '';
  nextActionEl.value = '';
  saveState();
  appendReview(reviewPayload);
  renderReviewHistory();
  renderCoachSection();
  renderHomeOverview();
  renderMetrics();
}

function renderReviewHistory() {
  if (!els.reviewHistory) return;
  if (!state.reviews.length) {
    els.reviewHistory.innerHTML = '<div class="note-block muted">まだ保存されたふり返りはありません。</div>';
    return;
  }
  els.reviewHistory.innerHTML = state.reviews.map((review) => {
    return '<div class="note-block" style="margin-top:12px;">' +
      '<strong>' + escapeHtml(review.createdAt) + '</strong>' +
      '<div style="margin-top:10px;"><strong>気になった言葉</strong><div>' + escapeHtml(review.signal || '未入力') + '</div></div>' +
      '<div style="margin-top:10px;"><strong>自分のふり返り</strong><div>' + escapeHtml(review.reflection || '未入力') + '</div></div>' +
      '<div style="margin-top:10px;"><strong>次回の宿題</strong><div>' + escapeHtml(review.nextAction || '未入力') + '</div></div>' +
      '</div>';
  }).join('');
}

function renderHomeOverview() {
  if (!els.homeNextActions || !els.homePrepMemo) return;
  const latestReview = state.reviews[0];
  const currentSession = courseSessions.find((item) => item.id === state.currentCourseId) || courseSessions[0];
  const nextActions = [
    state.completedCourses.length < 10
      ? '基礎講座は「' + (currentSession ? currentSession.title : '第1回') + '」の続きから進める'
      : '基礎講座は完了済みなので、ケース練習と面談前整理を中心に回す',
    state.practiceLogs.length === 0
      ? 'ケース練習を1本試して、今の返し方の癖を見ておく'
      : '直近のケース練習を踏まえて、今日の面談前に何を優先するかを言葉にする',
    state.prepMemo
      ? '直近の面談前メモを見返して、今日の最初の一言と急がないことを確認する'
      : '面談前AIコーチで、今回の着地点と入り方を先に固める',
    latestReview
      ? '前回の宿題「' + (latestReview.nextAction || '未入力') + '」を今回の面談前に見直す'
      : '面談後ふり返りを残して、次回に引き継ぐ材料を作る'
  ];
  els.homeNextActions.innerHTML = nextActions.map((action, index) => itemRow(index, action, 'timeline-item')).join('');

  if (state.prepMemo) {
    els.homePrepMemo.classList.remove('muted');
    els.homePrepMemo.innerHTML =
      '<strong>今回の着地点</strong>' +
      '<div style="margin-top:8px;">' + escapeHtml(state.prepMemo.purpose) + '</div>' +
      '<div style="margin-top:12px;"><strong>最初の一言例</strong></div>' +
      '<div style="margin-top:6px;">' + escapeHtml(state.prepMemo.openingLine) + '</div>';
  } else {
    els.homePrepMemo.classList.add('muted');
    els.homePrepMemo.textContent = 'まだ面談前メモはありません。';
  }

  if (!els.homeLatestReview) {
    return;
  }

  if (latestReview) {
    els.homeLatestReview.classList.remove('muted');
    els.homeLatestReview.innerHTML =
      '<strong>気になった言葉</strong>' +
      '<div style="margin-top:8px;">' + escapeHtml(latestReview.signal || '未入力') + '</div>' +
      '<div style="margin-top:12px;"><strong>次回の宿題</strong></div>' +
      '<div style="margin-top:6px;">' + escapeHtml(latestReview.nextAction || '未入力') + '</div>';
  } else {
    els.homeLatestReview.classList.add('muted');
    els.homeLatestReview.textContent = 'まだ保存されたふり返りはありません。';
  }
}

function renderMetrics() {
  if (!els.completedCount || !els.practiceCount || !els.priorityChip || !els.dashboardCompleted || !els.dashboardPractice || !els.dashboardWeakness || !els.dashboardReviews || !els.dashboardScores || !els.dashboardActions) {
    return;
  }
  const completed = state.completedCourses.length;
  const practices = state.practiceLogs.length;
  const reviews = state.reviews.length;
  const aggregate = aggregateScores();
  const weakestKey = findWeakestKey(aggregate);
  const keyLabelMap = { empathy: '共感', listening: '受け止め', probing: '深掘り', safety: '安心感' };

  els.completedCount.innerHTML = '<strong>' + completed + '/10</strong>';
  els.practiceCount.innerHTML = '<strong>' + practices + '回</strong>';
  els.priorityChip.innerHTML = '<strong>' + keyLabelMap[weakestKey] + '</strong>';
  if (els.homeCompletedStat) els.homeCompletedStat.textContent = completed + '/10';
  if (els.homePracticeStat) els.homePracticeStat.textContent = String(practices);
  els.dashboardCompleted.textContent = completed + '/10';
  els.dashboardPractice.textContent = String(practices);
  els.dashboardWeakness.textContent = keyLabelMap[weakestKey];
  els.dashboardReviews.textContent = String(reviews);
  els.dashboardScores.innerHTML = createScoreItems(aggregate);
  els.dashboardActions.innerHTML = [
    recommendAction(weakestKey),
    completed < 10 ? '未完了の講座を先に進め、見立ての土台を増やす' : '講座は一通り完了しているので、実務ケースを増やして定着させる',
    reviews < 3 ? '本番後のふり返りを3件以上ためて、次回の宿題を回し始める' : 'ふり返りメモをもとに、次回の面談前準備をより具体化する'
  ].map((action, index) => itemRow(index, action, 'timeline-item')).join('');
}

function aggregateScores() {
  if (!state.practiceLogs.length) return { ...defaultScores };
  const totals = { empathy: 0, listening: 0, probing: 0, safety: 0 };
  state.practiceLogs.forEach((log) => {
    totals.empathy += log.scores.empathy;
    totals.listening += log.scores.listening;
    totals.probing += log.scores.probing;
    totals.safety += log.scores.safety;
  });
  return {
    empathy: Math.round(totals.empathy / state.practiceLogs.length),
    listening: Math.round(totals.listening / state.practiceLogs.length),
    probing: Math.round(totals.probing / state.practiceLogs.length),
    safety: Math.round(totals.safety / state.practiceLogs.length)
  };
}

function createScoreItems(scores) {
  const labels = [
    { key: 'empathy', label: '共感' },
    { key: 'listening', label: '受け止め' },
    { key: 'probing', label: '深掘り' },
    { key: 'safety', label: '安心感' }
  ];
  return labels.map((item) => {
    return '<div class="score-item"><span>' + item.label + '</span><div class="bar"><span style="width:' + scores[item.key] + '%;"></span></div><strong>' + scores[item.key] + '/100</strong></div>';
  }).join('');
}

function findWeakestKey(scores) {
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];
}

function recommendAction(key) {
  if (key === 'probing') return '次の重点は深掘りです。「どんな時」「どこが一番」の質問を1つ足してください。';
  if (key === 'safety') return '次の重点は安心感です。結論を急がず、「無理に話さなくて大丈夫」を先に置いてください。';
  if (key === 'empathy') return '次の重点は共感です。事実確認の前に、相手の重さや不安を一度言葉にしてください。';
  return '次の重点は受け止めです。相手の言葉を短く要約し、「こういうことかな」と返す回数を増やしてください。';
}

function itemRow(index, text, className = 'detail-item') {
  return '<div class="' + className + '"><div class="bullet">' + (index + 1) + '</div><div>' + escapeHtml(text) + '</div></div>';
}

function prepMemoRow(label, text, index) {
  return '<div class="prep-item"><div class="bullet">' + index + '</div><div><strong>' + label + '</strong><div>' + escapeHtml(text) + '</div></div></div>';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeRender(label, renderFn) {
  try {
    renderFn();
  } catch (error) {
    console.error('[App] render failed:', label, error);
  }
}

function renderAll() {
  safeRender('courseSidebar', renderCourseSidebar);
  safeRender('course', renderCourse);
  safeRender('scenarioSelect', renderScenarioSelect);
  safeRender('scenario', renderScenario);
  safeRender('coachSection', renderCoachSection);
  safeRender('prepOutput', renderPrepOutput);
  safeRender('reviewHistory', renderReviewHistory);
  safeRender('homeOverview', renderHomeOverview);
  safeRender('metrics', renderMetrics);
  safeRender('persistenceNote', renderPersistenceNote);
}

function renderPersistenceNote() {
  const footerNote = document.querySelector('.footer-note');
  if (!footerNote) return;
  footerNote.textContent = '現在は' + getPersistenceLabel() + 'です。次段階で Supabase に切り替えると、別端末再開と管理者集計に広げられます。';
}
