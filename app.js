const SUPABASE_CONFIG = {
  // Вставьте значения из Supabase Project Settings -> API.
  url: "https://ffusacesuumigyeoshkl.supabase.co",
  apiKey: "sb_publishable_n8uU9W5EP3CqMSBoeiXO6g_3DuxrpcN",
  table: "finance_user_state"
};

const AUTH_STORAGE_KEY = "moneySystem.authSession.v1";

const defaultFunds = [
  {
    id: createId(),
    name: "Кредит за первоначальный взнос",
    icon: "🏦",
    color: "#52d6ff",
    balance: 0,
    monthBalance: 0,
    target: 300000,
    percent: 5,
    priority: 1,
    description: "Фонд для ускоренного закрытия крупной цели."
  },
  {
    id: createId(),
    name: "Кредит",
    icon: "📄",
    color: "#ffd166",
    balance: 0,
    monthBalance: 0,
    target: 120000,
    percent: 18,
    priority: 2,
    description: "Регулярное погашение основного кредита."
  },
  {
    id: createId(),
    name: "Кредитка №1",
    icon: "💳",
    color: "#ff8177",
    balance: 0,
    monthBalance: 0,
    target: 80000,
    percent: 6,
    priority: 3,
    description: "Плановое закрытие задолженности по первой карте."
  },
  {
    id: createId(),
    name: "Кредитка №2",
    icon: "💳",
    color: "#ff6b6b",
    balance: 0,
    monthBalance: 0,
    target: 100000,
    percent: 24,
    priority: 4,
    description: "Самый высокий приоритет среди кредитных карт."
  },
  {
    id: createId(),
    name: "Долг другу",
    icon: "🤝",
    color: "#a78bfa",
    balance: 0,
    monthBalance: 0,
    target: 40000,
    percent: 5,
    priority: 5,
    description: "Личный долг с отдельным контролем прогресса."
  },
  {
    id: createId(),
    name: "Бизнес",
    icon: "🚀",
    color: "#37d399",
    balance: 0,
    monthBalance: 0,
    target: 150000,
    percent: 15,
    priority: 6,
    description: "Деньги на развитие, тесты и закупки."
  },
  {
    id: createId(),
    name: "3D-принтер",
    icon: "🧊",
    color: "#4cc9f0",
    balance: 12000,
    monthBalance: 0,
    target: 35000,
    percent: 5,
    priority: 7,
    description: "Накопление на покупку оборудования."
  },
  {
    id: createId(),
    name: "Ремонт квартиры",
    icon: "🛠",
    color: "#f59e0b",
    balance: 0,
    monthBalance: 0,
    target: 250000,
    percent: 4,
    priority: 8,
    description: "Материалы, работы и небольшие улучшения."
  },
  {
    id: createId(),
    name: "Резервный фонд",
    icon: "🛡",
    color: "#2dd4bf",
    balance: 0,
    monthBalance: 0,
    target: 180000,
    percent: 10,
    priority: 9,
    description: "Подушка безопасности на несколько месяцев."
  },
  {
    id: createId(),
    name: "Комфорт",
    icon: "☕",
    color: "#f472b6",
    balance: 0,
    monthBalance: 0,
    target: 30000,
    percent: 5,
    priority: 10,
    description: "Личные радости без чувства вины."
  },
  {
    id: createId(),
    name: "Газировки и напитки",
    icon: "🥤",
    color: "#84cc16",
    balance: 0,
    monthBalance: 0,
    target: 8000,
    percent: 3,
    priority: 11,
    description: "Маленький фонд для напитков и перекусов."
  }
];

let state = createDefaultState();
let storageStatus = "Подключение к Supabase еще не настроено.";
let isStorageReady = false;
let isBooted = false;
let saveTimer;
let session = loadSavedSession();

const els = {
  authModal: document.querySelector("#authModal"),
  authOpenBtn: document.querySelector("#authOpenBtn"),
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
  statsGrid: document.querySelector("#statsGrid"),
  fundGrid: document.querySelector("#fundGrid"),
  fundCount: document.querySelector("#fundCount"),
  donutChart: document.querySelector("#donutChart"),
  donutTotal: document.querySelector("#donutTotal"),
  distributionLabel: document.querySelector("#distributionLabel"),
  distributionLegend: document.querySelector("#distributionLegend"),
  addFundBtn: document.querySelector("#addFundBtn"),
  fundModal: document.querySelector("#fundModal"),
  fundForm: document.querySelector("#fundForm"),
  fundModalTitle: document.querySelector("#fundModalTitle"),
  fundId: document.querySelector("#fundId"),
  fundName: document.querySelector("#fundName"),
  fundIcon: document.querySelector("#fundIcon"),
  fundColor: document.querySelector("#fundColor"),
  fundBalance: document.querySelector("#fundBalance"),
  fundTarget: document.querySelector("#fundTarget"),
  fundPercent: document.querySelector("#fundPercent"),
  fundPriority: document.querySelector("#fundPriority"),
  fundDescription: document.querySelector("#fundDescription"),
  historyList: document.querySelector("#historyList"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  resetMonthBtn: document.querySelector("#resetMonthBtn"),
  toast: document.querySelector("#toast")
};

function createDefaultState() {
  return {
    funds: defaultFunds.map((fund) => ({ ...fund })),
    history: [],
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
      const initialState = createDefaultState();
      await persistState(initialState);
      storageStatus = "Supabase подключен. Создана первая запись состояния.";
      isStorageReady = true;
      return initialState;
    }

    storageStatus = "Supabase подключен. Данные загружены из базы.";
    isStorageReady = true;
    return normalizeState(rows[0].data);
  } catch (error) {
    storageStatus = `Ошибка Supabase: ${error.message}`;
    isStorageReady = false;
    showToast(storageStatus);
    return createDefaultState();
  }
}

function normalizeState(value) {
  return {
    funds: Array.isArray(value?.funds) ? value.funds.map(normalizeFund) : defaultFunds.map((fund) => ({ ...fund })),
    history: Array.isArray(value?.history) ? value.history : [],
    createdAt: value?.createdAt || new Date().toISOString()
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
    target: Number(fund.target) || 0,
    percent: Number(fund.percent) || 0,
    priority: Number(fund.priority) || 1,
    description: fund.description || ""
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
      renderSettings();
    } catch (error) {
      storageStatus = `Не удалось сохранить в Supabase: ${error.message}`;
      renderSettings();
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

function loadSavedSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? normalizeSession(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
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
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
}

function clearSession() {
  session = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
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

function remainingOf(fund) {
  return Math.max(0, fund.target - fund.balance);
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

  renderStats();
  renderFunds();
  renderDistribution();
  renderHistory();
  saveState();
}

function renderAuthState() {
  const isSignedIn = Boolean(session?.user?.id);
  els.authOpenBtn.classList.toggle("is-hidden", isSignedIn);
  els.userAccount.classList.toggle("is-hidden", !isSignedIn);
  els.userEmail.textContent = session?.user?.email || "";

  if (isSignedIn && els.authModal.open) {
    els.authModal.close();
  }
}

function renderStats() {
  const capital = state.funds.reduce((sum, fund) => sum + fund.balance, 0);
  const debt = state.funds
    .filter((fund) => /кредит|долг/i.test(fund.name))
    .reduce((sum, fund) => sum + remainingOf(fund), 0);
  const goals = state.funds
    .filter((fund) => !/кредит|долг/i.test(fund.name))
    .reduce((sum, fund) => sum + fund.balance, 0);
  const business = state.funds.find((fund) => /бизнес/i.test(fund.name))?.balance || 0;
  const reserve = state.funds.find((fund) => /резерв/i.test(fund.name))?.balance || 0;

  const stats = [
    ["Общий капитал", money(capital), "#37d399"],
    ["Общий долг", money(debt), "#ff6b6b"],
    ["Накоплено на цели", money(goals), "#52d6ff"],
    ["Фонд бизнеса", money(business), "#ffd166"],
    ["Резерв", money(reserve), "#2dd4bf"]
  ];

  els.statsGrid.innerHTML = stats.map(([label, value, color]) => `
    <article class="stat-card" style="--accent: ${color}">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderFunds() {
  const funds = sortedFunds();
  els.fundCount.textContent = `${funds.length} фондов`;
  els.fundGrid.innerHTML = funds.map((fund) => {
    const progress = progressOf(fund);
    return `
      <article class="fund-card" style="--fund-color: ${fund.color}">
        <div class="fund-head">
          <div class="fund-icon">${escapeHtml(fund.icon)}</div>
          <div class="fund-title">
            <h3>${escapeHtml(fund.name)}</h3>
            <div class="fund-meta">${fund.percent}% дохода · приоритет ${fund.priority}</div>
          </div>
          <div class="fund-actions">
            <button class="icon-btn" type="button" data-edit="${fund.id}" aria-label="Редактировать ${escapeHtml(fund.name)}">✎</button>
            <button class="icon-btn" type="button" data-delete="${fund.id}" aria-label="Удалить ${escapeHtml(fund.name)}">×</button>
          </div>
        </div>
        <div class="fund-money">
          <div>
            <span>Накоплено</span>
            <strong>${money(fund.balance)}</strong>
          </div>
          <div>
            <span>Цель</span>
            <strong>${money(fund.target)}</strong>
          </div>
        </div>
        <div class="progress-track">
          <span class="progress-fill" style="--progress: ${progress}%"></span>
        </div>
        <div class="fund-footer">
          <span>${progress}% цели</span>
          <span>Осталось ${money(remainingOf(fund))}</span>
        </div>
        <div class="fund-footer">
          <span>${forecastFor(fund)}</span>
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
          ${item.allocations ? `<div class="history-meta">${item.allocations.length} начислений по фондам</div>` : ""}
        </div>
        <div class="history-amount">${money(item.amount)}</div>
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
    comment: `Удален фонд «${fund.name}»`
  });
  showToast("Фонд удален.");
  render();
}

function resetMonth() {
  if (!canChangeData()) {
    return;
  }

  const confirmed = confirm("Сбросить месячные накопления? Фонды и общие балансы сохранятся.");
  if (!confirmed) {
    return;
  }

  state.funds = state.funds.map((fund) => ({ ...fund, monthBalance: 0 }));
  state.history.push({
    id: createId(),
    date: new Date().toISOString(),
    type: "Сброс месяца",
    amount: 0,
    comment: "Месячные накопления обнулены"
  });
  showToast("Месяц сброшен.");
  render();
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

els.authOpenBtn.addEventListener("click", () => {
  els.authMessage.textContent = "";
  els.authModal.showModal();
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

els.fundGrid.addEventListener("click", (event) => {
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const deleteId = event.target.closest("[data-delete]")?.dataset.delete;

  if (editId) {
    openFundModal(state.funds.find((fund) => fund.id === editId));
  }

  if (deleteId) {
    deleteFund(deleteId);
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

els.resetMonthBtn.addEventListener("click", resetMonth);

async function initApp() {
  isBooted = true;
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
