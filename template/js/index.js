const slides = document.querySelectorAll(".about-slide");
const prevBtn = document.querySelector(".prev");
const nextBtn = document.querySelector(".next");
const newsContainer = document.getElementById("news-container");
let currentIndex = 0;

const news = [];

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.toggle("active", i === index);
  });
}

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + slides.length) % slides.length;
  showSlide(currentIndex);
});

nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % slides.length;
  showSlide(currentIndex);
});

showSlide(currentIndex);


// 로그인 모달 
const modal = document.getElementById("login-modal");
const openBtn = document.querySelector(".login-link");
const closeBtn = document.querySelector(".close");

// 회원가입 모달 
const joinModal = document.getElementById("join_modal");
const joinOpenBtn = document.querySelector(".join-link");
const joinCloseBtn = joinModal.querySelector(".close");

// Create Account 링크
const goToJoinLink = document.getElementById("go-to-join");

// 열기
openBtn.addEventListener("click", (e) => {
e.preventDefault();
modal.style.display = "block";
});

joinOpenBtn.addEventListener("click", (e) => {
e.preventDefault();
joinModal.style.display = "block";
});

// 닫기
closeBtn.addEventListener("click", () => modal.style.display = "none");
joinCloseBtn.addEventListener("click", () => joinModal.style.display = "none");


goToJoinLink.addEventListener("click", (e) => {
  e.preventDefault();
  modal.style.display = "none";
  joinModal.style.display = "block";
});

function openModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeModal(e) {
  if (e.target.className === 'modal' || e.target.className === 'modal-close') {
    document.querySelectorAll('.modal, .modal-scam').forEach(m => m.style.display = 'none');
  }
}

// 회원가입
async function handleJoinSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  try {
    const res = await fetch("http://localhost:8000/join", {
      method: "POST",
      body: formData,
      credentials: "include" 
    });

    const data = await res.json();

    if (res.ok && data.message === "success") {
      alert("회원가입 완료! 로그인 해주세요.");
      joinModal.style.display = "none";
      modal.style.display = "block";
      modal.querySelector("input[name='id']").focus();
    } else {
      alert("회원가입 실패: " + (data.detail || "알 수 없는 에러"));
    }
  } catch (err) {
    console.error("회원가입 요청 에러:", err);
    alert("서버 오류 발생!");
  }

  return false;
}

//로그인
window.handleLogin = async function(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  try {
    const res = await fetch("http://localhost:8000/login", {
      method: "POST",
      body: formData,
      credentials: "include" 
    });

    const data = await res.json();

    if (res.ok) {
      // 로그인 성공
      const userId = data.user_id;
      sessionStorage.setItem("user_id", userId);
      document.getElementById("login-modal").style.display = "none";
      document.querySelector(".auth-top").style.display = "none";
      document.querySelector(".auth-top-loggedin").style.display = "flex";
    } else {
      alert("로그인 실패: " + data.detail);
    }
  } catch (err) {
    console.error("로그인 오류:", err);
    alert("서버 오류 발생!");
  }

  return false;
}

//로그아웃
document.querySelector(".logout-link").addEventListener("click", async (e) => {
  e.preventDefault();

  await fetch("http://localhost:8000/logout", {
    method: "POST",
    credentials: "include" 
  });
 
  sessionStorage.removeItem("user_id");
  // console.log("🗑 로그아웃 후 localStorage.user_id:",sessionStorage.removeItem("user_id"));
  document.getElementById("login-form")?.reset();
  
  alert("로그아웃 되었습니다!");

  document.querySelector(".auth-top").style.display = "flex";
  document.querySelector(".auth-top-loggedin").style.display = "none";
});

window.addEventListener("DOMContentLoaded", () => {
  const userId = sessionStorage.getItem("user_id");
  console.log("▶ user_id 상태:", userId);
   
    if (userId) {
      document.querySelector(".auth-top").style.display = "none";
      document.querySelector(".auth-top-loggedin").style.display = "flex";
    } else {
      document.querySelector(".auth-top").style.display = "flex";
      document.querySelector(".auth-top-loggedin").style.display = "none";
    }
  });



// 회원정보 수정
async function handleeditSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  try {
    const res = await fetch("http://localhost:8000/edit", {
      method: "POST",
      body: formData,
      credentials: "include" 
    });

    const data = await res.json();

    console.log("Response data:", data); // 디버깅을 위한 로그 추가
    if (res.ok && data.message === "수정 성공") {
      alert("회원정보 수정 완료!");
      document.getElementById("edit_modal").style.display = "none";
    } else {
      alert("수정 실패: " + (data.detail || "알 수 없는 에러"));
    }
  } catch (err) {
    console.error("수정 오류:", err);
    alert("서버 오류 발생!");
  }

  return false;
}


document.querySelector(".edit-link").addEventListener("click", async (e) => {
  e.preventDefault();

  try {
    const res = await fetch("http://localhost:8000/userinfo", {
      method: "GET",
      credentials: "include"
    });
    
    const data = await res.json();

    if (res.ok) {
      // 로그인 된 상태면 수정 모달 열기
      document.getElementById("edit_modal").style.display = "block";
      document.querySelector("#edit_modal input[name='id']").value = data.user_id; // 사용자 id 채워주기
    } else {
      alert("로그인이 필요합니다.");
      window.location.reload();
    }
  } catch (err) {
    console.error("사용자 정보 가져오기 실패:", err);
    alert("서버 오류 발생!");
  }
});


const editModal = document.getElementById("edit_modal");
const editCloseBtn = editModal.querySelector(".close");

editCloseBtn.addEventListener("click", () => {
  editModal.style.display = "none";
});
// 팀원 모달
  document.querySelector('a[href="#team"]').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('teamModal').style.display = 'block';
  });

  document.querySelector('.Tclose-btn').addEventListener('click', function() {
    document.getElementById('teamModal').style.display = 'none';
  });



// 스크롤
function scrollToSection(id) {
  const target = document.getElementById(id);
  const offset = -90;
  const y = target.getBoundingClientRect().top + window.pageYOffset + offset;
  window.scrollTo({ top: y, behavior: "smooth" });
}

// Guide 
document.getElementById("guide-link").addEventListener("click", function(e) {
  e.preventDefault();
  scrollToSection("guide");
});

// Tips 메뉴
document.getElementById("tips-link").addEventListener("click", function(e) {
  e.preventDefault();
  scrollToSection("tips");
});


document.getElementById("faq-link").addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("faqModal").style.display = "block";
});

document.querySelector(".Fclose-btn").addEventListener("click", function () {
  document.getElementById("faqModal").style.display = "none";
});

document.getElementById("faqModal").addEventListener("click", function (e) {
  if (e.target.id === "faqModal") {
    e.target.style.display = "none";
  }
});


//  FAQ 아코디언
document.querySelectorAll(".accordion-header").forEach((header) => {
  header.addEventListener("click", () => {
    const active = document.querySelector(".accordion-header.active");
    if (active && active !== header) {
      active.classList.remove("active");
      active.nextElementSibling.classList.remove("active");
    }
    header.classList.toggle("active");
    header.nextElementSibling.classList.toggle("active");
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const contactLink = document.querySelector(".open-contact-modal");
  if (contactLink) {
    contactLink.addEventListener("click", (e) => {
      e.preventDefault();  
      const modal = document.getElementById("contactModal");
      if (modal) modal.style.display = "block";
    });
  }
});


(async () => {
  try {
    const response = await fetch("http://localhost:8000/naver-news?query=전세사기&display=100");
    const data = await response.json();

    data.items.forEach(item => {
      const title = item.title.replace(/<[^>]*>?/g, ''); // <b> 태그 제거
      const description = item.description.replace(/<[^>]*>?/g, '').slice(0, 50); // <b> 태그 제거
      newsContainer.innerHTML += `
        <a href="${item.link}" target="_blank" class="swiper-slide">
          <h4>${title}</h4>
          <p>${description}...</p>
        </a>
      `;
    });
    new Swiper(".mySwiper", {
      direction: "horizontal",
      slidesPerView: 3, 
      spaceBetween: 20, 
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
      },
      loop: true,
    });

  } catch (error) {
    console.error("뉴스 불러오기 실패:", error);
  }
})();