import { courseSessions } from './v2/data.js';

const storageKey = 'oneOnOneCoachingAppStateV2';
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

const state = loadState();
let currentScenario = state.currentScenarioId || 'burnout';
let messages = [];
let turnCount = 0;
let isLoading = false;
let sessionActive = false;

const navButtons = Array.from(document.querySelectorAll('.nav-button'));
const sections = {
  overview: document.getElementById('overviewSection'),
  course: document.getElementById('courseSection'),
  practice: document.getElementById('practiceSection'),
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
  coachPhaseLabel: document.getElementById('coachPhaseLabel'),
  coachStageNodes: Array.from(document.querySelectorAll('.coach-stage-progress span')),
  coachStarterButtons: Array.from(document.querySelectorAll('.starter-button')),
  coachChatBox: document.getElementById('coachChatBox'),
  coachInput: document.getElementById('coachInput')
};

boot();

function boot() {
  window.doLogin = doLogin;
  window.startCheckout = startCheckout;
  window.openPortal = openPortal;

  const input = document.getElementById('lg-email');
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') doLogin();
  });

  const email = localStorage.getItem('user_email');
  if (email) {
    document.getElementById('login-gate').style.display = 'none';
    initApp();
  } else {
    setTimeout(() => input.focus(), 100);
  }

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  if (sessionId) {
    fetch('/api/stripe/session?session_id=' + sessionId)
      .then((response) => response.json())
      .then((data) => {
        if (data.customerId) {
          localStorage.setItem('stripe_customer_id', data.customerId);
          localStorage.removeItem('trial_start_date');
        }
        window.history.replaceState({}, '', '/');
        initApp();
      })
      .catch(() => initApp());
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
      localStorage.setItem('user_email', email);
      if (data.customerId) localStorage.setItem('stripe_customer_id', data.customerId);
      fetch('/api/sheets/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status: data.status })
      }).catch(() => {});
      document.getElementById('login-gate').style.display = 'none';
      initApp();
    })
    .catch(() => {
      errEl.textContent = '通信エラーが発生しました。再度お試しください。';
      btn.disabled = false;
      btn.textContent = '続ける';
    });
}

function initApp() {
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
        btn.textContent = '月額980円で続ける';
      }
    })
    .catch((error) => {
      alert('通信エラー: ' + error.message);
      btn.disabled = false;
      btn.textContent = '月額980円で続ける';
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

  navButtons.forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  document.getElementById('startCourseButton').addEventListener('click', () => switchTab('course'));
  document.getElementById('jumpCoachButton').addEventListener('click', () => switchTab('prep'));
  document.getElementById('jumpPracticeButton').addEventListener('click', () => switchTab('practice'));
  document.getElementById('nextCourseButton').addEventListener('click', goToNextCourse);
  document.getElementById('markCompleteButton').addEventListener('click', markCourseComplete);
  document.getElementById('courseToCoachButton').addEventListener('click', seedCoachFromCourse);

  els.scenarioSelect.addEventListener('change', () => {
    currentScenario = els.scenarioSelect.value;
    state.currentScenarioId = currentScenario;
    saveState();
    renderScenario();
  });

  document.getElementById('startPracticeButton').addEventListener('click', startSession);
  document.getElementById('insertStarterButton').addEventListener('click', () => {
    document.getElementById('userInput').value = scenarioMeta[currentScenario].starter;
    autoResize(document.getElementById('userInput'));
  });
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('userInput').addEventListener('keydown', handleKeydown);
  document.getElementById('userInput').addEventListener('input', function () { autoResize(this); });
  document.getElementById('endSessionButton').addEventListener('click', endSession);
  document.getElementById('replayScenarioButton').addEventListener('click', startSession);
  document.getElementById('practiceToCoachButton').addEventListener('click', seedCoachFromScenario);

  els.coachStarterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      els.coachInput.value = button.dataset.starter;
      sendCoachMessage(button.dataset.starter);
    });
  });
  document.getElementById('sendCoachButton').addEventListener('click', () => sendCoachMessage());
  document.getElementById('resetCoachButton').addEventListener('click', resetCoachFlow);
  document.getElementById('coachToReviewButton').addEventListener('click', () => switchTab('review'));

  document.getElementById('saveReviewButton').addEventListener('click', saveReview);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return {
      currentCourseId: saved.currentCourseId || 1,
      completedCourses: Array.isArray(saved.completedCourses) ? saved.completedCourses : [],
      currentScenarioId: saved.currentScenarioId || 'burnout',
      practiceLogs: Array.isArray(saved.practiceLogs) ? saved.practiceLogs : [],
      reviews: Array.isArray(saved.reviews) ? saved.reviews : [],
      prepMemo: saved.prepMemo || null,
      coachMessages: Array.isArray(saved.coachMessages) ? saved.coachMessages : [],
      coachSummary: saved.coachSummary || null,
      coachPhase: saved.coachPhase || 0
    };
  } catch {
    return {
      currentCourseId: 1,
      completedCourses: [],
      currentScenarioId: 'burnout',
      practiceLogs: [],
      reviews: [],
      prepMemo: null,
      coachMessages: [],
      coachSummary: null,
      coachPhase: 0
    };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function switchTab(tabId) {
  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabId));
  Object.entries(sections).forEach(([key, section]) => {
    section.classList.toggle('active', key === tabId);
  });
}

function renderCourseSidebar() {
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
  els.courseTitle.textContent = session.id + '. ' + session.title;
  els.courseIntro.textContent = session.intro;
  els.courseEmployeeLine.textContent = session.employee;
  els.courseCoachLine.textContent = session.coach;
  els.courseStatusBadge.textContent = state.completedCourses.includes(session.id) ? '完了済み' : '未完了';
  els.courseGoals.innerHTML = session.goals.map((goal, index) => itemRow(index, goal)).join('');
  els.courseSignals.innerHTML = session.signals.map((signal, index) => itemRow(index, signal)).join('');
  els.courseOptions.innerHTML = '';
  els.courseFeedbackBox.classList.add('hidden');
  els.courseFeedbackBox.innerHTML = '';

  session.options.forEach((option) => {
    const button = document.createElement('button');
    button.className = 'option-button';
    button.innerHTML = '<strong>' + escapeHtml(option.label) + '</strong><div style="margin-top:8px;">' + escapeHtml(option.body) + '</div>';
    button.addEventListener('click', () => {
      Array.from(els.courseOptions.children).forEach((child) => child.classList.remove('selected'));
      button.classList.add('selected');
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
  state.currentCourseId = next.id;
  saveState();
  renderCourseSidebar();
  renderCourse();
}

function markCourseComplete() {
  if (!state.completedCourses.includes(state.currentCourseId)) {
    state.completedCourses.push(state.currentCourseId);
  }
  saveState();
  renderAll();
}

function renderScenarioSelect() {
  els.scenarioSelect.innerHTML = Object.entries(scenarioMeta).map(([key, item]) => {
    return '<option value="' + key + '">' + escapeHtml(item.name) + '</option>';
  }).join('');
  els.scenarioSelect.value = currentScenario;
}

function renderScenario() {
  const scenario = scenarioMeta[currentScenario];
  els.scenarioPersona.textContent = scenario.persona;
  els.scenarioContext.textContent = scenario.context;
  els.scenarioTip.textContent = scenario.tip;
  els.scenarioTags.innerHTML = scenario.tags.map((tag) => '<span class="tag">' + escapeHtml(tag) + '</span>').join('');
}

function resetPracticePanel() {
  document.getElementById('feedbackPanel').classList.add('hidden');
  document.getElementById('feedbackLoading').classList.add('hidden');
  document.getElementById('feedbackContent').classList.add('hidden');
  document.getElementById('feedbackActions').classList.add('hidden');
  document.getElementById('feedbackContent').innerHTML = '';
}

function startSession() {
  if (!isAuthorized()) {
    document.getElementById('pay-section').classList.remove('hidden');
    switchTab('overview');
    document.getElementById('pay-section').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const scenario = scenarioMeta[currentScenario];
  messages = [];
  turnCount = 0;
  sessionActive = true;
  document.getElementById('personaAvatar').textContent = scenario.avatar;
  document.getElementById('personaName').textContent = scenario.persona;
  document.getElementById('personaRole').textContent = scenario.name;
  document.getElementById('turnCounter').textContent = '0 ターン';
  document.getElementById('chatMessages').innerHTML = '<div class="system-msg">1on1が始まりました。最初の一言で安心感を作ることを意識してください。</div>';
  document.getElementById('userInput').value = '';
  autoResize(document.getElementById('userInput'));
  resetPracticePanel();
  addMessage('assistant', openingMessages[currentScenario]);
}

function addMessage(role, content) {
  const scenario = scenarioMeta[currentScenario];
  const chatEl = document.getElementById('chatMessages');
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
    document.getElementById('turnCounter').textContent = turnCount + ' ターン';
  }
}

function showTyping() {
  const chatEl = document.getElementById('chatMessages');
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
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function sendMessage() {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!sessionActive) {
    alert('先にシナリオを開始してください。');
    return;
  }
  if (!text || isLoading) return;

  input.value = '';
  autoResize(input);
  isLoading = true;
  document.getElementById('sendBtn').disabled = true;
  addMessage('user', text);
  showTyping();

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
    addMessage('assistant', data.reply || ('（エラー: ' + (data.error || '不明なエラー') + '）'));
  } catch {
    hideTyping();
    addMessage('assistant', '（通信エラーが発生しました）');
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}

async function endSession() {
  if (!sessionActive || messages.length < 2) {
    alert('もう少し会話してからセッションを終了してください。');
    return;
  }

  const feedbackPanel = document.getElementById('feedbackPanel');
  const loading = document.getElementById('feedbackLoading');
  const contentEl = document.getElementById('feedbackContent');
  const actions = document.getElementById('feedbackActions');
  feedbackPanel.classList.remove('hidden');
  loading.classList.remove('hidden');
  contentEl.classList.add('hidden');
  actions.classList.add('hidden');
  feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const apiMessages = messages
    .filter((message, index) => !(index === 0 && message.role === 'assistant'))
    .map((message) => ({ role: message.role, content: message.content }));

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'feedback', scenario: currentScenario, messages: apiMessages })
    });
    const data = await response.json();
    loading.classList.add('hidden');
    contentEl.classList.remove('hidden');
    actions.classList.remove('hidden');
    contentEl.innerHTML = formatFeedback(data.feedback || 'フィードバックを取得できませんでした。');

    state.practiceLogs.unshift({
      scenarioId: currentScenario,
      createdAt: new Date().toLocaleString('ja-JP'),
      scores: extractScores(data.feedback || '')
    });
    state.practiceLogs = state.practiceLogs.slice(0, 30);
    saveState();
    renderMetrics();
    renderHomeOverview();
  } catch {
    loading.classList.add('hidden');
    contentEl.classList.remove('hidden');
    actions.classList.remove('hidden');
    contentEl.textContent = '通信エラーが発生しました。';
  }
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

function renderPrepOutput() {
  const output = document.getElementById('prepOutput');
  if (!state.prepMemo) {
    output.innerHTML = '<div class="prep-item"><div class="bullet">1</div><div>ここに、面談前AIコーチで整理した4点メモが表示されます。面談直前はこの欄だけ見返せば十分です。</div></div>';
    return;
  }
  output.innerHTML =
    prepMemoRow('今回の面談目的', state.prepMemo.purpose, 1) +
    prepMemoRow('最初の一言', state.prepMemo.openingLine, 2) +
    prepMemoRow('最初の質問', state.prepMemo.firstQuestion, 3) +
    prepMemoRow('今日は急がないこと', state.prepMemo.holdBack, 4);
}

function resetCoachFlow() {
  state.coachMessages = [];
  state.coachSummary = null;
  state.coachPhase = 0;
  state.prepMemo = null;
  els.coachInput.value = '';
  saveState();
  renderCoachSection();
  renderPrepOutput();
  renderHomeOverview();
  renderMetrics();
}

function sendCoachMessage(prefilledText) {
  const text = (prefilledText || els.coachInput.value).trim();
  if (!text) return;
  state.coachMessages.push({ role: 'user', content: text });
  state.coachPhase = Math.min(state.coachMessages.filter((item) => item.role === 'user').length - 1, 3);
  state.coachSummary = buildCoachSummary(text);
  state.coachMessages.push({ role: 'assistant', content: buildCoachReply(state.coachSummary, state.coachPhase) });
  state.prepMemo = { ...state.coachSummary };
  els.coachInput.value = '';
  saveState();
  renderCoachSection();
  renderPrepOutput();
  renderHomeOverview();
  renderMetrics();
}

function buildCoachSummary(text) {
  const lastReview = state.reviews[0];
  const purpose = detectPurpose(text);
  const focus = detectFocus(text);
  const risk = detectRisk(text, lastReview);
  return {
    purpose,
    openingLine: buildOpeningLine(focus),
    firstQuestion: buildFirstQuestion(focus),
    holdBack: risk
  };
}

function detectPurpose(text) {
  if (text.includes('退職') || text.includes('辞め')) return '離職予兆を軽く扱わず、まず今の状態を見極めたい';
  if (text.includes('若手') || text.includes('自信')) return '自信低下と意欲低下を決めつけずに見分けたい';
  if (text.includes('話しすぎ')) return '自分が話しすぎず、相手の言葉を引き出す面談にしたい';
  if (text.includes('忙') || text.includes('負担')) return '忙しさの中で何が一番負担かを見極めたい';
  return '今回の1on1で何を確認する面談にするかを先に固めたい';
}

function detectFocus(text) {
  if (text.includes('退職') || text.includes('辞め')) return '本音の重さ';
  if (text.includes('若手') || text.includes('自信')) return '向いていないと感じる場面';
  if (text.includes('話しすぎ')) return '相手が話しやすくなる入り方';
  if (text.includes('忙') || text.includes('負担')) return '一番しんどい場面';
  return '今回いちばん確かめたいこと';
}

function detectRisk(text, lastReview) {
  if (text.includes('踏み込') || text.includes('退職')) return '結論や引き止めを急がず、まず背景確認を優先する';
  if (text.includes('話しすぎ')) return '自分が補足しすぎず、問いのあとに一呼吸置く';
  if (lastReview && lastReview.reflection) return '前回の反省である「' + lastReview.reflection + '」を繰り返さない';
  return '相手の整理より先に答えを置かない';
}

function buildOpeningLine(focus) {
  if (focus === '本音の重さ') return '今日は結論を急がず、最近の様子を一緒に整理したいと思っています。';
  if (focus === '向いていないと感じる場面') return '無理に前向きにしなくて大丈夫なので、最近気になっていることから聞かせてください。';
  if (focus === '相手が話しやすくなる入り方') return '今日は私から話しすぎず、まず最近の感じ方を聞かせてもらえたらと思っています。';
  if (focus === '一番しんどい場面') return '今日は忙しさの中で何が一番負担か、まず整理したいと思っています。';
  return '今日は何を確認する面談にするかを、急がず整理しながら進めたいと思っています。';
}

function buildFirstQuestion(focus) {
  if (focus === '本音の重さ') return '最近いちばん引っかかっていることは、どのあたりですか。';
  if (focus === '向いていないと感じる場面') return 'そう感じる場面は、最近だとどんな時が多いですか。';
  if (focus === '相手が話しやすくなる入り方') return '最近の状況を振り返ると、どこから話すのがいちばん話しやすそうですか。';
  if (focus === '一番しんどい場面') return '忙しさの中でも、特にしんどさが出やすいのはどんな時ですか。';
  return '今回の1on1で、まず何がわかると一番前に進みそうですか。';
}

function buildCoachReply(summary, phase) {
  const replies = [
    'まず置いておきたいGoalは、「' + summary.purpose + '」に近そうです。今回の1on1でここが見えれば前に進めそうか、まずそこから考えてみましょう。',
    '次はRealityです。いま気になっているのは「' + summary.firstQuestion.replace('ですか。', '') + '」に関わる場面だと思うので、その場面を一つ思い浮かべながら面談に入るとぶれにくいです。',
    'Optionsとしては、最初の一言を短く置いてから、質問を一つだけ開く流れが合いそうです。たとえば「' + summary.openingLine + '」のあとに「' + summary.firstQuestion + '」とつなぐと、広げすぎずに始められます。',
    '最後にWillです。今回は「' + summary.holdBack + '」を意識しながら進めると、面談の軸がぶれにくくなります。右側の4点メモをそのまま今日の面談前メモとして使ってください。'
  ];
  return replies[Math.min(phase, replies.length - 1)];
}

function renderCoachSection() {
  const phaseLabels = ['面談前の整理を始める', 'Goalを言葉にする', 'Realityを見直す', 'Optionsを整える', 'Willを固める'];
  els.coachPhaseLabel.textContent = phaseLabels[Math.min(state.coachPhase, phaseLabels.length - 1)];
  els.coachStageNodes.forEach((node, index) => {
    node.classList.toggle('active', index <= state.coachPhase && state.coachMessages.length > 0);
  });

  if (!state.coachMessages.length) {
    els.coachChatBox.innerHTML = '<div class="coach-chat-row coach-chat-system"><div class="coach-bubble">まずはスターターを選ぶか、下の入力欄から今回の1on1前に整理したいことを書いてください。最後に右側へ、今日そのまま使える4点メモを残します。</div></div>';
    return;
  }

  els.coachChatBox.innerHTML = state.coachMessages.map((message) => {
    const klass = message.role === 'user' ? 'coach-chat-user' : 'coach-chat-ai';
    return '<div class="coach-chat-row ' + klass + '"><div class="coach-bubble">' + escapeHtml(message.content) + '</div></div>';
  }).join('');
}

function saveReview() {
  const signal = document.getElementById('reviewSignal').value.trim();
  const reflection = document.getElementById('reviewReflection').value.trim();
  const nextAction = document.getElementById('reviewNextAction').value.trim();
  if (!signal && !reflection && !nextAction) return;
  state.reviews.unshift({ signal, reflection, nextAction, createdAt: new Date().toLocaleString('ja-JP') });
  state.reviews = state.reviews.slice(0, 8);
  document.getElementById('reviewSignal').value = '';
  document.getElementById('reviewReflection').value = '';
  document.getElementById('reviewNextAction').value = '';
  saveState();
  renderReviewHistory();
  renderCoachSection();
  renderHomeOverview();
  renderMetrics();
}

function renderReviewHistory() {
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
  const latestReview = state.reviews[0];
  const currentSession = courseSessions.find((item) => item.id === state.currentCourseId) || courseSessions[0];
  const nextActions = [
    state.completedCourses.length < 10
      ? '基礎講座は「' + currentSession.title + '」の続きから進める'
      : '基礎講座は完了済みなので、ケース練習と面談前整理を中心に回す',
    state.practiceLogs.length === 0
      ? 'ケース練習を1本試して、今の返し方の癖を見ておく'
      : '直近のケース練習を踏まえて、今日の面談前に何を優先するかを言葉にする',
    state.prepMemo
      ? '直近の面談前メモを見返して、今日の最初の一言と急がないことを確認する'
      : '面談前AIコーチで、今回の1on1のGoalと最初の質問を先に整理する',
    latestReview
      ? '前回の宿題「' + (latestReview.nextAction || '未入力') + '」を今回の面談前に見直す'
      : '面談後ふり返りを残して、次回に引き継ぐ材料を作る'
  ];
  els.homeNextActions.innerHTML = nextActions.map((action, index) => itemRow(index, action, 'timeline-item')).join('');

  if (state.prepMemo) {
    els.homePrepMemo.classList.remove('muted');
    els.homePrepMemo.innerHTML =
      '<strong>今回の面談目的</strong>' +
      '<div style="margin-top:8px;">' + escapeHtml(state.prepMemo.purpose) + '</div>' +
      '<div style="margin-top:12px;"><strong>最初の一言</strong></div>' +
      '<div style="margin-top:6px;">' + escapeHtml(state.prepMemo.openingLine) + '</div>';
  } else {
    els.homePrepMemo.classList.add('muted');
    els.homePrepMemo.textContent = 'まだ面談前メモはありません。';
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
  const completed = state.completedCourses.length;
  const practices = state.practiceLogs.length;
  const reviews = state.reviews.length;
  const aggregate = aggregateScores();
  const weakestKey = findWeakestKey(aggregate);
  const keyLabelMap = { empathy: '共感', listening: '受け止め', probing: '深掘り', safety: '安心感' };

  els.completedCount.innerHTML = '<strong>' + completed + '/10</strong>';
  els.practiceCount.innerHTML = '<strong>' + practices + '回</strong>';
  els.priorityChip.innerHTML = '<strong>' + keyLabelMap[weakestKey] + '</strong>';
  els.homeCompletedStat.textContent = completed + '/10';
  els.homePracticeStat.textContent = String(practices);
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

function renderAll() {
  renderCourseSidebar();
  renderCourse();
  renderScenarioSelect();
  renderScenario();
  renderCoachSection();
  renderPrepOutput();
  renderReviewHistory();
  renderHomeOverview();
  renderMetrics();
}
