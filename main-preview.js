
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
    await initApp();
  } catch (error) {
    console.error('App initialization failed after login.', error);
    localStorage.removeItem('user_email');
    showLoginError('初期化に失敗しました。もう一度お試しください。');
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
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') doLogin();
  });

  const email = localStorage.getItem('user_email');
  if (email) {
    completeLogin(email);
  } else {
    setTimeout(() => input.focus(), 100);
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

  trialBar.classList.add('hidden');
  paySection.classList.add('hidden');
  portalWrap.classList.add('hidden');

  if (subscribed) {
    portalWrap.classList.remove('hidden');
  } else if (trialActive) {
    const days = Math.ceil((30 * 24 * 60 * 60 * 1000 - elapsed) / (24 * 60 * 60 * 1000));
    trialBar.classList.remove('hidden');
    trialBar.textContent = '無料トライアル中 - あと ' + days + ' 日';
  } else {
    paySection.classList.remove('hidden');
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