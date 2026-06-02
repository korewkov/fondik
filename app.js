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
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authMessage: document.querySelector("#authMessage"),
  loginBtn: document.querySelector("#loginBtn"),
  signupBtn: document.querySelector("#signupBtn"),
  userAccount: document.querySelector("#userAccount"),
  userEmail: document.querySelector("#userEmail"),
  logoutBtn: document.querySelector("#logoutBtn"),
  navButtons: document.querySelectorAll(".nav-btn"),
  screenTitle: document.querySelector("#screenTitle"),
  screens: {
    dashboard: document.querySelector("#dashboardScreen"),
    history: document.querySelector("#historyScreen")
  },
  incomeForm: document.querySelector("#incomeForm"),
  incomeAmount: document.querySelector("#incomeAmount"),
  incomeComment: document.querySelector("#incomeComment"),
  distributeBtn: document.querySelector("#distributeBtn"),
  percentWarning: document.querySelector("#percentWarning"),
  sidebarPercent: document.querySelector("#sidebarPercent"),
  sidebarPercentHint: document.querySelector("#sidebarPercentHint"),
  fundGrid: document.querySelector("#fundGrid"),
  fundCount: document.querySelector("#fundCount"),
  donutChart: document.querySelector("#donutChart"),
  donutTotal: document.querySelector("#donutTotal"),
  distributionLabel: document.querySelector("#distributionLabel"),
  distributionLegend: document.querySelector("#distributionLegend"),
  addFundBtn: document.querySelector("#addFundBtn"),
  addMonthBtn: document.querySelector("#addMonthBtn"),
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
    currentMonthKey: monthKeyFromDate(new Date()),
    createdAt: new Date().toISOString()
  };
}

async function loadState() {
  if (!isSupabaseConfigured()) {
    storageStatus = "Supabase не настроен. Укажите url и apiKey в app.js.";
    isStorageReady = false;
    return createDefaultState();
  }

  try {
    await refreshSessionIfNeeded();
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
    currentMonthKey: value?.currentMonthKey || monthKeyFromDate(new Date()),
    createdAt: value?.createdAt || new Date().toISOString()
  };

  return ensureCurrentCalendarMonth(nextState);
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
    description: fund.description || ""
  };
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
}

function clearSession() {
  session = null;
}

async function refreshSessionIfNeeded() {
  if (!session) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - now > 60) {
    return;
  }

  const refreshed = await authRequest("/token?grant_type=refresh_token", {
    refresh_token: session.refresh_token
  });
  saveSession(refreshed);
}

async function signIn(email, password) {
  const nextSession = await authRequest("/token?grant_type=password", { email, password });
  saveSession(nextSession);
  await bootAuthenticatedApp();
  showToast("Вы вошли в систему.");
}

async function signUp(email, password) {
  const result = await authRequest("/signup", { email, password });
  if (result?.access_token) {
    saveSession(result);
    await bootAuthenticatedApp();
    showToast("Аккаунт создан.");
    return;
  }

  els.authMessage.textContent = "Аккаунт создан. Проверьте почту и подтвердите регистрацию, затем войдите.";
}

function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url.startsWith("https://") && SUPABASE_CONFIG.apiKey.length > 20;
}

function sortedFunds() {
  return [...state.funds].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, "ru"));
}

function totalPercent() {
  return roundMoney(state.funds.reduce((sum, fund) => sum + Number(fund.percent || 0), 0));
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
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
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

  els.sidebarPercent.textContent = `${percent}%`;
  els.sidebarPercentHint.textContent = valid ? "Распределение готово" : "Нужно ровно 100%";
  els.distributeBtn.disabled = !valid || !isStorageReady;
  els.percentWarning.textContent = getWarningText(percent, valid);
  els.currentMonthLabel.textContent = monthLabel(state.currentMonthKey);

  renderFunds();
  renderDistribution();
  renderMonthList();
  renderHistory();
  saveState();
}

function renderAuthState() {
  const isSignedIn = Boolean(session?.user?.id);
  els.publicShell.classList.toggle("is-hidden", isSignedIn);
  els.appShell.classList.toggle("is-hidden", !isSignedIn);
  els.authOpenBtn.classList.toggle("is-hidden", isSignedIn);
  els.userAccount.classList.toggle("is-hidden", !isSignedIn);
  els.userEmail.textContent = session?.user?.email || "";

  if (isSignedIn && els.authModal.open) {
    els.authModal.close();
  }
}

function demoAmountValue() {
  return Math.max(0, roundMoney(els.demoAmount.value));
}

function demoPercentTotal() {
  return roundMoney(demoFunds.reduce((sum, fund) => sum + Number(fund.percent || 0), 0));
}

function renderDemo(amount = demoAmountValue()) {
  const safeAmount = Math.max(0, roundMoney(amount));
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
          <input data-demo-percent="${fund.id}" type="number" min="0" step="1" value="${fund.percent}" aria-label="Процент демо-фонда">
          <span>%</span>
        </label>
        <strong data-demo-allocation="${fund.id}">${money(fund.allocation)}</strong>
      </div>
    `).join("")}
  `;
}

function updateDemoAllocations() {
  const safeAmount = demoAmountValue();
  const percentTotal = demoPercentTotal();
  const totalNode = document.querySelector("#demoTotalAmount");
  const statusNode = document.querySelector("#demoPercentStatus");

  if (totalNode) {
    totalNode.textContent = money(safeAmount);
  }

  if (statusNode) {
    statusNode.textContent = `${percentTotal}% распределения`;
    statusNode.classList.toggle("is-warning", percentTotal !== 100);
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

function renderFunds() {
  const funds = sortedFunds();
  els.fundCount.textContent = `${funds.length} фондов`;
  els.fundGrid.innerHTML = funds.map((fund) => {
    const progress = monthProgressOf(fund);
    return `
      <article class="fund-card" data-fund-card="${fund.id}" style="--fund-color: ${fund.color}" tabindex="0">
        <div class="fund-head">
          <div class="fund-icon">${escapeHtml(fund.icon)}</div>
          <div class="fund-title">
            <h3>${escapeHtml(fund.name)}</h3>
            <div class="fund-meta">${fund.percent}% дохода · месяц</div>
          </div>
          <div class="fund-actions">
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
        <div class="progress-track">
          <span class="progress-fill" style="--progress: ${progress}%"></span>
        </div>
        <div class="fund-footer">
          <span>${progress}% месяца</span>
          <span>Осталось ${money(monthRemainingOf(fund))}</span>
        </div>
        <div class="fund-footer">
          <span>${fund.percent}% от доходов</span>
          <span>Приоритет ${fund.priority}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderDistribution() {
  const funds = sortedFunds();
  let cursor = 0;
  const slices = funds.map((fund) => {
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
      <strong>${fund.percent}%</strong>
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

  const allocations = state.funds.map((fund) => {
    const value = roundMoney(amount * fund.percent / 100);
    fund.balance = roundMoney(fund.balance + value);
    fund.monthBalance = roundMoney((fund.monthBalance || 0) + value);
    return {
      fundId: fund.id,
      fundName: fund.name,
      amount: value,
      percent: fund.percent
    };
  });

  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: "Доход",
    amount,
    periodKey: state.currentMonthKey,
    comment: comment || "Распределено автоматически",
    allocations
  });

  showToast(`Распределено ${money(amount)} по ${state.funds.length} фондам.`);
  els.incomeForm.reset();
  render();
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
  els.fundDescription.value = fund?.description || "";
  els.fundModal.showModal();
}

function saveFundFromForm() {
  if (!canChangeData()) {
    return;
  }

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
    description: els.fundDescription.value.trim()
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
      <span>${fund.percent}% дохода · приоритет ${fund.priority}</span>
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

function resetAll() {
  if (!canChangeData()) {
    return;
  }

  closeResetConfirm();
  state = createDefaultState();
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
  const isAll = action === "all";
  els.resetConfirmTitle.textContent = isAll ? "Сбросить все?" : "Сбросить месяц?";
  els.resetConfirmText.textContent = isAll
    ? "Будут удалены фонды, история и месяцы. Останутся только стартовые фонды."
    : "Текущий месяц сохранится в динамике, затем месячные суммы обнулятся.";
  els.confirmResetBtn.textContent = isAll ? "Да, сбросить все" : "Да, сбросить месяц";
  els.resetConfirm.classList.remove("is-hidden");
}

function closeResetConfirm() {
  els.resetConfirm.classList.add("is-hidden");
  pendingResetAction = null;
}

function confirmPendingReset() {
  if (pendingResetAction === "all") {
    resetAll();
    return;
  }

  if (pendingResetAction === "month") {
    resetMonth();
  }
}

function switchScreen(screen) {
  Object.entries(els.screens).forEach(([key, node]) => {
    node.classList.toggle("is-visible", key === screen);
  });

  els.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === screen);
  });

  const titles = {
    dashboard: "Мои деньги",
    history: "История операций"
  };
  els.screenTitle.textContent = titles[screen];
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

function openAuthModal() {
  els.authMessage.textContent = "";
  if (!els.authModal.open) {
    els.authModal.showModal();
  }
}

els.authOpenBtn.addEventListener("click", openAuthModal);

els.authTriggerButtons.forEach((button) => {
  button.addEventListener("click", openAuthModal);
});

els.demoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateDemoAllocations();
});

els.demoAmount.addEventListener("input", () => {
  updateDemoAllocations();
});

els.demoResult.addEventListener("input", (event) => {
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
  storageStatus = "Войдите, чтобы загрузить данные из Supabase.";
  renderAuthState();
  render();
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

els.resetMenuBtn.addEventListener("click", openResetMenu);

els.resetMonthOption.addEventListener("click", () => openResetConfirm("month"));

els.resetAllOption.addEventListener("click", () => openResetConfirm("all"));

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
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const deleteId = event.target.closest("[data-delete]")?.dataset.delete;
  const cardId = event.target.closest("[data-fund-card]")?.dataset.fundCard;

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

async function initApp() {
  isBooted = true;
  renderDemo();
  if (session) {
    await bootAuthenticatedApp();
  } else {
    storageStatus = "Войдите, чтобы загрузить данные из Supabase.";
    renderAuthState();
    render();
  }
}

async function bootAuthenticatedApp() {
  renderAuthState();
  state = await loadState();
  renderAuthState();
  render();
}

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

initApp();
