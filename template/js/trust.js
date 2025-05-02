window.addEventListener("DOMContentLoaded", () => {
  const userId = sessionStorage.getItem("user_id");
  console.log(" user_id 상태:", userId);

  if (!userId) {
    alert("로그인을 해주세요!");
    sessionStorage.setItem("showLoginModal", "true");
    window.location.href = "/template/html/index.html";
    return;
  }
 
});

function toggleHeaderUI() {
  document.querySelector(".auth-top").style.display = "none";
  document.querySelector(".auth-top-loggedin").style.display = "flex";
}


document.querySelectorAll(".file-input").forEach((input) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const box = e.target.closest(".upload-box");
    box.querySelector(".file-name").textContent = file ? `📁 ${file.name}` : "";
    box.querySelector(".clear-btn").style.display = file ? "inline-block" : "none";
  });
});

document.querySelectorAll(".clear-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const box = e.target.closest(".upload-box");
    const input = box.querySelector(".file-input");
    input.value = "";
    box.querySelector(".file-name").textContent = "";
    btn.style.display = "none";
  });
});

function getRiskLabel(score) {
  if (score === "na") return "미확인";
  const abs = Math.abs(score);
  if (abs > 20) return "위험";
  if (abs > 0) return "주의";
  return "안전";
}

// 3. 총점 도넛 차트
//--------------------------------------------------
function renderTotalScoreChart(score, riskLabel) {
  const canvas = document.getElementById("chart-total");
  const colorMap = { 안전: "#2ecc71", 주의: "#f39c12", 위험: "#e74c3c" };
  const remain = 100 - score;

  if (Chart.getChart(canvas)) Chart.getChart(canvas).destroy(); // 

  new Chart(canvas, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [score, remain],
        backgroundColor: [colorMap[riskLabel], "#f0f0f0"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: false, // 
      maintainAspectRatio: false, // 
      rotation: 0,
      circumference: 360,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [{
      id: "center-label",
      beforeDraw: (chart) => {
        const { width, height, ctx } = chart;
        ctx.save();
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(riskLabel, width / 2, height / 2 - 10);
        ctx.font = "normal 14px sans-serif";
        ctx.fillText(`${score}점`, width / 2, height / 2 + 10);
      }
    }]
  });
}

// 2. 슬라이드 기반 카드 렌더링
const scoreMap = { mort: 0, prior: 0, seiz: 0, after: 0, owner: 0, trust: 0, res: 0, auction: 0, lease: 0 };
const titleMap = {
  mort: "근저당권", prior: "가압류", seiz: "압류", after: "계약일 이후 권리",
  owner: "임대인 불일치", trust: "신탁", res: "가등기", auction: "경매 이력", lease: "임차권등기명령"
};
const descMap = {
  mort: "보증금보다 채권이 클 경우 위험",
  prior: "다수 가압류는 우선순위 경합",
  seiz: "말소되지 않은 압류는 세금 위험",
  after: "계약 이후 설정 권리는 선순위 우려",
  owner: "등기부 소유자와 임대인 불일치",
  trust: "신탁 구조는 권리관계 복잡",
  res: "가등기는 소유권 이전 가능성",
  auction: "경매 이력은 위험 신호",
  lease: "임차권 등기는 선순위 임차인 가능"
};

const colorMap = { 위험: "#e74c3c", 주의: "#f39c12", 안전: "#2ecc71",미확인: "#cccccc"  };
let chartMetaList = [];


function drawChart(canvasId, score, risk) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (Chart.getChart(canvas)) Chart.getChart(canvas).destroy();

  

  const isUnknown = score === "na";
  const colorMap = {
    위험: "#e74c3c",
    주의: "#f39c12",
    안전: "#2ecc71",
    미확인: "#cccccc"  
  };

  new Chart(canvas, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [100],
        backgroundColor: [colorMap[risk]],
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [{
      id: "center-text",
      beforeDraw: (chart) => {
        const { width, height, ctx } = chart;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#333";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(risk, width / 2, height / 2 + 10);
        ctx.font = "normal 12px sans-serif";
        ctx.fillText(isUnknown ? "확인 불가" : `${score}점`, width / 2, height / 2 + 30);  // ✅ "확인 불가" 텍스트
      }
    }]
  });
}


function renderRiskCards(deductions) {
  chartMetaList = [];
  const scoreMap = { mort: 0, prior: 0, seiz: 0, after: 0, owner: 0, trust: 0, res: 0, auction: 0, lease: 0 };

  deductions.forEach(d => {
    const r = d.reason;
    const p = d.point;
    if (p === null || p === undefined) return;
    if (r.includes("근저당권")) scoreMap.mort += p;
    if (r.includes("가압류")) scoreMap.prior += p;
    if (r.includes("압류")) scoreMap.seiz += p;
    if (r.includes("계약일") && r.includes("이후")) scoreMap.after += p;
    if (r.includes("불일치")) scoreMap.owner += p;
    if (r.includes("신탁")) scoreMap.trust += p;
    if (r.includes("가등기")) scoreMap.res += p;
    if (r.includes("경매")) scoreMap.auction += p;
    if (r.includes("임차권")) scoreMap.lease += p;
    if (r.includes("보증금")) scoreMap.mort = "na";
    if (r.includes("계약일") && r.includes("미입력")) scoreMap.after = "na";
    if (r.includes("임대인") && r.includes("미입력")) scoreMap.owner = "na";
    if (r.includes("주소") && r.includes("미입력")) scoreMap.mort = "na"; // 또는 별도 address 항목을 만들 수도 있음
    if (r.includes("주소") && r.includes("추출할 수 없음")) scoreMap.mort = "na";

  });

  const sortedKeys = Object.keys(scoreMap).sort((a, b) => {
    const riskLevels = { 위험: 0, 주의: 1, 안전: 2 };
    return riskLevels[getRiskLabel(scoreMap[a])] - riskLevels[getRiskLabel(scoreMap[b])];
  });

  sortedKeys.forEach((key) => {
    const score = scoreMap[key];
    const risk = getRiskLabel(score);
    const canvasId = `chart-${key}`;
    chartMetaList.push({ canvasId, score, risk });
  });

  renderAccordionPage();
}

// 좌우 슬라이드 기능
let currentIndex = 0;
const cardsPerPage = 3;

function renderAccordionPage() {
  const visible = document.getElementById("accordion-visible");
  visible.innerHTML = "";

  const pageItems = chartMetaList.slice(currentIndex, currentIndex + cardsPerPage);

  pageItems.forEach(meta => {
    const key = meta.canvasId.split("-")[1];
    const card = document.createElement("div");
    card.className = "score-item";
    card.innerHTML = `
      <h4>${titleMap[key]}</h4>
      <canvas id="${meta.canvasId}" width="150" height="75"></canvas>
      <p class="desc">${descMap[key]}</p>
    `;
    visible.appendChild(card);
    drawChart(meta.canvasId, meta.score, meta.risk);
  });

 
}

document.getElementById("arrow-left").addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex -= cardsPerPage;
    renderAccordionPage();
  }
});

document.getElementById("arrow-right").addEventListener("click", () => {
  if (currentIndex + cardsPerPage < chartMetaList.length) {
    currentIndex += cardsPerPage;
    renderAccordionPage();
  }
});



async function fetchGptSummaryStream(reasonText) {
  const response = await fetch("http://34.60.210.75:8000/reportsummary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `
아래 감점 항목을 기반으로 부동산 등기부 분석 리포트를 작성해주세요.
반드시 아래 형식을 정확히 따라주세요. 시스템이 이 구조를 기반으로 내용을 인식합니다.
---
자료 요약:
[아래 항목들을 번호로 나누어 정리해 주세요. 각 항목은 1~2문장 이내로 간결하게 작성하고, 감점 요소 간 연관성을 잘 드러내 주세요.]

1. ...
2. ...
3. ...

→ 종합 판단: [전체 리스크를 요약하는 문장 1줄]

📊 등기부 위험도 요약 표:
- 근저당권 상태:
- 가압류:
- 압류:
- 신탁 구조:
- 종합 위험도 평가:

추천 조치:
[사용자가 당장 실행할 수 있는 구체적인 행동 5~6가지를 번호로 제시해 주세요.]

1. ...
2. ...
---
주의사항:
- "자료 요약:"과 "추천 조치:"는 **라벨 그대로 유지**해야 하며 변경하거나 생략하지 마세요.
- 문단 전체를 이어 쓰는 형식은 사용하지 말고, **항목별 번호 형식으로만 작성**해 주세요.
- 마크다운 문법(##, **, -, • 등)은 사용하지 마세요.
- 과도한 수식어나 두루뭉술한 표현 없이, **간결하고 실제적인 표현만** 사용해 주세요.
- 추천조치에서 -합니다, -하세요 말고 추천하는 느낌의 다른 표현도 섞어서 사용해주세요
- 추천조치에는 예방적 조치보다는 실제 확인해야할 항목들을 제시해주세요

감점 항목:
${reasonText}
      `
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let summaryText = "";
  let actionText = "";
  let isActionStarted = false;

  const summaryEl = document.getElementById("gpt-summary");
  if (!summaryEl) {
    alert("❗ 리포트를 출력할 위치를 찾지 못했습니다. HTML에 id='gpt-summary'가 있는지 확인해주세요.");
    return;
  }

  summaryEl.textContent = " 리포트를 불러오는 중입니다...";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;

    if (!isActionStarted && fullText.includes("추천 조치")) {
      isActionStarted = true;
      const splitIndex = fullText.indexOf("추천 조치");
      summaryText = fullText.slice(0, splitIndex).replace("자료 요약:", "").trim();
      actionText = fullText.slice(splitIndex).trim();
    } else if (isActionStarted) {
      actionText += chunk;
    } else {
      
      summaryText = fullText.replace("자료 요약:", "").trim();
    }

    summaryEl.innerHTML = formatGptReport(summaryText, actionText);
  }
}


function formatGptSummaryText(raw) {
  const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
  let listItems = [], summaryLine = '', tableLines = [], mode = 'list';

  for (let line of lines) {
    if (line.startsWith('→ 종합 판단:')) {
      summaryLine = line.replace('→ 종합 판단:', '').trim();
      mode = 'summary';
    } else if (line.includes('📊') || line.includes('위험도 요약 표')) {
      mode = 'table';
    } else {
      if (mode === 'list' && /^\d+\./.test(line)) {
        listItems.push(line.replace(/^\d+\.\s*/, ''));
      } else if (mode === 'table' && line.includes(':')) {
        tableLines.push(line);
      }
    }
  }

  return `
    <div class="report-section">
      <ol class="report-list">
        ${listItems.map(item => `<ol>${item}</ol>`).join('')}
      </ol>
      <p class="report-summary"><strong>➤ 종합 판단:</strong> ${summaryLine}</p>
      <div class="risk-table">
        <h5>📊 등기부 위험도 요약 표</h5>
        <table>
          <tr><th>항목</th><th>내용</th></tr>
          ${tableLines.map(row => {
            const [key, val] = row.split(':');
            return `<tr><td>${key.trim()}</td><td>${val.trim()}</td></tr>`;
          }).join('')}
        </table>
      </div>
    </div>
  `;
}

function formatGptActionText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => /^\d+\./.test(l));
  if (lines.length === 0) return `<p>${raw}</p>`;

  return `
    <div class="report-section">
      <h4>추천 조치</h4>
      <ol class="report-actions">
        ${lines.map(line => `<ol>${line.replace(/^\d+\.\s*/, '')}</ol>`).join('')}
      </ol>
    </div>
  `;
}

function formatGptReport(summaryText, actionText) {
  const summary = formatGptSummaryText(summaryText);
  const actions = formatGptActionText(actionText);
  return `
    <div class="report-section">
      ${summary}
      <hr style="margin: 2rem 0; border: none; border-top: 1px solid #ddd;" />
      ${actions}
    </div>
  `;
}

function showGptLoadingSpinner() {
  const summaryEl = document.getElementById("gpt-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="report-loading">
        <div class="spinner"></div>
        <p class="loading-text">리포트를 생성 중입니다...</p>
      </div>
    `;
  }
}



// 6. 분석 버튼 이벤트
//--------------------------------------------------
document.getElementById("start-check-btn").addEventListener("click", async () => {
  const spinner = document.getElementById("loading-spinner");
  spinner.style.display = "block";
  document.getElementById("result-section").style.display = "none";

  const landlord = document.getElementById("own_name").value;
  const date = document.getElementById("date").value;
  const deposit = document.getElementById("money").value;
  const address = document.getElementById("address").value;
  const file = document.getElementById("file1").files[0];

  if (!file) {
    alert("등기부등본 파일을 첨부해주세요.");
    spinner.style.display = "none";
    return;
  }

  const formData = new FormData();
  formData.append("landlord", landlord);
  formData.append("contract_date", date);
  formData.append("deposit", deposit);
  formData.append("address", address);
  formData.append("file1", file);

  const waitAtLeast4Sec = new Promise(res => setTimeout(res, 4000));

  try {
    const fetchReport = fetch("http://34.60.210.75:8000/trust-check", {
      method: "POST",
      body: formData
    })
      .then(async res => {
        console.log("🎯 API 상태코드:", res.status);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API 오류: ${res.status} - ${text}`);
        }
        return res.json();
      });

    const [_, report] = await Promise.all([waitAtLeast4Sec, fetchReport]);

    spinner.style.display = "none";
    document.getElementById("result-section").style.display = "flex";
    document.getElementById("result-section").scrollIntoView({ behavior: "smooth" });

    renderRiskCards(report.deductions);
    renderTotalScoreChart(report.score, report.risk);

    const neg = report.deductions
      .filter(d => d.point < 0)
      .map(d => `• ${d.reason} (${d.point}점)`)
      .join("\n");

    if (neg) {
      document.querySelector(".gpt-report").style.display = "block";
      showGptLoadingSpinner();

      
      await fetchGptSummaryStream(neg);
    }
  } catch (err) {
    console.error("분석 실패:", err);
    alert("분석 도중 오류가 발생했습니다.");
    spinner.style.display = "none"
  }
});