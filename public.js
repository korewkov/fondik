const SUPABASE_CONFIG = {
  url: "https://ffusacesuumigyeoshkl.supabase.co",
  apiKey: "sb_publishable_n8uU9W5EP3CqMSBoeiXO6g_3DuxrpcN"
};

const SESSION_STORAGE_KEY = "fondik.supabase-session";
const LEGACY_SESSION_STORAGE_KEY = "money-system.supabase-session";
const SUPABASE_PROXY_PATH = "/api/supabase";

const demoFunds = [
  { id: "required", name: "Обязательные платежи", color: "#3b82f6", percent: 30 },
  { id: "reserve", name: "Резерв", color: "#14b8a6", percent: 20 },
  { id: "goals", name: "Крупные цели", color: "#f59e0b", percent: 25 },
  { id: "growth", name: "Развитие", color: "#22c55e", percent: 15 },
  { id: "personal", name: "Личное", color: "#ec4899", percent: 10 }
];

const els = {
  authModal: document.querySelector("#authModal"),
  authOpenBtn: document.querySelector("#authOpenBtn"),
  authTriggerButtons: document.querySelectorAll("[data-auth-trigger]"),
  authCloseBtn: document.querySelector("#authCloseBtn"),
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authMessage: document.querySelector("#authMessage"),
  loginBtn: document.querySelector("#loginBtn"),
  signupBtn: document.querySelector("#signupBtn"),
  publicLogoutBtn: document.querySelector("#publicLogoutBtn"),
  demoForm: document.querySelector("#demoForm"),
  demoAmount: document.querySelector("#demoAmount"),
  demoResult: document.querySelector("#demoResult")
};

function parseDecimal(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((parseDecimal(value) + Number.EPSILON) * 100) / 100;
}

function money(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeLogin(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}._-]/gu, "")
    .slice(0, 24);
}

function demoAmountValue() {
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

function renderDemo() {
  const safeAmount = demoAmountValue();
  const percentTotal = demoPercentTotal();
  els.demoResult.innerHTML = `
    <div class="demo-total">
      <div>
        <span>Пример поступления</span>
        <small class="${percentTotal === 100 ? "" : "is-warning"}" id="demoPercentStatus">${percentTotal}% распределения</small>
      </div>
      <strong id="demoTotalAmount">${money(safeAmount)}</strong>
    </div>
    ${demoFunds.map((fund) => `
      <div class="demo-row" data-demo-fund="${fund.id}" style="--preview-color: ${fund.color}">
        <input class="demo-name-input" data-demo-name="${fund.id}" type="text" value="${escapeHtml(fund.name)}" maxlength="40" aria-label="Название демо-фонда">
        <label class="demo-percent-input">
          <input data-demo-percent="${fund.id}" type="text" inputmode="decimal" value="${fund.percent}" aria-label="Процент демо-фонда">
          <span>%</span>
        </label>
        <strong data-demo-allocation="${fund.id}">${money(safeAmount * fund.percent / 100)}</strong>
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
  document.querySelector("#demoTotalAmount").textContent = money(safeAmount);
  document.querySelector("#demoPercentStatus").textContent = `${percentTotal}% распределения`;
  document.querySelector("#demoPercentStatus").classList.toggle("is-warning", percentTotal !== 100);
  document.querySelector("#demoScaleValue").textContent = `${Math.min(percentTotal, 100)}%`;
  document.querySelector(".demo-scale-track").style.setProperty("--scale-progress", `${Math.min(percentTotal, 100)}%`);
  document.querySelector("#demoScaleFill").innerHTML = demoScaleSegments();
  demoFunds.forEach((fund) => {
    document.querySelector(`[data-demo-allocation="${fund.id}"]`).textContent = money(safeAmount * fund.percent / 100);
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

  fund.percent = Math.max(0, roundMoney(value));
  updateDemoAllocations();
}

async function authRequest(path, body) {
  let response;
  try {
    response = await fetch(supabaseUrl("auth", path), {
      method: "POST",
      headers: {
        apikey: SUPABASE_CONFIG.apiKey,
        Authorization: `Bearer ${SUPABASE_CONFIG.apiKey}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    throw new Error(formatNetworkError(error));
  }

  const text = await response.text();
  const data = parseJsonResponse(text);
  if (!response.ok) {
    throw new Error(data?.msg || data?.error_description || data?.message || `HTTP ${response.status}`);
  }
  return data;
}

function supabaseUrl(area, path) {
  if (shouldUseSupabaseProxy()) {
    return `${SUPABASE_PROXY_PATH}?area=${encodeURIComponent(area)}&path=${encodeURIComponent(path)}`;
  }

  return `${SUPABASE_CONFIG.url}/${area}/v1${path}`;
}

function shouldUseSupabaseProxy() {
  const hostname = window.location.hostname;
  return window.location.protocol !== "file:"
    && hostname !== "localhost"
    && hostname !== "127.0.0.1"
    && hostname !== "::1";
}

function parseJsonResponse(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Сервер вернул некорректный ответ. Обновите страницу и попробуйте снова.");
  }
}

function formatNetworkError(error) {
  const message = error?.message || String(error || "");
  const lower = message.toLowerCase();
  if (lower.includes("load failed") || lower.includes("failed to fetch") || lower.includes("network")) {
    return "Не удалось связаться с сервером авторизации. Обновите страницу или откройте сайт в обычном браузере и попробуйте снова.";
  }

  return message || "Не удалось связаться с сервером авторизации.";
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
  const session = normalizeSession(nextSession);
  if (session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
}

function hasStoredSession() {
  return Boolean(localStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(LEGACY_SESSION_STORAGE_KEY));
}

function redirectToApp() {
  window.location.href = "app.html#dashboard";
}

async function signIn(email, password) {
  const session = await authRequest("/token?grant_type=password", { email, password });
  saveSession(session);
  redirectToApp();
}

async function signUp(email, password) {
  const result = await authRequest("/signup", {
    email,
    password
  });
  if (result?.access_token) {
    saveSession(result);
    redirectToApp();
    return;
  }
  els.authMessage.textContent = "Аккаунт создан. Проверьте почту и подтвердите регистрацию, затем войдите.";
}

function translateAuthError(message) {
  const lower = message.toLowerCase();
  if (lower.includes("load failed") || lower.includes("failed to fetch") || lower.includes("network")) {
    return "Ошибка авторизации: не удалось связаться с сервером. Обновите страницу или откройте сайт в обычном браузере.";
  }

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

function openAuthModal() {
  if (hasStoredSession()) {
    redirectToApp();
    return;
  }

  els.authMessage.textContent = "";
  if (!els.authModal.open) {
    els.authModal.showModal();
  }
}

els.authTriggerButtons.forEach((button) => {
  button.addEventListener("click", openAuthModal);
});

els.publicLogoutBtn.addEventListener("click", () => {
  clearSession();
  els.publicLogoutBtn.classList.add("is-hidden");
  document.querySelector(".public-header [data-auth-trigger]").textContent = "Войти";
  document.querySelector(".hero-actions [data-auth-trigger]").textContent = "Начать с аккаунтом";
  els.authMessage.textContent = "Сессия сброшена. Можно войти заново.";
  openAuthModal();
});

els.authCloseBtn.addEventListener("click", () => els.authModal.close());

els.authModal.addEventListener("click", (event) => {
  if (event.target === els.authModal) {
    els.authModal.close();
  }
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  els.authMessage.textContent = "";
  els.loginBtn.disabled = true;
  els.signupBtn.disabled = true;
  try {
    const action = event.submitter?.value || "login";
    if (action === "signup") {
      await signUp(els.authEmail.value.trim(), els.authPassword.value);
    } else {
      await signIn(els.authEmail.value.trim(), els.authPassword.value);
    }
  } catch (error) {
    els.authMessage.textContent = translateAuthError(error.message);
  } finally {
    els.loginBtn.disabled = false;
    els.signupBtn.disabled = false;
  }
});

els.demoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateDemoAllocations();
});

els.demoAmount.addEventListener("input", updateDemoAllocations);

els.demoResult.addEventListener("input", (event) => {
  const nameId = event.target.dataset.demoName;
  const percentId = event.target.dataset.demoPercent;
  if (nameId) {
    updateDemoFund(nameId, "name", event.target.value);
  }
  if (percentId) {
    updateDemoFund(percentId, "percent", event.target.value);
  }
});

if (hasStoredSession()) {
  document.querySelectorAll("[data-auth-trigger]").forEach((button) => {
    button.textContent = "В кабинет";
  });
  els.publicLogoutBtn.classList.remove("is-hidden");
}

renderDemo();
