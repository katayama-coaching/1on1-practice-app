const legacyStorageKey = 'oneOnOneCoachingAppStateV2';
const scopedStoragePrefix = 'oneOnOneCoachingAppStateV3:';
const snapshotTable = 'app_state_snapshots';
const practiceLogTable = 'practice_logs';
const reviewTable = 'reviews';
const prepMemoTable = 'prep_memos';

const defaultState = {
  currentCourseId: 1,
  completedCourses: [],
  currentScenarioId: 'burnout',
  practiceLogs: [],
  reviews: [],
  prepMemo: null,
  previousPrepMemo: null,
  coachMessages: [],
  coachSummary: null,
  coachPhase: 0
};

let syncMode = 'local';
let remoteConfig = null;
let queuedState = null;
let flushTimer = null;
let isFlushing = false;
let remoteIdentity = null;

function isLocalPreview() {
  return window.location.protocol === 'file:';
}

function getActiveEmail() {
  return (localStorage.getItem('user_email') || 'anonymous').trim().toLowerCase();
}

function getScopedKey() {
  return scopedStoragePrefix + getActiveEmail();
}

function parseState(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getLocalState() {
  try {
    const scoped = parseState(localStorage.getItem(getScopedKey()));
    if (scoped) {
      return { ...defaultState, ...scoped };
    }

    const legacy = parseState(localStorage.getItem(legacyStorageKey));
    if (legacy) {
      const merged = { ...defaultState, ...legacy };
      localStorage.setItem(getScopedKey(), JSON.stringify(merged));
      return merged;
    }
  } catch (error) {
    console.warn('local state read failed, using default state.', error);
  }

  return { ...defaultState };
}

function persistLocalState(state) {
  const serialized = JSON.stringify(state);
  localStorage.setItem(getScopedKey(), serialized);
  localStorage.setItem(legacyStorageKey, serialized);
}

function normalizeAppConfig() {
  const config = window.__APP_CONFIG__ || {};
  const supabaseUrl = (config.supabaseUrl || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = (config.supabaseAnonKey || '').trim();
  const supabaseSchema = (config.supabaseSchema || 'public').trim();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey, supabaseSchema };
}

function createHeaders() {
  return {
    apikey: remoteConfig.supabaseAnonKey,
    Authorization: 'Bearer ' + remoteConfig.supabaseAnonKey,
    'Content-Type': 'application/json',
    'Accept-Profile': remoteConfig.supabaseSchema,
    'Content-Profile': remoteConfig.supabaseSchema
  };
}

function createRestUrl(path, query = '') {
  return remoteConfig.supabaseUrl + '/rest/v1/' + path + (query ? '?' + query : '');
}

function getCompanyDomain(email) {
  return email && email.includes('@') ? email.split('@')[1] : null;
}

function buildCompanyName(domain) {
  if (!domain) return 'Default Company';
  return domain;
}

async function fetchSingleRow(path, query) {
  const response = await fetch(createRestUrl(path, query), {
    method: 'GET',
    headers: createHeaders()
  });
  if (!response.ok) {
    throw new Error(path + ' fetch failed: ' + response.status);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function fetchRows(path, query) {
  const response = await fetch(createRestUrl(path, query), {
    method: 'GET',
    headers: createHeaders()
  });
  if (!response.ok) {
    throw new Error(path + ' fetch failed: ' + response.status);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function upsertRow(path, payload, onConflict) {
  const suffix = onConflict ? 'on_conflict=' + encodeURIComponent(onConflict) : '';
  const response = await fetch(createRestUrl(path, suffix), {
    method: 'POST',
    headers: {
      ...createHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(path + ' upsert failed: ' + response.status);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function ensureRemoteIdentity() {
  if (remoteIdentity) return remoteIdentity;

  const email = getActiveEmail();
  if (!email || email === 'anonymous' || !remoteConfig) return null;

  const companyDomain = getCompanyDomain(email);
  let company = null;

  if (companyDomain) {
    const companyParams = new URLSearchParams({
      select: 'id,name,domain',
      domain: 'eq.' + companyDomain,
      limit: '1'
    });
    company = await fetchSingleRow('companies', companyParams.toString());
  }

  if (!company) {
    company = await upsertRow('companies', {
      name: buildCompanyName(companyDomain),
      domain: companyDomain
    }, 'domain');
  }

  let user = null;
  const userParams = new URLSearchParams({
    select: 'id,email,company_id',
    email: 'eq.' + email,
    limit: '1'
  });
  user = await fetchSingleRow('users', userParams.toString());

  if (!user) {
    user = await upsertRow('users', {
      email,
      company_id: company && company.id,
      display_name: email.split('@')[0] || email,
      role: 'manager'
    }, 'email');
  }

  remoteIdentity = {
    companyId: company && company.id,
    userId: user && user.id,
    email
  };
  return remoteIdentity;
}

async function fetchRemoteSnapshot() {
  const email = getActiveEmail();
  if (!email || email === 'anonymous') return null;

  const params = new URLSearchParams({
    select: 'email,state,updated_at',
    email: 'eq.' + email,
    limit: '1'
  });

  const response = await fetch(createRestUrl(snapshotTable, params.toString()), {
    method: 'GET',
    headers: createHeaders()
  });

  if (!response.ok) {
    throw new Error('snapshot fetch failed: ' + response.status);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0];
}

async function upsertRemoteSnapshot(state) {
  const email = getActiveEmail();
  if (!email || email === 'anonymous') return;

  const payload = {
    email,
    company_domain: email.includes('@') ? email.split('@')[1] : null,
    state,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(createRestUrl(snapshotTable, 'on_conflict=email'), {
    method: 'POST',
    headers: {
      ...createHeaders(),
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('snapshot upsert failed: ' + response.status);
  }
}

async function syncLearningProgress(state) {
  const identity = await ensureRemoteIdentity();
  if (!identity || !identity.userId) return;

  const completedSet = new Set(Array.isArray(state.completedCourses) ? state.completedCourses : []);
  const touchedSessionIds = new Set(completedSet);
  if (state.currentCourseId) touchedSessionIds.add(state.currentCourseId);

  for (const sessionId of touchedSessionIds) {
    const numericSessionId = Number(sessionId);
    if (!Number.isFinite(numericSessionId)) continue;
    const isCompleted = completedSet.has(numericSessionId);
    await upsertRow('learning_progress', {
      user_id: identity.userId,
      session_id: numericSessionId,
      is_completed: isCompleted,
      last_viewed_at: new Date().toISOString(),
      completed_at: isCompleted ? new Date().toISOString() : null
    }, 'user_id,session_id');
  }
}

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ja-JP');
}

function mapPracticeLogRow(row) {
  return {
    scenarioId: row.scenario_id || 'unknown',
    createdAt: formatTimestamp(row.created_at),
    clientLogId: row.client_log_id || null,
    feedback: row.feedback || '',
    transcript: Array.isArray(row.transcript) ? row.transcript : [],
    scores: {
      empathy: normalizePracticeScore(row.empathy_score) || 0,
      listening: normalizePracticeScore(row.listening_score) || 0,
      probing: normalizePracticeScore(row.probing_score) || 0,
      safety: normalizePracticeScore(row.safety_score) || 0
    }
  };
}

function mapReviewRow(row) {
  return {
    signal: row.signal || '',
    reflection: row.reflection || '',
    nextAction: row.next_action || '',
    createdAt: formatTimestamp(row.created_at),
    clientReviewId: row.client_review_id || null
  };
}

function mapPrepMemoRow(row) {
  return {
    purpose: row.purpose || '',
    openingLine: row.opening_line || '',
    firstQuestion: row.first_question || '',
    holdBack: row.hold_back || '',
    focus: row.source_context || row.first_question || '',
    clientPrepId: row.client_prep_id || null,
    createdAt: formatTimestamp(row.created_at)
  };
}

async function fetchNormalizedState() {
  const identity = await ensureRemoteIdentity();
  if (!identity || !identity.userId) {
    return null;
  }

  const practiceParams = new URLSearchParams({
    select: 'client_log_id,scenario_id,transcript,feedback,empathy_score,listening_score,probing_score,safety_score,created_at',
    user_id: 'eq.' + identity.userId,
    order: 'created_at.desc',
    limit: '30'
  });
  const reviewParams = new URLSearchParams({
    select: 'client_review_id,signal,reflection,next_action,created_at',
    user_id: 'eq.' + identity.userId,
    order: 'created_at.desc',
    limit: '8'
  });
  const prepParams = new URLSearchParams({
    select: 'client_prep_id,purpose,opening_line,first_question,hold_back,source_context,created_at',
    user_id: 'eq.' + identity.userId,
    order: 'created_at.desc',
    limit: '1'
  });
  const progressParams = new URLSearchParams({
    select: 'session_id,is_completed,last_viewed_at,completed_at',
    user_id: 'eq.' + identity.userId,
    order: 'last_viewed_at.desc'
  });

  const [practiceRows, reviewRows, prepRows, progressRows] = await Promise.all([
    fetchRows(practiceLogTable, practiceParams.toString()),
    fetchRows(reviewTable, reviewParams.toString()),
    fetchRows(prepMemoTable, prepParams.toString()),
    fetchRows('learning_progress', progressParams.toString())
  ]);

  const completedCourses = progressRows
    .filter((row) => row.is_completed)
    .map((row) => Number(row.session_id))
    .filter((value) => Number.isFinite(value));

  const currentCourseId = progressRows.length
    ? Number(progressRows[0].session_id) || defaultState.currentCourseId
    : null;

  return {
    currentCourseId,
    completedCourses,
    practiceLogs: practiceRows.map(mapPracticeLogRow),
    reviews: reviewRows.map(mapReviewRow),
    prepMemo: prepRows.length ? mapPrepMemoRow(prepRows[0]) : null
  };
}

function mergeLoadedState(localState, remoteSnapshotState, normalizedState) {
  const merged = {
    ...defaultState,
    ...localState,
    ...(remoteSnapshotState || {})
  };

  if (!normalizedState) {
    return merged;
  }

  if (Array.isArray(normalizedState.completedCourses) && normalizedState.completedCourses.length) {
    merged.completedCourses = normalizedState.completedCourses;
  }
  if (Number.isFinite(normalizedState.currentCourseId)) {
    merged.currentCourseId = normalizedState.currentCourseId;
  }
  if (Array.isArray(normalizedState.practiceLogs) && normalizedState.practiceLogs.length) {
    merged.practiceLogs = normalizedState.practiceLogs;
  }
  if (Array.isArray(normalizedState.reviews) && normalizedState.reviews.length) {
    merged.reviews = normalizedState.reviews;
  }
  if (normalizedState.prepMemo) {
    merged.prepMemo = normalizedState.prepMemo;
    merged.coachSummary = {
      purpose: normalizedState.prepMemo.purpose || '',
      focus: normalizedState.prepMemo.focus || '',
      openingLine: normalizedState.prepMemo.openingLine || '',
      firstQuestion: normalizedState.prepMemo.firstQuestion || '',
      holdBack: normalizedState.prepMemo.holdBack || ''
    };
    merged.coachMessages = [];
    merged.coachPhase = 3;
  }

  if (merged.prepMemo) {
    merged.coachMessages = [];
    merged.coachPhase = 3;
    merged.coachSummary = {
      purpose: merged.prepMemo.purpose || '',
      focus: merged.prepMemo.focus || '',
      openingLine: merged.prepMemo.openingLine || '',
      firstQuestion: merged.prepMemo.firstQuestion || '',
      holdBack: merged.prepMemo.holdBack || ''
    };
  }

  return merged;
}

function normalizePracticeScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

async function upsertPracticeLog(log) {
  const identity = await ensureRemoteIdentity();
  if (!identity || !identity.userId || !log || !log.clientLogId) return;

  await upsertRow(practiceLogTable, {
    client_log_id: log.clientLogId,
    user_id: identity.userId,
    scenario_id: log.scenarioId || 'unknown',
    transcript: Array.isArray(log.transcript) ? log.transcript : [],
    feedback: log.feedback || null,
    empathy_score: normalizePracticeScore(log.scores && log.scores.empathy),
    listening_score: normalizePracticeScore(log.scores && log.scores.listening),
    probing_score: normalizePracticeScore(log.scores && log.scores.probing),
    safety_score: normalizePracticeScore(log.scores && log.scores.safety),
    created_at: log.createdAtIso || new Date().toISOString()
  }, 'client_log_id');
}

async function upsertReview(review) {
  const identity = await ensureRemoteIdentity();
  if (!identity || !identity.userId || !review || !review.clientReviewId) return;

  await upsertRow(reviewTable, {
    client_review_id: review.clientReviewId,
    user_id: identity.userId,
    signal: review.signal || null,
    reflection: review.reflection || null,
    next_action: review.nextAction || null,
    created_at: review.createdAtIso || new Date().toISOString()
  }, 'client_review_id');
}

async function upsertPrepMemo(prepMemo) {
  const identity = await ensureRemoteIdentity();
  if (!identity || !identity.userId || !prepMemo || !prepMemo.clientPrepId) return;

  await upsertRow(prepMemoTable, {
    client_prep_id: prepMemo.clientPrepId,
    user_id: identity.userId,
    purpose: prepMemo.purpose || '',
    opening_line: prepMemo.openingLine || '',
    first_question: prepMemo.firstQuestion || '',
    hold_back: prepMemo.holdBack || '',
    source_context: prepMemo.sourceContext || null,
    created_at: prepMemo.createdAtIso || new Date().toISOString()
  }, 'client_prep_id');
}

function scheduleFlush() {
  if (!remoteConfig) return;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushRemoteQueue();
  }, 700);
}

async function flushRemoteQueue() {
  if (!remoteConfig || isFlushing || !queuedState) return;
  isFlushing = true;

  while (queuedState) {
    const nextState = queuedState;
    queuedState = null;
    try {
      await ensureRemoteIdentity();
      await syncLearningProgress(nextState);
      await upsertRemoteSnapshot(nextState);
      syncMode = 'supabase';
    } catch (error) {
      console.warn('Supabase sync failed, keeping local cache.', error);
      queuedState = nextState;
      syncMode = 'local';
      break;
    }
  }

  isFlushing = false;
}

async function initializePersistence() {
  if (isLocalPreview()) {
    remoteConfig = null;
    syncMode = 'local';
    return;
  }
  remoteConfig = normalizeAppConfig();
  syncMode = remoteConfig ? 'supabase' : 'local';
}

async function loadAppState() {
  const localState = getLocalState();
  if (!remoteConfig) return localState;

  const timeoutMs = 5000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Supabase load timeout')), timeoutMs)
  );

  try {
    const result = await Promise.race([
      (async () => {
        await ensureRemoteIdentity();
        const [remoteSnapshot, normalizedState] = await Promise.all([
          fetchRemoteSnapshot(),
          fetchNormalizedState()
        ]);
        const merged = mergeLoadedState(localState, remoteSnapshot && remoteSnapshot.state, normalizedState);
        persistLocalState(merged);
        await syncLearningProgress(merged);
        await upsertRemoteSnapshot(merged);
        syncMode = 'supabase';
        return merged;
      })(),
      timeoutPromise
    ]);
    return result;
  } catch (error) {
    console.warn('Falling back to local-only persistence.', error);
    syncMode = 'local';
    return localState;
  }
}

function saveAppState(state) {
  persistLocalState(state);
  if (!remoteConfig) return;
  queuedState = JSON.parse(JSON.stringify(state));
  scheduleFlush();
}

function appendPracticeLog(log) {
  if (!remoteConfig) return;
  void upsertPracticeLog(log).catch((error) => {
    console.warn('practice log sync failed, keeping snapshot only.', error);
  });
}

function appendReview(review) {
  if (!remoteConfig) return;
  void upsertReview(review).catch((error) => {
    console.warn('review sync failed, keeping snapshot only.', error);
  });
}

function appendPrepMemo(prepMemo) {
  if (!remoteConfig) return;
  void upsertPrepMemo(prepMemo).catch((error) => {
    console.warn('prep memo sync failed, keeping snapshot only.', error);
  });
}

function getPersistenceLabel() {
  return syncMode === 'supabase'
    ? 'Supabaseクラウド保存'
    : 'メールアドレスごとのブラウザ保存';
}

function createDefaultState() {
  return { ...defaultState };
}

window.__PERSISTENCE__ = {
  initializePersistence,
  loadAppState,
  saveAppState,
  appendPracticeLog,
  appendReview,
  appendPrepMemo,
  getPersistenceLabel,
  createDefaultState
};
