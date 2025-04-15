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
  
  document.querySelectorAll(".file-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const uploadBox = e.target.closest(".upload-box");
      const fileName = uploadBox.querySelector(".file-name");
      const clearBtn = uploadBox.querySelector(".clear-btn");
  
      if (file) {
        fileName.textContent = file.name;
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
  