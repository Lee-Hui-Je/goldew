document.querySelectorAll(".file-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const fileNameElement = e.target.closest(".upload-box").querySelector(".file-name");
  
      if (file) {
        fileNameElement.textContent = `📁 ${file.name}`;
       
      } else {
        fileNameElement.textContent = "";
      }
    });
  });
  
  //
document.querySelectorAll(".file-input").forEach((input) => {
  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const uploadBox = e.target.closest(".upload-box");
    const fileName = uploadBox.querySelector(".file-name");
    const clearBtn = uploadBox.querySelector(".clear-btn");

    if (file) {
      fileName.textContent = `📁 ${file.name}`;
      clearBtn.style.display = "inline-block";
    } else {
      fileName.textContent = "";
      clearBtn.style.display = "none";
    }
  });
});

document.querySelectorAll(".clear-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const uploadBox = e.target.closest(".upload-box");
    const input = uploadBox.querySelector(".file-input");
    const fileName = uploadBox.querySelector(".file-name");
    const clearBtn = uploadBox.querySelector(".clear-btn");

    input.value = "";
    fileName.textContent = "";
    clearBtn.style.display = "none";
  });
});

document.getElementById("start-check-btn").addEventListener("click", async () => {
  // 로딩 표시
  document.getElementById("loading-spinner").style.display = "block";
  document.querySelector(".trust-report").style.display = "none";

  // 입력값 수집
  const landlord = document.querySelector('input[placeholder="임대인 이름"]').value;
  const date = document.querySelector('input[type="date"]').value;
  const deposit = document.querySelector('input[placeholder="보증금 (원)"]').value;
  const address = document.querySelector('input[placeholder="임대차 주소"]').value;
  const file = document.getElementById("file1").files[0];

  if (!file) {
    alert("등기부등본 파일을 첨부해주세요.");
    document.getElementById("loading-spinner").style.display = "none";
    return;
  }

  const formData = new FormData();
  formData.append("landlord", landlord);
  formData.append("contract_date", date);
  formData.append("deposit", deposit);
  formData.append("address", address);
  formData.append("file1", file);

  const waitAtLeast4Seconds = new Promise(resolve => setTimeout(resolve, 4000));

  try {
    const fetchReport = fetch("http://127.0.0.1:8000/trust-check", {
      method: "POST",
      body: formData
    }).then(res => res.json());

    const [_, report] = await Promise.all([waitAtLeast4Seconds, fetchReport]);

    // 리포트 표시
    document.getElementById("loading-spinner").style.display = "none";
    document.querySelector(".trust-report").style.display = "block";

    // 기본 정보
    document.getElementById("input-landlord").textContent = report.input.landlord || "입력되지 않음";
    document.getElementById("input-date").textContent = report.input.date || "입력되지 않음";
    document.getElementById("input-address").textContent = report.input.address || "입력되지 않음";
    document.getElementById("input-deposit").textContent = report.input.deposit || "입력되지 않음";

    // 점수 / 등급 / 라벨
    document.getElementById("score").textContent = report.score;
    document.getElementById("grade").textContent = report.grade;
    document.getElementById("risk-label").textContent = report.risk;

    // 위험도 색상
    const riskColor = {
      "안전": "#2ecc71",
      "주의": "#e67e22",
      "위험": "#e74c3c"
    };
    document.getElementById("risk-label").style.color = riskColor[report.risk] || "#333";

    // 분석 요약
    document.getElementById("summary-text").textContent = report.summary || "요약 정보 없음";
    


    // 위험 요인
    const riskEl = document.getElementById("deduction-list");
    riskEl.innerHTML = "";
    if (report.deductions && report.deductions.length > 0) {
      report.deductions.forEach(d => {
        const p = document.createElement("p");
        p.textContent = `${d.reason} (감점: ${d.point}점)`;
        riskEl.appendChild(p);
      });
    } else {
      riskEl.innerHTML = "<p>특이 위험 요인은 발견되지 않았습니다.</p>"
    }

    // 추천 조치
    const actionEl = document.getElementById("action-list");
    actionEl.innerHTML = "";
    if (report.actions && report.actions.length > 0) {
      report.actions.forEach(a => {
        const p = document.createElement("p");
        p.textContent = "· " + a;
        actionEl.appendChild(p);
      });
    } else {
      actionEl.innerHTML = "<p>추천 조치 없음</p>";
    }

  } catch (err) {
    console.error("분석 실패:", err);
    alert("분석 도중 오류가 발생했습니다. 다시 시도해주세요.");
    document.getElementById("loading-spinner").style.display = "none";
  }
});
