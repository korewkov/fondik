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
const FINANCE_PANELS_COLLAPSED_KEY = "money-system.finance-panels-collapsed";
const DISTRIBUTION_EXPANDED_KEY = "money-system.distribution-expanded";
const FUND_TYPES = ["saving", "spending", "debt", "reserve", "business", "required"];
const PRIORITY_LABELS = {
  5: "Критично",
  4: "Важно",
  3: "Полезно",
  2: "Можно позже",
  1: "Хотелка"
};
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
    fundType: "required",
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
    fundType: "reserve",
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
    fundType: "saving",
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
    fundType: "business",
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
    fundType: "spending",
    category: "Комфорт",
    description: "Повседневные желания и небольшие радости."
  }
];

let session = null;
let state = createDefaultState();
let demoFunds = defaultFunds.map((fund) => ({ ...fund }));
let storageStatus = "Подключение к Supabase еще не настроено.";
let isStorageReady = false;
let isBooted = false;
let saveTimer;
let pendingResetAction = null;
let briefingStep = 0;
let hasAutoOfferedBriefing = false;
let lastOverflow = null;
let isRequiredIncomeHidden = readBooleanPreference(REQUIRED_INCOME_VISIBILITY_KEY);
let collapsedFinancePanels = readCollapsedFinancePanels();
let isDistributionExpanded = readBooleanPreference(DISTRIBUTION_EXPANDED_KEY);
let areWarningsExpanded = false;
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
  financeModePanel: document.querySelector("#financeModePanel"),
  freeBalancePanel: document.querySelector("#freeBalancePanel"),
  financeWarningsPanel: document.querySelector("#financeWarningsPanel"),
  showRequiredIncomeBtn: document.querySelector("#showRequiredIncomeBtn"),
  requiredIncomePanel: document.querySelector("#requiredIncomePanel"),
  overflowPanel: document.querySelector("#overflowPanel"),
  fundCount: document.querySelector("#fundCount"),
  donutChart: document.querySelector("#donutChart"),
  donutWrap: document.querySelector("#donutWrap"),
  donutTotal: document.querySelector("#donutTotal"),
  distributionLabel: document.querySelector("#distributionLabel"),
  distributionLegend: document.querySelector("#distributionLegend"),
  distributionCompact: document.querySelector("#distributionCompact"),
  distributionToggleBtn: document.querySelector("#distributionToggleBtn"),
  addFundBtn: document.querySelector("#addFundBtn"),
  addMonthBtn: document.querySelector("#addMonthBtn"),
  editMonthBriefBtn: document.querySelector("#editMonthBriefBtn"),
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
  fundType: document.querySelector("#fundType"),
  fundBalance: document.querySelector("#fundBalance"),
  fundTarget: document.querySelector("#fundTarget"),
  fundMonthTarget: document.querySelector("#fundMonthTarget"),
  fundPercent: document.querySelector("#fundPercent"),
  fundPriority: document.querySelector("#fundPriority"),
  fundCategory: document.querySelector("#fundCategory"),
  fundDescription: document.querySelector("#fundDescription"),
  fundDebtBalance: document.querySelector("#fundDebtBalance"),
  fundAnnualRate: document.querySelector("#fundAnnualRate"),
  fundMinPayment: document.querySelector("#fundMinPayment"),
  fundPaymentDate: document.querySelector("#fundPaymentDate"),
  fundHasOverdue: document.querySelector("#fundHasOverdue"),
  fundExtraPayment: document.querySelector("#fundExtraPayment"),
  fundDebtType: document.querySelector("#fundDebtType"),
  monthReportModal: document.querySelector("#monthReportModal"),
  monthReportTitle: document.querySelector("#monthReportTitle"),
  monthReportContent: document.querySelector("#monthReportContent"),
  confirmMonthReportBtn: document.querySelector("#confirmMonthReportBtn"),
  monthBriefModal: document.querySelector("#monthBriefModal"),
  monthBriefForm: document.querySelector("#monthBriefForm"),
  monthBriefTitle: document.querySelector("#monthBriefTitle"),
  monthBriefIncome: document.querySelector("#monthBriefIncome"),
  monthBriefRequired: document.querySelector("#monthBriefRequired"),
  monthBriefLife: document.querySelector("#monthBriefLife"),
  monthBriefOverdue: document.querySelector("#monthBriefOverdue"),
  monthBriefPaused: document.querySelector("#monthBriefPaused"),
  monthBriefActive: document.querySelector("#monthBriefActive"),
  monthBriefPreview: document.querySelector("#monthBriefPreview"),
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
    monthBriefs: {},
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
    monthBriefs: normalizeMonthBriefs(value?.monthBriefs),
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

function normalizeMonthBriefs(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(Object.entries(value)
    .map(([key, brief]) => [key, normalizeMonthBrief(brief, key)])
    .filter(([, brief]) => brief));
}

function normalizeMonthBrief(brief, key = state.currentMonthKey) {
  if (!brief || typeof brief !== "object") {
    return null;
  }

  return {
    key: brief.key || key,
    monthlyIncome: roundMoney(brief.monthlyIncome),
    requiredPayments: roundMoney(brief.requiredPayments),
    minimumLifeExpenses: roundMoney(brief.minimumLifeExpenses),
    hasOverdue: Boolean(brief.hasOverdue),
    pausedFunds: String(brief.pausedFunds || ""),
    activeFunds: String(brief.activeFunds || ""),
    completedAt: brief.completedAt || new Date().toISOString()
  };
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeFund(fund) {
  const debtBalance = roundMoney(fund.debtBalance ?? (isDebtFund(fund) ? fund.target : 0));
  const minPayment = roundMoney(fund.minPayment ?? (isDebtFund(fund) ? fund.monthTarget : 0));
  const fundType = normalizeFundType(fund.fundType || fund.type, fund);
  const monthTarget = Number(fund.monthTarget) || suggestMonthTarget({ ...fund, fundType });
  return {
    id: fund.id || createId(),
    name: fund.name || "Новый фонд",
    icon: fund.icon || "◌",
    color: fund.color || "#52d6ff",
    balance: Number(fund.balance) || 0,
    monthBalance: Number(fund.monthBalance) || 0,
    fundType,
    monthlyLimit: roundMoney(fund.monthlyLimit || (fundType === "spending" ? monthTarget : 0)),
    spentThisMonth: roundMoney(fund.spentThisMonth ?? (fundType === "spending" ? fund.monthBalance : 0)),
    monthTarget,
    target: Number(fund.target) || 0,
    percent: Number(fund.percent) || 0,
    priority: Number(fund.priority) || 1,
    category: normalizeCategory(fund.category || inferFundCategory(fund)),
    description: fund.description || "",
    type: fund.type || "custom",
    isFrozen: Boolean(fund.isFrozen && fund.pauseType !== "system"),
    pauseType: fund.pauseType === "manual" ? "manual" : null,
    pauseReason: fund.pauseReason || "",
    systemPauseDismissedMonths: Array.isArray(fund.systemPauseDismissedMonths) ? fund.systemPauseDismissedMonths : [],
    debtBalance,
    annualRate: roundMoney(fund.annualRate ?? fund.interestRate),
    minPayment,
    paymentDate: fund.paymentDate || "",
    hasOverdue: Boolean(fund.hasOverdue),
    extraPayment: roundMoney(fund.extraPayment),
    debtType: normalizeDebtType(fund.debtType || fund.type)
  };
}

function normalizeFundType(value, fund = {}) {
  const type = String(value || "");
  const legacyType = String(fund.type || "");
  const category = normalizeCategory(fund.category || inferFundCategory(fund));
  if (FUND_TYPES.includes(type)) {
    return type;
  }
  if (type.includes("debt") || legacyType.includes("debt") || category === "Кредиты" || Number(fund.debtBalance) > 0 || Number(fund.annualRate) > 0 || Number(fund.minPayment) > 0) {
    return "debt";
  }
  if (type === "required_payment" || legacyType === "required_payment" || category === "Обязательные платежи") {
    return "required";
  }
  if (type === "comfort" || type === "life" || legacyType === "comfort" || legacyType === "life" || ["Комфорт", "Жизнь и быт"].includes(category)) {
    return "spending";
  }
  if (type === "reserve" || legacyType === "reserve" || category === "Резерв") {
    return "reserve";
  }
  if (type.includes("business") || legacyType.includes("business") || category === "Бизнес") {
    return "business";
  }
  return "saving";
}

function fundTypeLabel(type) {
  return {
    saving: "Накопление",
    spending: "Лимит",
    debt: "Долг",
    reserve: "Резерв",
    business: "Бизнес",
    required: "Обязательный"
  }[normalizeFundType(type)] || "Фонд";
}

function normalizeDebtType(value) {
  return ["credit_card", "loan", "person", "installment", "other"].includes(value) ? value : "other";
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
    nextState.funds = nextState.funds.map((fund) => ({ ...fund, monthBalance: 0, spentThisMonth: 0 }));
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
    category: fund.category,
    fundType: normalizeFundType(fund.fundType || fund.type, fund),
    amount: roundMoney(fund.monthBalance || 0),
    spent: roundMoney(spentThisMonthOf(fund)),
    target: roundMoney(fund.monthTarget || 0),
    monthlyLimit: roundMoney(monthlyLimitOf(fund)),
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

function readCollapsedFinancePanels() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(FINANCE_PANELS_COLLAPSED_KEY) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function writeCollapsedFinancePanels() {
  try {
    globalThis.localStorage?.setItem(FINANCE_PANELS_COLLAPSED_KEY, JSON.stringify([...collapsedFinancePanels]));
  } catch {
    // Collapsed state is only a UI preference; the calculations stay available.
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
  const finance = calculateMonthlyFinance();
  return state.funds.filter((fund) => !isFundPaused(fund, finance));
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

function isDebtFund(fund = {}) {
  const type = String(fund.type || "");
  return fund.fundType === "debt"
    || normalizeCategory(fund.category || inferFundCategory(fund)) === "Кредиты"
    || type.includes("debt")
    || Number(fund.debtBalance) > 0
    || Number(fund.annualRate) > 0
    || Number(fund.minPayment) > 0;
}

function isRequiredFund(fund = {}) {
  if (["debt", "required"].includes(fund.fundType)) {
    return true;
  }
  const category = normalizeCategory(fund.category || inferFundCategory(fund));
  return ["Кредиты", "Обязательные платежи"].includes(category);
}

function isProtectedFromSystemPause(fund = {}) {
  const category = normalizeCategory(fund.category || inferFundCategory(fund));
  const type = String(fund.type || "");
  const name = String(fund.name || "").toLowerCase();
  return isFundListedInMonthBrief(fund, "activeFunds")
    || isRequiredFund(fund)
    || ["Жизнь и быт"].includes(category)
    || type === "life"
    || name.includes("транспорт")
    || name.includes("подпис")
    || name.includes("минималь")
    || name.includes("комфорт");
}

function monthBriefNameList(field) {
  return String(state.monthBriefs?.[state.currentMonthKey]?.[field] || "")
    .split(/[,;\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isFundListedInMonthBrief(fund, field) {
  const name = String(fund?.name || "").trim().toLowerCase();
  if (!name) {
    return false;
  }
  return monthBriefNameList(field).some((item) => item === name);
}

function debtCalculations(fund = {}) {
  const debtBalance = roundMoney(fund.debtBalance || (isDebtFund(fund) ? fund.target : 0));
  const annualRate = roundMoney(fund.annualRate);
  const minPayment = roundMoney(fund.minPayment || (isDebtFund(fund) ? fund.monthTarget : 0));
  const monthlyRate = annualRate / 100 / 12;
  const monthlyInterest = roundMoney(debtBalance * monthlyRate);
  const principalPayment = roundMoney(minPayment - monthlyInterest);
  const payoffMonths = debtPayoffMonths(debtBalance, annualRate, minPayment);
  return { debtBalance, annualRate, minPayment, monthlyRate, monthlyInterest, principalPayment, payoffMonths };
}

function debtPayoffMonths(balance, annualRate, payment) {
  let debt = roundMoney(balance);
  const monthlyRate = roundMoney(annualRate) / 100 / 12;
  const safePayment = roundMoney(payment);
  if (debt <= 0) {
    return 0;
  }
  if (safePayment <= 0 || safePayment <= roundMoney(debt * monthlyRate)) {
    return Infinity;
  }
  for (let month = 1; month <= 120; month += 1) {
    debt = roundMoney(debt + debt * monthlyRate - safePayment);
    if (debt <= 0) {
      return month;
    }
  }
  return Infinity;
}

function debtForecastText(fund) {
  const debt = debtCalculations(fund);
  if (!Number.isFinite(debt.payoffMonths)) {
    return "При текущем платеже долг почти не уменьшается";
  }
  if (debt.payoffMonths === 0) {
    return "долг закрыт";
  }
  if (debt.payoffMonths === 1) {
    return "закрытие примерно за 1 месяц";
  }
  if (debt.payoffMonths < 5) {
    return `закрытие примерно за ${debt.payoffMonths} месяца`;
  }
  return `закрытие примерно за ${debt.payoffMonths} месяцев`;
}

function monthlyLimitOf(fund) {
  return roundMoney(fund.monthlyLimit || fund.monthTarget || 0);
}

function spentThisMonthOf(fund) {
  return roundMoney(fund.spentThisMonth ?? fund.monthBalance ?? 0);
}

function remainingLimitOf(fund) {
  return roundMoney(monthlyLimitOf(fund) - spentThisMonthOf(fund));
}

function spentPercentOf(fund) {
  const limit = monthlyLimitOf(fund);
  if (!limit) {
    return 0;
  }
  return Math.round(spentThisMonthOf(fund) / limit * 100);
}

function priorityBadge(fund) {
  const priority = clamp(Number(fund.priority) || 1, 1, 5);
  return PRIORITY_LABELS[priority] || `Приоритет ${priority}`;
}

function priorityLevel(fund) {
  return clamp(Number(fund.priority) || 1, 1, 5);
}

function currentMonthIncome() {
  const briefIncome = Number(state.monthBriefs?.[state.currentMonthKey]?.monthlyIncome) || 0;
  if (briefIncome > 0) {
    return briefIncome;
  }

  const briefingIncome = Number(state.briefing?.answers?.monthlyIncome) || 0;
  if (briefingIncome > 0) {
    return briefingIncome;
  }

  return roundMoney(state.history
    .filter((item) => item.periodKey === state.currentMonthKey && item.type === "Доход")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0));
}

function requiredPaymentsTotal() {
  const briefRequired = Number(state.monthBriefs?.[state.currentMonthKey]?.requiredPayments) || 0;
  if (briefRequired > 0) {
    return roundMoney(briefRequired);
  }

  return roundMoney(state.funds
    .filter(isRequiredFund)
    .reduce((sum, fund) => sum + Number(fund.minPayment || fund.monthTarget || 0), 0));
}

function minimumLifeExpensesTotal() {
  const briefLife = Number(state.monthBriefs?.[state.currentMonthKey]?.minimumLifeExpenses) || 0;
  if (briefLife > 0) {
    return roundMoney(briefLife);
  }

  return roundMoney(state.funds
    .filter((fund) => normalizeCategory(fund.category) === "Жизнь и быт")
    .reduce((sum, fund) => sum + Number(fund.monthTarget || 0), 0));
}

function monthHasOverdue() {
  return Boolean(state.monthBriefs?.[state.currentMonthKey]?.hasOverdue)
    || state.funds.some((fund) => Boolean(fund.hasOverdue));
}

function calculateMonthlyFinance() {
  const monthlyIncome = roundMoney(currentMonthIncome());
  const requiredPayments = requiredPaymentsTotal();
  const minimumLifeExpenses = minimumLifeExpensesTotal();
  const requiredPercent = monthlyIncome > 0 ? roundMoney(requiredPayments / monthlyIncome * 100) : requiredPayments > 0 ? 100 : 0;
  const hasOverdue = monthHasOverdue();
  const mode = hasOverdue || requiredPercent >= 70
    ? "Антикризисный"
    : requiredPercent >= 50
      ? "Стабилизация"
      : "Развитие";
  const freeBalance = roundMoney(monthlyIncome - requiredPayments - minimumLifeExpenses);
  const systemPausedFunds = state.funds.filter((fund) => isSystemPauseRecommended(fund, mode));

  return {
    monthlyIncome,
    requiredPayments,
    minimumLifeExpenses,
    requiredPercent,
    hasOverdue,
    mode,
    freeBalance,
    systemPausedFunds
  };
}

function isSystemPauseRecommended(fund, mode = calculateMonthlyFinance().mode) {
  if (isProtectedFromSystemPause(fund)) {
    return false;
  }

  return isFundListedInMonthBrief(fund, "pausedFunds")
    || (mode === "Антикризисный"
      && Number(fund.priority) >= 1
      && Number(fund.priority) <= 3);
}

function isSystemPauseDismissed(fund) {
  return Array.isArray(fund.systemPauseDismissedMonths)
    && fund.systemPauseDismissedMonths.includes(state.currentMonthKey);
}

function isFundSystemPaused(fund, finance = calculateMonthlyFinance()) {
  return isSystemPauseRecommended(fund, finance.mode) && !isSystemPauseDismissed(fund);
}

function isFundPaused(fund, finance = calculateMonthlyFinance()) {
  return Boolean(fund.isFrozen) || isFundSystemPaused(fund, finance);
}

function systemPauseReason(fund, finance = calculateMonthlyFinance()) {
  const overdueDebt = state.funds.find((item) => isDebtFund(item) && item.hasOverdue);
  if (overdueDebt) {
    return "Антикризис: сначала закройте просрочку.";
  }
  const dangerDebt = state.funds
    .filter(isDebtFund)
    .sort((a, b) => Number(b.annualRate || 0) - Number(a.annualRate || 0))[0];
  if (dangerDebt && Number(dangerDebt.annualRate || 0) > 40) {
    return "Антикризис: сначала снизьте дорогой долг.";
  }
  return `${finance.mode}: сначала защитите обязательные платежи.`;
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
  renderFinanceMode();
  renderFreeBalance();
  renderFinanceWarnings();
  renderRequiredIncome();
  renderOverflow();
  renderFunds();
  renderDistribution();
  renderMonthList();
  renderHistory();
  saveState();
  maybeOfferBriefing();
}

function renderFinanceMode() {
  if (!els.financeModePanel) {
    return;
  }

  const finance = calculateMonthlyFinance();
  const pausedFunds = finance.systemPausedFunds
    .filter((fund) => isFundSystemPaused(fund, finance))
    .map((fund) => fund.name);
  const collapsed = collapsedFinancePanels.has("mode");
  const gaugeValue = Math.min(100, Math.max(0, Math.round(finance.requiredPercent)));
  const heroCopy = finance.mode === "Антикризисный"
    ? "Система временно замораживает низкие приоритеты, чтобы защитить обязательные платежи."
    : finance.mode === "Стабилизация"
      ? "Держим фокус на обязательных платежах и аккуратно двигаем цели."
      : "Можно активнее пополнять резерв, цели и развитие.";
  els.financeModePanel.className = `finance-card finance-mode-panel mode-${finance.mode === "Антикризисный" ? "crisis" : finance.mode === "Стабилизация" ? "stable" : "growth"} ${collapsed ? "is-collapsed" : ""}`;
  els.financeModePanel.innerHTML = collapsed
    ? renderCollapsedFinanceCard("mode", "Режим", finance.mode, `${finance.requiredPercent}%`)
    : `
      <div class="mode-copy">
        <span>Текущий режим</span>
        <strong>${escapeHtml(finance.mode)}</strong>
        <p><b>${finance.requiredPercent}%</b> дохода уходит на обязательные платежи.</p>
        <p>${escapeHtml(heroCopy)}</p>
        ${pausedFunds.length ? `<small>На паузе: ${escapeHtml(pausedFunds.slice(0, 4).join(", "))}${pausedFunds.length > 4 ? "..." : ""}</small>` : ""}
      </div>
      <div class="mode-gauge" style="--gauge-angle: ${roundMoney(gaugeValue * 1.8)}deg">
        <div class="mode-gauge-arc"></div>
        <strong>${finance.requiredPercent}%</strong>
        <span>долговая нагрузка</span>
      </div>
      <div class="mode-action">
        <button class="icon-btn compact-icon" type="button" data-collapse-finance-panel="mode" aria-label="Скрыть режим">×</button>
        <button class="ghost-btn compact" type="button">Подробнее о режиме</button>
      </div>
    `;
}

function renderFreeBalance() {
  if (!els.freeBalancePanel) {
    return;
  }

  const finance = calculateMonthlyFinance();
  const collapsed = collapsedFinancePanels.has("balance");
  const title = finance.freeBalance < 0 ? "Остатка нет" : "Свободно";
  els.freeBalancePanel.className = `finance-card free-balance-panel ${finance.freeBalance < 0 ? "is-negative" : "is-positive"} ${collapsed ? "is-collapsed" : ""}`;
  els.freeBalancePanel.innerHTML = collapsed
    ? renderCollapsedFinanceCard("balance", title, money(finance.freeBalance), "Остаток")
    : `
      <div class="finance-card-head">
        <span>${title}</span>
        <button class="icon-btn compact-icon" type="button" data-collapse-finance-panel="balance" aria-label="Скрыть свободный остаток">×</button>
      </div>
      <div class="finance-card-main">
        <strong>${money(finance.freeBalance)}</strong>
      </div>
      <p>${finance.freeBalance < 0
        ? "Новые покупки на паузу: нужен доход, перенос платежа или реструктуризация."
        : "Можно распределить между резервом, целями и досрочным погашением."}</p>
    `;
}

function financeWarnings() {
  const finance = calculateMonthlyFinance();
  const warnings = [];
  const percent = totalPercent();
  if (!isDistributionValid()) {
    warnings.push(`Распределение невозможно: сумма процентов = ${percent}%. Нужно 100%.`);
  }
  if (finance.requiredPercent >= 70) {
    warnings.push(`Высокая долговая нагрузка: ${finance.requiredPercent}%. Включен антикризисный режим.`);
  }

  state.funds.filter(isDebtFund).forEach((fund) => {
    const debt = debtCalculations(fund);
    if (debt.annualRate > 40) {
      warnings.push(`Опасный долг: ${fund.name} со ставкой выше 40% годовых. Проверьте возможность реструктуризации.`);
    }
    if (debt.minPayment > 0 && debt.debtBalance > 0 && (debt.principalPayment <= 0 || debt.principalPayment < debt.minPayment * 0.3)) {
      warnings.push(`Платеж ${money(debt.minPayment)} по ${fund.name} почти не снижает долг. При ставке ${debt.annualRate}% долг ${money(debt.debtBalance)} начисляет около ${money(debt.monthlyInterest)} процентов в месяц. Минимальный платеж может не уменьшать тело долга.`);
    }
  });

  if (finance.mode === "Антикризисный") {
    state.funds
      .filter((fund) => isSystemPauseRecommended(fund, finance.mode) && isSystemPauseDismissed(fund) && Number(fund.percent || 0) > 0)
      .forEach((fund) => {
        warnings.push(`Фонд низкого приоритета: ${fund.name}. В антикризисном режиме лучше направить деньги в проблемный долг.`);
      });
  }

  return [...new Set(warnings)];
}

function warningSeverity(warning) {
  return /невозможно|опасн|высок|не снижает|антикризис/i.test(warning) ? "critical" : "warning";
}

function renderFinanceWarnings() {
  if (!els.financeWarningsPanel) {
    return;
  }

  const warnings = financeWarnings();
  els.financeWarningsPanel.classList.toggle("is-hidden", !warnings.length);
  if (!warnings.length) {
    els.financeWarningsPanel.innerHTML = "";
    return;
  }

  const collapsed = collapsedFinancePanels.has("warnings");
  const visibleWarnings = areWarningsExpanded ? warnings : warnings.slice(0, 2);
  const hasHiddenWarnings = warnings.length > visibleWarnings.length;
  els.financeWarningsPanel.className = `finance-card finance-warnings-panel ${collapsed ? "is-collapsed" : ""}`;
  els.financeWarningsPanel.innerHTML = collapsed
    ? renderCollapsedFinanceCard("warnings", "Предупреждения", String(warnings.length), "Открыть")
    : `
      <div class="finance-card-head">
        <span>${warnings.length === 1 ? "1 предупреждение" : `${warnings.length} предупреждения`}</span>
        <button class="icon-btn compact-icon" type="button" data-collapse-finance-panel="warnings" aria-label="Скрыть предупреждения">×</button>
      </div>
      <ol class="finance-warning-list">
        ${visibleWarnings.map((warning) => `<li class="is-${warningSeverity(warning)}">${escapeHtml(warning)}</li>`).join("")}
      </ol>
      ${hasHiddenWarnings || areWarningsExpanded
        ? `<button class="ghost-btn compact warning-toggle" type="button" data-toggle-warnings>${areWarningsExpanded ? "Скрыть" : "Показать все"}</button>`
        : ""}
    `;
}

function renderCollapsedFinanceCard(key, label, value, meta) {
  return `
    <button class="finance-card-toggle" type="button" data-expand-finance-panel="${key}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(meta)}</small>
    </button>
  `;
}

function toggleFinancePanel(key, collapsed) {
  if (collapsed) {
    collapsedFinancePanels.add(key);
  } else {
    collapsedFinancePanels.delete(key);
  }
  writeCollapsedFinancePanels();
  renderFinanceMode();
  renderFreeBalance();
  renderFinanceWarnings();
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

  const finance = calculateMonthlyFinance();
  const active = activeFunds();
  const monthTarget = active.reduce((sum, fund) => sum + Number(fund.monthTarget || 0), 0);
  const monthBalance = active.reduce((sum, fund) => sum + Number(fund.monthBalance || 0), 0);
  const remaining = Math.max(0, roundMoney(monthTarget - monthBalance));
  const progress = monthTarget ? Math.min(100, Math.round(monthBalance / monthTarget * 100)) : 0;
  els.monthSummaryCard.innerHTML = `
    <div class="kpi-card kpi-income">
      <span>Доход за месяц</span>
      <strong>${money(finance.monthlyIncome)}</strong>
      <small>ожидаемый доход</small>
    </div>
    <div class="kpi-card kpi-required">
      <span>Обязательные платежи</span>
      <strong>${money(finance.requiredPayments)}</strong>
      <small>${finance.requiredPercent}% от дохода</small>
    </div>
    <div class="kpi-card kpi-life">
      <span>Минимум на жизнь</span>
      <strong>${money(finance.minimumLifeExpenses)}</strong>
      <small>базовые расходы</small>
    </div>
    <div class="kpi-card ${finance.freeBalance < 0 ? "kpi-negative" : "kpi-positive"}">
      <span>Свободный остаток</span>
      <strong>${money(finance.freeBalance)}</strong>
      <small>на этот месяц</small>
    </div>
    <div class="kpi-card kpi-progress">
      <span>Прогресс</span>
      <strong>${progress}%</strong>
      <small>выполнено</small>
    </div>
  `;
}

function requiredIncomeSummary(includeFrozen = false) {
  const finance = calculateMonthlyFinance();
  const funds = state.funds.filter((fund) => includeFrozen || !isFundPaused(fund, finance));
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
  const finance = calculateMonthlyFinance();
  const hasFrozen = state.funds.some((fund) => isFundPaused(fund, finance));
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
  const finance = calculateMonthlyFinance();
  return {
    balance: roundMoney(funds.reduce((sum, fund) => sum + Number(fund.balance || 0), 0)),
    monthTarget: roundMoney(funds.reduce((sum, fund) => sum + Number(fund.monthTarget || 0), 0)),
    percent: roundMoney(funds.filter((fund) => !isFundPaused(fund, finance)).reduce((sum, fund) => sum + Number(fund.percent || 0), 0))
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
  if (["spending", "required"].includes(fund.fundType)) {
    return monthlyLimitOf(fund) > 0 && spentThisMonthOf(fund) <= monthlyLimitOf(fund);
  }
  if (isDebtFund(fund)) {
    return debtCalculations(fund).debtBalance <= 0;
  }
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
  const fundType = normalizeFundType(fund.fundType || fund.type, fund);
  const progress = ["spending", "required"].includes(fundType) ? Math.min(100, Math.max(0, spentPercentOf(fund))) : progressOf(fund);
  const complete = fundIsComplete(fund);
  const finance = calculateMonthlyFinance();
  const isSystemPaused = isFundSystemPaused(fund, finance);
  const paused = isFundPaused(fund, finance);
  const pauseLabel = isSystemPaused ? "Пауза системой" : "Пауза";
  const pauseReason = isSystemPaused ? systemPauseReason(fund, finance) : fund.pauseReason || "ручная пауза пользователя.";
  const debt = debtCalculations(fund);
  return `
      <article class="fund-card fund-card-${fundType} ${paused ? "is-frozen" : ""} ${isSystemPaused ? "is-system-paused" : ""} ${complete ? "is-complete" : ""} ${debt.annualRate > 40 ? "is-high-rate" : ""}" data-fund-card="${fund.id}" style="--fund-color: ${fund.color}" tabindex="0">
        <div class="fund-head">
          <div class="fund-icon">${escapeHtml(fund.icon)}</div>
          <div class="fund-title">
            <h3>${escapeHtml(fund.name)}</h3>
            <div class="fund-badges">
              <span class="fund-badge">${escapeHtml(fundTypeLabel(fundType))}</span>
              <span class="fund-badge priority-badge priority-${priorityLevel(fund)}">${escapeHtml(priorityBadge(fund))}</span>
              ${debt.annualRate > 40 ? `<span class="fund-badge high-rate-badge">Высокая ставка</span>` : ""}
              ${paused ? `<span class="fund-badge pause-badge">${pauseLabel}</span>` : ""}
            </div>
          </div>
          <div class="fund-actions">
            ${complete ? `<span class="complete-check" aria-label="Готово">✓</span>` : ""}
            ${isSystemPaused ? `<button class="icon-btn" type="button" data-dismiss-system-pause="${fund.id}" aria-label="Снять системную паузу с ${escapeHtml(fund.name)}">▶</button>` : ""}
            <button class="icon-btn" type="button" data-edit="${fund.id}" aria-label="Редактировать ${escapeHtml(fund.name)}">✎</button>
            <button class="icon-btn" type="button" data-delete="${fund.id}" aria-label="Удалить ${escapeHtml(fund.name)}">×</button>
          </div>
        </div>
        ${paused ? `
          <div class="fund-pause-note">
            <strong>${pauseLabel}</strong>
            <span>${escapeHtml(pauseReason)}</span>
          </div>
        ` : ""}
        ${renderFundCardBody(fund, fundType, progress)}
        ${renderFundQuickActions(fund, fundType)}
      </article>
    `;
}

function renderFundCardBody(fund, fundType, progress) {
  if (fundType === "debt") {
    const debt = debtCalculations(fund);
    const weakPayment = debt.minPayment > 0 && debt.debtBalance > 0 && (debt.principalPayment <= 0 || debt.principalPayment < debt.minPayment * 0.3);
    return `
      <div class="fund-main-metric">
        <span>Остаток долга</span>
        <strong>${money(debt.debtBalance)}</strong>
      </div>
      <div class="fund-money debt-money">
        <div class="metric-emphasis">
          <span>Мин. платеж</span>
          <strong>${money(debt.minPayment)}</strong>
        </div>
        <div class="metric-emphasis">
          <span>Дата платежа</span>
          <strong>${escapeHtml(fund.paymentDate || "-")}</strong>
        </div>
        <div>
          <span>Ставка</span>
          <strong>${debt.annualRate}%</strong>
        </div>
        <div>
          <span>Проценты / тело</span>
          <strong>${money(debt.monthlyInterest)} / ${money(Math.max(0, debt.principalPayment))}</strong>
        </div>
      </div>
      ${debt.annualRate > 40 ? `<div class="limit-warning is-critical">Высокая ставка. Проверьте досрочное погашение или реструктуризацию.</div>` : ""}
      ${weakPayment ? `<div class="limit-warning">Платеж почти не снижает долг</div>` : ""}
      <div class="fund-footer strong-footer">
        <span>${escapeHtml(debtForecastText(fund))}</span>
      </div>
    `;
  }

  if (fundType === "spending" || fundType === "required") {
    const remaining = remainingLimitOf(fund);
    const over = Math.abs(Math.min(0, remaining));
    return `
      <div class="fund-main-metric ${remaining < 0 ? "is-danger" : "is-ok"}">
        <span>${remaining < 0 ? "Превышение" : "Осталось"}</span>
        <strong>${money(Math.abs(remaining))}</strong>
      </div>
      <div class="fund-money spending-money">
        <div>
          <span>Лимит месяца</span>
          <strong>${money(monthlyLimitOf(fund))}</strong>
        </div>
        <div>
          <span>Потрачено</span>
          <strong>${money(spentThisMonthOf(fund))}</strong>
        </div>
        <div>
          <span>Израсходовано</span>
          <strong>${spentPercentOf(fund)}%</strong>
        </div>
      </div>
      ${remaining < 0 ? `<div class="limit-warning is-critical">Лимит превышен на ${money(over)}</div>` : ""}
      <div class="progress-track">
        <span class="progress-fill" style="--progress: ${Math.min(100, Math.max(0, progress))}%"></span>
      </div>
      <div class="fund-footer">
        <span>${fund.percent}% распределения</span>
        <span>${escapeHtml(fund.category)}</span>
      </div>
    `;
  }

  const remaining = remainingOf(fund);
  return `
    <div class="fund-main-metric">
      <span>Собрано</span>
      <strong>${money(fund.balance || 0)}</strong>
    </div>
    <div class="fund-money">
      <div>
        <span>Цель</span>
        <strong>${money(fund.target || 0)}</strong>
      </div>
      <div>
        <span>Осталось</span>
        <strong>${money(remaining)}</strong>
      </div>
      <div>
        <span>Прогресс</span>
        <strong>${progress}%</strong>
      </div>
    </div>
    <div class="progress-track">
      <span class="progress-fill" style="--progress: ${progress}%"></span>
    </div>
    <div class="fund-footer">
      <span>${forecastFor(fund)}</span>
      <span>${fund.percent}%</span>
    </div>
  `;
}

function renderFundQuickActions(fund, fundType) {
  const primaryAction = fundType === "debt" ? "paid" : fundType === "spending" || fundType === "required" ? "spend" : "topup";
  const primaryLabel = {
    topup: "Пополнить",
    spend: "Списать",
    paid: "Оплатил"
  }[primaryAction];
  const secondary = ["topup", "spend", "paid", "pause"].filter((action) => action !== primaryAction);
  return `
    <div class="fund-quick-actions">
      <button class="primary-action" type="button" data-fund-action="${primaryAction}" data-fund-action-id="${fund.id}">${primaryLabel}</button>
      <details class="fund-more-actions">
        <summary>Еще</summary>
        <div>
          ${secondary.map((action) => `
            <button type="button" data-fund-action="${action}" data-fund-action-id="${fund.id}">${action === "pause" ? fund.isFrozen ? "Вернуть" : "Пауза" : actionLabel(action)}</button>
          `).join("")}
        </div>
      </details>
    </div>
  `;
}

function renderDistribution() {
  const funds = sortedFunds();
  const finance = calculateMonthlyFinance();
  const active = funds.filter((fund) => !isFundPaused(fund, finance));
  let cursor = 0;
  const slices = active.map((fund) => {
    const from = cursor;
    cursor += fund.percent;
    return `${fund.color} ${from}% ${cursor}%`;
  });

  els.donutChart.style.background = slices.length ? `conic-gradient(${slices.join(", ")})` : "conic-gradient(#37d399 0 100%)";
  els.donutTotal.textContent = `${totalPercent()}%`;
  els.distributionLabel.textContent = isDistributionValid() ? "готово" : "требует настройки";
  els.distributionToggleBtn.textContent = isDistributionExpanded ? "Свернуть распределение" : "Развернуть распределение";
  els.donutWrap.classList.toggle("is-hidden", !isDistributionExpanded);
  els.distributionLegend.classList.toggle("is-hidden", !isDistributionExpanded);
  const topFunds = active
    .filter((fund) => Number(fund.percent || 0) > 0)
    .sort((a, b) => Number(b.percent || 0) - Number(a.percent || 0))
    .slice(0, 3);
  els.distributionCompact.innerHTML = `
    <div>
      <span>В фондах</span>
      <strong>${totalPercent()}%</strong>
    </div>
    <div>
      <span>Активно</span>
      <strong>${active.length}</strong>
    </div>
    <div class="top-distribution">
      <span>Топ-3</span>
      ${topFunds.length ? topFunds.map((fund) => `
        <b><i class="legend-dot" style="--dot: ${fund.color}"></i>${escapeHtml(fund.name)} ${fund.percent}%</b>
      `).join("") : "<b>Нет активных фондов</b>"}
    </div>
  `;
  els.distributionLegend.innerHTML = funds.map((fund) => `
    <div class="legend-row">
      <i class="legend-dot" style="--dot: ${fund.color}"></i>
      <span>${escapeHtml(fund.name)}</span>
      <strong>${isFundPaused(fund, finance) ? "пауза" : `${fund.percent}%`}</strong>
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
  const finance = calculateMonthlyFinance();
  if (finance.mode === "Антикризисный" && fundsToAllocate.some((fund) => isSystemPauseRecommended(fund, finance.mode))) {
    showToast("Фонд низкого приоритета. В антикризисном режиме лучше направить деньги в проблемный долг.");
  }
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
  els.fundType.value = normalizeFundType(fund?.fundType || fund?.type, fund);
  els.fundBalance.value = fund?.balance ?? 0;
  els.fundTarget.value = fund?.target ?? 0;
  els.fundMonthTarget.value = fund?.monthTarget ?? suggestMonthTarget(fund);
  els.fundPercent.value = fund?.percent ?? 0;
  els.fundPriority.value = fund?.priority ?? state.funds.length + 1;
  els.fundCategory.value = normalizeCategory(fund?.category || inferFundCategory(fund));
  els.fundDescription.value = fund?.description || "";
  els.fundDebtBalance.value = fund?.debtBalance ?? "";
  els.fundAnnualRate.value = fund?.annualRate ?? "";
  els.fundMinPayment.value = fund?.minPayment ?? "";
  els.fundPaymentDate.value = fund?.paymentDate || "";
  els.fundHasOverdue.checked = Boolean(fund?.hasOverdue);
  els.fundExtraPayment.value = fund?.extraPayment ?? "";
  els.fundDebtType.value = normalizeDebtType(fund?.debtType || fund?.type);
  els.fundModal.showModal();
}

function saveFundFromForm() {
  if (!canChangeData()) {
    return;
  }

  const previousFund = state.funds.find((fund) => fund.id === els.fundId.value);
  const category = normalizeCategory(els.fundCategory.value);
  const debtBalance = roundMoney(els.fundDebtBalance.value);
  const annualRate = roundMoney(els.fundAnnualRate.value);
  const minPayment = roundMoney(els.fundMinPayment.value);
  const fundType = normalizeFundType(els.fundType.value, { category, debtBalance, annualRate, minPayment });
  const isDebt = fundType === "debt" || category === "Кредиты" || debtBalance > 0 || annualRate > 0 || minPayment > 0;
  const monthTarget = roundMoney(els.fundMonthTarget.value);
  const data = {
    id: els.fundId.value || createId(),
    name: els.fundName.value.trim(),
    icon: els.fundIcon.value.trim() || "◌",
    color: els.fundColor.value,
    fundType: isDebt ? "debt" : fundType,
    balance: roundMoney(els.fundBalance.value),
    monthBalance: state.funds.find((fund) => fund.id === els.fundId.value)?.monthBalance || 0,
    monthlyLimit: fundType === "spending" || fundType === "required" ? monthTarget : 0,
    spentThisMonth: previousFund?.spentThisMonth || 0,
    monthTarget,
    target: roundMoney(els.fundTarget.value),
    percent: roundMoney(els.fundPercent.value),
    priority: Number(els.fundPriority.value) || 1,
    category,
    description: els.fundDescription.value.trim(),
    type: isDebt ? "debt" : previousFund?.type || fundType || "custom",
    isFrozen: Boolean(previousFund?.isFrozen),
    pauseType: previousFund?.pauseType || null,
    pauseReason: previousFund?.pauseReason || "",
    systemPauseDismissedMonths: previousFund?.systemPauseDismissedMonths || [],
    debtBalance,
    annualRate,
    minPayment,
    paymentDate: els.fundPaymentDate.value.trim(),
    hasOverdue: els.fundHasOverdue.checked,
    extraPayment: roundMoney(els.fundExtraPayment.value),
    debtType: normalizeDebtType(els.fundDebtType.value)
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

function dismissSystemPause(id) {
  if (!canChangeData()) {
    return;
  }

  const fund = state.funds.find((item) => item.id === id);
  if (!fund) {
    return;
  }

  const confirmed = confirm("Фонд низкого приоритета. В антикризисном режиме лучше направить деньги в проблемный долг. Снять системную паузу на этот месяц?");
  if (!confirmed) {
    return;
  }

  fund.systemPauseDismissedMonths = [...new Set([...(fund.systemPauseDismissedMonths || []), state.currentMonthKey])];
  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: "Система",
    amount: 0,
    periodKey: state.currentMonthKey,
    comment: `Системная пауза снята с фонда «${fund.name}» на текущий месяц`
  });
  showToast("Системная пауза снята на текущий месяц.");
  render();
}

function applyFundAction(id, action) {
  if (!canChangeData()) {
    return;
  }

  const fund = state.funds.find((item) => item.id === id);
  if (!fund) {
    return;
  }

  if (action === "pause") {
    fund.isFrozen = !fund.isFrozen;
    fund.pauseType = fund.isFrozen ? "manual" : null;
    fund.pauseReason = fund.isFrozen ? "Ручная пауза с карточки фонда." : "";
    state.history.push({
      id: createId(),
      date: new Date().toISOString(),
      type: "Система",
      amount: 0,
      periodKey: state.currentMonthKey,
      comment: `${fund.isFrozen ? "Поставлен на паузу" : "Снят с паузы"} фонд «${fund.name}»`
    });
    showToast(fund.isFrozen ? "Фонд на паузе." : "Фонд снова активен.");
    render();
    return;
  }

  const amount = roundMoney(prompt(`Сумма для операции «${actionLabel(action)}» по фонду «${fund.name}»`, ""));
  if (amount <= 0) {
    return;
  }

  const fundType = normalizeFundType(fund.fundType || fund.type, fund);
  let historyType = actionLabel(action);
  let comment = `${historyType}: «${fund.name}»`;
  if (action === "topup") {
    fund.balance = roundMoney(Number(fund.balance || 0) + amount);
    fund.monthBalance = roundMoney(Number(fund.monthBalance || 0) + amount);
  } else if (action === "spend") {
    fund.spentThisMonth = roundMoney(spentThisMonthOf(fund) + amount);
    if (fundType !== "spending" && fundType !== "required") {
      fund.balance = Math.max(0, roundMoney(Number(fund.balance || 0) - amount));
    }
  } else if (action === "paid") {
    if (fundType === "debt") {
      fund.debtBalance = Math.max(0, roundMoney(debtCalculations(fund).debtBalance - amount));
      fund.monthBalance = roundMoney(Number(fund.monthBalance || 0) + amount);
      fund.balance = roundMoney(Number(fund.balance || 0) + amount);
      comment = `Оплачен долг «${fund.name}»`;
    } else {
      fund.spentThisMonth = roundMoney(spentThisMonthOf(fund) + amount);
      fund.monthBalance = roundMoney(Number(fund.monthBalance || 0) + amount);
    }
  }

  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: historyType,
    amount,
    periodKey: state.currentMonthKey,
    comment
  });
  showToast(`${historyType}: ${money(amount)}.`);
  render();
}

function actionLabel(action) {
  return {
    topup: "Пополнение",
    spend: "Списание",
    paid: "Оплатил",
    pause: "Пауза"
  }[action] || "Операция";
}

function openFundDetails(fund) {
  if (!fund) {
    return;
  }

  const totalProgress = progressOf(fund);
  const monthProgress = monthProgressOf(fund);
  const debt = debtCalculations(fund);
  const finance = calculateMonthlyFinance();
  const paused = isFundPaused(fund, finance);
  const isSystemPaused = isFundSystemPaused(fund, finance);
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

    ${isDebtFund(fund) ? `
      <div class="detail-grid debt-detail-grid">
        <div class="detail-box">
          <span>Остаток долга</span>
          <strong>${money(debt.debtBalance)}</strong>
        </div>
        <div class="detail-box">
          <span>Ставка</span>
          <strong>${debt.annualRate}%</strong>
        </div>
        <div class="detail-box">
          <span>Проценты в месяц</span>
          <strong>${money(debt.monthlyInterest)}</strong>
        </div>
        <div class="detail-box">
          <span>Минимальный платеж</span>
          <strong>${money(debt.minPayment)}</strong>
        </div>
        <div class="detail-box">
          <span>Гасится тело</span>
          <strong>${money(debt.principalPayment)}</strong>
        </div>
        <div class="detail-box">
          <span>Дата платежа</span>
          <strong>${escapeHtml(fund.paymentDate || "-")}</strong>
        </div>
      </div>
    ` : ""}

    ${paused ? `
      <div class="detail-warning">
        <strong>${isSystemPaused ? "На паузе системой" : "На паузе вручную"}</strong>
        <span>Причина: ${escapeHtml(isSystemPaused ? systemPauseReason(fund, finance) : fund.pauseReason || "ручная пауза пользователя.")}</span>
      </div>
    ` : ""}

    <p class="detail-description">${escapeHtml(fund.description || "Без описания")}</p>
    <div class="detail-row">
      <span>${forecastFor(fund)}</span>
      <span>${escapeHtml(fund.category)} · ${paused ? "заморожен" : `${fund.percent}% дохода`} · приоритет ${fund.priority}</span>
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
  state.funds = state.funds.map((fund) => ({ ...fund, monthBalance: 0, spentThisMonth: 0 }));
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
    monthBalance: 0,
    spentThisMonth: 0
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

  openMonthReport();
}

function openMonthReport() {
  if (!els.monthReportModal) {
    createNextMonthFromReport();
    return;
  }

  const report = buildMonthReport();
  els.monthReportTitle.textContent = `${report.label} закрывается`;
  els.monthReportContent.innerHTML = renderMonthReport(report);
  els.monthReportModal.showModal();
}

function createNextMonthFromReport() {
  const closedMonth = archiveMonth(state);
  state.currentMonthKey = nextMonthKey(state.currentMonthKey);
  state.funds = state.funds.map((fund) => ({ ...fund, monthBalance: 0, spentThisMonth: 0 }));
  showToast(`Месяц ${closedMonth.label} сохранен. Открыт ${monthLabel(state.currentMonthKey)}.`);
  render();
  openMonthBrief();
}

function buildMonthReport() {
  const finance = calculateMonthlyFinance();
  const funds = state.funds.map((fund) => ({ ...fund, fundType: normalizeFundType(fund.fundType || fund.type, fund) }));
  const buckets = {
    required: funds.filter((fund) => fund.fundType === "required" || normalizeCategory(fund.category) === "Обязательные платежи"),
    debt: funds.filter((fund) => fund.fundType === "debt" || isDebtFund(fund)),
    comfort: funds.filter((fund) => fund.fundType === "spending" || ["Комфорт", "Жизнь и быт"].includes(normalizeCategory(fund.category))),
    reserve: funds.filter((fund) => fund.fundType === "reserve" || normalizeCategory(fund.category) === "Резерв"),
    goals: funds.filter((fund) => ["saving", "business"].includes(fund.fundType) || ["Бизнес", "Хотелки", "Другое"].includes(normalizeCategory(fund.category)))
  };
  const amountFor = (fund) => fund.fundType === "spending" ? spentThisMonthOf(fund) : Number(fund.monthBalance || 0);
  const sum = (items) => roundMoney(items.reduce((total, fund) => total + amountFor(fund), 0));
  const completedFunds = funds.filter((fund) => {
    if (fund.fundType === "debt") {
      return debtCalculations(fund).debtBalance <= 0;
    }
    if (["spending", "required"].includes(fund.fundType)) {
      return monthlyLimitOf(fund) > 0 && spentThisMonthOf(fund) <= monthlyLimitOf(fund);
    }
    return Number(fund.target || 0) > 0 && Number(fund.balance || 0) >= Number(fund.target || 0);
  });
  const missedFunds = funds.filter((fund) => {
    if (fund.fundType === "debt") {
      return debtCalculations(fund).debtBalance > 0 && debtCalculations(fund).principalPayment <= 0;
    }
    if (["spending", "required"].includes(fund.fundType)) {
      return remainingLimitOf(fund) < 0;
    }
    return Number(fund.monthTarget || 0) > 0 && Number(fund.monthBalance || 0) < Number(fund.monthTarget || 0);
  });
  const missing = roundMoney(missedFunds.reduce((total, fund) => {
    if (["spending", "required"].includes(fund.fundType)) {
      return total + Math.max(0, Math.abs(Math.min(0, remainingLimitOf(fund))));
    }
    if (fund.fundType === "debt") {
      return total + Math.max(0, debtCalculations(fund).monthlyInterest - debtCalculations(fund).minPayment);
    }
    return total + Math.max(0, monthRemainingOf(fund));
  }, 0));
  const problemDebt = funds
    .filter((fund) => fund.fundType === "debt" || isDebtFund(fund))
    .sort((a, b) => Number(b.annualRate || 0) - Number(a.annualRate || 0) || debtCalculations(b).debtBalance - debtCalculations(a).debtBalance)[0];
  const paused = funds.filter((fund) => isFundPaused(fund, finance)).map((fund) => fund.name);
  const freeBalance = roundMoney(finance.monthlyIncome - finance.requiredPayments - finance.minimumLifeExpenses);

  return {
    label: monthLabel(state.currentMonthKey),
    income: finance.monthlyIncome,
    distributed: roundMoney(funds.reduce((total, fund) => total + Number(fund.monthBalance || 0), 0)),
    required: sum(buckets.required),
    debts: sum(buckets.debt),
    comfort: sum(buckets.comfort),
    reserve: sum(buckets.reserve),
    goals: sum(buckets.goals),
    completedFunds,
    missedFunds,
    missing,
    mode: finance.mode,
    freeBalance,
    problemDebt,
    recommendation: paused.length
      ? `Сохранить паузу у фондов: ${paused.slice(0, 4).join(", ")}.`
      : problemDebt
        ? `Сначала усилить платеж по фонду «${problemDebt.name}».`
        : "Сохранить текущие проценты и проверить лимиты комфортных расходов."
  };
}

function renderMonthReport(report) {
  return `
    <div class="month-report-hero">
      <strong>${escapeHtml(report.label)} закрыт в ${escapeHtml(report.mode.toLowerCase())} режиме.</strong>
      <span>Доход: ${money(report.income)}. Свободный остаток: ${money(report.freeBalance)}.</span>
    </div>
    <div class="month-report-grid">
      <div><span>Доход</span><strong>${money(report.income)}</strong></div>
      <div><span>Распределено</span><strong>${money(report.distributed)}</strong></div>
      <div><span>Обязательства</span><strong>${money(report.required)}</strong></div>
      <div><span>Долги</span><strong>${money(report.debts)}</strong></div>
      <div><span>Комфорт</span><strong>${money(report.comfort)}</strong></div>
      <div><span>Резерв</span><strong>${money(report.reserve)}</strong></div>
      <div><span>Цели</span><strong>${money(report.goals)}</strong></div>
      <div><span>Не хватило</span><strong>${money(report.missing)}</strong></div>
    </div>
    <div class="month-report-lists">
      <div>
        <span>Выполнены</span>
        <strong>${report.completedFunds.length ? escapeHtml(report.completedFunds.slice(0, 5).map((fund) => fund.name).join(", ")) : "Нет закрытых фондов"}</strong>
      </div>
      <div>
        <span>Не выполнены</span>
        <strong>${report.missedFunds.length ? escapeHtml(report.missedFunds.slice(0, 5).map((fund) => fund.name).join(", ")) : "Критичных провалов нет"}</strong>
      </div>
    </div>
    <div class="detail-warning">
      <strong>Главная проблема: ${escapeHtml(report.problemDebt?.name || report.missedFunds[0]?.name || "не выявлена")}</strong>
      <span>Рекомендация: ${escapeHtml(report.recommendation)}</span>
    </div>
  `;
}

function defaultMonthBrief(key = state.currentMonthKey) {
  return {
    key,
    monthlyIncome: currentMonthIncome(),
    requiredPayments: requiredPaymentsTotal(),
    minimumLifeExpenses: minimumLifeExpensesTotal(),
    hasOverdue: monthHasOverdue(),
    pausedFunds: calculateMonthlyFinance().systemPausedFunds.map((fund) => fund.name).join(", "),
    activeFunds: state.funds.filter(isProtectedFromSystemPause).map((fund) => fund.name).join(", "),
    completedAt: new Date().toISOString()
  };
}

function openMonthBrief() {
  if (!els.monthBriefModal) {
    return;
  }

  const existing = state.monthBriefs?.[state.currentMonthKey] || defaultMonthBrief();
  els.monthBriefTitle.textContent = `Мини-бриф: ${monthLabel(state.currentMonthKey)}`;
  els.monthBriefIncome.value = existing.monthlyIncome || "";
  els.monthBriefRequired.value = existing.requiredPayments || "";
  els.monthBriefLife.value = existing.minimumLifeExpenses || "";
  els.monthBriefOverdue.value = existing.hasOverdue ? "true" : "false";
  els.monthBriefPaused.value = existing.pausedFunds || "";
  els.monthBriefActive.value = existing.activeFunds || "";
  renderMonthBriefPreview();
  els.monthBriefModal.showModal();
}

function collectMonthBriefData() {
  return normalizeMonthBrief({
    key: state.currentMonthKey,
    monthlyIncome: roundMoney(els.monthBriefIncome.value),
    requiredPayments: roundMoney(els.monthBriefRequired.value),
    minimumLifeExpenses: roundMoney(els.monthBriefLife.value),
    hasOverdue: els.monthBriefOverdue.value === "true",
    pausedFunds: els.monthBriefPaused.value.trim(),
    activeFunds: els.monthBriefActive.value.trim(),
    completedAt: new Date().toISOString()
  }, state.currentMonthKey);
}

function previewFinanceForBrief(brief) {
  const monthlyIncome = Number(brief.monthlyIncome) || 0;
  const requiredPayments = Number(brief.requiredPayments) || 0;
  const minimumLifeExpenses = Number(brief.minimumLifeExpenses) || 0;
  const requiredPercent = monthlyIncome > 0 ? roundMoney(requiredPayments / monthlyIncome * 100) : requiredPayments > 0 ? 100 : 0;
  const mode = brief.hasOverdue || requiredPercent >= 70
    ? "Антикризисный"
    : requiredPercent >= 50
      ? "Стабилизация"
      : "Развитие";
  return {
    mode,
    requiredPercent,
    freeBalance: roundMoney(monthlyIncome - requiredPayments - minimumLifeExpenses)
  };
}

function renderMonthBriefPreview() {
  if (!els.monthBriefPreview) {
    return;
  }

  const finance = previewFinanceForBrief(collectMonthBriefData());
  els.monthBriefPreview.innerHTML = `
    <div>
      <span>Режим после брифа</span>
      <strong>${escapeHtml(finance.mode)}</strong>
    </div>
    <div>
      <span>Нагрузка</span>
      <strong>${finance.requiredPercent}%</strong>
    </div>
    <div>
      <span>Свободный остаток</span>
      <strong>${money(finance.freeBalance)}</strong>
    </div>
  `;
}

function saveMonthBrief() {
  if (!canChangeData()) {
    return;
  }

  state.monthBriefs = {
    ...(state.monthBriefs || {}),
    [state.currentMonthKey]: collectMonthBriefData()
  };
  els.monthBriefModal.close();
  showToast("Мини-бриф месяца сохранен.");
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
    debts: collectBriefingRows(els.debtList, ["balance", "monthlyPayment", "interestRate"]),
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
  const fundType = normalizeFundType(data.fundType || data.type, data);
  return {
    id: createId(),
    icon: data.icon || "◌",
    color: data.color || "#52d6ff",
    balance: data.balance || 0,
    monthBalance: 0,
    monthTarget: roundMoney(data.monthTarget || 0),
    fundType,
    monthlyLimit: ["spending", "required"].includes(fundType) ? roundMoney(data.monthTarget || 0) : 0,
    spentThisMonth: 0,
    target: roundMoney(data.target || data.monthTarget || 0),
    percent: 0,
    priority: data.priority || 3,
    name: data.name,
    description: data.description || "",
    type: data.type || fundType,
    category: normalizeCategory(data.category || inferFundCategory(data)),
    block: data.block,
    weight: Math.max(1, Number(data.weight) || 1),
    isFrozen: Boolean(data.isFrozen),
    pauseType: data.pauseType || null,
    pauseReason: data.pauseReason || "",
    systemPauseDismissedMonths: [],
    debtBalance: roundMoney(data.debtBalance),
    annualRate: roundMoney(data.annualRate),
    minPayment: roundMoney(data.minPayment),
    paymentDate: data.paymentDate || "",
    hasOverdue: Boolean(data.hasOverdue),
    extraPayment: roundMoney(data.extraPayment),
    debtType: normalizeDebtType(data.debtType)
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
      debtBalance: debt.balance || 0,
      annualRate: debt.interestRate || 0,
      minPayment: debt.monthlyPayment || 0,
      hasOverdue: debt.hasOverdue,
      debtType: {
        "Кредитная карта": "credit_card",
        "Кредит": "loan",
        "Долг человеку": "person",
        "Рассрочка": "installment"
      }[debt.type] || "other",
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
  const finalFunds = assignBriefingPercents(funds, shares).map((fund) => (
    mode.name === "Антикризисный" && fund.isFrozen
      ? {
          ...fund,
          isFrozen: false,
          pauseType: "system",
          pauseReason: "антикризисный режим"
        }
      : fund
  ));
  const frozenCount = finalFunds.filter((fund) => isSystemPauseRecommended(fund, mode.name)).length;
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
    dashboard: "Дашборд",
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

els.distributionToggleBtn?.addEventListener("click", () => {
  isDistributionExpanded = !isDistributionExpanded;
  writeBooleanPreference(DISTRIBUTION_EXPANDED_KEY, isDistributionExpanded);
  renderDistribution();
});

els.editMonthBriefBtn?.addEventListener("click", openMonthBrief);

els.monthBriefForm?.addEventListener("input", renderMonthBriefPreview);

els.monthBriefForm?.addEventListener("change", renderMonthBriefPreview);

els.monthBriefForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.monthBriefModal.close();
    return;
  }
  saveMonthBrief();
});

els.confirmMonthReportBtn?.addEventListener("click", () => {
  els.monthReportModal?.close();
  createNextMonthFromReport();
});

els.monthReportModal?.addEventListener("click", (event) => {
  if (event.target === els.monthReportModal || event.target.closest("[data-cancel-month-report]")) {
    els.monthReportModal.close();
  }
});

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

document.querySelector(".finance-alerts-row")?.addEventListener("click", (event) => {
  const collapseKey = event.target.closest("[data-collapse-finance-panel]")?.dataset.collapseFinancePanel;
  const expandKey = event.target.closest("[data-expand-finance-panel]")?.dataset.expandFinancePanel;
  const toggleWarnings = event.target.closest("[data-toggle-warnings]");
  if (collapseKey) {
    toggleFinancePanel(collapseKey, true);
    return;
  }
  if (expandKey) {
    toggleFinancePanel(expandKey, false);
    return;
  }
  if (toggleWarnings) {
    areWarningsExpanded = !areWarningsExpanded;
    renderFinanceWarnings();
  }
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
  const dismissSystemPauseId = event.target.closest("[data-dismiss-system-pause]")?.dataset.dismissSystemPause;
  const fundActionButton = event.target.closest("[data-fund-action]");
  const fundAction = fundActionButton?.dataset.fundAction;
  const fundActionId = fundActionButton?.dataset.fundActionId;
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

  if (dismissSystemPauseId) {
    dismissSystemPause(dismissSystemPauseId);
    return;
  }

  if (fundAction && fundActionId) {
    applyFundAction(fundActionId, fundAction);
    return;
  }

  if (event.target.closest(".fund-more-actions")) {
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
