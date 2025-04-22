const slides = document.querySelectorAll(".about-slide");
const prevBtn = document.querySelector(".prev");
const nextBtn = document.querySelector(".next");
let currentIndex = 0;

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


// 기존 로그인 모달 요소
const modal = document.getElementById("login-modal");
const openBtn = document.querySelector(".login-link");
const closeBtn = document.querySelector(".close");

// 회원가입 모달 요소
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


// Create Account 클릭 시 로그인 모달 닫고 회원가입 모달 열기
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

// 회원가입 후  로그인 모달 열기
async function handleJoinSubmit(event) {
  event.preventDefault(); // 기본 제출 막기

  const form = event.target;
  const formData = new FormData(form);

  try {
    const res = await fetch("http://34.132.18.41:8000/join", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (res.ok && data.message === "success") {
      alert("회원가입 완료! 로그인 해주세요.");

      // 회원가입 모달 닫고 로그인 모달 열기
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
// 로그인처리
window.handleLogin = async function(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  try {
    const res = await fetch("http://34.132.18.41:8000/login", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (res.ok) {
      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("user_id", data.user_id);

      // 모달 닫기
      document.getElementById("login-modal").style.display = "none";

      //  UI 전환
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

document.querySelector(".logout-link").addEventListener("click", (e) => {
  e.preventDefault();
  sessionStorage.removeItem("access_token");
  alert("로그아웃 되었습니다!");


  document.querySelector(".auth-top").style.display = "flex";
  document.querySelector(".auth-top-loggedin").style.display = "none";


});


window.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage
  .getItem("access_token");

  if (token) {
    // 로그인된 UI
    document.querySelector(".auth-top").style.display = "none";
    document.querySelector(".auth-top-loggedin").style.display = "flex";
  } else {
    // 비로그인 UI
    document.querySelector(".auth-top").style.display = "flex";
    document.querySelector(".auth-top-loggedin").style.display = "none";
  }
});

async function handleeditSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  try {
    const res = await fetch("http://34.132.18.41:8000/edit", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

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

document.querySelector(".edit-link").addEventListener("click", (e) => {
  e.preventDefault();
  const userId = sessionStorage.getItem("user_id");
  document.querySelector('#edit_modal input[name="id"]').value = userId;
  document.getElementById("edit_modal").style.display = "block";
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