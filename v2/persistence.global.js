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
