const SUPABASE_CONFIG = {
  // Вставьте значения из Supabase Project Settings -> API.
  url: "https://ffusacesuumigyeoshkl.supabase.co",
  apiKey: "sb_publishable_n8uU9W5EP3CqMSBoeiXO6g_3DuxrpcN",
  table: "finance_user_state"
};

const LEGACY_STATE_CONFIG = {
  table: "finance_app_state",
  id: "personal-finance"
};

const SESSION_STORAGE_KEY = "money-system.supabase-session";
const REQUIRED_INCOME_VISIBILITY_KEY = "money-system.required-income-hidden";
const FUND_CATEGORIES = [
  "Кредиты",
  "Обязательные платежи",
  "Жизнь и быт",
  "Комфорт",
  "Резерв",
  "Бизнес",
  "Хотелки",
  "Другое"
];
const REQUIRED_INCOME_BUCKETS = [
  { key: "obligations", label: "Обязательные платежи", categories: ["Кредиты", "Обязательные платежи"] },
  { key: "life", label: "Расходы на жизнь", categories: ["Жизнь и быт"] },
  { key: "comfort", label: "Комфорт", categories: ["Комфорт"] },
  { key: "reserve", label: "Резервы", categories: ["Резерв"] },
  { key: "goals", label: "Цели", categories: ["Бизнес", "Хотелки", "Другое"] }
];

const defaultFunds = [
  {
    id: createId(),
    name: "Обязательные платежи",
    icon: "▣",
    color: "#3b82f6",
    balance: 0,
    monthBalance: 0,
    monthTarget: 30000,
    target: 0,
    percent: 30,
    priority: 1,
    category: "Обязательные платежи",
    description: "Регулярные платежи, долги и важные обязательства."
  },
  {
    id: createId(),
    name: "Резерв",
    icon: "◈",
    color: "#14b8a6",
    balance: 0,
    monthBalance: 0,
    monthTarget: 20000,
    target: 150000,
    percent: 20,
    priority: 2,
    category: "Резерв",
    description: "Подушка безопасности и деньги на непредвиденное."
  },
  {
    id: createId(),
    name: "Крупные цели",
    icon: "◇",
    color: "#f59e0b",
    balance: 0,
    monthBalance: 0,
    monthTarget: 25000,
    target: 250000,
    percent: 25,
    priority: 3,
    category: "Хотелки",
    description: "Накопления на покупки, ремонт, поездки или проекты."
  },
  {
    id: createId(),
    name: "Развитие",
    icon: "△",
    color: "#22c55e",
    balance: 0,
    monthBalance: 0,
    monthTarget: 15000,
    target: 0,
    percent: 15,
    priority: 4,
    category: "Бизнес",
    description: "Обучение, инструменты, бизнес и рост дохода."
  },
  {
    id: createId(),
    name: "Личное",
    icon: "○",
    color: "#ec4899",
    balance: 0,
    monthBalance: 0,
    monthTarget: 10000,
    target: 0,
    percent: 10,
    priority: 5,
    category: "Комфорт",
    description: "Повседневные желания и небольшие радости."
  }
];

let state = createDefaultState();
let demoFunds = defaultFunds.map((fund) => ({ ...fund }));
let storageStatus = "Подключение к Supabase еще не настроено.";
let isStorageReady = false;
let isBooted = false;
let saveTimer;
let session = null;
let pendingResetAction = null;
let briefingStep = 0;
let hasAutoOfferedBriefing = false;
let lastOverflow = null;
let isRequiredIncomeHidden = readBooleanPreference(REQUIRED_INCOME_VISIBILITY_KEY);
const collapsedCategories = new Set();
const isPrivateAppPage = window.location.pathname.endsWith("app.html");

const els = {
  authModal: document.querySelector("#authModal"),
  publicShell: document.querySelector("#publicShell"),
  authOpenBtn: document.querySelector("#authOpenBtn"),
  authTriggerButtons: document.querySelectorAll("[data-auth-trigger]"),
  demoForm: document.querySelector("#demoForm"),
  demoAmount: document.querySelector("#demoAmount"),
  demoResult: document.querySelector("#demoResult"),
  authCloseBtn: document.querySelector("#authCloseBtn"),
  appShell: document.querySelector("#appShell"),
  appLoading: document.querySelector("#appLoading"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authMessage: document.querySelector("#authMessage"),
  loginBtn: document.querySelector("#loginBtn"),
  signupBtn: document.querySelector("#signupBtn"),
  userAccountBtn: document.querySelector("#userAccountBtn"),
  userLogin: document.querySelector("#userLogin"),
  logoutBtn: document.querySelector("#logoutBtn"),
  navButtons: document.querySelectorAll(".nav-btn"),
  screenTitle: document.querySelector("#screenTitle"),
  screens: {
    account: document.querySelector("#accountScreen"),
    dashboard: document.querySelector("#dashboardScreen"),
    history: document.querySelector("#historyScreen")
  },
  profileSetupPanel: document.querySelector("#profileSetupPanel"),
  profileSetupLogin: document.querySelector("#profileSetupLogin"),
  accountLogin: document.querySelector("#accountLogin"),
  accountEmail: document.querySelector("#accountEmail"),
  accountForm: document.querySelector("#accountForm"),
  accountLoginInput: document.querySelector("#accountLoginInput"),
  incomeForm: document.querySelector("#incomeForm"),
  incomeAmount: document.querySelector("#incomeAmount"),
  incomeComment: document.querySelector("#incomeComment"),
  distributeBtn: document.querySelector("#distributeBtn"),
  percentWarning: document.querySelector("#percentWarning"),
  fundGrid: document.querySelector("#fundGrid"),
  monthSummaryCard: document.querySelector("#monthSummaryCard"),
  showRequiredIncomeBtn: document.querySelector("#showRequiredIncomeBtn"),
  requiredIncomePanel: document.querySelector("#requiredIncomePanel"),
  overflowPanel: document.querySelector("#overflowPanel"),
  fundCount: document.querySelector("#fundCount"),
  donutChart: document.querySelector("#donutChart"),
  donutTotal: document.querySelector("#donutTotal"),
  distributionLabel: document.querySelector("#distributionLabel"),
  distributionLegend: document.querySelector("#distributionLegend"),
  addFundBtn: document.querySelector("#addFundBtn"),
  addMonthBtn: document.querySelector("#addMonthBtn"),
  briefingModal: document.querySelector("#briefingModal"),
  briefingForm: document.querySelector("#briefingForm"),
  briefingStepTitle: document.querySelector("#briefingStepTitle"),
  briefingStepLabel: document.querySelector("#briefingStepLabel"),
  briefingStepHint: document.querySelector("#briefingStepHint"),
  briefingMeter: document.querySelector("#briefingMeter"),
  briefingSteps: document.querySelectorAll(".briefing-step"),
  briefingBackBtn: document.querySelector("#briefingBackBtn"),
  briefingNextBtn: document.querySelector("#briefingNextBtn"),
  briefingApplyBtn: document.querySelector("#briefingApplyBtn"),
  briefingPreview: document.querySelector("#briefingPreview"),
  briefMonthlyIncome: document.querySelector("#briefMonthlyIncome"),
  briefIncomeType: document.querySelector("#briefIncomeType"),
  briefIncomeFrequency: document.querySelector("#briefIncomeFrequency"),
  requiredPaymentList: document.querySelector("#requiredPaymentList"),
  addRequiredPaymentBtn: document.querySelector("#addRequiredPaymentBtn"),
  debtList: document.querySelector("#debtList"),
  addDebtBtn: document.querySelector("#addDebtBtn"),
  comfortList: document.querySelector("#comfortList"),
  addComfortBtn: document.querySelector("#addComfortBtn"),
  goalList: document.querySelector("#goalList"),
  addGoalBtn: document.querySelector("#addGoalBtn"),
  briefCurrentReserve: document.querySelector("#briefCurrentReserve"),
  briefReserveGoal: document.querySelector("#briefReserveGoal"),
  briefHasBusiness: document.querySelector("#briefHasBusiness"),
  briefBusinessNeedsInvestment: document.querySelector("#briefBusinessNeedsInvestment"),
  fundModal: document.querySelector("#fundModal"),
  fundForm: document.querySelector("#fundForm"),
  fundModalTitle: document.querySelector("#fundModalTitle"),
  fundId: document.querySelector("#fundId"),
  fundName: document.querySelector("#fundName"),
  fundIcon: document.querySelector("#fundIcon"),
  fundColor: document.querySelector("#fundColor"),
  fundBalance: document.querySelector("#fundBalance"),
  fundTarget: document.querySelector("#fundTarget"),
  fundMonthTarget: document.querySelector("#fundMonthTarget"),
  fundPercent: document.querySelector("#fundPercent"),
  fundPriority: document.querySelector("#fundPriority"),
  fundCategory: document.querySelector("#fundCategory"),
  fundDescription: document.querySelector("#fundDescription"),
  historyList: document.querySelector("#historyList"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  resetMenuBtn: document.querySelector("#resetMenuBtn"),
  resetConfirmWrap: document.querySelector("#resetConfirmWrap"),
  resetMenu: document.querySelector("#resetMenu"),
  resetMonthOption: document.querySelector("#resetMonthOption"),
  resetAllOption: document.querySelector("#resetAllOption"),
  resetConfirm: document.querySelector("#resetConfirm"),
  resetConfirmTitle: document.querySelector("#resetConfirmTitle"),
  resetConfirmText: document.querySelector("#resetConfirmText"),
  cancelResetBtn: document.querySelector("#cancelResetBtn"),
  confirmResetBtn: document.querySelector("#confirmResetBtn"),
  resetEverythingBtn: document.querySelector("#resetEverythingBtn"),
  currentMonthLabel: document.querySelector("#currentMonthLabel"),
  monthList: document.querySelector("#monthList"),
  fundDetailModal: document.querySelector("#fundDetailModal"),
  fundDetailContent: document.querySelector("#fundDetailContent"),
  toast: document.querySelector("#toast")
};

function createDefaultState() {
  return {
    funds: defaultFunds.map((fund) => ({ ...fund })),
    history: [],
    months: [],
    briefing: null,
    profile: {
      login: defaultUserLogin()
    },
    currentMonthKey: monthKeyFromDate(new Date()),
    createdAt: new Date().toISOString()
  };
}

async function loadState(options = {}) {
  if (!isSupabaseConfigured()) {
    storageStatus = "Supabase не настроен. Укажите url и apiKey в app.js.";
    isStorageReady = false;
    return createDefaultState();
  }

  try {
    if (!options.skipRefresh) {
      await refreshSessionIfNeeded();
    }
    const userId = session.user.id;
    const rows = await supabaseRequest("GET", `/${SUPABASE_CONFIG.table}?user_id=eq.${encodeURIComponent(userId)}&select=data&limit=1`);

    if (!rows.length) {
      const legacyState = await loadLegacyState();
      const initialState = legacyState || createDefaultState();
      await persistState(initialState);
      storageStatus = legacyState
        ? "Supabase подключен. Старые данные перенесены в ваш аккаунт."
        : "Supabase подключен. Создана первая запись состояния.";
      isStorageReady = true;
      return initialState;
    }

    const savedState = normalizeState(rows[0].data);
    if (isOldExampleState(savedState)) {
      const legacyState = await loadLegacyState();
      const replacementState = legacyState || createDefaultState();
      await persistState(replacementState);
      storageStatus = legacyState
        ? "Supabase подключен. Старые данные перенесены в ваш аккаунт."
        : "Supabase подключен. Примеры фондов обновлены.";
      isStorageReady = true;
      return replacementState;
    }

    storageStatus = "Supabase подключен. Данные загружены из базы.";
    isStorageReady = true;
    return savedState;
  } catch (error) {
    storageStatus = `Ошибка Supabase: ${error.message}`;
    isStorageReady = false;
    showToast(storageStatus);
    return createDefaultState();
  }
}

async function loadLegacyState() {
  try {
    const path = `/${LEGACY_STATE_CONFIG.table}?id=eq.${encodeURIComponent(LEGACY_STATE_CONFIG.id)}&select=data&limit=1`;
    const rows = await supabaseAnonRequest("GET", path);
    if (!Array.isArray(rows) || !rows.length) {
      return null;
    }

    const legacyState = normalizeState(rows[0].data);
    return isOldExampleState(legacyState) ? null : legacyState;
  } catch {
    return null;
  }
}

function isOldExampleState(value) {
  const oldExampleNames = new Set([
    "Кредит за первоначальный взнос",
    "Кредит",
    "Кредитка №1",
    "Кредитка №2",
    "Долг другу",
    "Бизнес",
    "3D-принтер",
    "Ремонт квартиры",
    "Резервный фонд",
    "Комфорт",
    "Газировки и напитки"
  ]);
  const funds = Array.isArray(value?.funds) ? value.funds : [];
  const history = Array.isArray(value?.history) ? value.history : [];

  return funds.length === oldExampleNames.size
    && history.length === 0
    && funds.every((fund) => oldExampleNames.has(fund.name));
}

function normalizeState(value) {
  const nextState = {
    funds: Array.isArray(value?.funds) ? value.funds.map(normalizeFund) : defaultFunds.map((fund) => ({ ...fund })),
    history: Array.isArray(value?.history) ? value.history : [],
    months: Array.isArray(value?.months) ? value.months.map(normalizeMonth).filter(Boolean) : [],
    briefing: value?.briefing || null,
    profile: normalizeProfile(value?.profile),
    currentMonthKey: value?.currentMonthKey || monthKeyFromDate(new Date()),
    createdAt: value?.createdAt || new Date().toISOString()
  };

  return ensureCurrentCalendarMonth(nextState);
}

function normalizeProfile(profile) {
  const profileLogin = normalizeLogin(profile?.login);
  const explicitLogin = profileLogin && profileLogin !== "Пользователь"
    ? profileLogin
    : normalizeLogin(session?.user?.user_metadata?.login);
  return {
    login: explicitLogin || defaultUserLogin(),
    needsLoginSetup: !explicitLogin
  };
}

function defaultUserLogin() {
  return normalizeLogin(session?.user?.user_metadata?.login)
    || normalizeLogin(session?.user?.email?.split("@")[0])
    || "Пользователь";
}

function normalizeLogin(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}._-]/gu, "")
    .slice(0, 24);
}

function currentUserLogin() {
  return normalizeLogin(state.profile?.login) || defaultUserLogin();
}

function normalizeMonth(month) {
  if (!month?.key) {
    return null;
  }

  return {
    key: month.key,
    label: month.label || monthLabel(month.key),
    total: Number(month.total) || 0,
    target: Number(month.target) || 0,
    progress: Number(month.progress) || 0,
    funds: Array.isArray(month.funds) ? month.funds : [],
    closedAt: month.closedAt || null
  };
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFund(fund) {
  return {
    id: fund.id || createId(),
    name: fund.name || "Новый фонд",
    icon: fund.icon || "◌",
    color: fund.color || "#52d6ff",
    balance: Number(fund.balance) || 0,
    monthBalance: Number(fund.monthBalance) || 0,
    monthTarget: Number(fund.monthTarget) || suggestMonthTarget(fund),
    target: Number(fund.target) || 0,
    percent: Number(fund.percent) || 0,
    priority: Number(fund.priority) || 1,
    category: normalizeCategory(fund.category || inferFundCategory(fund)),
    description: fund.description || "",
    type: fund.type || "custom",
    isFrozen: Boolean(fund.isFrozen)
  };
}

function normalizeCategory(value) {
  return FUND_CATEGORIES.includes(value) ? value : "Другое";
}

function inferFundCategory(fund = {}) {
  const type = String(fund.type || "");
  const name = String(fund.name || "").toLowerCase();
  if (type.includes("debt") || name.includes("кредит") || name.includes("долг")) {
    return "Кредиты";
  }
  if (type === "required_payment" || name.includes("обяз")) {
    return "Обязательные платежи";
  }
  if (type === "life" || name.includes("еда") || name.includes("быт") || name.includes("транспорт")) {
    return "Жизнь и быт";
  }
  if (type === "comfort" || name.includes("комфорт") || name.includes("личное")) {
    return "Комфорт";
  }
  if (type === "reserve" || name.includes("резерв")) {
    return "Резерв";
  }
  if (type.includes("business") || name.includes("бизнес") || name.includes("развит")) {
    return "Бизнес";
  }
  if (type.includes("goal") || name.includes("цель")) {
    return "Хотелки";
  }

  return "Другое";
}

function suggestMonthTarget(fund) {
  const target = Number(fund?.target) || 0;
  const percent = Number(fund?.percent) || 0;
  if (target > 0) {
    return Math.max(1000, roundMoney(target * 0.08));
  }

  return Math.max(1000, roundMoney(percent * 1000));
}

function monthKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabel(key) {
  const [year, month] = String(key).split("-").map(Number);
  if (!year || !month) {
    return "Месяц";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

function nextMonthKey(key) {
  const [year, month] = String(key).split("-").map(Number);
  const date = new Date(year || new Date().getFullYear(), month || new Date().getMonth(), 1);
  return monthKeyFromDate(date);
}

function ensureCurrentCalendarMonth(nextState) {
  const calendarKey = monthKeyFromDate(new Date());
  if (!nextState.currentMonthKey) {
    nextState.currentMonthKey = calendarKey;
  }

  if (nextState.currentMonthKey !== calendarKey && monthKeyIsBefore(nextState.currentMonthKey, calendarKey)) {
    archiveMonth(nextState, "auto");
    nextState.currentMonthKey = calendarKey;
    nextState.funds = nextState.funds.map((fund) => ({ ...fund, monthBalance: 0 }));
  }

  return nextState;
}

function monthKeyIsBefore(left, right) {
  return String(left).localeCompare(String(right)) < 0;
}

function monthSnapshot(nextState, key = nextState.currentMonthKey) {
  const funds = nextState.funds.map((fund) => ({
    fundId: fund.id,
    fundName: fund.name,
    amount: roundMoney(fund.monthBalance || 0),
    target: roundMoney(fund.monthTarget || 0),
    percent: roundMoney(fund.percent || 0)
  }));
  const total = roundMoney(funds.reduce((sum, fund) => sum + fund.amount, 0));
  const target = roundMoney(funds.reduce((sum, fund) => sum + fund.target, 0));

  return {
    key,
    label: monthLabel(key),
    total,
    target,
    progress: target ? Math.min(100, Math.round(total / target * 100)) : 0,
    funds,
    closedAt: new Date().toISOString()
  };
}

function archiveMonth(nextState, reason = "manual") {
  const snapshot = monthSnapshot(nextState);
  const index = nextState.months.findIndex((month) => month.key === snapshot.key);
  if (index >= 0) {
    nextState.months[index] = snapshot;
  } else {
    nextState.months.push(snapshot);
  }

  nextState.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: reason === "auto" ? "Новый месяц" : "Сброс месяца",
    amount: snapshot.total,
    periodKey: snapshot.key,
    comment: reason === "auto"
      ? `Автоматически закрыт месяц ${snapshot.label}`
      : `Закрыт месяц ${snapshot.label}`
  });

  return snapshot;
}

function currentMonthSnapshot() {
  return {
    ...monthSnapshot(state),
    closedAt: null
  };
}

function saveState() {
  if (!isBooted || !isStorageReady) {
    return;
  }

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await persistState(state);
      isStorageReady = true;
      storageStatus = "Данные сохранены в Supabase.";
    } catch (error) {
      storageStatus = `Не удалось сохранить в Supabase: ${error.message}`;
      showToast(storageStatus);
    }
  }, 250);
}

async function persistState(nextState) {
  await refreshSessionIfNeeded();
  await supabaseRequest("POST", `/${SUPABASE_CONFIG.table}`, {
    user_id: session.user.id,
    data: nextState,
    updated_at: new Date().toISOString()
  }, "resolution=merge-duplicates,return=minimal");
}

async function supabaseRequest(method, path, body, prefer = "return=representation") {
  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_CONFIG.apiKey,
      Authorization: `Bearer ${session?.access_token || SUPABASE_CONFIG.apiKey}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function supabaseAnonRequest(method, path, body, prefer = "return=representation") {
  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_CONFIG.apiKey,
      Authorization: `Bearer ${SUPABASE_CONFIG.apiKey}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function authRequest(path, body, token = null) {
  const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_CONFIG.apiKey,
      Authorization: `Bearer ${token || SUPABASE_CONFIG.apiKey}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.msg || data?.error_description || data?.message || `HTTP ${response.status}`);
  }

  return data;
}

function normalizeSession(value) {
  if (!value?.access_token || !value?.refresh_token || !value?.user?.id) {
    return null;
  }

  return {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_at: value.expires_at || Math.floor(Date.now() / 1000) + (value.expires_in || 3600),
    user: value.user
  };
}

function saveSession(nextSession) {
  session = normalizeSession(nextSession);
  if (session) {
    writeStoredSession(session);
  }
}

function clearSession() {
  session = null;
  removeStoredSession();
}

function loadStoredSession() {
  try {
    return normalizeSession(JSON.parse(globalThis.localStorage?.getItem(SESSION_STORAGE_KEY) || "null"));
  } catch {
    return null;
  }
}

function readBooleanPreference(key) {
  try {
    return globalThis.localStorage?.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeBooleanPreference(key, value) {
  try {
    globalThis.localStorage?.setItem(key, String(Boolean(value)));
  } catch {
    // The UI still works for the current tab if preferences cannot be persisted.
  }
}

function writeStoredSession(nextSession) {
  try {
    globalThis.localStorage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  } catch {
    // Auth still works for the current tab if persistent storage is unavailable.
  }
}

function removeStoredSession() {
  try {
    globalThis.localStorage?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing else to clear if the browser storage is unavailable.
  }
}

async function refreshSessionIfNeeded() {
  if (!session) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - now > 60) {
    return;
  }

  try {
    const refreshed = await authRequest("/token?grant_type=refresh_token", {
      refresh_token: session.refresh_token
    });
    saveSession(refreshed);
  } catch (error) {
    clearSession();
    throw error;
  }
}

async function signIn(email, password) {
  const nextSession = await authRequest("/token?grant_type=password", { email, password });
  saveSession(nextSession);
  await bootAuthenticatedApp({ skipRefresh: true });
  showToast("Вы вошли в систему.");
}

async function signUp(email, password) {
  const result = await authRequest("/signup", {
    email,
    password
  });
  if (result?.access_token) {
    saveSession(result);
    await bootAuthenticatedApp({ skipRefresh: true });
    showToast("Аккаунт создан.");
    return;
  }

  els.authMessage.textContent = "Аккаунт создан. Проверьте почту и подтвердите регистрацию, затем войдите.";
}

function updateProfileLogin(login, options = {}) {
  const safeLogin = normalizeLogin(login);
  if (!safeLogin) {
    showToast("Введите логин.");
    return false;
  }

  state.profile = {
    ...(state.profile || {}),
    login: safeLogin,
    needsLoginSetup: false
  };
  saveState();
  renderAuthState();
  renderAccount();
  if (!options.silent) {
    showToast("Логин сохранен.");
  }
  return true;
}

function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url.startsWith("https://") && SUPABASE_CONFIG.apiKey.length > 20;
}

function sortedFunds() {
  return [...state.funds].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "ru"));
}

function activeFunds() {
  return state.funds.filter((fund) => !fund.isFrozen);
}

function totalPercent() {
  return roundMoney(activeFunds().reduce((sum, fund) => sum + Number(fund.percent || 0), 0));
}

function isDistributionValid() {
  return Math.abs(totalPercent() - 100) < 0.001;
}

function money(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function dateTime(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function roundMoney(value) {
  const number = parseDecimal(value);
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function parseDecimal(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value ?? "").trim().replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function progressOf(fund) {
  if (!fund.target) {
    return 0;
  }
  return Math.min(100, Math.round((fund.balance / fund.target) * 100));
}

function monthProgressOf(fund) {
  if (!fund.monthTarget) {
    return 0;
  }
  return Math.min(100, Math.round(((fund.monthBalance || 0) / fund.monthTarget) * 100));
}

function remainingOf(fund) {
  return Math.max(0, fund.target - fund.balance);
}

function monthRemainingOf(fund) {
  return Math.max(0, (fund.monthTarget || 0) - (fund.monthBalance || 0));
}

function forecastFor(fund) {
  const monthly = Number(fund.monthBalance || 0);
  const remaining = remainingOf(fund);

  if (remaining <= 0) {
    return "цель достигнута";
  }

  if (monthly <= 0) {
    return "нужны новые поступления";
  }

  const months = Math.ceil(remaining / monthly);
  if (months === 1) {
    return "примерно за 1 месяц";
  }

  if (months < 5) {
    return `примерно за ${months} месяца`;
  }

  return `примерно за ${months} месяцев`;
}

function render() {
  const percent = totalPercent();
  const valid = isDistributionValid();

  els.distributeBtn.disabled = !valid || !isStorageReady;
  els.percentWarning.textContent = getWarningText(percent, valid);
  els.currentMonthLabel.textContent = monthLabel(state.currentMonthKey);

  renderAccount();
  renderMonthSummary();
  renderRequiredIncome();
  renderOverflow();
  renderFunds();
  renderDistribution();
  renderMonthList();
  renderHistory();
  saveState();
  maybeOfferBriefing();
}

function renderAccount() {
  const login = currentUserLogin();
  els.userLogin.textContent = login;
  els.accountLogin.textContent = login;
  els.accountEmail.textContent = session?.user?.email || "-";
  els.accountLoginInput.value = login;
  els.profileSetupPanel?.classList.toggle("is-hidden", !state.profile?.needsLoginSetup);
  if (els.profileSetupLogin && !els.profileSetupLogin.value) {
    els.profileSetupLogin.value = login;
  }
}

function renderMonthSummary() {
  if (!els.monthSummaryCard) {
    return;
  }

  const active = activeFunds();
  const monthTarget = active.reduce((sum, fund) => sum + Number(fund.monthTarget || 0), 0);
  const monthBalance = active.reduce((sum, fund) => sum + Number(fund.monthBalance || 0), 0);
  const remaining = Math.max(0, roundMoney(monthTarget - monthBalance));
  const progress = monthTarget ? Math.min(100, Math.round(monthBalance / monthTarget * 100)) : 0;
  els.monthSummaryCard.innerHTML = `
    <div>
      <span>Внесено за месяц</span>
      <strong>${money(monthBalance)}</strong>
    </div>
    <div>
      <span>До целей месяца</span>
      <strong>${money(remaining)}</strong>
    </div>
    <div>
      <span>Прогресс</span>
      <strong>${progress}%</strong>
    </div>
  `;
}

function requiredIncomeSummary(includeFrozen = false) {
  const funds = state.funds.filter((fund) => includeFrozen || !fund.isFrozen);
  const buckets = REQUIRED_INCOME_BUCKETS.map((bucket) => {
    const amount = funds
      .filter((fund) => bucket.categories.includes(normalizeCategory(fund.category)))
      .reduce((sum, fund) => sum + Number(fund.monthTarget || 0), 0);
    return { ...bucket, amount: roundMoney(amount) };
  });
  const total = roundMoney(buckets.reduce((sum, bucket) => sum + bucket.amount, 0));
  return { buckets, total };
}

function renderRequiredIncome() {
  els.requiredIncomePanel.classList.toggle("is-hidden", isRequiredIncomeHidden);
  els.showRequiredIncomeBtn.classList.toggle("is-hidden", !isRequiredIncomeHidden);
  if (isRequiredIncomeHidden) {
    els.requiredIncomePanel.innerHTML = "";
    return;
  }

  const active = requiredIncomeSummary(false);
  const withFrozen = requiredIncomeSummary(true);
  const hasFrozen = state.funds.some((fund) => fund.isFrozen);
  els.requiredIncomePanel.innerHTML = `
    <div class="required-income-head">
      <div>
        <span>Сколько нужно заработать в месяц</span>
        <strong>Чтобы закрыть все потребности месяца, нужно заработать: ${money(active.total)}.</strong>
      </div>
      <button class="icon-btn" type="button" data-hide-required-income aria-label="Скрыть расчет дохода">×</button>
      ${hasFrozen ? `
        <div class="required-income-compare">
          <span>Без фондов на паузе: ${money(active.total)}</span>
          <span>С учетом фондов на паузе: ${money(withFrozen.total)}</span>
        </div>
      ` : ""}
    </div>
    <div class="required-income-grid">
      ${active.buckets.map((bucket) => `
        <div>
          <span>${escapeHtml(bucket.label)}</span>
          <strong>${money(bucket.amount)}</strong>
        </div>
      `).join("")}
      <div class="is-total">
        <span>Общий нужный доход</span>
        <strong>${money(active.total)}</strong>
      </div>
    </div>
  `;
}

function renderOverflow() {
  if (!lastOverflow?.amount) {
    els.overflowPanel.classList.add("is-hidden");
    els.overflowPanel.innerHTML = "";
    return;
  }

  els.overflowPanel.classList.remove("is-hidden");
  els.overflowPanel.innerHTML = `
    <div>
      <span>Сверх плана месяца</span>
      <strong>${money(lastOverflow.amount)}</strong>
      <p>${escapeHtml(lastOverflow.plan)}</p>
    </div>
  `;
}

function renderAuthState() {
  const isSignedIn = Boolean(session?.user?.id);
  els.appLoading?.classList.toggle("is-hidden", isSignedIn);
  els.publicShell?.classList.toggle("is-hidden", isSignedIn);
  els.appShell?.classList.toggle("is-hidden", !isSignedIn);
  els.authOpenBtn?.classList.toggle("is-hidden", isSignedIn);
  els.userAccountBtn?.classList.toggle("is-hidden", !isSignedIn);
  if (els.userLogin) {
    els.userLogin.textContent = currentUserLogin();
  }

  if (isSignedIn && els.authModal?.open) {
    els.authModal.close();
  }
}

function redirectToLogin() {
  window.location.href = "index.html#login";
}

function withTimeout(promise, ms, label = "Операция") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} выполняется слишком долго.`)), ms);
    })
  ]);
}

function currentRoute() {
  return window.location.hash.replace(/^#\/?/, "") || "";
}

function routeToHash(screen) {
  return `#${screen}`;
}

function screenFromRoute(route = currentRoute()) {
  const normalized = route.split("?")[0];
  if (["account", "cabinet"].includes(normalized)) {
    return "account";
  }
  if (["dashboard", "history"].includes(normalized)) {
    return normalized;
  }
  return "dashboard";
}

function isPrivateRoute(route = currentRoute()) {
  const normalized = route.split("?")[0];
  return ["account", "cabinet", "dashboard", "history"].includes(normalized);
}

function applyRoute() {
  const route = currentRoute();
  if (!session?.user?.id) {
    renderAuthState();
    if (route === "login" || route === "signup") {
      openAuthModal();
    }
    return;
  }

  if (!isPrivateRoute(route)) {
    switchScreen("dashboard");
    return;
  }

  switchScreen(screenFromRoute(route), { skipHash: true });
}

function demoAmountValue() {
  if (!els.demoAmount) {
    return 0;
  }

  return Math.max(0, roundMoney(els.demoAmount.value));
}

function demoPercentTotal() {
  return roundMoney(demoFunds.reduce((sum, fund) => sum + Number(fund.percent || 0), 0));
}

function demoScaleSegments() {
  const percentTotal = demoPercentTotal();
  if (!percentTotal) {
    return "";
  }

  return demoFunds.map((fund) => {
    const width = roundMoney(fund.percent / percentTotal * 100);
    return `<span style="--segment-color: ${fund.color}; --segment-width: ${width}%" title="${escapeHtml(fund.name)} · ${fund.percent}%"></span>`;
  }).join("");
}

function renderDemo(amount = null) {
  if (!els.demoResult) {
    return;
  }

  const safeAmount = Math.max(0, roundMoney(amount ?? demoAmountValue()));
  const percentTotal = demoPercentTotal();
  const funds = demoFunds.map((fund) => ({
    ...fund,
    allocation: roundMoney(safeAmount * fund.percent / 100)
  }));

  els.demoResult.innerHTML = `
    <div class="demo-total">
      <div>
        <span>Пример поступления</span>
        <small class="${percentTotal === 100 ? "" : "is-warning"}" id="demoPercentStatus">${percentTotal}% распределения</small>
      </div>
      <strong id="demoTotalAmount">${money(safeAmount)}</strong>
    </div>
    ${funds.map((fund) => `
      <div class="demo-row" data-demo-fund="${fund.id}" style="--preview-color: ${fund.color}">
        <input class="demo-name-input" data-demo-name="${fund.id}" type="text" value="${escapeHtml(fund.name)}" maxlength="40" aria-label="Название демо-фонда">
        <label class="demo-percent-input">
          <input data-demo-percent="${fund.id}" type="text" inputmode="decimal" value="${fund.percent}" aria-label="Процент демо-фонда">
          <span>%</span>
        </label>
        <strong data-demo-allocation="${fund.id}">${money(fund.allocation)}</strong>
      </div>
    `).join("")}
    <div class="demo-scale" aria-label="Шкала распределения демо-фондов">
      <div class="demo-scale-head">
        <span>Шкала заполнения</span>
        <strong id="demoScaleValue">${Math.min(percentTotal, 100)}%</strong>
      </div>
      <div class="demo-scale-track" style="--scale-progress: ${Math.min(percentTotal, 100)}%">
        <div class="demo-scale-fill" id="demoScaleFill">${demoScaleSegments()}</div>
      </div>
    </div>
  `;
}

function updateDemoAllocations() {
  const safeAmount = demoAmountValue();
  const percentTotal = demoPercentTotal();
  const totalNode = document.querySelector("#demoTotalAmount");
  const statusNode = document.querySelector("#demoPercentStatus");
  const scaleNode = document.querySelector("#demoScaleValue");
  const scaleFillNode = document.querySelector("#demoScaleFill");
  const scaleTrackNode = document.querySelector(".demo-scale-track");

  if (totalNode) {
    totalNode.textContent = money(safeAmount);
  }

  if (statusNode) {
    statusNode.textContent = `${percentTotal}% распределения`;
    statusNode.classList.toggle("is-warning", percentTotal !== 100);
  }

  if (scaleNode) {
    scaleNode.textContent = `${Math.min(percentTotal, 100)}%`;
  }

  if (scaleTrackNode) {
    scaleTrackNode.style.setProperty("--scale-progress", `${Math.min(percentTotal, 100)}%`);
  }

  if (scaleFillNode) {
    scaleFillNode.innerHTML = demoScaleSegments();
  }

  demoFunds.forEach((fund) => {
    const allocationNode = document.querySelector(`[data-demo-allocation="${fund.id}"]`);
    if (allocationNode) {
      allocationNode.textContent = money(safeAmount * fund.percent / 100);
    }
  });
}

function updateDemoFund(id, field, value) {
  const fund = demoFunds.find((item) => item.id === id);
  if (!fund) {
    return;
  }

  if (field === "name") {
    fund.name = value.trim() || "Демо-фонд";
    return;
  }

  if (field === "percent") {
    fund.percent = Math.max(0, roundMoney(value));
    updateDemoAllocations();
  }
}

function fundsByCategory() {
  const groups = new Map(FUND_CATEGORIES.map((category) => [category, []]));
  sortedFunds().forEach((fund) => {
    groups.get(normalizeCategory(fund.category)).push(fund);
  });

  return [...groups.entries()].filter(([, funds]) => funds.length);
}

function groupTotals(funds) {
  return {
    balance: roundMoney(funds.reduce((sum, fund) => sum + Number(fund.balance || 0), 0)),
    monthTarget: roundMoney(funds.reduce((sum, fund) => sum + Number(fund.monthTarget || 0), 0)),
    percent: roundMoney(funds.filter((fund) => !fund.isFrozen).reduce((sum, fund) => sum + Number(fund.percent || 0), 0))
  };
}

function currentMonthAllocationsForFund(fundId) {
  return state.history
    .filter((item) => item.periodKey === state.currentMonthKey && Array.isArray(item.allocations))
    .flatMap((item) => item.allocations.map((allocation) => ({ ...allocation, date: item.date })))
    .filter((allocation) => allocation.fundId === fundId && Number(allocation.amount) > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function lastTopUpFor(fund) {
  return currentMonthAllocationsForFund(fund.id)[0]?.amount || 0;
}

function fundIsComplete(fund) {
  return Number(fund.monthTarget || 0) > 0 && Number(fund.monthBalance || 0) >= Number(fund.monthTarget || 0);
}

function renderFunds() {
  const groups = fundsByCategory();
  const funds = groups.flatMap(([, groupFunds]) => groupFunds);
  els.fundCount.textContent = `${funds.length} фондов`;
  els.fundGrid.innerHTML = groups.map(([category, groupFunds]) => {
    const totals = groupTotals(groupFunds);
    const isCollapsed = collapsedCategories.has(category);
    return `
      <section class="fund-group ${isCollapsed ? "is-collapsed" : ""}" data-fund-group="${escapeHtml(category)}">
        <button class="fund-group-head" type="button" data-toggle-group="${escapeHtml(category)}" aria-expanded="${!isCollapsed}">
          <div>
            <strong>${escapeHtml(category)}</strong>
            <span>${groupFunds.length} фондов</span>
          </div>
          <div class="fund-group-stats">
            <span>Баланс ${money(totals.balance)}</span>
            <span>Цель месяца ${money(totals.monthTarget)}</span>
            <span>${totals.percent}%</span>
          </div>
        </button>
        <div class="fund-group-body">
          ${groupFunds.map(renderFundCard).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function renderFundCard(fund) {
  const progress = monthProgressOf(fund);
  const complete = fundIsComplete(fund);
  const lastTopUp = lastTopUpFor(fund);
  return `
      <article class="fund-card ${fund.isFrozen ? "is-frozen" : ""} ${complete ? "is-complete" : ""}" data-fund-card="${fund.id}" style="--fund-color: ${fund.color}" tabindex="0">
        <div class="fund-head">
          <div class="fund-icon">${escapeHtml(fund.icon)}</div>
          <div class="fund-title">
            <h3>${escapeHtml(fund.name)}</h3>
            <div class="fund-meta">${escapeHtml(fund.category)} · ${fund.isFrozen ? "заморожен" : `${fund.percent}% дохода · месяц`}</div>
          </div>
          <div class="fund-actions">
            ${complete ? `<span class="complete-check" aria-label="Готово">✓</span>` : ""}
            <button class="icon-btn" type="button" data-edit="${fund.id}" aria-label="Редактировать ${escapeHtml(fund.name)}">✎</button>
            <button class="icon-btn" type="button" data-delete="${fund.id}" aria-label="Удалить ${escapeHtml(fund.name)}">×</button>
          </div>
        </div>
        <div class="fund-money">
          <div>
            <span>За месяц</span>
            <strong>${money(fund.monthBalance || 0)}</strong>
          </div>
          <div>
            <span>Цель месяца</span>
            <strong>${money(fund.monthTarget || 0)}</strong>
          </div>
        </div>
        <div class="fund-last-topup">
          <span>${complete ? "Готово" : "Последнее пополнение"}</span>
          <strong class="${complete ? "" : "is-positive"}">${complete ? "Готово" : `+${money(lastTopUp)}`}</strong>
        </div>
        <div class="progress-track">
          <span class="progress-fill" style="--progress: ${progress}%"></span>
        </div>
        <div class="fund-footer">
          <span>${progress}% месяца</span>
          <span>Осталось ${money(monthRemainingOf(fund))}</span>
        </div>
        <div class="fund-footer">
          <span>${fund.isFrozen ? "не участвует в распределении" : `${fund.percent}% от доходов`}</span>
          <span>Приоритет ${fund.priority}</span>
        </div>
      </article>
    `;
}

function renderDistribution() {
  const funds = sortedFunds();
  const active = funds.filter((fund) => !fund.isFrozen);
  let cursor = 0;
  const slices = active.map((fund) => {
    const from = cursor;
    cursor += fund.percent;
    return `${fund.color} ${from}% ${cursor}%`;
  });

  els.donutChart.style.background = slices.length ? `conic-gradient(${slices.join(", ")})` : "conic-gradient(#37d399 0 100%)";
  els.donutTotal.textContent = `${totalPercent()}%`;
  els.distributionLabel.textContent = isDistributionValid() ? "готово" : "требует настройки";
  els.distributionLegend.innerHTML = funds.map((fund) => `
    <div class="legend-row">
      <i class="legend-dot" style="--dot: ${fund.color}"></i>
      <span>${escapeHtml(fund.name)}</span>
      <strong>${fund.isFrozen ? "пауза" : `${fund.percent}%`}</strong>
    </div>
  `).join("");
}

function renderHistory() {
  if (!state.history.length) {
    els.historyList.innerHTML = `<div class="empty-state">История пока пустая. Первое распределение появится здесь.</div>`;
    return;
  }

  els.historyList.innerHTML = [...state.history]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((item) => `
      <article class="history-item">
        <div>
          <span class="history-meta">${dateTime(item.date)}</span>
          <span class="history-type">${escapeHtml(item.type)}</span>
        </div>
        <div>
          <strong>${escapeHtml(item.comment || "Без комментария")}</strong>
          ${item.allocations ? `<div class="history-meta">${item.allocations.length} начислений по фондам · ${escapeHtml(monthLabel(item.periodKey || state.currentMonthKey))}</div>` : ""}
        </div>
        <div class="history-amount">${money(item.amount)}</div>
      </article>
    `).join("");
}

function renderMonthList() {
  const current = currentMonthSnapshot();
  const months = [
    { ...current, isCurrent: true },
    ...state.months
      .filter((month) => month.key !== current.key)
      .sort((a, b) => b.key.localeCompare(a.key))
  ];

  if (!months.length) {
    els.monthList.innerHTML = `<div class="empty-state">Месяцы появятся после первых пополнений.</div>`;
    return;
  }

  els.monthList.innerHTML = months.map((month) => `
    <article class="month-card ${month.isCurrent ? "is-current" : ""}">
      <div>
        <span class="history-meta">${month.isCurrent ? "Текущий месяц" : "Закрытый месяц"}</span>
        <strong>${escapeHtml(month.label)}</strong>
      </div>
      <div>
        <span>Пополнено</span>
        <strong>${money(month.total)}</strong>
      </div>
      <div>
        <span>Цель</span>
        <strong>${money(month.target)}</strong>
      </div>
      <div>
        <span>Прогресс</span>
        <strong>${month.progress}%</strong>
      </div>
    </article>
  `).join("");
}

function getWarningText(percent, valid) {
  if (!session) {
    return "Войдите в аккаунт, чтобы работать со своими фондами.";
  }

  if (!isStorageReady) {
    return "Подключите Supabase в app.js, чтобы изменения сохранялись в базе данных.";
  }

  if (!valid) {
    return `Сейчас сумма процентов ${percent}%. Распределение заблокировано, пока не будет 100%.`;
  }

  return "";
}

function distributeIncome(amount, comment) {
  if (!canChangeData()) {
    return;
  }

  if (!isDistributionValid()) {
    showToast("Сначала настройте проценты до 100%.");
    return;
  }

  const fundsToAllocate = activeFunds();
  const allocations = allocateIncomeWithMonthlyLimits(amount, fundsToAllocate);
  allocations.forEach((allocation) => {
    const fund = state.funds.find((item) => item.id === allocation.fundId);
    if (!fund) {
      return;
    }
    fund.balance = roundMoney(fund.balance + allocation.amount);
    fund.monthBalance = roundMoney((fund.monthBalance || 0) + allocation.amount);
  });
  const allocatedTotal = roundMoney(allocations.reduce((sum, allocation) => sum + allocation.amount, 0));
  const overflowAmount = roundMoney(amount - allocatedTotal);
  lastOverflow = overflowAmount > 0
    ? {
        amount: overflowAmount,
        plan: buildOverflowPlan(overflowAmount)
      }
    : null;

  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: "Доход",
    amount,
    periodKey: state.currentMonthKey,
    comment: comment || "Распределено автоматически",
    allocations,
    overflow: overflowAmount
  });

  showToast(overflowAmount > 0
    ? `Распределено ${money(allocatedTotal)}. Сверх плана: ${money(overflowAmount)}.`
    : `Распределено ${money(allocatedTotal)} по ${fundsToAllocate.length} фондам.`);
  els.incomeForm.reset();
  render();
}

function allocateIncomeWithMonthlyLimits(amount, funds) {
  const allocationMap = new Map();
  let pool = 0;

  funds.forEach((fund) => {
    const planned = roundMoney(amount * Number(fund.percent || 0) / 100);
    const room = monthRemainingOf(fund);
    const value = roundMoney(Math.min(planned, room));
    if (value > 0) {
      allocationMap.set(fund.id, {
        fundId: fund.id,
        fundName: fund.name,
        amount: value,
        percent: fund.percent
      });
    }
    pool = roundMoney(pool + Math.max(0, planned - value));
  });

  const priorityFunds = [...funds].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "ru"));
  let moved = true;
  while (pool > 0 && moved) {
    moved = false;
    for (const fund of priorityFunds) {
      const existing = allocationMap.get(fund.id)?.amount || 0;
      const room = Math.max(0, monthRemainingOf(fund) - existing);
      const value = roundMoney(Math.min(pool, room));
      if (value <= 0) {
        continue;
      }
      const current = allocationMap.get(fund.id) || {
        fundId: fund.id,
        fundName: fund.name,
        amount: 0,
        percent: fund.percent
      };
      current.amount = roundMoney(current.amount + value);
      allocationMap.set(fund.id, current);
      pool = roundMoney(pool - value);
      moved = true;
      if (pool <= 0) {
        break;
      }
    }
  }

  return [...allocationMap.values()].filter((allocation) => allocation.amount > 0);
}

function buildOverflowPlan(amount) {
  const nextFunds = activeFunds()
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "ru"))
    .slice(0, 3)
    .map((fund) => fund.name);
  if (!nextFunds.length) {
    return "Все месячные планы закрыты. Перенесите остаток на следующий месяц или создайте новый фонд.";
  }

  return `Остаток можно перенести на следующий месяц и распределить в первую очередь: ${nextFunds.join(", ")}.`;
}

function openFundModal(fund) {
  const isEdit = Boolean(fund);
  els.fundModalTitle.textContent = isEdit ? "Редактировать фонд" : "Новый фонд";
  els.fundId.value = fund?.id || "";
  els.fundName.value = fund?.name || "";
  els.fundIcon.value = fund?.icon || "◌";
  els.fundColor.value = fund?.color || "#52d6ff";
  els.fundBalance.value = fund?.balance ?? 0;
  els.fundTarget.value = fund?.target ?? 0;
  els.fundMonthTarget.value = fund?.monthTarget ?? suggestMonthTarget(fund);
  els.fundPercent.value = fund?.percent ?? 0;
  els.fundPriority.value = fund?.priority ?? state.funds.length + 1;
  els.fundCategory.value = normalizeCategory(fund?.category || inferFundCategory(fund));
  els.fundDescription.value = fund?.description || "";
  els.fundModal.showModal();
}

function saveFundFromForm() {
  if (!canChangeData()) {
    return;
  }

  const previousFund = state.funds.find((fund) => fund.id === els.fundId.value);
  const data = {
    id: els.fundId.value || createId(),
    name: els.fundName.value.trim(),
    icon: els.fundIcon.value.trim() || "◌",
    color: els.fundColor.value,
    balance: roundMoney(els.fundBalance.value),
    monthBalance: state.funds.find((fund) => fund.id === els.fundId.value)?.monthBalance || 0,
    monthTarget: roundMoney(els.fundMonthTarget.value),
    target: roundMoney(els.fundTarget.value),
    percent: roundMoney(els.fundPercent.value),
    priority: Number(els.fundPriority.value) || 1,
    category: normalizeCategory(els.fundCategory.value),
    description: els.fundDescription.value.trim(),
    type: previousFund?.type || "custom",
    isFrozen: Boolean(previousFund?.isFrozen)
  };

  const index = state.funds.findIndex((fund) => fund.id === data.id);
  if (index >= 0) {
    state.funds[index] = data;
  } else {
    state.funds.push(data);
  }

  els.fundModal.close();
  showToast("Фонд сохранен.");
  render();
}

function deleteFund(id) {
  if (!canChangeData()) {
    return;
  }

  const fund = state.funds.find((item) => item.id === id);
  if (!fund) {
    return;
  }

  const confirmed = confirm(`Удалить фонд «${fund.name}»? Баланс фонда тоже будет удален.`);
  if (!confirmed) {
    return;
  }

  state.funds = state.funds.filter((item) => item.id !== id);
  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: "Система",
    amount: 0,
    periodKey: state.currentMonthKey,
    comment: `Удален фонд «${fund.name}»`
  });
  showToast("Фонд удален.");
  render();
}

function openFundDetails(fund) {
  if (!fund) {
    return;
  }

  const totalProgress = progressOf(fund);
  const monthProgress = monthProgressOf(fund);
  els.fundDetailContent.innerHTML = `
    <div class="modal-head">
      <div class="fund-detail-title">
        <div class="fund-icon" style="--fund-color: ${fund.color}">${escapeHtml(fund.icon)}</div>
        <div>
          <p class="eyebrow">Общая информация</p>
          <h2>${escapeHtml(fund.name)}</h2>
        </div>
      </div>
      <button class="icon-btn" type="button" data-close-detail aria-label="Закрыть">×</button>
    </div>

    <div class="detail-grid">
      <div class="detail-box">
        <span>Общий баланс</span>
        <strong>${money(fund.balance)}</strong>
      </div>
      <div class="detail-box">
        <span>Общая цель</span>
        <strong>${money(fund.target)}</strong>
      </div>
      <div class="detail-box">
        <span>Осталось всего</span>
        <strong>${money(remainingOf(fund))}</strong>
      </div>
      <div class="detail-box">
        <span>Прогресс цели</span>
        <strong>${totalProgress}%</strong>
      </div>
    </div>

    <div class="detail-progress">
      <div class="detail-row">
        <span>Общая цель</span>
        <strong>${totalProgress}%</strong>
      </div>
      <div class="progress-track">
        <span class="progress-fill" style="--progress: ${totalProgress}%; --fund-color: ${fund.color}"></span>
      </div>
    </div>

    <div class="detail-grid compact-detail-grid">
      <div class="detail-box">
        <span>За месяц</span>
        <strong>${money(fund.monthBalance || 0)}</strong>
      </div>
      <div class="detail-box">
        <span>Цель месяца</span>
        <strong>${money(fund.monthTarget || 0)}</strong>
      </div>
      <div class="detail-box">
        <span>Осталось в месяце</span>
        <strong>${money(monthRemainingOf(fund))}</strong>
      </div>
      <div class="detail-box">
        <span>Месячный прогресс</span>
        <strong>${monthProgress}%</strong>
      </div>
    </div>

    <p class="detail-description">${escapeHtml(fund.description || "Без описания")}</p>
    <div class="detail-row">
      <span>${forecastFor(fund)}</span>
      <span>${escapeHtml(fund.category)} · ${fund.isFrozen ? "заморожен" : `${fund.percent}% дохода`} · приоритет ${fund.priority}</span>
    </div>
  `;
  els.fundDetailModal.showModal();
}

function resetMonth() {
  if (!canChangeData()) {
    return;
  }

  closeResetConfirm();
  archiveMonth(state);
  state.funds = state.funds.map((fund) => ({ ...fund, monthBalance: 0 }));
  showToast("Месяц сброшен.");
  render();
}

function resetBalances() {
  if (!canChangeData()) {
    return;
  }

  closeResetConfirm();
  const total = roundMoney(state.funds.reduce((sum, fund) => sum + Number(fund.balance || 0), 0));
  state.funds = state.funds.map((fund) => ({
    ...fund,
    balance: 0,
    monthBalance: 0
  }));
  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: "Сброс балансов",
    amount: total,
    periodKey: state.currentMonthKey,
    comment: "Обнулены балансы всех текущих фондов"
  });
  showToast("Балансы фондов сброшены.");
  render();
}

function resetAll() {
  if (!canChangeData()) {
    return;
  }

  closeResetConfirm();
  state = createDefaultState();
  hasAutoOfferedBriefing = false;
  showToast("Все данные сброшены.");
  render();
}

function addMonth() {
  if (!canChangeData()) {
    return;
  }

  const closedMonth = archiveMonth(state);
  state.currentMonthKey = nextMonthKey(state.currentMonthKey);
  state.funds = state.funds.map((fund) => ({ ...fund, monthBalance: 0 }));
  showToast(`Месяц ${closedMonth.label} сохранен. Открыт ${monthLabel(state.currentMonthKey)}.`);
  render();
}

function openResetMenu() {
  closeResetConfirm();
  els.resetMenu.classList.toggle("is-hidden");
  els.resetMenuBtn.setAttribute("aria-expanded", String(!els.resetMenu.classList.contains("is-hidden")));
}

function closeResetMenu() {
  els.resetMenu.classList.add("is-hidden");
  els.resetMenuBtn.setAttribute("aria-expanded", "false");
}

function openResetConfirm(action) {
  if (!canChangeData()) {
    return;
  }

  pendingResetAction = action;
  closeResetMenu();
  const content = {
    month: {
      title: "Сбросить месяц?",
      text: "Текущий месяц сохранится в динамике, затем месячные суммы обнулятся.",
      button: "Да, сбросить месяц"
    },
    balances: {
      title: "Сбросить балансы?",
      text: "Фонды, проценты, цели, месяцы и история останутся. Обнулятся только накопленные суммы текущих фондов.",
      button: "Да, сбросить балансы"
    }
  }[action];

  els.resetConfirmTitle.textContent = content.title;
  els.resetConfirmText.textContent = content.text;
  els.confirmResetBtn.textContent = content.button;
  els.resetConfirm.classList.remove("is-hidden");
}

function closeResetConfirm() {
  els.resetConfirm.classList.add("is-hidden");
  pendingResetAction = null;
}

function confirmPendingReset() {
  if (pendingResetAction === "balances") {
    resetBalances();
    return;
  }

  if (pendingResetAction === "month") {
    resetMonth();
  }
}

const briefingSteps = [
  {
    title: "Доход",
    hint: "Понимаем ритм поступлений"
  },
  {
    title: "Обязательные платежи",
    hint: "Отделяем то, что нельзя пропустить"
  },
  {
    title: "Долги",
    hint: "Ищем самые опасные обязательства"
  },
  {
    title: "Базовая жизнь",
    hint: "Собираем устойчивый минимум"
  },
  {
    title: "Комфорт и резерв",
    hint: "Оставляем защиту и нормальную жизнь"
  },
  {
    title: "Цели и развитие",
    hint: "Расставляем желания по приоритетам"
  }
];

function isDefaultFundEquivalent(fund, defaultFund) {
  const comparableFields = [
    "name",
    "icon",
    "color",
    "balance",
    "monthBalance",
    "monthTarget",
    "target",
    "percent",
    "priority",
    "category",
    "description"
  ];

  return comparableFields.every((field) => {
    if (typeof defaultFund[field] === "number") {
      return roundMoney(fund[field]) === roundMoney(defaultFund[field]);
    }
    return String(fund[field] || "") === String(defaultFund[field] || "");
  }) && !fund.isFrozen && (!fund.type || fund.type === "custom");
}

function hasStandardFundsOnly(nextState = state) {
  const funds = Array.isArray(nextState.funds) ? nextState.funds : [];
  if (funds.length !== defaultFunds.length) {
    return false;
  }

  return defaultFunds.every((defaultFund) => {
    const fund = funds.find((item) => item.name === defaultFund.name);
    return fund && isDefaultFundEquivalent(fund, defaultFund);
  });
}

function shouldOfferBriefing(nextState = state) {
  return Boolean(session?.user?.id)
    && isStorageReady
    && hasStandardFundsOnly(nextState)
    && !nextState.briefing
    && !nextState.history.length
    && !nextState.months.length;
}

function maybeOfferBriefing() {
  if (hasAutoOfferedBriefing || !shouldOfferBriefing() || els.briefingModal.open) {
    return;
  }

  hasAutoOfferedBriefing = true;
  window.setTimeout(() => openBriefing({ skipPermissionCheck: true }), 250);
}

function openBriefing(options = {}) {
  if (!options.skipPermissionCheck && !canChangeData()) {
    return;
  }

  if (!els.requiredPaymentList.children.length) {
    addRequiredPaymentRow();
  }

  if (!els.comfortList.children.length) {
    addComfortRow();
  }

  if (!els.goalList.children.length) {
    addGoalRow();
  }

  briefingStep = 0;
  updateBriefingStep();
  els.briefingModal.showModal();
}

function updateBriefingStep() {
  els.briefingSteps.forEach((step, index) => {
    step.classList.toggle("is-active", index === briefingStep);
  });

  const step = briefingSteps[briefingStep];
  els.briefingStepTitle.textContent = step.title;
  els.briefingStepLabel.textContent = `Шаг ${briefingStep + 1} из ${briefingSteps.length}`;
  els.briefingStepHint.textContent = step.hint;
  els.briefingMeter.style.setProperty("--progress", `${roundMoney((briefingStep + 1) / briefingSteps.length * 100)}%`);
  els.briefingBackBtn.disabled = briefingStep === 0;
  els.briefingNextBtn.classList.toggle("is-hidden", briefingStep === briefingSteps.length - 1);
  els.briefingApplyBtn.classList.toggle("is-hidden", briefingStep !== briefingSteps.length - 1);
  renderBriefingPreview();
}

function moveBriefingStep(direction) {
  briefingStep = Math.min(briefingSteps.length - 1, Math.max(0, briefingStep + direction));
  updateBriefingStep();
}

function addRequiredPaymentRow(value = {}) {
  els.requiredPaymentList.insertAdjacentHTML("beforeend", `
    <div class="briefing-item" data-briefing-item>
      <input data-field="name" type="text" value="${escapeHtml(value.name || "")}" placeholder="Название">
      <input data-field="amount" type="number" min="0" step="1" value="${value.amount || ""}" placeholder="Сумма">
      <input data-field="date" type="text" value="${escapeHtml(value.date || "")}" placeholder="Дата">
      <select data-field="hasOverdue">
        <option value="false">Нет просрочки</option>
        <option value="true" ${value.hasOverdue ? "selected" : ""}>Есть просрочка</option>
      </select>
      <select data-field="criticality">
        ${["Очень высокая", "Высокая", "Средняя", "Низкая"].map((item) => `<option ${value.criticality === item ? "selected" : ""}>${item}</option>`).join("")}
      </select>
      <button class="icon-btn" type="button" data-remove-briefing-item aria-label="Удалить">×</button>
    </div>
  `);
}

function addDebtRow(value = {}) {
  els.debtList.insertAdjacentHTML("beforeend", `
    <div class="briefing-item" data-briefing-item>
      <input data-field="name" type="text" value="${escapeHtml(value.name || "")}" placeholder="Долг">
      <input data-field="balance" type="number" min="0" step="1" value="${value.balance || ""}" placeholder="Остаток">
      <input data-field="monthlyPayment" type="number" min="0" step="1" value="${value.monthlyPayment || ""}" placeholder="Платеж">
      <input data-field="interestRate" type="text" value="${escapeHtml(value.interestRate || "")}" placeholder="Ставка">
      <select data-field="hasOverdue">
        <option value="false">Нет просрочки</option>
        <option value="true" ${value.hasOverdue ? "selected" : ""}>Есть просрочка</option>
      </select>
      <select data-field="type">
        ${["Кредит", "Кредитная карта", "Рассрочка", "Долг человеку", "Ипотека", "Другое"].map((item) => `<option ${value.type === item ? "selected" : ""}>${item}</option>`).join("")}
      </select>
      <button class="icon-btn" type="button" data-remove-briefing-item aria-label="Удалить">×</button>
    </div>
  `);
}

function addComfortRow(value = {}) {
  els.comfortList.insertAdjacentHTML("beforeend", `
    <div class="briefing-item compact-briefing-item" data-briefing-item>
      <input data-field="name" type="text" value="${escapeHtml(value.name || "")}" placeholder="Например, кофе">
      <input data-field="amount" type="number" min="0" step="1" value="${value.amount || ""}" placeholder="Сумма">
      <select data-field="canReduce">
        <option value="true">Можно уменьшить</option>
        <option value="false" ${value.canReduce === false ? "selected" : ""}>Нельзя уменьшить</option>
      </select>
      <button class="icon-btn" type="button" data-remove-briefing-item aria-label="Удалить">×</button>
    </div>
  `);
}

function addGoalRow(value = {}) {
  els.goalList.insertAdjacentHTML("beforeend", `
    <div class="briefing-item" data-briefing-item>
      <input data-field="name" type="text" value="${escapeHtml(value.name || "")}" placeholder="Цель">
      <input data-field="amount" type="number" min="0" step="1" value="${value.amount || ""}" placeholder="Стоимость">
      <select data-field="priority">
        ${[5, 4, 3, 2, 1].map((item) => `<option value="${item}" ${Number(value.priority) === item ? "selected" : ""}>Приоритет ${item}</option>`).join("")}
      </select>
      <select data-field="type">
        ${["Дом / квартира", "Бизнес", "Техника", "Образование", "Здоровье", "Отдых", "Хобби", "Другое"].map((item) => `<option ${value.type === item ? "selected" : ""}>${item}</option>`).join("")}
      </select>
      <input data-field="urgency" type="text" value="${escapeHtml(value.urgency || "")}" placeholder="Срочность">
      <button class="icon-btn" type="button" data-remove-briefing-item aria-label="Удалить">×</button>
    </div>
  `);
}

function collectBriefingRows(listNode, numericFields = []) {
  return [...listNode.querySelectorAll("[data-briefing-item]")]
    .map((row) => {
      const item = {};
      row.querySelectorAll("[data-field]").forEach((field) => {
        const key = field.dataset.field;
        if (field.value === "true" || field.value === "false") {
          item[key] = field.value === "true";
        } else if (numericFields.includes(key)) {
          item[key] = roundMoney(field.value);
        } else {
          item[key] = field.value.trim();
        }
      });
      return item;
    })
    .filter((item) => {
      const hasName = typeof item.name === "string" && item.name.length > 0;
      const hasNumericValue = numericFields.some((key) => Number(item[key]) > 0);
      return hasName || hasNumericValue;
    });
}

function collectBriefingData() {
  const lifeExpenses = {};
  document.querySelectorAll("[data-life-expense]").forEach((input) => {
    lifeExpenses[input.dataset.lifeExpense] = roundMoney(input.value);
  });

  return {
    monthlyIncome: roundMoney(els.briefMonthlyIncome.value),
    incomeType: els.briefIncomeType.value,
    incomeFrequency: els.briefIncomeFrequency.value,
    requiredPayments: collectBriefingRows(els.requiredPaymentList, ["amount"]),
    debts: collectBriefingRows(els.debtList, ["balance", "monthlyPayment"]),
    lifeExpenses,
    comfortExpenses: collectBriefingRows(els.comfortList, ["amount"]),
    currentReserve: roundMoney(els.briefCurrentReserve.value),
    reserveGoal: roundMoney(els.briefReserveGoal.value),
    goals: collectBriefingRows(els.goalList, ["amount", "priority"]),
    hasBusiness: els.briefHasBusiness.value,
    businessNeedsInvestment: els.briefBusinessNeedsInvestment.value
  };
}

function criticalityPriority(value) {
  return {
    "Очень высокая": 5,
    "Высокая": 5,
    "Средняя": 4,
    "Низкая": 3
  }[value] || 4;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createBriefFund(data) {
  return {
    id: createId(),
    icon: data.icon || "◌",
    color: data.color || "#52d6ff",
    balance: data.balance || 0,
    monthBalance: 0,
    monthTarget: roundMoney(data.monthTarget || 0),
    target: roundMoney(data.target || data.monthTarget || 0),
    percent: 0,
    priority: data.priority || 3,
    name: data.name,
    description: data.description || "",
    type: data.type,
    category: normalizeCategory(data.category || inferFundCategory(data)),
    block: data.block,
    weight: Math.max(1, Number(data.weight) || 1),
    isFrozen: Boolean(data.isFrozen)
  };
}

function determineBriefingMode(data, requiredTotal) {
  const income = data.monthlyIncome || 1;
  const requiredPercent = requiredTotal / income * 100;
  const hasOverdue = data.requiredPayments.some((item) => item.hasOverdue)
    || data.debts.some((item) => item.hasOverdue);

  if (requiredPercent >= 70 || hasOverdue) {
    return { name: "Антикризисный", requiredPercent };
  }

  if (requiredPercent >= 50) {
    return { name: "Стабилизация", requiredPercent };
  }

  return { name: "Развитие", requiredPercent };
}

function blockSharesFor(mode, requiredPercent, presentBlocks) {
  const shares = {
    obligations: 0,
    life: 0,
    comfort: 0,
    reserve: 0,
    goals: 0
  };

  if (mode === "Антикризисный") {
    shares.obligations = presentBlocks.obligations ? clamp(requiredPercent, 75, 85) : 0;
    shares.comfort = presentBlocks.comfort ? 5 : 0;
    shares.reserve = presentBlocks.reserve ? 5 : 0;
    shares.goals = 0;
  } else if (mode === "Стабилизация") {
    shares.obligations = presentBlocks.obligations ? clamp(requiredPercent, 50, 70) : 0;
    shares.life = presentBlocks.life ? 20 : 0;
    shares.comfort = presentBlocks.comfort ? 5 : 0;
    shares.reserve = presentBlocks.reserve ? 10 : 0;
    shares.goals = presentBlocks.goals ? 10 : 0;
  } else {
    shares.obligations = presentBlocks.obligations ? clamp(requiredPercent, 20, 50) : 0;
    shares.life = presentBlocks.life ? 25 : 0;
    shares.comfort = presentBlocks.comfort ? 8 : 0;
    shares.reserve = presentBlocks.reserve ? 12 : 0;
    shares.goals = presentBlocks.goals ? 25 : 0;
  }

  const used = Object.values(shares).reduce((sum, value) => sum + value, 0);
  if (used > 100) {
    Object.keys(shares).forEach((key) => {
      shares[key] = roundMoney(shares[key] / used * 100);
    });
    return shares;
  }

  const preferredBlock = presentBlocks.life ? "life" : Object.keys(presentBlocks).find((key) => presentBlocks[key]);
  if (preferredBlock) {
    shares[preferredBlock] += Math.max(0, 100 - used);
  }

  return shares;
}

function assignBriefingPercents(funds, shares) {
  const active = funds.filter((fund) => !fund.isFrozen);
  Object.entries(shares).forEach(([block, share]) => {
    const blockFunds = active.filter((fund) => fund.block === block);
    const totalWeight = blockFunds.reduce((sum, fund) => sum + fund.weight, 0);
    blockFunds.forEach((fund) => {
      fund.percent = totalWeight ? roundMoney(share * fund.weight / totalWeight) : 0;
    });
  });

  const activeTotal = active.reduce((sum, fund) => sum + fund.percent, 0);
  const diff = roundMoney(100 - activeTotal);
  if (active.length && diff !== 0) {
    active[0].percent = roundMoney(active[0].percent + diff);
  }

  funds.filter((fund) => fund.isFrozen).forEach((fund) => {
    fund.percent = 0;
  });

  return funds.map(({ block, weight, ...fund }) => fund);
}

function buildBriefingResult(data) {
  const requiredTotal = data.requiredPayments.reduce((sum, item) => sum + item.amount, 0)
    + data.debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);
  const mode = determineBriefingMode(data, requiredTotal);
  const funds = [];

  data.requiredPayments.forEach((payment) => {
    if (!payment.name || !payment.amount) {
      return;
    }
    funds.push(createBriefFund({
      name: payment.name,
      icon: "▣",
      color: "#3b82f6",
      type: "required_payment",
      block: "obligations",
      priority: criticalityPriority(payment.criticality),
      monthTarget: payment.amount,
      target: payment.amount,
      weight: payment.amount,
      description: `Обязательный платеж${payment.date ? `, дата: ${payment.date}` : ""}.`
    }));
  });

  data.debts.forEach((debt) => {
    if (!debt.name || (!debt.balance && !debt.monthlyPayment)) {
      return;
    }
    const isDanger = debt.hasOverdue || debt.type === "Кредитная карта";
    funds.push(createBriefFund({
      name: debt.name,
      icon: isDanger ? "!" : "▣",
      color: isDanger ? "#ff6b7a" : "#3b82f6",
      type: isDanger ? "danger_debt" : "debt",
      block: "obligations",
      priority: isDanger ? 5 : 4,
      monthTarget: debt.monthlyPayment || 0,
      target: debt.balance || debt.monthlyPayment || 0,
      weight: debt.monthlyPayment || debt.balance || 1,
      description: `${debt.type || "Долг"}${debt.hasOverdue ? " с просрочкой" : ""}.`
    }));
  });

  const lifeLabels = {
    food: ["Еда и быт", "#22c55e", "●"],
    transport: ["Транспорт", "#14b8a6", "△"],
    phoneInternet: ["Связь / интернет", "#1f8fff", "◌"],
    health: ["Здоровье", "#ef4444", "+"],
    subscriptions: ["Рабочие подписки", "#8b5cf6", "□"],
    household: ["Бытовые мелочи", "#f59e0b", "◇"]
  };
  Object.entries(data.lifeExpenses).forEach(([key, amount]) => {
    if (!amount) {
      return;
    }
    const [name, color, icon] = lifeLabels[key];
    funds.push(createBriefFund({
      name,
      icon,
      color,
      type: "life",
      block: "life",
      priority: key === "health" ? 5 : 4,
      monthTarget: amount,
      target: amount,
      weight: amount,
      description: "Базовая жизнь и рабочая устойчивость."
    }));
  });

  data.comfortExpenses.forEach((expense) => {
    if (!expense.name || !expense.amount) {
      return;
    }
    funds.push(createBriefFund({
      name: expense.name,
      icon: "○",
      color: "#ec4899",
      type: "comfort",
      block: "comfort",
      priority: expense.canReduce ? 3 : 4,
      monthTarget: expense.amount,
      target: expense.amount,
      weight: expense.amount,
      description: expense.canReduce ? "Комфортный расход, который можно временно уменьшить." : "Комфортный расход, который лучше оставить отдельным лимитом."
    }));
  });

  if (data.reserveGoal > data.currentReserve) {
    funds.push(createBriefFund({
      name: "Резерв",
      icon: "◈",
      color: "#14b8a6",
      type: "reserve",
      block: "reserve",
      priority: 4,
      balance: data.currentReserve,
      monthTarget: Math.max(1000, roundMoney((data.reserveGoal - data.currentReserve) * 0.2)),
      target: data.reserveGoal,
      weight: data.reserveGoal,
      description: "Подушка безопасности на непредвиденные ситуации."
    }));
  }

  data.goals.forEach((goal) => {
    if (!goal.name || !goal.amount) {
      return;
    }
    funds.push(createBriefFund({
      name: goal.name,
      icon: goal.type === "Бизнес" ? "△" : "◇",
      color: goal.type === "Бизнес" ? "#22c55e" : "#f59e0b",
      type: goal.type === "Бизнес" ? "business_goal" : "goal",
      block: "goals",
      priority: Number(goal.priority) || 3,
      monthTarget: Math.max(1000, roundMoney(goal.amount * 0.1)),
      target: goal.amount,
      weight: Math.max(1, (Number(goal.priority) || 3) * goal.amount),
      isFrozen: mode.name === "Антикризисный" && Number(goal.priority) <= 3,
      description: `${goal.type || "Цель"}${goal.urgency ? `, срочность: ${goal.urgency}` : ""}.`
    }));
  });

  if (data.hasBusiness !== "no" && !funds.some((fund) => fund.type === "business_goal")) {
    funds.push(createBriefFund({
      name: "Развитие / бизнес",
      icon: "△",
      color: "#22c55e",
      type: "business",
      block: "goals",
      priority: 3,
      monthTarget: 5000,
      target: 0,
      weight: 3,
      isFrozen: mode.name === "Антикризисный",
      description: data.businessNeedsInvestment === "yes" ? "Регулярные вложения в проект." : "Будущий фонд развития дохода."
    }));
  }

  if (!funds.length) {
    funds.push(...defaultFunds.map((fund) => createBriefFund({
      ...fund,
      type: "starter",
      block: fund.name === "Резерв" ? "reserve" : fund.name === "Личное" ? "comfort" : fund.name === "Обязательные платежи" ? "obligations" : "goals",
      weight: fund.percent,
      description: fund.description
    })));
  }

  const activeBlocks = funds.reduce((blocks, fund) => {
    if (!fund.isFrozen) {
      blocks[fund.block] = true;
    }
    return blocks;
  }, {});
  const shares = blockSharesFor(mode.name, mode.requiredPercent, activeBlocks);
  const finalFunds = assignBriefingPercents(funds, shares);
  const frozenCount = finalFunds.filter((fund) => fund.isFrozen).length;
  const recommendations = [
    mode.name === "Антикризисный"
      ? "Сначала защищаем обязательные платежи и проблемные долги. Цели с приоритетом 1-3 временно поставлены на паузу."
      : mode.name === "Стабилизация"
        ? "Держим платежи под контролем, параллельно создаем резерв и оставляем небольшой поток на цели."
        : "Можно развивать цели и проекты, но резерв остается отдельным обязательным направлением.",
    "Когда фонд достигнет цели, его процент стоит перекинуть в следующий активный фонд с самым высоким приоритетом.",
    "Если закрыт долг человеку: 40% освободившегося процента в резерв, 40% в главный долг, 20% в цели или бизнес."
  ];

  return {
    data,
    mode: mode.name,
    requiredPercent: roundMoney(mode.requiredPercent),
    shares,
    frozenCount,
    recommendations,
    funds: finalFunds
  };
}

function renderBriefingPreview() {
  const result = buildBriefingResult(collectBriefingData());
  els.briefingPreview.innerHTML = `
    <div>
      <span>Режим</span>
      <strong>${result.mode}</strong>
    </div>
    <div>
      <span>Обязательства</span>
      <strong>${result.requiredPercent}% дохода</strong>
    </div>
    <div>
      <span>Будет создано</span>
      <strong>${result.funds.length} фондов</strong>
    </div>
    <div>
      <span>На паузе</span>
      <strong>${result.frozenCount}</strong>
    </div>
  `;
}

function applyBriefing() {
  if (!canChangeData()) {
    return;
  }

  const result = buildBriefingResult(collectBriefingData());
  state.funds = result.funds;
  state.briefing = {
    completedAt: new Date().toISOString(),
    mode: result.mode,
    requiredPercent: result.requiredPercent,
    shares: result.shares,
    frozenCount: result.frozenCount,
    recommendations: result.recommendations,
    answers: result.data
  };
  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: "Брифинг",
    amount: 0,
    periodKey: state.currentMonthKey,
    comment: `Созданы фонды по режиму «${result.mode}»`
  });
  els.briefingModal.close();
  showToast(`Брифинг готов: создано ${result.funds.length} фондов.`);
  switchScreen("dashboard");
  render();
}

function switchScreen(screen, options = {}) {
  const nextScreen = els.screens[screen] ? screen : "dashboard";
  Object.entries(els.screens).forEach(([key, node]) => {
    node.classList.toggle("is-visible", key === nextScreen);
  });

  els.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === nextScreen);
  });

  const titles = {
    account: "Кабинет",
    dashboard: "Мои деньги",
    history: "История операций"
  };
  els.screenTitle.textContent = titles[nextScreen];

  if (options.skipHash !== true && window.location.hash !== routeToHash(nextScreen)) {
    window.location.hash = routeToHash(nextScreen);
  }
}

function canChangeData() {
  if (!session) {
    showToast("Сначала войдите в аккаунт.");
    return false;
  }

  if (isStorageReady) {
    return true;
  }

  showToast("Сначала подключите Supabase, чтобы изменения сохранялись в базе.");
  return false;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2800);
}

els.navButtons.forEach((button) => {
  button.addEventListener("click", () => switchScreen(button.dataset.screen));
});

window.addEventListener("hashchange", applyRoute);

function openAuthModal() {
  if (session?.user?.id) {
    renderAuthState();
    switchScreen("dashboard");
    return;
  }

  els.authMessage.textContent = "";
  if (!els.authModal.open) {
    els.authModal.showModal();
  }
}

els.authOpenBtn.addEventListener("click", openAuthModal);

els.userAccountBtn.addEventListener("click", () => switchScreen("account"));

els.authTriggerButtons.forEach((button) => {
  button.addEventListener("click", openAuthModal);
});

els.demoForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  updateDemoAllocations();
});

els.demoAmount?.addEventListener("input", () => {
  updateDemoAllocations();
});

els.demoResult?.addEventListener("input", (event) => {
  const nameId = event.target.dataset.demoName;
  const percentId = event.target.dataset.demoPercent;

  if (nameId) {
    updateDemoFund(nameId, "name", event.target.value);
    return;
  }

  if (percentId) {
    updateDemoFund(percentId, "percent", event.target.value);
  }
});

els.authCloseBtn.addEventListener("click", () => {
  els.authModal.close();
});

els.authModal.addEventListener("click", (event) => {
  if (event.target === els.authModal) {
    els.authModal.close();
  }
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.authMessage.textContent = "";
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  const action = event.submitter?.value || "login";

  els.loginBtn.disabled = true;
  els.signupBtn.disabled = true;

  try {
    if (action === "signup") {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
  } catch (error) {
    els.authMessage.textContent = translateAuthError(error.message);
  } finally {
    els.loginBtn.disabled = false;
    els.signupBtn.disabled = false;
  }
});

els.logoutBtn.addEventListener("click", async () => {
  try {
    if (session?.access_token) {
      await authRequest("/logout", null, session.access_token);
    }
  } catch {
    // Local logout still matters if the network request fails.
  }

  clearSession();
  state = createDefaultState();
  isStorageReady = false;
  hasAutoOfferedBriefing = false;
  storageStatus = "Войдите, чтобы загрузить данные из Supabase.";
  renderAuthState();
  render();
  if (isPrivateAppPage) {
    window.location.href = "index.html";
  }
});

els.accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateProfileLogin(els.accountLoginInput.value);
});

els.profileSetupPanel?.addEventListener("submit", (event) => {
  event.preventDefault();
  updateProfileLogin(els.profileSetupLogin.value);
});

els.incomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = roundMoney(els.incomeAmount.value);
  if (amount <= 0) {
    showToast("Введите сумму больше нуля.");
    return;
  }
  distributeIncome(amount, els.incomeComment.value.trim());
});

els.addFundBtn.addEventListener("click", () => openFundModal());

els.addMonthBtn.addEventListener("click", addMonth);

els.briefingBackBtn.addEventListener("click", () => moveBriefingStep(-1));

els.briefingNextBtn.addEventListener("click", () => moveBriefingStep(1));

els.addRequiredPaymentBtn.addEventListener("click", addRequiredPaymentRow);

els.addDebtBtn.addEventListener("click", addDebtRow);

els.addComfortBtn.addEventListener("click", addComfortRow);

els.addGoalBtn.addEventListener("click", addGoalRow);

els.showRequiredIncomeBtn.addEventListener("click", () => {
  isRequiredIncomeHidden = false;
  writeBooleanPreference(REQUIRED_INCOME_VISIBILITY_KEY, false);
  renderRequiredIncome();
});

els.requiredIncomePanel.addEventListener("click", (event) => {
  if (!event.target.closest("[data-hide-required-income]")) {
    return;
  }

  isRequiredIncomeHidden = true;
  writeBooleanPreference(REQUIRED_INCOME_VISIBILITY_KEY, true);
  renderRequiredIncome();
});

els.briefingForm.addEventListener("input", renderBriefingPreview);

els.briefingForm.addEventListener("change", renderBriefingPreview);

els.briefingForm.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-briefing-item]");
  if (!removeButton) {
    return;
  }

  removeButton.closest("[data-briefing-item]")?.remove();
  renderBriefingPreview();
});

els.briefingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.briefingModal.close();
    return;
  }
  applyBriefing();
});

els.resetMenuBtn.addEventListener("click", openResetMenu);

els.resetMonthOption.addEventListener("click", () => openResetConfirm("month"));

els.resetAllOption.addEventListener("click", () => openResetConfirm("balances"));

els.cancelResetBtn.addEventListener("click", closeResetConfirm);

els.confirmResetBtn.addEventListener("click", confirmPendingReset);

document.addEventListener("click", (event) => {
  if (els.resetConfirmWrap.contains(event.target)) {
    return;
  }

  if (!els.resetMenu.classList.contains("is-hidden")) {
    closeResetMenu();
  }

  if (!els.resetConfirm.classList.contains("is-hidden")) {
    closeResetConfirm();
  }
});

els.fundGrid.addEventListener("click", (event) => {
  const group = event.target.closest("[data-toggle-group]")?.dataset.toggleGroup;
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const deleteId = event.target.closest("[data-delete]")?.dataset.delete;
  const cardId = event.target.closest("[data-fund-card]")?.dataset.fundCard;

  if (group) {
    if (collapsedCategories.has(group)) {
      collapsedCategories.delete(group);
    } else {
      collapsedCategories.add(group);
    }
    renderFunds();
    return;
  }

  if (editId) {
    openFundModal(state.funds.find((fund) => fund.id === editId));
    return;
  }

  if (deleteId) {
    deleteFund(deleteId);
    return;
  }

  if (cardId) {
    openFundDetails(state.funds.find((fund) => fund.id === cardId));
  }
});

els.fundGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const cardId = event.target.closest("[data-fund-card]")?.dataset.fundCard;
  if (!cardId || event.target.closest("button")) {
    return;
  }

  event.preventDefault();
  openFundDetails(state.funds.find((fund) => fund.id === cardId));
});

els.fundDetailModal.addEventListener("click", (event) => {
  if (event.target === els.fundDetailModal || event.target.closest("[data-close-detail]")) {
    els.fundDetailModal.close();
  }
});

els.fundForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.fundModal.close();
    return;
  }
  saveFundFromForm();
});

els.clearHistoryBtn.addEventListener("click", () => {
  if (!canChangeData()) {
    return;
  }

  if (confirm("Очистить всю историю операций?")) {
    state.history = [];
    showToast("История очищена.");
    render();
  }
});

els.resetEverythingBtn.addEventListener("click", () => {
  if (!canChangeData()) {
    return;
  }

  const confirmed = confirm("Сбросить все данные? Будут удалены фонды, история и месяцы. Останутся только стартовые фонды.");
  if (!confirmed) {
    return;
  }

  resetAll();
});

async function initApp() {
  isBooted = true;
  renderDemo();
  session = loadStoredSession();
  if (session) {
    await bootAuthenticatedApp();
  } else {
    if (isPrivateAppPage) {
      redirectToLogin();
      return;
    }
    storageStatus = "Войдите, чтобы загрузить данные из Supabase.";
    renderAuthState();
    render();
    applyRoute();
  }
}

async function bootAuthenticatedApp(options = {}) {
  hasAutoOfferedBriefing = false;
  state.profile = normalizeProfile(state.profile);
  renderAuthState();
  render();
  applyRoute();

  try {
    const refreshedBeforeLoad = !options.skipRefresh;
    if (refreshedBeforeLoad) {
      await withTimeout(refreshSessionIfNeeded(), 8000, "Восстановление сессии");
    }
    state = await withTimeout(loadState({ skipRefresh: refreshedBeforeLoad || options.skipRefresh }), 12000, "Загрузка кабинета");
    renderAuthState();
    render();
    applyRoute();
  } catch (error) {
    if (!session?.user?.id) {
      storageStatus = "Сессия устарела. Войдите заново.";
      isStorageReady = false;
      clearSession();
      if (isPrivateAppPage) {
        redirectToLogin();
        return;
      }
    }

    storageStatus = `Не удалось загрузить данные: ${error.message}`;
    isStorageReady = false;
    showToast(storageStatus);
    renderAuthState();
    render();
    applyRoute();
  }
}

function showBootError(error) {
  const message = error?.message || String(error || "неизвестная ошибка");
  const loading = document.querySelector("#appLoading");
  if (loading) {
    loading.classList.remove("is-hidden");
    const text = loading.querySelector("p");
    if (text) {
      text.textContent = `Ошибка загрузки кабинета: ${message}`;
    }
  }
  console.error(error);
}

window.addEventListener("error", (event) => {
  showBootError(event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  showBootError(event.reason);
});

function translateAuthError(message) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Неверный email или пароль.";
  }

  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "Пользователь с таким email уже зарегистрирован.";
  }

  if (lower.includes("password")) {
    return "Пароль должен быть не короче 6 символов.";
  }

  return `Ошибка авторизации: ${message}`;
}

initApp().catch(showBootError);
