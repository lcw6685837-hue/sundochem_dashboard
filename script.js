// 💡 1. Firebase 설정 (창우님의 프로젝트 API 키 완벽 적용!)
const firebaseConfig = {
  apiKey: "AIzaSyA_JNWO5Ke5ZVJDnwP06QW9WsZXNZFv0bc",
  authDomain: "sundochem-dashboard.firebaseapp.com",
  databaseURL: "https://sundochem-dashboard-default-rtdb.firebaseio.com",
  projectId: "sundochem-dashboard",
  storageBucket: "sundochem-dashboard.firebasestorage.app",
  messagingSenderId: "360796635566",
  appId: "1:360796635566:web:d3bf85eb5e5e1574b5483f",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.addEventListener("DOMContentLoaded", () => {
  // 1. 실시간 플립 시계
  function updateFlipClock() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const kst = new Date(utc + 3600000 * 9);
    document.getElementById("fc-year").textContent = kst.getFullYear();
    document.getElementById("fc-month").textContent = String(
      kst.getMonth() + 1,
    ).padStart(2, "0");
    document.getElementById("fc-day").textContent = String(
      kst.getDate(),
    ).padStart(2, "0");
    document.getElementById("fc-hour").textContent = String(
      kst.getHours(),
    ).padStart(2, "0");
    document.getElementById("fc-min").textContent = String(
      kst.getMinutes(),
    ).padStart(2, "0");
    document.getElementById("fc-sec").textContent = String(
      kst.getSeconds(),
    ).padStart(2, "0");
  }
  updateFlipClock();
  setInterval(updateFlipClock, 1000);

  // 2. 수율 및 가스순도 링 애니메이션
  function setupDynamicRing(inputId, ringId, hexColor) {
    const inputEl = document.getElementById(inputId);
    const ringEl = document.getElementById(ringId);
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

  // 3. 콤마 자동 생성 헬퍼
  function parseCommaNum(str) {
    return isNaN(parseFloat(String(str).replace(/,/g, "")))
      ? 0
      : parseFloat(String(str).replace(/,/g, ""));
  }
  function formatCommaNum(num) {
    return num.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  }

  // 4. 전/금일재고 자동 합산
  function setupAutoSum(input1Id, input2Id, totalId) {
    const in1 = document.getElementById(input1Id),
      in2 = document.getElementById(input2Id),
      total = document.getElementById(totalId);
    function calculateSum() {
      total.value = formatCommaNum(
        parseCommaNum(in1.value) + parseCommaNum(in2.value),
      );
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

  // 5. 탱크 용량 대비 퍼센트 계산
  function setupInventoryRatio(
    tonInputId,
    percentInputId,
    ringId,
    maxCapacity,
    hexColor,
  ) {
    const tonInput = document.getElementById(tonInputId),
      percentInput = document.getElementById(percentInputId),
      ringEl = document.getElementById(ringId);
    function updateRatio() {
      let ratio = (parseCommaNum(tonInput.value) / maxCapacity) * 100;
      if (isNaN(ratio) || ratio < 0) ratio = 0;
      if (ratio > 100) ratio = 100;
      percentInput.value = ratio.toFixed(1);
      ringEl.style.background = `conic-gradient(${hexColor} ${ratio.toFixed(1)}%, #334155 0)`;
    }
    tonInput.addEventListener("input", updateRatio);
    tonInput.addEventListener("blur", updateRatio);
    updateRatio();
  }
  setupInventoryRatio(
    "today-ind-ton",
    "today-ind-input",
    "today-ind-ring",
    2900,
    "#3b82f6",
  );
  setupInventoryRatio(
    "today-bev-ton",
    "today-bev-input",
    "today-bev-ring",
    800,
    "#10b981",
  );

  // 6. 실시간 탱크 재고 자동 합산
  const tk1 = document.getElementById("tank1-ton"),
    tk2 = document.getElementById("tank2-ton"),
    tk3 = document.getElementById("tank3-ton"),
    tk4 = document.getElementById("tank4-ton"),
    tk5 = document.getElementById("tank5-ton");
  const tkIndTotal = document.getElementById("ind-tank-total"),
    tkBevTotal = document.getElementById("bev-tank-total"),
    tkAllTotal = document.getElementById("all-tank-total");
  function calculateTankTotals() {
    const ind =
      parseCommaNum(tk1.value) +
      parseCommaNum(tk2.value) +
      parseCommaNum(tk3.value) +
      parseCommaNum(tk5.value);
    const bev = parseCommaNum(tk4.value);
    tkIndTotal.value = formatCommaNum(Number(ind.toFixed(2)));
    tkBevTotal.value = formatCommaNum(Number(bev.toFixed(2)));
    tkAllTotal.value = formatCommaNum(Number((ind + bev).toFixed(2)));
  }
  [tk1, tk2, tk3, tk4, tk5].forEach((input) => {
    input.addEventListener("input", calculateTankTotals);
    input.addEventListener("blur", (e) => {
      e.target.value = formatCommaNum(parseCommaNum(e.target.value));
      calculateTankTotals();
    });
  });

  // 7. 한전 파워플래너 차트
  const ctx = document.getElementById("energyChart").getContext("2d");
  const labels = Array.from(
    { length: 25 },
    (_, i) => `${String(i).padStart(2, "0")}시`,
  );
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          type: "line",
          label: "전월동일",
          data: [
            1050, 1040, 1060, 1080, 1100, 1120, 1140, 1160, 1150, 1140, 1130,
            1150, 1170, 1190, 1210, 1230, 1250, 1500, 1550, 1530, 1510, 1490,
            1300, 1280, 1290,
          ],
          borderColor: "#fb923c",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          fill: false,
        },
        {
          type: "line",
          label: "전일",
          data: [
            290, 285, 280, 275, 270, 265, 260, 255, 130, 120, 115, 110, 115,
            120, 130, 290, 295, 300, 300, 295, 290, 285, 290, 295, 300,
          ],
          borderColor: "#4ade80",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          fill: false,
        },
        {
          type: "line",
          label: "평균",
          data: [
            270, 260, 250, 240, 230, 220, 210, 200, 150, 140, 130, 120, 130,
            140, 150, 270, 280, 290, 290, 280, 270, 260, 270, 280, 290,
          ],
          borderColor: "#c084fc",
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          fill: false,
        },
        {
          type: "bar",
          label: "사용량",
          data: [
            280, 275, 270, 180, 250, 245, 240, 235, 120, 110, 105, 100, 105,
            110, 120, 280, 285, 290, 290, 285, 280, 275, 280, 285, 290,
          ].map((val, idx) => (idx <= new Date().getHours() ? val : null)),
          backgroundColor: "#2dd4bf",
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#94a3b8",
            font: { size: 11, family: "Pretendard" },
            usePointStyle: true,
            boxWidth: 8,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "#334155", drawBorder: false },
          ticks: { color: "#64748b", font: { size: 10 } },
        },
        y: {
          grid: { color: "#334155", borderDash: [5, 5] },
          ticks: { color: "#64748b", font: { size: 10 } },
          beginAtZero: true,
        },
      },
    },
  });

  // =========================================================================
  // 🚀 클라우드(Firebase) 동기화 엔진 🚀
  // =========================================================================

  // A. 텍스트 입력창 동기화
  const allInputs = document.querySelectorAll(
    'input[type="text"], input[type="time"]',
  );
  allInputs.forEach((input, index) => {
    const syncKey = input.id || "input_idx_" + index;
    input.addEventListener("input", (e) => {
      // 💡 깐깐한 조건 해제하여 완벽 작동 보장
      db.ref("dashboard/inputs/" + syncKey).set(e.target.value);
    });
  });

  db.ref("dashboard/inputs").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    allInputs.forEach((input, index) => {
      const syncKey = input.id || "input_idx_" + index;
      if (data[syncKey] !== undefined && document.activeElement !== input) {
        if (input.value !== data[syncKey]) {
          input.value = data[syncKey];
          input.dispatchEvent(new Event("input")); // 값 받으면 자동합산 등 트리거 작동
        }
      }
    });
  });

  // B. 설비가동 토글 동기화
  const toggleGroups = document.querySelectorAll(".toggle-group");
  toggleGroups.forEach((group, index) => {
    const onBtn = group.querySelector(".on-btn");
    const offBtn = group.querySelector(".off-btn");
    const syncKey = "toggle_idx_" + index;

    onBtn.addEventListener("click", () => {
      db.ref("dashboard/toggles/" + syncKey).set("ON");
    });
    offBtn.addEventListener("click", () => {
      db.ref("dashboard/toggles/" + syncKey).set("OFF");
    });
  });

  db.ref("dashboard/toggles").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    toggleGroups.forEach((group, index) => {
      const syncKey = "toggle_idx_" + index;
      const currentState = data[syncKey];
      const onBtn = group.querySelector(".on-btn");
      const offBtn = group.querySelector(".off-btn");

      if (currentState === "ON") {
        onBtn.className =
          "toggle-btn on-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.8)] opacity-100";
        offBtn.className =
          "toggle-btn off-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-transparent text-rose-500 opacity-20 hover:opacity-50";
      } else if (currentState === "OFF") {
        offBtn.className =
          "toggle-btn off-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.8)] opacity-100";
        onBtn.className =
          "toggle-btn on-btn px-2 py-0.5 rounded-full text-[9px] font-black transition-all duration-300 bg-transparent text-emerald-500 opacity-20 hover:opacity-50";
      }
    });
  });

  // C. 🚨 DEFCON (비상 알람) 엔진 🚨
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

    // 💡 HTML(w-[170px] 등)의 최신 클래스 설정과 100% 동일하게 튜닝 완료!
    if (defconState === 0) {
      defconPing.className =
        "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
      defconDot.className =
        "relative inline-flex rounded-full h-3 w-3 bg-emerald-500";
      defconText.className =
        "text-emerald-400 font-bold tracking-widest text-sm w-[170px] text-center whitespace-nowrap transition-colors group-hover:text-emerald-300";
      defconText.textContent = "전 설비 정상 가동중";
      document.body.classList.remove("emergency-mode");
    } else if (defconState === 1) {
      defconPing.className =
        "animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75";
      defconDot.className =
        "relative inline-flex rounded-full h-3 w-3 bg-amber-500";
      defconText.className =
        "text-amber-400 font-bold tracking-widest text-sm w-[170px] text-center whitespace-nowrap transition-colors group-hover:text-amber-300";
      defconText.textContent = "⚠️ 일부 설비 점검중";
      document.body.classList.remove("emergency-mode");
    } else if (defconState === 2) {
      defconPing.className =
        "fast-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75";
      defconDot.className =
        "relative inline-flex rounded-full h-3 w-3 bg-rose-600";
      defconText.className =
        "text-rose-500 font-black tracking-widest text-sm w-[170px] text-center whitespace-nowrap transition-colors animate-pulse drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]";
      defconText.textContent = "🚨 비상: 이상 발생!";
      document.body.classList.add("emergency-mode");
    }
  });
});
