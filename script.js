/* ============================================================
   화학평형과 평형이동 교육용 시뮬레이션 - script.js
   3단계: 실제 평형상수(K)와 물질수지식을 이용한 정량적 계산으로 교체.
   - 실험1: 2CrO4^2- + 2H+ <=> Cr2O7^2- + H2O, K ≈ 1.0×10^14
   - 실험2: [Co(H2O)6]^2+ + 4Cl- <=> CoCl4^2- + 6H2O, 반트호프 식으로 K(T) 계산
   ============================================================ */

// ============================================================
// 공통 유틸
// ============================================================
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
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function playShiftAnimation(arrowEl, beakerEl, direction) {
  arrowEl.classList.remove("point-left", "point-right");
  if (direction === "right") arrowEl.classList.add("point-right");
  if (direction === "left") arrowEl.classList.add("point-left");
  beakerEl.classList.remove("shake");
  void beakerEl.offsetWidth;
  beakerEl.classList.add("shake");
}

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

// 숫자를 "가수 × 10^지수" 형태의 과학적 표기법 문자열로 변환한다.
const SUPERSCRIPT_MAP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "" };
function toSuperscript(str) {
  return str.split("").map((ch) => SUPERSCRIPT_MAP[ch] ?? ch).join("");
}
function toSci(value, sig = 2) {
  if (value === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / Math.pow(10, exp);
  return `${mantissa.toFixed(sig)} × 10${toSuperscript(String(exp))}`;
}

// ============================================================
// 화면 전환
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
//
//   반응식   2CrO4²⁻ + 2H⁺  ⇌  Cr2O7²⁻ + H2O
//   평형상수 K = [Cr2O7²⁻] / ([CrO4²⁻]² [H⁺]²)  ≈ 1.0×10¹⁴  (실온 근사값)
//
//   총 크로뮴 농도(C_Cr = [CrO4²⁻] + 2[Cr2O7²⁻])는 시약 추가로 변하지 않는
//   "물질수지"이므로 항상 0.100 M로 고정하고, pH만 바뀐다고 가정한다.
//   이 물질수지식과 K를 연립하면 아래의 이차방정식이 나온다.
//
//     2K[H⁺]² a² + a − C_Cr = 0   (a = [CrO4²⁻])
//     a = ( −1 + √(1 + 8K[H⁺]²C_Cr) ) / (4K[H⁺]²)
//
//   이 식으로 실제 [CrO4²⁻], [Cr2O7²⁻]를 계산하므로, 문헌에 알려진 대로
//   pH ≈ 6.5 부근에서 크로뮴산↔다이크로뮴산 비율이 절반씩 뒤바뀐다.
// ============================================================
const EXP1_K = 1.0e14;      // 평형상수 (문헌값 약 10^14 ~ 10^15 범위의 대표값)
const EXP1_C_CR = 0.100;    // 총 크로뮴 농도 (mol/L), 시약 추가로 변하지 않음

const exp1State = { pH: 7 };

const EXP1_EL = {
  liquid: document.getElementById("exp1-liquid"),
  beaker: document.getElementById("exp1-beaker"),
  arrow: document.getElementById("exp1-shift-arrow"),
  colorLabel: document.getElementById("exp1-color-label"),
  phValue: document.getElementById("exp1-ph-value"),
  hValue: document.getElementById("exp1-h-value"),
  cro4Value: document.getElementById("exp1-cro4-value"),
  cr2o7Value: document.getElementById("exp1-cr2o7-value"),
};

// pH로부터 실제 [CrO4²⁻], [Cr2O7²⁻]를 계산 (물질수지 + 평형상수 연립)
function exp1SolveSpecies(pH) {
  const h = Math.pow(10, -pH); // [H+]
  const denom = 4 * EXP1_K * h * h;

  let cro4;
  if (denom < 1e-30) {
    // [H+]가 극도로 작아 사실상 크로뮴산(CrO4^2-)만 존재하는 경우
    cro4 = EXP1_C_CR;
  } else {
    const discriminant = 1 + 8 * EXP1_K * h * h * EXP1_C_CR;
    cro4 = (-1 + Math.sqrt(discriminant)) / denom;
    cro4 = clamp(cro4, 0, EXP1_C_CR);
  }
  const cr2o7 = (EXP1_C_CR - cro4) / 2;
  return { h, cro4, cr2o7 };
}

function exp1Render() {
  const { h, cro4, cr2o7 } = exp1SolveSpecies(exp1State.pH);

  // 색 혼합 비율: 크로뮴 원자 기준으로 다이크로뮴산 형태로 존재하는 비율
  const fractionAsDichromate = clamp01((EXP1_C_CR - cro4) / EXP1_C_CR);
  const color = mixColor("#F4C542", "#F0894B", fractionAsDichromate);
  EXP1_EL.liquid.style.background = color;
  EXP1_EL.liquid.style.height = "62%";
  EXP1_EL.colorLabel.textContent = fractionAsDichromate > 0.5 ? "주황색" : "노란색";

  EXP1_EL.phValue.textContent = exp1State.pH.toFixed(1);
  EXP1_EL.hValue.textContent = toSci(h);
  EXP1_EL.cro4Value.textContent = toSci(cro4);
  EXP1_EL.cr2o7Value.textContent = toSci(cr2o7);

  return { fractionAsDichromate, cro4, cr2o7 };
}

function exp1AddHCl() {
  exp1State.pH = clamp(exp1State.pH - 1.5, 1, 13);
  const { fractionAsDichromate, cro4, cr2o7 } = exp1Render();
  playShiftAnimation(EXP1_EL.arrow, EXP1_EL.beaker, "right");
  renderExplanation("exp1-explain", [
    "HCl을 넣었습니다.",
    "H⁺ 농도가 증가했습니다 (pH 감소).",
    "르샤틀리에 원리에 의해 H⁺를 소비하는 오른쪽(Cr₂O₇²⁻ 생성) 방향으로 평형이 이동합니다.",
    `계산 결과 [Cr₂O₇²⁻] = ${toSci(cr2o7)} M, [CrO₄²⁻] = ${toSci(cro4)} M 입니다.`,
    `Cr 원자 중 <strong>${(fractionAsDichromate * 100).toFixed(0)}%</strong>가 주황색 Cr₂O₇²⁻ 형태이므로 용액이 <strong>주황색</strong>에 가까워집니다.`,
  ]);
}

function exp1AddNaOH() {
  exp1State.pH = clamp(exp1State.pH + 1.5, 1, 13);
  const { fractionAsDichromate, cro4, cr2o7 } = exp1Render();
  playShiftAnimation(EXP1_EL.arrow, EXP1_EL.beaker, "left");
  renderExplanation("exp1-explain", [
    "NaOH를 넣었습니다.",
    "OH⁻가 H⁺를 중화시켜 H⁺ 농도가 감소했습니다 (pH 증가).",
    "르샤틀리에 원리에 의해 H⁺를 보충하는 왼쪽(CrO₄²⁻ 생성) 방향으로 평형이 이동합니다.",
    `계산 결과 [CrO₄²⁻] = ${toSci(cro4)} M, [Cr₂O₇²⁻] = ${toSci(cr2o7)} M 입니다.`,
    `Cr 원자 중 <strong>${((1 - fractionAsDichromate) * 100).toFixed(0)}%</strong>가 노란색 CrO₄²⁻ 형태이므로 용액이 <strong>노란색</strong>에 가까워집니다.`,
  ]);
}

function exp1AddWater() {
  const before = exp1State.pH;
  // 물을 넣으면 강산·강염기가 희석되어 pH가 중성(7) 쪽으로 이동한다.
  // (총 크로뮴 농도 C_Cr은 교육용으로 단순화해 고정값으로 둔다.)
  exp1State.pH = exp1State.pH + (7 - exp1State.pH) * 0.4;
  const direction = exp1State.pH < before ? "left" : exp1State.pH > before ? "right" : null;
  const { fractionAsDichromate } = exp1Render();
  if (direction) playShiftAnimation(EXP1_EL.arrow, EXP1_EL.beaker, direction);
  renderExplanation("exp1-explain", [
    "물을 추가했습니다.",
    "넣었던 산·염기가 희석되어 pH가 중성 쪽으로 이동합니다.",
    "H⁺ 농도 변화가 완만해지며 평형이 중성 부근의 분포로 서서히 되돌아갑니다.",
    `현재 Cr 원자 중 ${(fractionAsDichromate * 100).toFixed(0)}%가 Cr₂O₇²⁻ 형태입니다.`,
  ]);
}

document.getElementById("exp1-add-hcl").addEventListener("click", exp1AddHCl);
document.getElementById("exp1-add-naoh").addEventListener("click", exp1AddNaOH);
document.getElementById("exp1-add-water").addEventListener("click", exp1AddWater);
document.getElementById("exp1-pressure").addEventListener("input", () => renderPressureNote("exp1-explain"));

exp1Render();

// ============================================================
// 실험 2 : 염화코발트 평형
//
//   반응식   [Co(H2O)6]²⁺ + 4Cl⁻  ⇌  CoCl4²⁻ + 6H2O   (정반응 = 흡열반응)
//   평형상수 K(T) = [CoCl4²⁻] / ([Co(H2O)6²⁺][Cl⁻]⁴)
//
//   온도에 따른 K(T) 변화는 반트호프 식을 사용한다.
//     ln(K(T)/K_ref) = −(ΔH/R)(1/T − 1/T_ref)
//   ΔH > 0 (흡열)이므로 T가 오르면 K(T)도 커진다 (오른쪽, 파란색 CoCl4²⁻ 증가).
//
//   총 Co 농도(C_Co)는 고정하고, 물질수지 [Co(H2O)6²⁺] + [CoCl4²⁻] = C_Co와
//   K(T)를 연립하면:
//     x = C_Co · K(T)[Cl⁻]⁴ / (1 + K(T)[Cl⁻]⁴)   (x = [CoCl4²⁻])
//
//   Cl⁻가 거의 없으면(순수 물만 있을 때) 온도를 올려도 파랗게 변하지 않는데,
//   이는 실제 화학 현상과 일치한다 (진한 염산이나 탈수 조건이 필요함).
// ============================================================
const EXP2_DH = 50000;       // ΔH (J/mol), 흡열 반응이므로 양수
const EXP2_R = 8.314;        // 기체 상수 (J/mol·K)
const EXP2_T_REF = 298.15;   // 기준 온도 (25℃, K)
const EXP2_K_REF = 1.0e-4;   // 기준 온도에서의 평형상수 (M⁻⁴), 교육용 대표값
const EXP2_C_CO = 0.050;     // 총 코발트 농도 (mol/L), 고정

const exp2State = {
  temperature: 25,       // ℃
  clConc: 0.10,           // [Cl⁻] (mol/L), CoCl2 자체에서 나오는 배경 농도로 시작
};

const EXP2_EL = {
  liquid: document.getElementById("exp2-liquid"),
  beaker: document.getElementById("exp2-beaker"),
  arrow: document.getElementById("exp2-shift-arrow"),
  colorLabel: document.getElementById("exp2-color-label"),
  tempValue: document.getElementById("exp2-temp-value"),
  clValue: document.getElementById("exp2-cl-value"),
  kValue: document.getElementById("exp2-k-value"),
  fractionValue: document.getElementById("exp2-fraction-value"),
};

// 반트호프 식으로 현재 온도에서의 평형상수 K(T)를 계산한다.
function exp2ComputeK(tempC) {
  const T = tempC + 273.15;
  const lnRatio = -(EXP2_DH / EXP2_R) * (1 / T - 1 / EXP2_T_REF);
  return EXP2_K_REF * Math.exp(lnRatio);
}

// K(T)와 [Cl⁻], 물질수지식을 연립해 CoCl4²⁻ 비율을 계산한다.
function exp2SolveFraction() {
  const K = exp2ComputeK(exp2State.temperature);
  const term = K * Math.pow(exp2State.clConc, 4);
  const fractionBlue = term / (1 + term); // = [CoCl4^2-] / C_Co
  return { K, fractionBlue };
}

function exp2Render() {
  const { K, fractionBlue } = exp2SolveFraction();
  const color = mixColor("#F2A6C6", "#5FB6E8", fractionBlue);
  EXP2_EL.liquid.style.background = color;
  EXP2_EL.liquid.style.height = "62%";
  EXP2_EL.colorLabel.textContent = fractionBlue > 0.5 ? "파란색" : "분홍색";
  EXP2_EL.tempValue.textContent = Math.round(exp2State.temperature);
  EXP2_EL.clValue.textContent = exp2State.clConc.toFixed(2);
  EXP2_EL.kValue.textContent = toSci(K);
  EXP2_EL.fractionValue.textContent = (fractionBlue * 100).toFixed(1);
  return { K, fractionBlue };
}

function exp2AddHCl() {
  exp2State.clConc = clamp(exp2State.clConc + 1.0, 0, 8);
  const { fractionBlue } = exp2Render();
  playShiftAnimation(EXP2_EL.arrow, EXP2_EL.beaker, "right");
  renderExplanation("exp2-explain", [
    "HCl을 넣었습니다.",
    `Cl⁻ 농도가 ${exp2State.clConc.toFixed(2)} M로 증가했습니다.`,
    "르샤틀리에 원리에 의해 Cl⁻을 소비하는 오른쪽(CoCl₄²⁻ 생성) 방향으로 평형이 이동합니다.",
    `계산 결과 CoCl₄²⁻ 비율 = <strong>${(fractionBlue * 100).toFixed(1)}%</strong> 입니다.`,
    `용액이 <strong>${fractionBlue > 0.5 ? "파란색" : "분홍색에 가까운 색"}</strong>으로 변합니다.`,
  ]);
}

function exp2AddWater() {
  exp2State.clConc = clamp(exp2State.clConc / 1.4, 0.01, 8);
  const { fractionBlue } = exp2Render();
  playShiftAnimation(EXP2_EL.arrow, EXP2_EL.beaker, "left");
  renderExplanation("exp2-explain", [
    "물을 추가했습니다.",
    `Cl⁻ 농도가 ${exp2State.clConc.toFixed(2)} M로 희석되었습니다.`,
    "르샤틀리에 원리에 의해 입자 수가 늘어나는 왼쪽([Co(H₂O)₆]²⁺ 생성) 방향으로 평형이 이동합니다.",
    `계산 결과 CoCl₄²⁻ 비율 = <strong>${(fractionBlue * 100).toFixed(1)}%</strong> 입니다.`,
    `용액이 <strong>${fractionBlue < 0.5 ? "분홍색" : "파란색에 가까운 색"}</strong>으로 변합니다.`,
  ]);
}

function exp2TemperatureChanged(value) {
  const before = exp2State.temperature;
  exp2State.temperature = value;
  const { K, fractionBlue } = exp2Render();
  const direction = value > before ? "right" : value < before ? "left" : null;
  if (direction) playShiftAnimation(EXP2_EL.arrow, EXP2_EL.beaker, direction);

  if (value > before) {
    renderExplanation("exp2-explain", [
      "온도를 높였습니다.",
      "이 반응은 <strong>흡열 반응(정반응)</strong>이므로 온도가 오르면 평형상수 K(T)가 커집니다.",
      `현재 K(T) ≈ ${toSci(K)}, [Cl⁻] = ${exp2State.clConc.toFixed(2)} M 입니다.`,
      "르샤틀리에 원리에 의해 열을 흡수하는 오른쪽(CoCl₄²⁻ 생성) 방향으로 평형이 이동합니다.",
      `CoCl₄²⁻ 비율 = <strong>${(fractionBlue * 100).toFixed(1)}%</strong> → 용액이 ${fractionBlue > 0.5 ? "<strong>파란색</strong>" : "파란색에 조금 더 가까워짐"}으로 변합니다.`,
    ]);
  } else if (value < before) {
    renderExplanation("exp2-explain", [
      "온도를 낮췄습니다.",
      "역반응(CoCl₄²⁻ → [Co(H₂O)₆]²⁺)은 발열 반응이므로 온도가 내려가면 평형상수 K(T)가 작아집니다.",
      `현재 K(T) ≈ ${toSci(K)}, [Cl⁻] = ${exp2State.clConc.toFixed(2)} M 입니다.`,
      "르샤틀리에 원리에 의해 열을 방출하는 왼쪽([Co(H₂O)₆]²⁺ 생성) 방향으로 평형이 이동합니다.",
      `CoCl₄²⁻ 비율 = <strong>${(fractionBlue * 100).toFixed(1)}%</strong> → 용액이 ${fractionBlue < 0.5 ? "<strong>분홍색</strong>" : "분홍색에 조금 더 가까워짐"}으로 변합니다.`,
    ]);
  }
}

document.getElementById("exp2-add-hcl").addEventListener("click", exp2AddHCl);
document.getElementById("exp2-add-water").addEventListener("click", exp2AddWater);
document.getElementById("exp2-temperature").addEventListener("input", (e) => {
  exp2TemperatureChanged(Number(e.target.value));
});
document.getElementById("exp2-pressure").addEventListener("input", () => renderPressureNote("exp2-explain"));

exp2Render();
