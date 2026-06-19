import { courseSessions, scenarios } from './data.js';

const storageKey = "oneOnOneCoachingAppStateV1";
const defaultScores = { empathy: 58, listening: 62, probing: 48, safety: 60 };
const state = loadState();

const navButtons = Array.from(document.querySelectorAll(".nav-button"));
const sections = {
  overview: document.getElementById("overviewSection"),
  course: document.getElementById("courseSection"),
  practice: document.getElementById("practiceSection"),
  prep: document.getElementById("prepSection"),
  review: document.getElementById("reviewSection"),
  dashboard: document.getElementById("dashboardSection")
};

const courseSidebar = document.getElementById("courseSidebar");
const courseTitle = document.getElementById("courseTitle");
const courseIntro = document.getElementById("courseIntro");
const courseGoals = document.getElementById("courseGoals");
const courseSignals = document.getElementById("courseSignals");
const courseEmployeeLine = document.getElementById("courseEmployeeLine");
const courseCoachLine = document.getElementById("courseCoachLine");
const courseGrowFocus = document.getElementById("courseGrowFocus");
const courseGrowHint = document.getElementById("courseGrowHint");
const courseLevel = document.getElementById("courseLevel");
const courseLevelHint = document.getElementById("courseLevelHint");
const courseStretchTitle = document.getElementById("courseStretchTitle");
const courseStretchBody = document.getElementById("courseStretchBody");
const courseOptions = document.getElementById("courseOptions");
const courseFeedbackBox = document.getElementById("courseFeedbackBox");
const courseStatusBadge = document.getElementById("courseStatusBadge");

const scenarioSelect = document.getElementById("scenarioSelect");
const scenarioContext = document.getElementById("scenarioContext");
const scenarioEmployeeLine = document.getElementById("scenarioEmployeeLine");
const scenarioTags = document.getElementById("scenarioTags");
const exampleReply = document.getElementById("exampleReply");
const replyInput = document.getElementById("replyInput");
const practiceResultBox = document.getElementById("practiceResultBox");
const resultMindset = document.getElementById("resultMindset");
const resultPriority = document.getElementById("resultPriority");
const resultSignals = document.getElementById("resultSignals");
const resultCoach = document.getElementById("resultCoach");
const resultGrow = document.getElementById("resultGrow");
const resultScores = document.getElementById("resultScores");
const resultSuggestions = document.getElementById("resultSuggestions");
const resultWarnings = document.getElementById("resultWarnings");
const resultNextLines = document.getElementById("resultNextLines");
const resultFollowup = document.getElementById("resultFollowup");

const completedCount = document.getElementById("completedCount");
const practiceCount = document.getElementById("practiceCount");
const priorityChip = document.getElementById("priorityChip");
const homeCompletedStat = document.getElementById("homeCompletedStat");
const homePracticeStat = document.getElementById("homePracticeStat");
const homeNextActions = document.getElementById("homeNextActions");
const homePrepMemo = document.getElementById("homePrepMemo");
const homeLatestReview = document.getElementById("homeLatestReview");
const coachPhaseLabel = document.getElementById("coachPhaseLabel");
const coachStageNodes = Array.from(document.querySelectorAll(".coach-stage-progress span"));
const coachStarterButtons = Array.from(document.querySelectorAll(".starter-button"));
const coachChatBox = document.getElementById("coachChatBox");
const coachInput = document.getElementById("coachInput");

const dashboardCompleted = document.getElementById("dashboardCompleted");
const dashboardPractice = document.getElementById("dashboardPractice");
const dashboardWeakness = document.getElementById("dashboardWeakness");
const dashboardReviews = document.getElementById("dashboardReviews");
const dashboardScores = document.getElementById("dashboardScores");
const dashboardActions = document.getElementById("dashboardActions");
const reviewHistory = document.getElementById("reviewHistory");

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
  });
});

document.getElementById("startCourseButton").addEventListener("click", () => {
  switchTab("course");
});

document.getElementById("jumpPracticeButton").addEventListener("click", () => {
  switchTab("practice");
});

document.getElementById("jumpCoachButton").addEventListener("click", () => {
  switchTab("prep");
});

document.getElementById("nextCourseButton").addEventListener("click", () => {
  const currentIndex = courseSessions.findIndex((session) => session.id === state.currentCourseId);
  const next = courseSessions[Math.min(currentIndex + 1, courseSessions.length - 1)];
  state.currentCourseId = next.id;
  saveState();
  renderCourseSidebar();
  renderCourse();
});

document.getElementById("markCompleteButton").addEventListener("click", () => {
  if (!state.completedCourses.includes(state.currentCourseId)) {
    state.completedCourses.push(state.currentCourseId);
  }
  saveState();
  renderAll();
});

document.getElementById("courseToCoachButton").addEventListener("click", () => {
  seedCoachFromCourse();
});

scenarioSelect.addEventListener("change", () => {
  state.currentScenarioId = scenarioSelect.value;
  practiceResultBox.classList.add("hidden");
  replyInput.value = "";
  saveState();
  renderScenario();
});

document.getElementById("fillSuggestionButton").addEventListener("click", () => {
  const scenario = getCurrentScenario();
  replyInput.value = scenario.example;
});

document.getElementById("analyzeReplyButton").addEventListener("click", () => {
  analyzeReply();
});

document.getElementById("practiceToCoachButton").addEventListener("click", () => {
  seedCoachFromScenario();
});

coachStarterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    coachInput.value = button.dataset.starter;
    sendCoachMessage(button.dataset.starter);
  });
});

document.getElementById("sendCoachButton").addEventListener("click", () => {
  sendCoachMessage();
});

document.getElementById("resetCoachButton").addEventListener("click", () => {
  resetCoachFlow();
});

document.getElementById("coachToReviewButton").addEventListener("click", () => {
  switchTab("review");
});

document.getElementById("saveReviewButton").addEventListener("click", () => {
  const signal = document.getElementById("reviewSignal").value.trim();
  const reflection = document.getElementById("reviewReflection").value.trim();
  const nextAction = document.getElementById("reviewNextAction").value.trim();
  if (!signal && !reflection && !nextAction) return;
  state.reviews.unshift({
    signal,
    reflection,
    nextAction,
    createdAt: new Date().toLocaleString("ja-JP")
  });
  state.reviews = state.reviews.slice(0, 8);
  document.getElementById("reviewSignal").value = "";
  document.getElementById("reviewReflection").value = "";
  document.getElementById("reviewNextAction").value = "";
  saveState();
  renderReviewHistory();
  renderMetrics();
  renderCoachSection();
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      currentCourseId: saved.currentCourseId || 1,
      completedCourses: Array.isArray(saved.completedCourses) ? saved.completedCourses : [],
      currentScenarioId: saved.currentScenarioId || scenarios[0].id,
      practiceLogs: Array.isArray(saved.practiceLogs) ? saved.practiceLogs : [],
      reviews: Array.isArray(saved.reviews) ? saved.reviews : [],
      prepMemo: saved.prepMemo || null,
      coachMessages: Array.isArray(saved.coachMessages) ? saved.coachMessages : [],
      coachSummary: saved.coachSummary || null,
      coachPhase: saved.coachPhase || 0
    };
  } catch (error) {
    return {
      currentCourseId: 1,
      completedCourses: [],
      currentScenarioId: scenarios[0].id,
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
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
  Object.entries(sections).forEach(([key, section]) => {
    section.classList.toggle("active", key === tabId);
  });
}

function renderCourseSidebar() {
  courseSidebar.innerHTML = "";
  courseSessions.forEach((session) => {
    const button = document.createElement("button");
    button.className = "course-button";
    if (session.id === state.currentCourseId) button.classList.add("active");
    if (state.completedCourses.includes(session.id)) button.classList.add("done");
    button.innerHTML = `
      <span class="course-no">${session.id}</span>
      <span class="course-copy">
        <strong>${session.title}</strong>
        <small>${session.intro}</small>
      </span>
      <span class="course-state">${state.completedCourses.includes(session.id) ? "完了" : "未完了"}</span>
    `;
    button.addEventListener("click", () => {
      state.currentCourseId = session.id;
      saveState();
      renderCourseSidebar();
      renderCourse();
      switchTab("course");
    });
    courseSidebar.appendChild(button);
  });
}

function renderCourse() {
  const session = courseSessions.find((item) => item.id === state.currentCourseId) || courseSessions[0];
  courseTitle.textContent = `${session.id}. ${session.title}`;
  courseIntro.textContent = session.intro;
  courseEmployeeLine.textContent = session.employee;
  courseCoachLine.textContent = session.coach;
  courseGrowFocus.textContent = session.growFocus;
  courseGrowHint.textContent = session.growHint;
  courseLevel.textContent = session.level;
  courseLevelHint.textContent = session.levelHint;
  courseStretchTitle.textContent = session.stretch.title;
  courseStretchBody.textContent = session.stretch.body;
  courseStatusBadge.textContent = state.completedCourses.includes(session.id) ? "完了済み" : "未完了";
  courseStatusBadge.style.color = state.completedCourses.includes(session.id) ? "#295547" : "#9b4f29";

  courseGoals.innerHTML = session.goals.map((goal, index) => `
    <div class="detail-item">
      <div class="bullet">${index + 1}</div>
      <div>${goal}</div>
    </div>
  `).join("");

  courseSignals.innerHTML = session.signals.map((signal, index) => `
    <div class="signal-item">
      <div class="bullet">${index + 1}</div>
      <div>${signal}</div>
    </div>
  `).join("");

  courseOptions.innerHTML = "";
  courseFeedbackBox.classList.add("hidden");
  courseFeedbackBox.innerHTML = "";

  session.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-button";
    button.innerHTML = `<strong>${option.label}</strong><div>${option.body}</div>`;
    button.addEventListener("click", () => {
      Array.from(courseOptions.children).forEach((child) => child.classList.remove("selected"));
      button.classList.add("selected");
      courseFeedbackBox.classList.remove("hidden");
      courseFeedbackBox.innerHTML = `
        <h3>${option.label}</h3>
        <div class="message-box coach-box" style="margin-top: 12px;">
          <div class="message-label">講評</div>
          <p>${option.feedback}</p>
        </div>
        <div class="message-box" style="margin-top: 12px;">
          <div class="message-label">なぜそうなのか</div>
          <p>${option.insight}</p>
        </div>
      `;
    });
    courseOptions.appendChild(button);
  });
}

function renderScenarioSelect() {
  scenarioSelect.innerHTML = scenarios.map((scenario) => `
    <option value="${scenario.id}">${scenario.title}</option>
  `).join("");
  scenarioSelect.value = state.currentScenarioId;
}

function getCurrentScenario() {
  return scenarios.find((item) => item.id === state.currentScenarioId) || scenarios[0];
}

function renderScenario() {
  const scenario = getCurrentScenario();
  scenarioContext.textContent = scenario.context;
  scenarioEmployeeLine.textContent = scenario.line;
  exampleReply.textContent = scenario.example;
  scenarioTags.innerHTML = scenario.tags.map((tag) => `<span class="tag">${tag}</span>`).join("");
}

function analyzeReply() {
  const text = replyInput.value.trim();
  if (!text) return;
  const scenario = getCurrentScenario();
  const analysis = evaluateReply(text, scenario);

  resultMindset.textContent = scenario.mindset;
  resultPriority.textContent = scenario.priority;
  resultGrow.textContent = analysis.grow;
  resultSignals.textContent = scenario.signals;
  resultCoach.textContent = analysis.coach;
  resultFollowup.innerHTML = `<strong>文例</strong><div>${scenario.followup}</div>`;
  resultScores.innerHTML = createScoreItems(analysis.scores);
  resultSuggestions.innerHTML = scenario.suggestions.map((item, index) => `
    <div class="suggestion-item">
      <div class="bullet">${index + 1}</div>
      <div><strong>${item.title}</strong><div>${item.body}</div></div>
    </div>
  `).join("");
  resultWarnings.innerHTML = scenario.warnings.map((item, index) => `
    <div class="warning-item">
      <div class="bullet">${index + 1}</div>
      <div><strong>${item.title}</strong><div>${item.body}</div></div>
    </div>
  `).join("");
  resultNextLines.innerHTML = scenario.nextLines.map((line, index) => `
    <div class="timeline-item">
      <div class="bullet">${index + 1}</div>
      <div>${line}</div>
    </div>
  `).join("");
  practiceResultBox.classList.remove("hidden");

  state.practiceLogs.unshift({
    scenarioId: scenario.id,
    createdAt: new Date().toLocaleString("ja-JP"),
    scores: analysis.scores
  });
  state.practiceLogs = state.practiceLogs.slice(0, 30);
  saveState();
  renderMetrics();
}

function seedCoachFromCourse() {
  const session = courseSessions.find((item) => item.id === state.currentCourseId) || courseSessions[0];
  switchTab("prep");
  sendCoachMessage(`いま講座の「${session.title}」を見ています。次の1on1で、どこを一番意識するか整理したいです。`);
}

function seedCoachFromScenario() {
  const scenario = getCurrentScenario();
  switchTab("prep");
  sendCoachMessage(`ケース練習の「${scenario.title}」を見て、実際の1on1では何を優先して聞くべきか整理したいです。`);
}

function evaluateReply(text, scenario) {
  const lower = text;
  const empathyHits = ["心配", "大丈夫", "しんど", "つら", "無理", "気にな", "話してくれて", "そうなんだ"].filter((word) => lower.includes(word)).length;
  const probingHits = ["どこ", "どんな", "いつ", "何が", "どちら", "どのあたり", "場面"].filter((word) => lower.includes(word)).length;
  const supportHits = ["一緒に", "整理", "手伝", "支援", "見たい"].filter((word) => lower.includes(word)).length;
  const rushHits = ["すぐ", "まずはこれ", "決めよう", "外そう", "頑張ろう", "気にしすぎ"].filter((word) => lower.includes(word)).length;
  const questionHits = (text.match(/？|\?/g) || []).length;

  const empathy = clamp(42 + empathyHits * 12 + supportHits * 4 - rushHits * 8, 22, 96);
  const listening = clamp(48 + empathyHits * 8 + questionHits * 3 - rushHits * 5, 24, 96);
  const probing = clamp(36 + probingHits * 14 + questionHits * 5 - rushHits * 6, 18, 96);
  const safety = clamp(44 + empathyHits * 10 + supportHits * 6 - rushHits * 10, 20, 96);

  let coach = "相手を受け止めつつ、次の質問で少し具体化できています。実務でかなり使いやすい返しです。";
  let grow = scenario.growFocusGood;
  if (probing < 48) {
    coach = "安心感はありますが、次にどこを深掘りするかが少し弱めです。具体的な場面を聞く一言を足すと、1on1が前に進みやすくなります。";
    grow = scenario.growFocusSoft;
  }
  if (safety < 48) {
    coach = "少し結論を急いでいる印象があります。今は解決策より、相手が話しやすい状態を作る方が先です。";
    grow = "まだGoalや解決策に進む前の土台づくりです。いまはGROWでいうとRealityを掘る前に、安全に話せる空気を整える段階です。";
  }
  if (scenario.id === "resignation" && safety < 54) {
    coach = "離職予兆がにじむ場面では、軽く扱わないことが最優先です。『重く聞こえる』と認めたうえで背景確認へ進むとよいです。";
    grow = "この場面ではWillを急がず、Realityの重さを丁寧に置くのが先です。GROWの順番を守ること自体が支援になります。";
  }

  return {
    coach,
    grow,
    scores: { empathy, listening, probing, safety }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createScoreItems(scores) {
  const labels = [
    { key: "empathy", label: "共感" },
    { key: "listening", label: "受け止め" },
    { key: "probing", label: "深掘り" },
    { key: "safety", label: "安心感" }
  ];
  return labels.map((item) => `
    <div class="score-item">
      <span>${item.label}</span>
      <div class="bar"><span style="width: ${scores[item.key]}%;"></span></div>
      <strong>${scores[item.key]}/100</strong>
    </div>
  `).join("");
}

function renderPrepOutput() {
  const output = document.getElementById("prepOutput");
  if (!state.prepMemo) {
    output.innerHTML = `
      <div class="prep-item">
        <div class="bullet">1</div>
        <div>ここに、面談前AIコーチで整理した4点メモが表示されます。</div>
      </div>
    `;
    return;
  }

  const { purpose, openingLine, firstQuestion, holdBack } = state.prepMemo;
  output.innerHTML = `
    <div class="prep-item">
      <div class="bullet">1</div>
      <div><strong>今回の面談目的</strong><div>${purpose}</div></div>
    </div>
    <div class="prep-item">
      <div class="bullet">2</div>
      <div><strong>最初の一言</strong><div>${openingLine}</div></div>
    </div>
    <div class="prep-item">
      <div class="bullet">3</div>
      <div><strong>最初の質問</strong><div>${firstQuestion}</div></div>
    </div>
    <div class="prep-item">
      <div class="bullet">4</div>
      <div><strong>今日は急がないこと</strong><div>${holdBack}</div></div>
    </div>
  `;
}

function resetCoachFlow() {
  state.coachMessages = [];
  state.coachSummary = null;
  state.coachPhase = 0;
  state.prepMemo = null;
  coachInput.value = "";
  saveState();
  renderCoachSection();
  renderPrepOutput();
}

function sendCoachMessage(prefilledText) {
  const text = (prefilledText || coachInput.value).trim();
  if (!text) return;
  state.coachMessages.push({ role: "user", content: text });
  state.coachPhase = Math.min(state.coachMessages.filter((item) => item.role === "user").length - 1, 3);
  state.coachSummary = buildCoachSummary(text);
  state.coachMessages.push({ role: "assistant", content: buildCoachReply(state.coachSummary, state.coachPhase) });
  state.prepMemo = { ...state.coachSummary };
  coachInput.value = "";
  saveState();
  renderCoachSection();
  renderPrepOutput();
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
  if (text.includes("退職") || text.includes("辞め")) return "離職予兆を軽く扱わず、まず今の状態を見極めたい";
  if (text.includes("若手") || text.includes("自信")) return "自信低下と意欲低下を決めつけずに見分けたい";
  if (text.includes("話しすぎ")) return "自分が話しすぎず、相手の言葉を引き出す面談にしたい";
  if (text.includes("忙") || text.includes("負担")) return "忙しさの中で何が一番負担かを見極めたい";
  return "今回の1on1で何を確認する面談にするかを先に固めたい";
}

function detectFocus(text) {
  if (text.includes("退職") || text.includes("辞め")) return "本音の重さ";
  if (text.includes("若手") || text.includes("自信")) return "向いていないと感じる場面";
  if (text.includes("話しすぎ")) return "相手が話しやすくなる入り方";
  if (text.includes("忙") || text.includes("負担")) return "一番しんどい場面";
  return "今回いちばん確かめたいこと";
}

function detectRisk(text, lastReview) {
  if (text.includes("踏み込") || text.includes("退職")) return "結論や引き止めを急がず、まず背景確認を優先する";
  if (text.includes("話しすぎ")) return "自分が補足しすぎず、問いのあとに一呼吸置く";
  if (lastReview && lastReview.reflection) return `前回の反省である「${lastReview.reflection}」を繰り返さない`;
  return "相手の整理より先に答えを置かない";
}

function buildOpeningLine(focus) {
  if (focus === "本音の重さ") return "今日は結論を急がず、最近の様子を一緒に整理したいと思っています。";
  if (focus === "向いていないと感じる場面") return "無理に前向きにしなくて大丈夫なので、最近気になっていることから聞かせてください。";
  if (focus === "相手が話しやすくなる入り方") return "今日は私から話しすぎず、まず最近の感じ方を聞かせてもらえたらと思っています。";
  if (focus === "一番しんどい場面") return "今日は忙しさの中で何が一番負担か、まず整理したいと思っています。";
  return "今日は何を確認する面談にするかを、急がず整理しながら進めたいと思っています。";
}

function buildFirstQuestion(focus) {
  if (focus === "本音の重さ") return "最近いちばん引っかかっていることは、どのあたりですか。";
  if (focus === "向いていないと感じる場面") return "そう感じる場面は、最近だとどんな時が多いですか。";
  if (focus === "相手が話しやすくなる入り方") return "最近の状況を振り返ると、どこから話すのがいちばん話しやすそうですか。";
  if (focus === "一番しんどい場面") return "忙しさの中でも、特にしんどさが出やすいのはどんな時ですか。";
  return "今回の1on1で、まず何がわかると一番前に進みそうですか。";
}

function buildCoachReply(summary, phase) {
  const intros = [
    `まず置いておきたいGoalは、「${summary.purpose}」に近そうです。今回の1on1でここが見えれば前に進めそうか、まずそこから考えてみましょう。`,
    `次はRealityです。いま気になっているのは「${summary.firstQuestion.replace("ですか。", "")}」に関わる場面だと思うので、その場面を一つ思い浮かべながら面談に入るとぶれにくいです。`,
    `Optionsとしては、最初の一言を短く置いてから、質問を一つだけ開く流れが合いそうです。たとえば「${summary.openingLine}」のあとに「${summary.firstQuestion}」とつなぐと、広げすぎずに始められます。`,
    `最後にWillです。今回は「${summary.holdBack}」を意識しながら進めると、面談の軸がぶれにくくなります。右側の4点メモをそのまま今日の面談前メモとして使ってください。`
  ];
  return intros[Math.min(phase, intros.length - 1)];
}

function renderCoachSection() {
  const phaseLabels = [
    "面談前の整理を始める",
    "Goalを言葉にする",
    "Realityを見直す",
    "Optionsを整える",
    "Willを固める"
  ];

  coachPhaseLabel.textContent = phaseLabels[Math.min(state.coachPhase, phaseLabels.length - 1)];
  coachStageNodes.forEach((node, index) => {
    node.classList.toggle("active", index <= state.coachPhase && state.coachMessages.length > 0);
  });

  if (!state.coachMessages.length) {
    coachChatBox.innerHTML = `
      <div class="coach-chat-row coach-chat-system">
        <div class="coach-bubble">スターターを選ぶか、下の入力欄から今回の1on1前に整理したいことを書いてください。</div>
      </div>
    `;
    return;
  }

  coachChatBox.innerHTML = state.coachMessages.map((message) => `
    <div class="coach-chat-row ${message.role === "user" ? "coach-chat-user" : "coach-chat-ai"}">
      <div class="coach-bubble">${escapeHtml(message.content)}</div>
    </div>
  `).join("");
}

function renderReviewHistory() {
  if (!state.reviews.length) {
    reviewHistory.innerHTML = `<div class="note-block muted">まだ保存されたふり返りはありません。</div>`;
    return;
  }
  reviewHistory.innerHTML = state.reviews.map((review) => `
    <div class="note-block" style="margin-top: 12px;">
      <strong>${review.createdAt}</strong>
      <div style="margin-top: 10px;"><strong>気になった言葉</strong><div>${escapeHtml(review.signal || "未入力")}</div></div>
      <div style="margin-top: 10px;"><strong>自分のふり返り</strong><div>${escapeHtml(review.reflection || "未入力")}</div></div>
      <div style="margin-top: 10px;"><strong>次回の宿題</strong><div>${escapeHtml(review.nextAction || "未入力")}</div></div>
    </div>
  `).join("");
}

function renderHomeOverview() {
  const latestReview = state.reviews[0];
  const currentSession = courseSessions.find((item) => item.id === state.currentCourseId) || courseSessions[0];
  const nextActions = [
    state.completedCourses.length < 10
      ? `基礎講座は「${currentSession.title}」の続きから進める`
      : "基礎講座は完了済みなので、ケース練習と面談前整理を中心に回す",
    state.practiceLogs.length === 0
      ? "ケース練習を1本試して、今の返し方の癖を見ておく"
      : "直近のケース練習を踏まえて、今日の面談前に何を優先するかを言葉にする",
    state.prepMemo
      ? "直近の面談前メモを見返して、今日の最初の一言と急がないことを確認する"
      : "面談前AIコーチで、今回の1on1のGoalと最初の質問を先に整理する",
    latestReview
      ? `前回の宿題「${latestReview.nextAction || "未入力"}」を今回の面談前に見直す`
      : "面談後ふり返りを残して、次回に引き継ぐ材料を作る"
  ];

  homeNextActions.innerHTML = nextActions.map((action, index) => `
    <div class="timeline-item">
      <div class="bullet">${index + 1}</div>
      <div>${action}</div>
    </div>
  `).join("");

  if (state.prepMemo) {
    homePrepMemo.classList.remove("muted");
    homePrepMemo.innerHTML = `
      <strong>今回の面談目的</strong>
      <div style="margin-top: 8px;">${escapeHtml(state.prepMemo.purpose)}</div>
      <div style="margin-top: 12px;"><strong>最初の一言</strong></div>
      <div style="margin-top: 6px;">${escapeHtml(state.prepMemo.openingLine)}</div>
    `;
  } else {
    homePrepMemo.classList.add("muted");
    homePrepMemo.textContent = "まだ面談前メモはありません。";
  }

  if (latestReview) {
    homeLatestReview.classList.remove("muted");
    homeLatestReview.innerHTML = `
      <strong>気になった言葉</strong>
      <div style="margin-top: 8px;">${escapeHtml(latestReview.signal || "未入力")}</div>
      <div style="margin-top: 12px;"><strong>次回の宿題</strong></div>
      <div style="margin-top: 6px;">${escapeHtml(latestReview.nextAction || "未入力")}</div>
    `;
  } else {
    homeLatestReview.classList.add("muted");
    homeLatestReview.textContent = "まだ保存されたふり返りはありません。";
  }
}

function renderMetrics() {
  const completed = state.completedCourses.length;
  const practices = state.practiceLogs.length;
  const reviews = state.reviews.length;
  const aggregate = aggregateScores();
  const weakestKey = findWeakestKey(aggregate);
  const keyLabelMap = {
    empathy: "共感",
    listening: "受け止め",
    probing: "深掘り",
    safety: "安心感"
  };

  completedCount.innerHTML = `<strong>${completed}/10</strong>`;
  practiceCount.innerHTML = `<strong>${practices}回</strong>`;
  priorityChip.innerHTML = `<strong>${keyLabelMap[weakestKey]}</strong>`;
  homeCompletedStat.textContent = `${completed}/10`;
  homePracticeStat.textContent = `${practices}`;
  dashboardCompleted.textContent = `${completed}/10`;
  dashboardPractice.textContent = `${practices}`;
  dashboardWeakness.textContent = keyLabelMap[weakestKey];
  dashboardReviews.textContent = `${reviews}`;

  dashboardScores.innerHTML = createScoreItems(aggregate);
  dashboardActions.innerHTML = [
    recommendAction(weakestKey),
    completed < 10
      ? "未完了の講座を先に進め、見立ての土台を増やす"
      : "講座は一通り完了しているので、実務ケースを増やして定着させる",
    state.prepMemo
      ? "面談前AIコーチで整理した4点メモを、本番直前に見返す"
      : "次の1on1前に、面談前AIコーチで今回の軸を先に言葉にしておく",
    reviews < 3
      ? "本番後のふり返りを3件以上ためて、次回の宿題を回し始める"
      : "ふり返りメモをもとに、次回の面談前準備をより具体化する"
  ].map((action, index) => `
    <div class="timeline-item">
      <div class="bullet">${index + 1}</div>
      <div>${action}</div>
    </div>
  `).join("");
}

function aggregateScores() {
  if (!state.practiceLogs.length) {
    return { ...defaultScores };
  }
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

function findWeakestKey(scores) {
  return Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];
}

function recommendAction(key) {
  if (key === "probing") return "次の重点は深掘りです。『どんな時』『どこが一番』の質問を1つ足してください。";
  if (key === "safety") return "次の重点は安心感です。結論を急がず、『無理に話さなくて大丈夫』を先に置いてください。";
  if (key === "empathy") return "次の重点は共感です。事実確認の前に、相手の重さや不安を一度言葉にしてください。";
  return "次の重点は受け止めです。相手の言葉を短く要約し、『こういうことかな』と返す回数を増やしてください。";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

renderAll();
