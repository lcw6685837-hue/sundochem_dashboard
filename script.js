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

// 월별 빈 데이터 구조 생성 유틸리티
function createEmptyMonthData(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const emptyLogs = [];
  for (let d = 1; d <= daysInMonth; d++) {
    emptyLogs.push({
      dayLabel: `${month}.${d}`,
      usage: null,
      prevMonth: null,
      prevYear: null
    });
  }
  return emptyLogs;
}

document.addEventListener("DOMContentLoaded", () => {

  // 1. 대시보드 플립 시계
  function updateFlipClock() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const kst = new Date(utc + 3600000 * 9);
    
    const yr = document.getElementById("fc-year");
    const mo = document.getElementById("fc-month");
    const da = document.getElementById("fc-day");
    const hr = document.getElementById("fc-hour");
    const mi = document.getElementById("fc-min");
    const se = document.getElementById("fc-sec");

    if (yr) yr.textContent = kst.getFullYear();
    if (mo) mo.textContent = String(kst.getMonth() + 1).padStart(2, "0");
    if (da) da.textContent = String(kst.getDate()).padStart(2, "0");
    if (hr) hr.textContent = String(kst.getHours()).padStart(2, "0");
    if (mi) mi.textContent = String(kst.getMinutes()).padStart(2, "0");
    if (se) se.textContent = String(kst.getSeconds()).padStart(2, "0");
  }
  updateFlipClock();
  setInterval(updateFlipClock, 1000);

  // 2. 동적 서클 차트 (수율/순도)
  function setupDynamicRing(inputId, ringId, hexColor) {
    const inputEl = document.getElementById(inputId);
    const ringEl = document.getElementById(ringId);
    if (!inputEl || !ringEl) return;
    
    inputEl.addEventListener("input", (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 0;
      if (val > 100) val = 100;
      if (val < 0) val = 0;
      ringEl.style.background = `conic-gradient(${hexColor} ${val}%, #334155 0)`;
    });
    
    inputEl.addEventListener("blur", (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val) || val < 0) e.target.value = 0;
      if (val > 100) e.target.value = 100;
    });
  }
  setupDynamicRing("yield-input", "yield-ring", "#10b981");
  setupDynamicRing("purity-input", "purity-ring", "#f59e0b");

  // 3. 콤마 연산 유틸리티
  function parseCommaNum(str) { 
    return isNaN(parseFloat(String(str).replace(/,/g, ""))) ? 0 : parseFloat(String(str).replace(/,/g, "")); 
  }
  
  function formatCommaNum(num) { 
    return Math.round(num).toLocaleString("ko-KR"); 
  }

  function setupAutoSum(input1Id, input2Id, totalId) {
    const in1 = document.getElementById(input1Id);
    const in2 = document.getElementById(input2Id);
    const total = document.getElementById(totalId);
    if (!in1 || !in2 || !total) return;

    function calculateSum() { 
      total.value = formatCommaNum(parseCommaNum(in1.value) + parseCommaNum(in2.value)); 
    }
    
    in1.addEventListener("input", calculateSum);
    in2.addEventListener("input", calculateSum);
    
    function formatOnBlur(e) {
      e.target.value = formatCommaNum(parseCommaNum(e.target.value));
      calculateSum();
    }
    in1.addEventListener("blur", formatOnBlur);
    in2.addEventListener("blur", formatOnBlur);
  }
  setupAutoSum("prev-ind-input", "prev-bev-input", "prev-total-input");
  setupAutoSum("today-ind-ton", "today-bev-ton", "today-total-input");
  setupAutoSum("psa1-input", "psa2-input", "psa-total-input");

  // 4. 게이지 비율 연산
  function setupInventoryRatio(tonInputId, percentInputId, fillId, maxCapacity) {
    const tonInput = document.getElementById(tonInputId);
    const percentInput = document.getElementById(percentInputId);
    const fillEl = document.getElementById(fillId);
    if (!tonInput || !percentInput || !fillEl) return;

    function updateRatio() {
      let ratio = (parseCommaNum(tonInput.value) / maxCapacity) * 100;
      if (isNaN(ratio) || ratio < 0) ratio = 0;
      if (ratio > 100) ratio = 100;
      percentInput.value = ratio.toFixed(1);
      fillEl.style.width = `${ratio.toFixed(1)}%`;
    }
    tonInput.addEventListener("input", updateRatio);
    tonInput.addEventListener("blur", updateRatio);
    updateRatio();
  }
  setupInventoryRatio("today-ind-ton", "today-ind-input", "today-ind-fill", 2900);
  setupInventoryRatio("today-bev-ton", "today-bev-input", "today-bev-fill", 800);

  // 5. 저장탱크 합계 연산
  const tk1 = document.getElementById("tank1-ton");
  const tk2 = document.getElementById("tank2-ton");
  const tk3 = document.getElementById("tank3-ton");
  const tk4 = document.getElementById("tank4-ton");
  const tk5 = document.getElementById("tank5-ton");
  const tkIndTotal = document.getElementById("ind-tank-total");
  const tkBevTotal = document.getElementById("bev-tank-total");
  const tkAllTotal = document.getElementById("all-tank-total");

  function calculateTankTotals() {
    if (!tk1 || !tk2 || !tk3 || !tk4 || !tk5 || !tkAllTotal) return;
    const ind = parseCommaNum(tk1.value) + parseCommaNum(tk2.value) + parseCommaNum(tk3.value) + parseCommaNum(tk5.value);
    const bev = parseCommaNum(tk4.value);
    if (tkIndTotal) tkIndTotal.value = formatCommaNum(Number(ind.toFixed(1)));
    if (tkBevTotal) tkBevTotal.value = formatCommaNum(Number(bev.toFixed(1)));
    tkAllTotal.value = formatCommaNum(Number((ind + bev).toFixed(1)));
  }
  
  [tk1, tk2, tk3, tk4, tk5].forEach((input) => {
    if (!input) return;
    input.addEventListener("input", calculateTankTotals);
    input.addEventListener("blur", (e) => { 
      e.target.value = formatCommaNum(parseCommaNum(e.target.value)); 
      calculateTankTotals(); 
    });
  });
  calculateTankTotals();

  // 6. 🍒 [Chart.js 고도화 Engine: 가변 Y축 스케일링 & 그라데이션 필터 적용]
  let energyChartInstance = null;
  const energyCanvas = document.getElementById("energyChart");
  
  function renderPowerPlannerChart(powerDataArray) {
    if (!energyCanvas) return;
    const ctx = energyCanvas.getContext("2d");
    
    const dataToRender = (powerDataArray && powerDataArray.length > 0) ? powerDataArray : [];

    const labels = dataToRender.map(item => item.dayLabel);
    const usageData = dataToRender.map(item => item.usage);
    const prevMonthData = dataToRender.map(item => item.prevMonth);
    const prevYearData = dataToRender.map(item => item.prevYear);

    if (energyChartInstance) {
      energyChartInstance.destroy();
    }

    // 🍒 바 차트 그라데이션 색상 생성
    const barGradient = ctx.createLinearGradient(0, 0, 0, 200);
    barGradient.addColorStop(0, "rgba(59, 130, 246, 0.85)"); // Vibrant Blue
    barGradient.addColorStop(1, "rgba(14, 165, 233, 0.2)");  // Cyan Fade

    // 🍒 유효 데이터 최댓값 감지 및 가변 Y축 Max 자동 계산 (Dynamic Y-Scaler)
    let maxUsageVal = 0;
    dataToRender.forEach(item => {
      if (item.usage !== null && item.usage !== undefined && item.usage > maxUsageVal) maxUsageVal = item.usage;
      if (item.prevMonth !== null && item.prevMonth !== undefined && item.prevMonth > maxUsageVal) maxUsageVal = item.prevMonth;
      if (item.prevYear !== null && item.prevYear !== undefined && item.prevYear > maxUsageVal) maxUsageVal = item.prevYear;
    });

    // 15% 상단 여유 공간 반영 및 깔끔한 틱 단위 적용
    const dynamicYMax = maxUsageVal > 0 ? Math.ceil((maxUsageVal * 1.15) / 10000) * 10000 : 220000;

    energyChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            type: "bar",
            label: "당일 사용량",
            data: usageData,
            backgroundColor: barGradient,
            borderColor: "#60a5fa", 
            borderWidth: 1.5,
            borderRadius: 4,
            barPercentage: 0.5,
            categoryPercentage: 0.7,
            order: 2 
          },
          {
            type: "line",
            label: "전월동일",
            data: prevMonthData,
            borderColor: "#10b981", 
            backgroundColor: "#10b981",
            borderWidth: 2.5,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: "#10b981",
            fill: false,
            spanGaps: false,
            order: 1 
          },
          {
            type: "line",
            label: "전년동일",
            data: prevYearData,
            borderColor: "#f59e0b", 
            backgroundColor: "#f59e0b",
            borderWidth: 2.5,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: "#f59e0b",
            fill: false,
            spanGaps: false,
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
            labels: { 
              color: "#cbd5e1", 
              font: { size: 11, family: "Pretendard", weight: "700" }, 
              usePointStyle: true, 
              boxWidth: 8,
              padding: 12
            } 
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            titleColor: "#38bdf8",
            titleFont: { size: 12, weight: "bold", family: "Pretendard" },
            bodyFont: { size: 11, family: "Pretendard" },
            borderColor: "#334155",
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                const val = context.raw !== null && context.raw !== undefined ? context.raw.toLocaleString("ko-KR") : '미검침';
                return ` ${context.dataset.label}: ${val} kWh`;
              }
            }
          }
        },
        scales: {
          x: { 
            grid: { color: "rgba(51, 65, 85, 0.4)", drawBorder: false }, 
            ticks: { color: "#94a3b8", font: { size: 9, family: "Pretendard" } } 
          },
          y: { 
            max: dynamicYMax,
            grid: { color: "rgba(51, 65, 85, 0.5)", borderDash: [3, 3] }, 
            ticks: { 
              color: "#64748b", 
              font: { size: 9, family: "Pretendard" },
              callback: function(value) {
                return value.toLocaleString();
              }
            }, 
            beginAtZero: true 
          }
        }
      }
    });

    // 🍒 실제 입력된 유효 데이터 기준 4대 지표 연산
    let maxVal = 0;
    let minVal = Infinity;
    let sumVal = 0;
    let count = 0;

    dataToRender.forEach(item => {
      if (item.usage !== null && item.usage !== undefined && !isNaN(item.usage) && item.usage > 0) {
        if (item.usage > maxVal) maxVal = item.usage;
        if (item.usage < minVal) minVal = item.usage;
        sumVal += item.usage;
        count++;
      }
    });

    if (count === 0) minVal = 0;

    const avgVal = count > 0 ? (sumVal / count) : 0;

    const maxElem = document.getElementById("pwr-max-val");
    const minElem = document.getElementById("pwr-min-val");
    const avgElem = document.getElementById("pwr-avg-val");
    const sumElem = document.getElementById("pwr-sum-val");

    if (maxElem) maxElem.innerHTML = `${formatCommaNum(maxVal)} <span class="text-[9px] font-normal text-slate-400">kWh</span>`;
    if (minElem) minElem.innerHTML = `${formatCommaNum(minVal)} <span class="text-[9px] font-normal text-slate-400">kWh</span>`;
    if (avgElem) avgElem.innerHTML = `${formatCommaNum(avgVal)} <span class="text-[9px] font-normal text-slate-400">kWh</span>`;
    if (sumElem) sumElem.innerHTML = `${formatCommaNum(sumVal)} <span class="text-[9px] font-normal text-slate-400">kWh</span>`;
  }

  // 7. Firebase 데이터 실시간 동기화
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        setupDatabaseSync();
    } else {
        window.location.replace("index.html");
    }
  });

  function setupDatabaseSync() {
      const explicitInputs = document.querySelectorAll('input[type="text"][id]');
      explicitInputs.forEach((input) => {
        const syncKey = input.id;
        input.addEventListener("input", (e) => { 
          db.ref("dashboard/inputs/" + syncKey).set(e.target.value); 
        });
      });

      db.ref("dashboard/inputs").on("value", (snapshot) => {
        const data = snapshot.val() || {};
        explicitInputs.forEach((input) => {
          const syncKey = input.id;
          if (data[syncKey] !== undefined && document.activeElement !== input) {
            if (input.value !== data[syncKey]) {
              input.value = data[syncKey];
              input.dispatchEvent(new Event("input"));
            }
          }
        });
      });

      const dateInput = document.getElementById("date-input");
      const dateSyncKey = "dashboard/production_date";
      if (dateInput) {
        db.ref(dateSyncKey).on("value", (snapshot) => {
          const savedDate = snapshot.val();
          if (savedDate && document.activeElement !== dateInput) { 
            dateInput.value = savedDate; 
          }
        });
        dateInput.addEventListener("change", (e) => { 
          db.ref("dashboard/production_date").set(e.target.value);
          fetchKepcoPowerLogs(e.target.value);
        });
        
        fetchKepcoPowerLogs(dateInput.value);
      } else {
        fetchKepcoPowerLogs("2026-08-30");
      }

      const toggleGroups = document.querySelectorAll(".toggle-group");
      toggleGroups.forEach((group, index) => {
        const onBtn = group.querySelector(".on-btn");
        const offBtn = group.querySelector(".off-btn");
        const syncKey = "toggle_idx_" + index;
        onBtn.addEventListener("click", () => { db.ref("dashboard/toggles/" + syncKey).set("ON"); });
        offBtn.addEventListener("click", () => { db.ref("dashboard/toggles/" + syncKey).set("OFF"); });
      });

      db.ref("dashboard/toggles").on("value", (snapshot) => {
        const data = snapshot.val() || {};
        toggleGroups.forEach((group, index) => {
          const syncKey = "toggle_idx_" + index;
          const currentState = data[syncKey];
          const onBtn = group.querySelector(".on-btn");
          const offBtn = group.querySelector(".off-btn");
          
          if (currentState === "ON") {
            onBtn.className = "toggle-btn on-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.8)] opacity-100";
            offBtn.className = "toggle-btn off-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-transparent text-rose-500 opacity-20 hover:opacity-50";
          } else if (currentState === "OFF") {
            offBtn.className = "toggle-btn off-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.8)] opacity-100";
            onBtn.className = "toggle-btn on-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-transparent text-emerald-500 opacity-20 hover:opacity-50";
          }
        });
      });

      const defconBtn = document.getElementById("defcon-btn");
      const defconPing = document.getElementById("defcon-ping");
      const defconDot = document.getElementById("defcon-dot");
      const defconText = document.getElementById("defcon-text");
      let defconState = 0;

      if (defconBtn) {
        defconBtn.addEventListener("click", () => {
          const newState = (defconState + 1) % 3;
          db.ref("dashboard/defcon").set(newState);
        });
      }

      db.ref("dashboard/defcon").on("value", (snap) => {
        const val = snap.val();
        defconState = val !== null ? val : 0;
        if (defconState === 0) {
          if (defconPing) defconPing.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
          if (defconDot) defconDot.className = "relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500";
          if (defconText) { 
            defconText.className = "text-emerald-400 font-bold tracking-widest text-base w-[180px] text-center whitespace-nowrap group-hover:text-emerald-300 transition-colors"; 
            defconText.textContent = "전 설비 정상 가동중"; 
          }
          document.body.classList.remove("emergency-mode");
        } else if (defconState === 1) {
          if (defconPing) defconPing.className = "animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75";
          if (defconDot) defconDot.className = "relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500";
          if (defconText) { 
            defconText.className = "text-amber-400 font-bold tracking-widest text-base w-[180px] text-center whitespace-nowrap group-hover:text-amber-300 transition-colors"; 
            defconText.textContent = "⚠️ 일부 설비 점검중"; 
          }
          document.body.classList.remove("emergency-mode");
        } else if (defconState === 2) {
          if (defconPing) defconPing.className = "fast-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75";
          if (defconDot) defconDot.className = "relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600";
          if (defconText) { 
            defconText.className = "text-rose-500 font-black tracking-widest text-base w-[180px] text-center whitespace-nowrap group-hover:text-rose-400 transition-colors animate-pulse drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]"; 
            defconText.textContent = "🚨 비상: 이상 발생!"; 
          }
          document.body.classList.add("emergency-mode");
        }
      });

      const tankTimeBtns = document.querySelectorAll(".tank-time-btn");
      if (tankTimeBtns.length > 0) {
        tankTimeBtns.forEach((btn) => {
          btn.addEventListener("click", (e) => { 
            db.ref("dashboard/tank_input_time").set(e.target.getAttribute("data-time")); 
          });
        });
        db.ref("dashboard/tank_input_time").on("value", (snap) => {
          const val = snap.val() || "06"; 
          tankTimeBtns.forEach((btn) => {
            if (btn.getAttribute("data-time") === val) {
              btn.className = "tank-time-btn px-3 py-1 rounded text-xs font-black transition-all bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.8)]";
            } else {
              btn.className = "tank-time-btn px-3 py-1 rounded text-xs font-black transition-all bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200";
            }
          });
        });
      }

      const badgeEl = document.getElementById("work-log-badge");
      if (badgeEl) {
        db.ref("notifications/work_log_updated").on("value", (snap) => {
          const lastUpdated = snap.val() || 0;
          const lastViewed = parseInt(localStorage.getItem("workLogLastViewed") || "0", 10);
          if (lastUpdated > lastViewed) {
            badgeEl.classList.remove("hidden");
          } else {
            badgeEl.classList.add("hidden");
          }
        });
      }
  }

  function fetchKepcoPowerLogs(selectedDateStr) {
    if (!selectedDateStr) return;
    const yearMonth = selectedDateStr.substring(0, 7);
    const [yr, mo] = yearMonth.split('-').map(Number);

    db.ref("kepco_logs/" + yearMonth).on("value", (snapshot) => {
      const dbData = snapshot.val();
      if (dbData && Array.isArray(dbData) && dbData.length > 0) {
        renderPowerPlannerChart(dbData);
      } else {
        const emptyMonthLogs = createEmptyMonthData(yr, mo);
        renderPowerPlannerChart(emptyMonthLogs);
      }
    });
  }

  // 8. 모달 데이터 복원 & 누적 저장 제어 유틸리티
  window.openKepcoModal = function() {
    const modal = document.getElementById("kepco-modal");
    const textInput = document.getElementById("kepco-paste-input");
    const dateInput = document.getElementById("date-input");

    let currentYearMonth = "2026-08";
    if (dateInput && dateInput.value) {
      currentYearMonth = dateInput.value.substring(0, 7);
    }

    db.ref("kepco_logs/" + currentYearMonth).once("value", (snap) => {
      const logs = snap.val();
      let textLines = [];

      if (logs && Array.isArray(logs)) {
        logs.forEach(item => {
          if (item.usage !== null && item.usage !== undefined) {
            const parts = String(item.dayLabel).split('.');
            const mStr = String(parts[0]).padStart(2, '0');
            const dStr = String(parts[1]).padStart(2, '0');
            const usageStr = typeof item.usage === 'number' ? item.usage.toLocaleString('ko-KR') : item.usage;
            const pmStr = (item.prevMonth !== null && item.prevMonth !== undefined) ? (typeof item.prevMonth === 'number' ? item.prevMonth.toLocaleString('ko-KR') : item.prevMonth) : '-';
            const pyStr = (item.prevYear !== null && item.prevYear !== undefined) ? (typeof item.prevYear === 'number' ? item.prevYear.toLocaleString('ko-KR') : item.prevYear) : '-';
            textLines.push(`${mStr}월 ${dStr}일\t${usageStr}\t${pmStr}\t${pyStr}`);
          }
        });
      }

      if (textInput) {
        textInput.value = textLines.join("\n");
      }
    });

    if (modal) modal.classList.remove("hidden");
  };

  window.closeKepcoModal = function() {
    const modal = document.getElementById("kepco-modal");
    if (modal) modal.classList.add("hidden");
  };

  // 🍒 [헤더 스마트 자동 감지 파서 적용]
  window.processAndSaveKepcoData = function() {
    const textInput = document.getElementById("kepco-paste-input");
    if (!textInput || !textInput.value.trim()) {
      alert("엑셀 복사 데이터를 입력 칸에 붙여넣어 주세요!");
      return;
    }

    const rawText = textInput.value.trim();
    const inputLines = rawText.split("\n");

    let detectedMonth = null;
    let usageColIdx = 0;
    let prevMonthColIdx = 1;
    let prevYearColIdx = 2;

    // 헤더 행 자동 감지 로직
    inputLines.forEach((line) => {
      if (line.includes("사용량") || line.includes("전월") || line.includes("전년")) {
        const tokens = line.split(/\t+|\s{2,}/);
        tokens.forEach((token, index) => {
          const cleanToken = token.trim();
          if (cleanToken.includes("사용량") && !cleanToken.includes("전월") && !cleanToken.includes("전년")) {
            usageColIdx = index > 0 ? index - 1 : 0;
          } else if (cleanToken.includes("전월")) {
            prevMonthColIdx = index > 0 ? index - 1 : 1;
          } else if (cleanToken.includes("전년")) {
            prevYearColIdx = index > 0 ? index - 1 : 2;
          }
        });
      }

      if (!detectedMonth) {
        const monthMatch = line.match(/(\d{1,2})월/);
        if (monthMatch) detectedMonth = parseInt(monthMatch[1], 10);
      }
    });

    const dateInput = document.getElementById("date-input");
    let currentYear = 2026;
    if (dateInput && dateInput.value) {
      currentYear = parseInt(dateInput.value.substring(0, 4), 10) || 2026;
    }

    if (!detectedMonth) {
      if (dateInput && dateInput.value) {
        detectedMonth = parseInt(dateInput.value.substring(5, 7), 10);
      } else {
        detectedMonth = 8;
      }
    }

    const formattedMonthStr = String(detectedMonth).padStart(2, "0");
    const yearMonthKey = `${currentYear}-${formattedMonthStr}`;
    const daysInMonth = new Date(currentYear, detectedMonth, 0).getDate();

    db.ref("kepco_logs/" + yearMonthKey).once("value", (snapshot) => {
      let logs = createEmptyMonthData(currentYear, detectedMonth);
      let updatedCount = 0;

      inputLines.forEach((line) => {
        if (!line.trim() || line.includes("사용량(kWh)") || line.includes("전월동일")) return;

        const dayMatch = line.match(/(\d{1,2})일/);
        if (dayMatch) {
          const dayNum = parseInt(dayMatch[1], 10);
          const idx = dayNum - 1;

          if (idx >= 0 && idx < daysInMonth) {
            const cleanLine = line.replace(/\d{1,2}월/, '').replace(/\d{1,2}일/, '');
            const cleanNumbers = cleanLine.match(/[\d,]+(\.\d+)?/g);

            if (cleanNumbers && cleanNumbers.length >= 1) {
              const usageVal = cleanNumbers[usageColIdx] ? parseCommaNum(cleanNumbers[usageColIdx]) : null;
              const prevMonthVal = cleanNumbers[prevMonthColIdx] ? parseCommaNum(cleanNumbers[prevMonthColIdx]) : null;
              const prevYearVal = cleanNumbers[prevYearColIdx] ? parseCommaNum(cleanNumbers[prevYearColIdx]) : null;

              logs[idx].usage = usageVal;
              logs[idx].prevMonth = prevMonthVal;
              logs[idx].prevYear = prevYearVal;

              updatedCount++;
            }
          }
        }
      });

      if (updatedCount === 0) {
        alert("데이터 파싱에 실패했습니다. 입력 양식을 확인해 주세요.");
        return;
      }

      db.ref("kepco_logs/" + yearMonthKey).set(logs).then(() => {
        alert(`${yearMonthKey} (${updatedCount}건 스마트 파싱) 데이터가 DB에 저장되고 차트에 자동 반영되었습니다!`);
        closeKepcoModal();

        if (dateInput) {
          const targetDate = `${yearMonthKey}-01`;
          dateInput.value = targetDate;
          db.ref("dashboard/production_date").set(targetDate);
          fetchKepcoPowerLogs(targetDate);
        }
      }).catch((err) => {
        alert("DB 저장 중 오류 발생: " + err.message);
      });
    });
  };

  window.openWorkLog = function() {
      localStorage.setItem("workLogLastViewed", Date.now().toString());
      const badgeEl = document.getElementById("work-log-badge");
      if (badgeEl) badgeEl.classList.add("hidden");
      window.open('work_log.html', '_blank', 'width=1400,height=950,scrollbars=yes');
  };

});