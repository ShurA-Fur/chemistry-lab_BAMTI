/* ============================================================
   화학평형과 평형이동 교육용 시뮬레이션 - script.js
   2단계: 화학평형 로직, 색 변화, 애니메이션, 실시간 설명, 
          농도·온도·압력 기능까지 모두 구현.
   ============================================================ */

// ============================================================
// 공통 유틸
// ============================================================

// 두 색(hex) 사이를 t(0~1) 비율로 섞어서 새로운 hex 색을 만든다.
// 예: mixColor("#F4C542", "#F0894B", 0.5) -> 두 색의 중간색
function mixColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// 0~1 사이 값으로 clamp
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// 화살표에 방향 클래스를 씌우고, 비커를 살짝 흔드는 효과를 준다.
function playShiftAnimation(arrowEl, beakerEl, direction) {
  arrowEl.classList.remove("point-left", "point-right");
  if (direction === "right") arrowEl.classList.add("point-right");
  if (direction === "left") arrowEl.classList.add("point-left");

  beakerEl.classList.remove("shake");
  // 리플로우를 강제해서 애니메이션을 다시 재생시킨다.
  void beakerEl.offsetWidth;
  beakerEl.classList.add("shake");
}

// 오른쪽 설명 패널에 단계별 설명을 순서대로 표시한다.
function renderExplanation(panelId, lines) {
  const panel = document.getElementById(panelId);
  const html = lines
    .map((line, i) => {
      const arrow = i === 0 ? "" : `<span class="explain-arrow">↓</span>`;
      return `${arrow}<p class="explain-step">${line}</p>`;
    })
    .join("");
  panel.innerHTML = `<h3 class="explain-title">지금 일어나는 일</h3>${html}`;
}

function renderPressureNote(panelId) {
  const panel = document.getElementById(panelId);
  panel.innerHTML = `
    <h3 class="explain-title">지금 일어나는 일</h3>
    <p class="explain-step">압력을 조절했습니다.</p>
    <span class="explain-arrow">↓</span>
    <p class="explain-step">이 반응에서는 기체가 관여하지 않으므로 압력 변화의 영향이 거의 없습니다.</p>
  `;
}

// 과학적 표기법 문자열 생성 (예: 1.0 × 10⁻⁷)
const SUPERSCRIPT_MAP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
function toSuperscript(str) {
  return str.split("").map((ch) => SUPERSCRIPT_MAP[ch] ?? ch).join("");
}
function formatConcentration(exponent) {
  // exponent는 음수 정수 (예: -7 -> 1.0 × 10⁻⁷ M)
  return `1.0 × 10${toSuperscript(String(exponent))}`;
}

// ============================================================
// 화면 전환 (1단계에서 이어짐)
// ============================================================
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}
document.getElementById("btn-logo").addEventListener("click", () => showScreen("home-screen"));
document.querySelectorAll("[data-target]").forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.target));
});

function bindSliderDisplay(sliderId, displayId, unit) {
  const slider = document.getElementById(sliderId);
  const display = document.getElementById(displayId);
  if (!slider || !display) return;
  slider.addEventListener("input", () => {
    display.textContent = `${slider.value} ${unit}`;
  });
}
bindSliderDisplay("exp1-pressure", "exp1-pressure-value", "atm");
bindSliderDisplay("exp2-temperature", "exp2-temperature-value", "℃");
bindSliderDisplay("exp2-pressure", "exp2-pressure-value", "atm");

// ============================================================
// 실험 1 : 다이크로뮴산(Cr2O7²⁻) - 크로뮴산(CrO4²⁻) 평형
//   2CrO4²⁻ + 2H⁺  ⇌  Cr2O7²⁻ + H2O
//   산성(H⁺ 증가)일수록 오른쪽(주황, Cr2O7²⁻)
//   염기성(H⁺ 감소)일수록 왼쪽(노랑, CrO4²⁻)
// ============================================================
const exp1State = {
  pH: 7, // 0(강산) ~ 14(강염기), 시작은 중성 부근
};

const EXP1_EL = {
  liquid: document.getElementById("exp1-liquid"),
  beaker: document.getElementById("exp1-beaker"),
  arrow: document.getElementById("exp1-shift-arrow"),
  colorLabel: document.getElementById("exp1-color-label"),
  hValue: document.getElementById("exp1-h-value"),
  ohValue: document.getElementById("exp1-oh-value"),
};

function exp1Render() {
  // pH가 낮을수록(산성) 오른쪽=주황, pH가 높을수록(염기성) 왼쪽=노랑
  // shiftT: 0 = 완전 노랑(왼쪽), 1 = 완전 주황(오른쪽)
  const shiftT = clamp01((7 - exp1State.pH) / 6 * 0.5 + 0.5);
  const color = mixColor("#F4C542", "#F0894B", shiftT);
  EXP1_EL.liquid.style.background = color;
  EXP1_EL.liquid.style.height = "62%";

  EXP1_EL.colorLabel.textContent = shiftT > 0.5 ? "주황색" : "노란색";

  const pH = clamp(exp1State.pH, 1, 13);
  EXP1_EL.hValue.textContent = formatConcentration(-Math.round(pH));
  EXP1_EL.ohValue.textContent = formatConcentration(-Math.round(14 - pH));
}

function exp1AddHCl() {
  const before = exp1State.pH;
  exp1State.pH = clamp(exp1State.pH - 2, 1, 13);
  exp1Render();
  playShiftAnimation(EXP1_EL.arrow, EXP1_EL.beaker, "right");
  renderExplanation("exp1-explain", [
    "HCl을 넣었습니다.",
    "H⁺ 농도가 증가했습니다.",
    "르샤틀리에 원리에 의해 H⁺를 소비하는 방향으로 평형이 이동합니다.",
    "Cr₂O₇²⁻ 생성량이 증가합니다.",
    "용액 색이 <strong>주황색</strong>으로 변합니다.",
  ]);
  if (before === exp1State.pH) {
    // 이미 최댓값(가장 강한 산성)에 도달한 경우 안내만 덧붙인다.
  }
}

function exp1AddNaOH() {
  exp1State.pH = clamp(exp1State.pH + 2, 1, 13);
  exp1Render();
  playShiftAnimation(EXP1_EL.arrow, EXP1_EL.beaker, "left");
  renderExplanation("exp1-explain", [
    "NaOH를 넣었습니다.",
    "H⁺ 농도가 감소했습니다 (OH⁻가 H⁺를 중화시킵니다).",
    "르샤틀리에 원리에 의해 H⁺를 보충하는 방향으로 평형이 이동합니다.",
    "CrO₄²⁻ 생성량이 증가합니다.",
    "용액 색이 <strong>노란색</strong>으로 변합니다.",
  ]);
}

function exp1AddWater() {
  // 물을 넣으면 전체가 희석되며 pH가 중성(7) 쪽으로 서서히 되돌아간다.
  const direction = exp1State.pH < 7 ? "left" : exp1State.pH > 7 ? "right" : null;
  exp1State.pH = exp1State.pH + (7 - exp1State.pH) * 0.4;
  exp1Render();
  if (direction) playShiftAnimation(EXP1_EL.arrow, EXP1_EL.beaker, direction);
  renderExplanation("exp1-explain", [
    "물을 추가했습니다.",
    "전체 이온 농도가 희석되었습니다.",
    "농도 변화가 완만해지며 평형이 중성 쪽으로 서서히 되돌아갑니다.",
    "용액 색 변화가 <strong>옅어집니다</strong>.",
  ]);
}

document.getElementById("exp1-add-hcl").addEventListener("click", exp1AddHCl);
document.getElementById("exp1-add-naoh").addEventListener("click", exp1AddNaOH);
document.getElementById("exp1-add-water").addEventListener("click", exp1AddWater);
document.getElementById("exp1-pressure").addEventListener("input", () => renderPressureNote("exp1-explain"));

exp1Render(); // 초기 상태 표시

// ============================================================
// 실험 2 : 염화코발트 평형
//   [Co(H2O)6]²⁺ + 4Cl⁻  ⇌  CoCl4²⁻ + 6H2O   (흡열 반응, 정반응)
//   온도 ↑ 또는 Cl⁻ ↑  -> 오른쪽(파랑)
//   물 ↑ (희석)         -> 왼쪽(분홍)
// ============================================================
const exp2State = {
  temperature: 25, // ℃, 슬라이더와 동기화
  clLevel: 0,      // -5(물 많이 넣음) ~ +5(HCl 많이 넣음)
};

const EXP2_EL = {
  liquid: document.getElementById("exp2-liquid"),
  beaker: document.getElementById("exp2-beaker"),
  arrow: document.getElementById("exp2-shift-arrow"),
  colorLabel: document.getElementById("exp2-color-label"),
  tempValue: document.getElementById("exp2-temp-value"),
  clValue: document.getElementById("exp2-cl-value"),
};

function exp2ShiftFraction() {
  // 온도 기여: 25℃ 기준으로 높아질수록 오른쪽(파랑) 방향 (흡열 반응)
  const tempFactor = clamp01((exp2State.temperature - 25) / 75) * 0.65;
  // Cl- 기여: 염산을 넣을수록 오른쪽, 물을 넣을수록 왼쪽
  const clFactor = clamp01((exp2State.clLevel + 5) / 10) ; // 0~1
  // 두 요인을 합쳐 최종 이동 비율 계산 (0=분홍, 1=파랑)
  return clamp01(tempFactor * 0.55 + clFactor * 0.55 - 0.25);
}

function exp2Render() {
  const shiftT = exp2ShiftFraction();
  const color = mixColor("#F2A6C6", "#5FB6E8", shiftT);
  EXP2_EL.liquid.style.background = color;
  EXP2_EL.liquid.style.height = "62%";
  EXP2_EL.colorLabel.textContent = shiftT > 0.5 ? "파란색" : "분홍색";
  EXP2_EL.tempValue.textContent = Math.round(exp2State.temperature);

  // Cl- 농도는 clLevel(-5~5)을 0.02M ~ 0.12M 범위로 단순 매핑해 표시한다.
  const clConc = (0.02 + (exp2State.clLevel + 5) * 0.01).toFixed(2);
  EXP2_EL.clValue.textContent = clConc;
}

function exp2AddHCl() {
  exp2State.clLevel = clamp(exp2State.clLevel + 1, -5, 5);
  exp2Render();
  playShiftAnimation(EXP2_EL.arrow, EXP2_EL.beaker, "right");
  renderExplanation("exp2-explain", [
    "HCl을 넣었습니다.",
    "Cl⁻ 농도가 증가했습니다.",
    "르샤틀리에 원리에 의해 Cl⁻을 소비하는 방향(오른쪽)으로 평형이 이동합니다.",
    "CoCl₄²⁻ 생성량이 증가합니다.",
    "용액 색이 <strong>파란색</strong>으로 변합니다.",
  ]);
}

function exp2AddWater() {
  exp2State.clLevel = clamp(exp2State.clLevel - 1, -5, 5);
  exp2Render();
  playShiftAnimation(EXP2_EL.arrow, EXP2_EL.beaker, "left");
  renderExplanation("exp2-explain", [
    "물을 추가했습니다.",
    "전체 이온 농도(특히 Cl⁻)가 희석되었습니다.",
    "르샤틀리에 원리에 의해 입자 수가 늘어나는 방향(왼쪽)으로 평형이 이동합니다.",
    "[Co(H₂O)₆]²⁺ 생성량이 증가합니다.",
    "용액 색이 <strong>분홍색</strong>으로 변합니다.",
  ]);
}

function exp2TemperatureChanged(value) {
  const before = exp2State.temperature;
  exp2State.temperature = value;
  exp2Render();
  const direction = value > before ? "right" : value < before ? "left" : null;
  if (direction) playShiftAnimation(EXP2_EL.arrow, EXP2_EL.beaker, direction);

  if (value > before) {
    renderExplanation("exp2-explain", [
      "온도를 높였습니다.",
      "이 반응은 <strong>흡열 반응(정반응)</strong>입니다.",
      "르샤틀리에 원리에 의해 열을 흡수하는 방향(오른쪽)으로 평형이 이동합니다.",
      "CoCl₄²⁻ 생성량이 증가합니다.",
      "용액 색이 <strong>파란색</strong>으로 변합니다.",
    ]);
  } else if (value < before) {
    renderExplanation("exp2-explain", [
      "온도를 낮췄습니다.",
      "이 반응의 <strong>역반응은 발열 반응</strong>입니다.",
      "르샤틀리에 원리에 의해 열을 방출하는 방향(왼쪽)으로 평형이 이동합니다.",
      "[Co(H₂O)₆]²⁺ 생성량이 증가합니다.",
      "용액 색이 <strong>분홍색</strong>으로 변합니다.",
    ]);
  }
}

document.getElementById("exp2-add-hcl").addEventListener("click", exp2AddHCl);
document.getElementById("exp2-add-water").addEventListener("click", exp2AddWater);
document.getElementById("exp2-temperature").addEventListener("input", (e) => {
  exp2TemperatureChanged(Number(e.target.value));
});
document.getElementById("exp2-pressure").addEventListener("input", () => renderPressureNote("exp2-explain"));

exp2Render(); // 초기 상태 표시
