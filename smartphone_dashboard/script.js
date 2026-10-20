// SUNDOCHEM 생산현황판 - 휴대폰 전용 (보기 전용)
// 이 화면은 Firebase 데이터를 읽기만 하며, DB에는 어떤 값도 저장하지 않는다.
// 날짜를 넘겨도 휴대폰 화면만 바뀌고 현장 PC 현황판의 날짜는 그대로 유지된다.

const firebaseConfig = {
  apiKey: "AIzaSyA_JNWO5Ke5ZVJDnwP06QW9WsZXNZFv0bc",
  authDomain: "sundochem-dashboard.firebaseapp.com",
  databaseURL: "https://sundochem-dashboard-default-rtdb.firebaseio.com",
  projectId: "sundochem-dashboard",
  storageBucket: "sundochem-dashboard.firebasestorage.app",
  messagingSenderId: "360796635566",
  appId: "1:360796635566:web:d3bf85eb5e5e1574b5483f",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// PC 현황판에서 날짜별(production_logs)로 보관되는 항목
const ARCHIVE_KEYS = [
  "prod-lco2-ind-day", "prod-lco2-ind-month",
  "prod-lco2-bev-day", "prod-lco2-bev-month",
  "prod-total-day", "prod-total-month",
  "prod-dryice-day", "prod-dryice-month",
  "today-ind-ton", "today-bev-ton",
  "util-labor-day", "util-labor-month",
  "util-water-day", "util-water-month",
  "util-power-day", "util-power-month",
  "util-power-cost"
];

// PC 현황판 설비가동현황 버튼 순서와 같아야 한다 (toggle_idx_N 순서로 저장되어 있음)
const EQUIPMENT = [
  { name: "#1액화설비", group: "liq" },
  { name: "#2액화설비", group: "liq" },
  { name: "#3액화설비", group: "liq" },
  { name: "#4액화설비", group: "liq" },
  { name: "#5액화설비", group: "liq" },
  { name: "#1-1 PSA(V/P)", group: "psa1" },
  { name: "#1-2 PSA(V/P)", group: "psa1" },
  { name: "#1-3 PSA(V/P)", group: "psa1" },
  { name: "#1-4 PSA(V/P)", group: "psa1" },
  { name: "#1 PSA(A)", group: "psa1" },
  { name: "#1 PSA(B)", group: "psa1" },
  { name: "#2 PSA(A)", group: "psa2" },
  { name: "#2 PSA(B)", group: "psa2" },
  { name: "#2-1 PSA(V/P)", group: "psa2" },
  { name: "#2-2 PSA(V/P)", group: "psa2" },
  { name: "#2-3 PSA(V/P)", group: "psa2" },
  { name: "#2-4 PSA(V/P)", group: "psa2" },
  { name: "#2-5 PSA(V/P)", group: "psa2" }
];

// 재고 게이지 최대 용량 (PC 현황판과 동일)
const CAPACITY = { ind: 2900, bev: 800 };

const DEFCON_TEXT = ["전 설비 정상 가동중", "⚠️ 일부 설비 점검중", "🚨 비상: 이상 발생!"];

const state = {
  inputs: {},        // dashboard/inputs (현장 PC 화면의 현재 값)
  toggles: {},       // dashboard/toggles
  log: null,         // production_logs/{조회 날짜} (지난 일보 조회 시)
  logLoaded: false,
  pcDate: null,      // 현장 PC 현황판이 보고 있는 날짜
  viewDate: null,    // 휴대폰에서 보고 있는 날짜
  workLogUpdated: 0
};

const $ = (id) => document.getElementById(id);

// ===== 숫자 유틸리티 =====
function isEmpty(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

function toNum(v) {
  if (isEmpty(v)) return NaN;
  return parseFloat(String(v).replace(/,/g, ""));
}

function fmt(n, digits = 1) {
  return isNaN(n) ? "-" : n.toLocaleString("ko-KR", { maximumFractionDigits: digits });
}

// ===== 날짜 유틸리티 (한국 시간 기준) =====
function kstNow() {
  const now = new Date();
  return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 9 * 3600000);
}

function toDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDateStr(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

// ===== 표시할 값 결정 =====
function isFollowingPc() {
  return !state.pcDate || state.viewDate === state.pcDate;
}

// 현장 PC와 같은 날짜면 PC 화면 값을, 지난 일보를 볼 때는 해당 날짜 기록을 사용한다.
// 기록에 없는 일보 항목은 이전 날짜 값이 남지 않도록 "-"로 표시한다.
function valueOf(key) {
  if (!isFollowingPc() && ARCHIVE_KEYS.includes(key)) {
    return state.log ? state.log[key] : undefined;
  }
  return state.inputs[key];
}

function sumKeys(keys) {
  let total = 0;
  let found = false;
  keys.forEach((key) => {
    const n = toNum(valueOf(key));
    if (!isNaN(n)) {
      total += n;
      found = true;
    }
  });
  return found ? total : NaN;
}

// ===== 화면 그리기 =====
function renderBar(prefix, key, capacity) {
  const fill = $(prefix + "-fill");
  const label = $(prefix + "-pct");
  const ton = toNum(valueOf(key));

  if (isNaN(ton)) {
    fill.style.width = "0%";
    fill.classList.remove("is-low");
    label.textContent = "-";
    return;
  }

  const ratio = Math.min(100, Math.max(0, (ton / capacity) * 100));
  fill.style.width = ratio.toFixed(1) + "%";
  fill.classList.toggle("is-low", ratio <= 10);
  label.textContent = ratio.toFixed(1) + "%";
}

function renderRing(ringId, key) {
  const n = toNum(valueOf(key));
  const pct = isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
  $(ringId).style.setProperty("--pct", pct);
}

function renderValues() {
  document.querySelectorAll("[data-key]").forEach((el) => {
    const v = valueOf(el.dataset.key);
    el.textContent = isEmpty(v) ? "-" : String(v);
  });

  $("today-total").textContent = fmt(sumKeys(["today-ind-ton", "today-bev-ton"]));
  $("prev-total").textContent = fmt(sumKeys(["prev-ind-input", "prev-bev-input"]));
  renderBar("today-ind", "today-ind-ton", CAPACITY.ind);
  renderBar("today-bev", "today-bev-ton", CAPACITY.bev);
  renderBar("prev-ind", "prev-ind-input", CAPACITY.ind);
  renderBar("prev-bev", "prev-bev-input", CAPACITY.bev);

  renderRing("yield-ring", "yield-input");
  renderRing("purity-ring", "purity-input");

  const indTank = sumKeys(["tank1-ton", "tank2-ton", "tank3-ton", "tank5-ton"]);
  const bevTank = sumKeys(["tank4-ton"]);
  $("ind-tank-total").textContent = fmt(indTank);
  $("bev-tank-total").textContent = fmt(bevTank);
  $("all-tank-total").textContent = fmt(sumKeys(["tank1-ton", "tank2-ton", "tank3-ton", "tank4-ton", "tank5-ton"]));

  $("psa-total").textContent = fmt(sumKeys(["psa1-input", "psa2-input"]));
  $("hmu-total").textContent = fmt(sumKeys(["hmu1-input", "hmu3-input"]));
}

function renderModeBar() {
  const bar = $("mode-bar");
  if (isFollowingPc()) {
    bar.className = "mode-bar";
    bar.innerHTML = '<span><i class="fas fa-desktop"></i> 현장 PC 화면과 같은 일보입니다</span>';
    return;
  }

  const noRecord = state.logLoaded && !state.log ? " · 기록 없음" : "";
  bar.className = "mode-bar is-history";
  bar.innerHTML = `<span><i class="fas fa-history"></i> 지난 일보 조회 중${noRecord} (현장: ${state.pcDate})</span>`;
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "현장 날짜로";
  backBtn.addEventListener("click", () => setViewDate(state.pcDate));
  bar.appendChild(backBtn);
}

function initEquipment() {
  $("equip-list").innerHTML = EQUIPMENT.map((item, i) =>
    `<li id="equip-${i}" class="equip-item"><span class="equip-dot ${item.group}"></span><span class="equip-name">${item.name}</span><span class="equip-state">OFF</span></li>`
  ).join("");
  $("equip-total-count").textContent = EQUIPMENT.length;
}

function renderEquipment() {
  let onCount = 0;
  EQUIPMENT.forEach((item, i) => {
    const isOn = state.toggles["toggle_idx_" + i] === "ON";
    if (isOn) onCount++;
    const li = $("equip-" + i);
    li.classList.toggle("is-on", isOn);
    li.querySelector(".equip-state").textContent = isOn ? "ON" : "OFF";
  });
  $("equip-on-count").textContent = onCount;
}

function renderDefcon(level) {
  const lv = [0, 1, 2].includes(level) ? level : 0;
  $("defcon-pill").dataset.level = lv;
  $("defcon-text").textContent = DEFCON_TEXT[lv];
  document.body.classList.toggle("emergency", lv === 2);
}

// ===== 시계 =====
function updateClock() {
  const d = kstNow();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const pad = (n) => String(n).padStart(2, "0");
  $("clock").textContent =
    `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${days[d.getDay()]}) ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ===== 지난 일보 조회 =====
let logRef = null;

function watchLog() {
  if (logRef) {
    logRef.off();
    logRef = null;
  }
  state.log = null;
  state.logLoaded = false;
  if (isFollowingPc()) return;

  const ref = db.ref("production_logs/" + state.viewDate);
  logRef = ref;
  ref.on("value", (snap) => {
    if (logRef !== ref) return;
    state.log = snap.val();
    state.logLoaded = true;
    renderModeBar();
    renderValues();
  });
}

function setViewDate(dateStr) {
  if (!dateStr) return;
  state.viewDate = dateStr;
  $("date-input").value = dateStr;
  watchLog();
  watchKepco(dateStr);
  renderModeBar();
  renderValues();
}

// ===== 전력 차트 =====
let kepcoRef = null;
let kepcoMonth = null;
let powerChart = null;

function emptyMonthLogs(yearMonth) {
  const [yr, mo] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const logs = [];
  for (let d = 1; d <= daysInMonth; d++) {
    logs.push({ dayLabel: `${mo}.${d}`, usage: null, prevMonth: null, prevYear: null });
  }
  return logs;
}

// 날짜를 바꿔도 감시가 쌓이지 않도록 이전 달 감시는 해제하고 새 달만 감시한다
function watchKepco(dateStr) {
  const yearMonth = dateStr.substring(0, 7);
  if (yearMonth === kepcoMonth) return;

  if (kepcoRef) kepcoRef.off();
  kepcoMonth = yearMonth;
  $("pwr-month").textContent = `(${Number(yearMonth.substring(5, 7))}월)`;

  const ref = db.ref("kepco_logs/" + yearMonth);
  kepcoRef = ref;
  ref.on("value", (snap) => {
    if (kepcoRef !== ref) return;
    const v = snap.val();
    let logs = Array.isArray(v) ? v.filter(Boolean) : (v ? Object.values(v) : []);
    if (logs.length === 0) logs = emptyMonthLogs(yearMonth);
    renderPowerChart(logs);
  });
}

function toNumOrNull(v) {
  const n = toNum(v);
  return isNaN(n) ? null : n;
}

function renderPowerChart(logs) {
  const labels = logs.map((item) => String(item.dayLabel ?? "").split(".").pop());
  const usage = logs.map((item) => toNumOrNull(item.usage));
  const prevMonth = logs.map((item) => toNumOrNull(item.prevMonth));
  const prevYear = logs.map((item) => toNumOrNull(item.prevYear));

  const valid = usage.filter((n) => n !== null && n > 0);
  const sum = valid.reduce((a, b) => a + b, 0);
  const kwh = (n) => (valid.length ? fmt(n, 0) + " kWh" : "-");
  $("pwr-max").textContent = kwh(Math.max(...valid));
  $("pwr-min").textContent = kwh(Math.min(...valid));
  $("pwr-avg").textContent = kwh(sum / valid.length);
  $("pwr-sum").textContent = kwh(sum);

  // 차트 라이브러리를 못 불러온 경우에도 통계 숫자는 표시한다
  if (typeof Chart === "undefined") return;

  if (powerChart) {
    powerChart.data.labels = labels;
    powerChart.data.datasets[0].data = usage;
    powerChart.data.datasets[1].data = prevMonth;
    powerChart.data.datasets[2].data = prevYear;
    powerChart.update();
    return;
  }

  Chart.defaults.font.family = "Pretendard, sans-serif";
  powerChart = new Chart($("energy-chart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          type: "bar",
          label: "당일 사용량",
          data: usage,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderColor: "#60a5fa",
          borderWidth: 1,
          borderRadius: 3,
          barPercentage: 0.7,
          categoryPercentage: 0.8,
          order: 2
        },
        {
          type: "line",
          label: "전월동일",
          data: prevMonth,
          borderColor: "#10b981",
          backgroundColor: "#10b981",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          fill: false,
          order: 1
        },
        {
          type: "line",
          label: "전년동일",
          data: prevYear,
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          fill: false,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#cbd5e1", font: { size: 11, weight: "700" }, usePointStyle: true, boxWidth: 8, padding: 10 }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#38bdf8",
          borderColor: "#334155",
          borderWidth: 1,
          padding: 8,
          usePointStyle: true,
          callbacks: {
            title: (items) => `${Number(kepcoMonth.substring(5, 7))}월 ${items[0].label}일`,
            label: (ctx) => {
              const val = ctx.raw !== null && ctx.raw !== undefined ? ctx.raw.toLocaleString("ko-KR") : "미검침";
              return ` ${ctx.dataset.label}: ${val} kWh`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: "#334155" },
          ticks: { color: "#94a3b8", font: { size: 9 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 4 }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(51, 65, 85, 0.5)" },
          border: { display: false, dash: [3, 3] },
          ticks: {
            color: "#64748b",
            font: { size: 9 },
            callback: (value) => (value >= 1000 ? Math.round(value / 1000).toLocaleString() + "k" : value)
          }
        }
      }
    }
  });
}

// ===== 근무일지 새 글 알림 (이 휴대폰 브라우저 기준) =====
function lastViewedWorkLog() {
  try {
    return parseInt(localStorage.getItem("workLogLastViewed") || "0", 10);
  } catch (e) {
    return 0;
  }
}

function renderWorkLogBadge() {
  $("work-log-badge").classList.toggle("hidden", !(state.workLogUpdated > lastViewedWorkLog()));
}

// ===== Firebase 실시간 수신 (읽기 전용) =====
function startSync() {
  db.ref("dashboard/inputs").on("value", (snap) => {
    state.inputs = snap.val() || {};
    renderValues();
  });

  db.ref("dashboard/production_date").on("value", (snap) => {
    const wasFollowing = isFollowingPc();
    state.pcDate = snap.val() || toDateStr(kstNow());
    if (wasFollowing || !state.viewDate) {
      setViewDate(state.pcDate);
    } else {
      // 지난 일보를 보는 중이면 휴대폰 날짜는 유지한다
      watchLog();
      renderModeBar();
      renderValues();
    }
  });

  db.ref("dashboard/toggles").on("value", (snap) => {
    state.toggles = snap.val() || {};
    renderEquipment();
  });

  db.ref("dashboard/defcon").on("value", (snap) => {
    renderDefcon(snap.val());
  });

  db.ref("dashboard/tank_input_time").on("value", (snap) => {
    $("tank-time").textContent = (snap.val() || "06") + "시";
  });

  db.ref("notifications/work_log_updated").on("value", (snap) => {
    state.workLogUpdated = snap.val() || 0;
    renderWorkLogBadge();
  });

  let hasConnected = false;
  db.ref(".info/connected").on("value", (snap) => {
    const connected = snap.val() === true;
    if (connected) hasConnected = true;
    $("offline-banner").classList.toggle("hidden", connected || !hasConnected);
  });
}

// ===== 화면 조작 (휴대폰 화면 안에서만 동작) =====
$("prev-date-btn").addEventListener("click", () => {
  if (state.viewDate) setViewDate(shiftDateStr(state.viewDate, -1));
});
$("next-date-btn").addEventListener("click", () => {
  if (state.viewDate) setViewDate(shiftDateStr(state.viewDate, 1));
});
$("today-date-btn").addEventListener("click", () => setViewDate(toDateStr(kstNow())));
$("date-input").addEventListener("change", (e) => {
  if (e.target.value) setViewDate(e.target.value);
});

$("work-log-link").addEventListener("click", () => {
  try {
    localStorage.setItem("workLogLastViewed", Date.now().toString());
  } catch (e) {}
  renderWorkLogBadge();
});

$("logout-btn").addEventListener("click", () => {
  if (confirm("로그아웃 하시겠습니까?")) firebase.auth().signOut();
});

initEquipment();
updateClock();
setInterval(updateClock, 1000);

let started = false;
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }
  document.body.classList.remove("is-loading");
  if (!started) {
    started = true;
    startSync();
  }
});
