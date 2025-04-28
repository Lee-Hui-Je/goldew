// ✅ 로봇 버튼 클릭 시 메뉴 등장 애니메이션
const ro_btn = document.querySelector(".robot-btn");
const robot = document.querySelector(".robot");
const text_box = document.querySelector(".text-box");
const menu = document.querySelector(".menu");
const input = document.getElementById('chat-input');
let type = menu.getAttribute('data-type');
let chat_bool = false;


console.log("▶ trust.js 로드됨, localStorage.user_id:", localStorage.getItem("user_id"));
window.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("user_id");
  console.log(" user_id 상태:", userId);

  if (!userId) {
    alert("로그인을 해주세요!");
    sessionStorage.setItem("showLoginModal", "true");
    window.location.href = "/template/html/index.html";
    return;
  }

});


ro_btn.addEventListener("click", () => {
  text_box.style.opacity = "0";
  ro_btn.style.opacity = "0";
  robot.style.backgroundImage = "url(../../assets/22.gif)";

  setTimeout(() => {
    text_box.style.visibility = "hidden";
    ro_btn.style.visibility = "hidden";
    robot.style.visibility = "hidden";
  }, 1000);

  setTimeout(() => {
    robot.style.visibility = "visible";
    robot.style.opacity = "1";
  }, 1000);

  setTimeout(() => {
    menu.classList.toggle("active");
  }, 500);
});

// ✅ GPT 챗봇 관련 로직
let messageHistory = [];
let selectedType = null;

// 메뉴 클릭 시 모달 열기 + 초기 메시지 설정
document.querySelectorAll('.gpt-start').forEach(menu => {
  menu.addEventListener('click', async () => {
    chat_bool = true;
    type = menu.getAttribute('data-type');
    selectedType = type;
    messageHistory = [];
    robot.style.backgroundImage = "url(../../assets/10.png)";
    
    document.querySelectorAll('.robotbox li').forEach(li => {
      li.style.visibility = 'hidden';
      li.style.opacity = '0';
    });
    document.querySelector('.robot').style.transform = 'translate(-70%, 0)';

    setTimeout(() => {
      document.getElementById('overlay').classList.add('active');
      document.getElementById('chat-modal').classList.add('show');
  
      document.getElementById('chat-box').innerHTML = '';
      document.getElementById('chat-input').value = '';
  
      const initSystem = `당신은 전세사기 시뮬레이터로, '${type}' 유형의 사기를 시도하는 중개인 역할입니다.`;
      console.log(initSystem);
      messageHistory.push({ role: "system", content: initSystem });
      messageHistory.push({ role: "user", content: "시뮬레이션을 시작합니다." });
  
      showLoading();
      fetchGPT();
      hideLoading();

    }, 1000);
  });
});

// 채팅창 닫기
document.getElementById("close-chat-btn").addEventListener("click", () => {
  chat_bool = false;
  const modal = document.getElementById('chat-modal');
  const overlay = document.getElementById('overlay');

  modal.classList.add('hide');
  overlay.classList.add('hide');

  robot.style.backgroundImage = "url(../../assets/22.gif)";

  setTimeout(() => {
    modal.classList.remove('show', 'hide');
    overlay.classList.remove('active', 'hide');
  }, 100);

  setTimeout(()=>{
    document.querySelector('.robot').style.transform = 'translate(0, 0)';
  },100)
  setTimeout(()=>{
    document.querySelectorAll('.robotbox li').forEach(li => {
      li.style.visibility = 'visible';
      li.style.opacity = '1';
    });
  },1200)

});

// 사용자가 메시지를 입력하고 전송할 때
async function sendChat() {
  chat_bool = false;
  const msg = input.value.trim();
  if (!msg) return;

  appendChat("나", msg);
  messageHistory.push({ role: "user", content: msg });

  input.value = '';
  showLoading();
  await fetchGPT();
  hideLoading();
}

// enter눌렀을때 메시지 전송
input.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    sendChat()
  }
});



// GPT 호출 함수 (Streaming 출력)
async function fetchGPT() {
  try {
    const lastUserMessage = messageHistory[messageHistory.length - 1]?.content || "";

    const res = await fetch('http://34.132.18.41:8000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: lastUserMessage, type:type ,chat_bool:chat_bool})
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = 'gpt-msg';
    div.innerText = "하우봇: ";
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      div.innerText = `하우봇: ${result}`;
      box.scrollTop = box.scrollHeight;
    }

    messageHistory.push({ role: "assistant", content: result });
    return result;

  } catch (error) {
    console.error("❌ GPT 호출 실패:", error);
    alert("서버와 연결할 수 없습니다.");
    return "⚠️ 서버 연결 실패";
  }
}



// 메시지 출력
function appendChat(sender, msg) {
  const box = document.getElementById('chat-box');
  const div = document.createElement('div');
  div.className = sender === "나" ? 'user-msg' : 'gpt-msg';
  div.innerText = `${sender}: ${msg}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// 로딩 인디케이터
function showLoading() {
  document.getElementById('chat-loading').style.display = 'block';
}

function hideLoading() {
  document.getElementById('chat-loading').style.display = 'none';
}


