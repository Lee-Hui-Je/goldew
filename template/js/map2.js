const fav_box = document.querySelector(".fav_box")
const fav_first = document.querySelector(".fav_first")
const fav_x = document.querySelector(".fav_x")
const fav_x_box = document.querySelector(".fav_x_box")
const fav_box_ul = document.querySelector(".fav_box ul")

// 즐겨찾기
fav_box.addEventListener('click', () => {
    fav_box.classList.add('action');
    fav_box.classList.remove('hoverable');
    fav_box_ul.style.display = "flex";
    const allInsideElements = fav_first.querySelectorAll('*');
    // 즐겨찾기 클릭시
    allInsideElements.forEach(el => {
        el.style.display = 'none';
    });
    fav_x.style.display = "flex";
});

fav_x_box.addEventListener('click',(e) => {
    e.stopPropagation();
    fav_box.classList.remove('action');
    fav_box.classList.add('hoverable');
    fav_box_ul.style.display = "none";
    const allInsideElements = fav_first.querySelectorAll('*');
    // 즐겨찾기 클릭시
    allInsideElements.forEach(el => {
        el.style.display = 'block';
    });
    fav_x.style.display = "none";
})

export async function fetchFavList() {
    try {
        const response = await fetch("http://localhost:8000/fav_list");
        const data = await response.json();

        data.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="fav_risk">
                    <div class="fav_risk_item"></div>
                    <div>
                        <p>${item.jeonse_price}</p>
                        <p>${item.estimated_jeonse_price}</p>
                    </div>
                </div>
                <div class='fav_address'>${item.address}</div>
            `;
            fav_box_ul.appendChild(li);
        });
    } catch (error) {
        console.error("데이터 가져오기 실패:", error);
    }
}



