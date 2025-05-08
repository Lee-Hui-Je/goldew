import { config } from '../../config/env_config.js';
const env = 'dev'
const env_path = `http://${config[env].host}:${config[env].port}`

const markers = []; // 마커 저장 배열
const chartInstances = {};
const randarChartInstances = {};
const zoomThreshold = 13;
const MHeader = document.querySelector(".main-header")
const logo = document.querySelector(".logo")
const Mtoolbar = document.querySelector(".map-toolbar")
const Ipanel = document.querySelector(".info-panel")
const back = document.querySelector(".back-box .back")
const opi = document.querySelector(".opi")
const villa = document.querySelector(".villa")
const  oneroom= document.querySelector(".oneroom")
const  opa_op= document.querySelector(".opa-op")
const  filter_btn= document.querySelector(".filter-btn")
let globalMarkerData = undefined;
const userId = sessionStorage.getItem("user_id");
const fav_box_ul = document.querySelector(".fav_box ul")
const option_btn = document.querySelector(".house_option button")
let favoriteList = [];

// 집 상세 정보 첫번째 박스
const imfo_price = document.querySelector(".imfo_price")
const room_box = document.querySelector(".room_box").children
const imfo_grid = document.querySelector(".imfo_grid")
const imfo_year = document.querySelector(".imfo_year")
const adress_info = document.querySelector(".adress-info")
const house_date = document.querySelector(".house_date").children

// 집 상세 오차율 박스
const level_box = document.querySelector(".level_box")
const mistake_prices = document.querySelector(".mistake_prices").children


document.addEventListener("DOMContentLoaded", async () => {
  Mtoolbar.classList.add('toact');
  if(userId){
    await fetchFavList(userId);
  }
  // 즐겨찾기 매물 이동 및 선택
  bindFavListEvents();
  // const fav_box_li = document.querySelectorAll(".fav_box ul li")
  // fav_box_li.forEach((e, index) => {
  //   e.addEventListener("mouseover", ()=>{
  //     const query = e.children[0].children[0].textContent
  //   if (query) searchAddress(query);
  //   })
  //   e.addEventListener("click",()=>{
  //     fav_li_click(index)
  //   })
  // });
  // 검색 이동
  await loadHouseKind(house_kind);

  const searchInput = document.getElementById("address-input");
  if (!searchInput) return;
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) searchAddress(query);
    }
  });
  
  filter_btn.addEventListener("click", function () {
    const query = searchInput.value.trim();
    if (query) searchAddress(query);
  });
});

// 바뀌는 값
let house_kind = "opi" //집 종류

opi.classList.add('active');
villa.classList.remove('active');
oneroom.classList.remove('active');

// 집 유형 선택
opi.addEventListener("click", ()=>{
  opi.classList.add('active');
  villa.classList.remove('active');
  oneroom.classList.remove('active');
  house_kind = "opi"
  loadHouseKind(house_kind)
})
villa.addEventListener("click", ()=>{
  villa.classList.add('active');
  opi.classList.remove('active');
  oneroom.classList.remove('active');
  house_kind = "villa"
  loadHouseKind(house_kind)
})
oneroom.addEventListener("click", ()=>{
  oneroom.classList.add('active');
  opi.classList.remove('active');
  villa.classList.remove('active');
  house_kind = "oneroom"
  loadHouseKind(house_kind)
})


const map = new naver.maps.Map('map', {
  center: new naver.maps.LatLng(35.1595, 126.8526),
  zoom: 12
});

const bounds = new naver.maps.LatLngBounds();
const markerData = [];

// 마커 생성 배치 처리 (100개씩)
async function createMarkersInBatch(data, batchSize = 100) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await Promise.all(batch.map(place => createMarker(place)));
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

function createMarker(data) {
  return new Promise((resolve) => {
    let position_color;
    
    if(data.risk_level > 26){
      position_color = 'high'
    }
    else if(data.risk_level > 11){
      position_color = 'medium'
    }
    else if(data.risk_level >= 0){
      position_color = 'safe'
    }

    naver.maps.Service.geocode(
      { query: data.address },
      function (status, response) {
        if (status !== naver.maps.Service.Status.OK || !response.v2.addresses.length) {
          console.error("주소 변환 실패:", data.address);
          return resolve();
        }

        const result = response.v2.addresses[0];
        const latlng = new naver.maps.LatLng(result.y, result.x);
        bounds.extend(latlng);

        const marker = new naver.maps.Marker({
          position: latlng,
          map: null,
          icon: {
            content: `<div class="marker ${position_color}"></div>`,
            size: new naver.maps.Size(30, 30),
            anchor: new naver.maps.Point(15, 15)
          }
        });

        markers.push(marker);
        if (map.getZoom() >= zoomThreshold && map.getBounds().hasLatLng(latlng)) {
          marker.setMap(map);
        }

        const infoWindow = new naver.maps.InfoWindow({
          content: `
            <div class="map-info-window">
              <div class="map-top">
                <canvas id="${data.property_id}" width="100" height="50"></canvas>
                <div class="price">
                  <p>전세가: ${data.jeonse_price}</p>
                  <p>추정가: ${data.estimated_jeonse_price}</p>
                </div>
              </div>
              <div class="map-bottom">
                <div>${data.address}</div>
                <div class="area">
                  <p>${data.area}</p>
                  <p>${data.immediate_move_in}</p>
                </div>
              </div>
            </div>
          `,
          backgroundColor: "transparent",
          borderWidth: 0
        });
        naver.maps.Event.addListener(marker, "mouseover", function () {
          infoWindow.open(map, marker);
          setTimeout(() => {gara_chart(data.property_id, data.risk_level)}, 10);
        });

        naver.maps.Event.addListener(marker, "mouseout", () => infoWindow.close());
        naver.maps.Event.addListener(marker, "click", () => {
          Ipanel.style.opacity = "0";
          setTimeout(() => {
            Ipanel.style.opacity = "1";
            Ipanel.style.visibility = "visible";
          }, 150);
          house_imfo_box(data.property_id, house_kind)
        });
        resolve();
      }
    );
  });
}

back.addEventListener('click', () => {
  Ipanel.style.opacity = "0";
  Ipanel.style.visibility = "hidden";
});

naver.maps.Event.addListener(map, 'zoom_changed', function () {
  const zoom = map.getZoom();
  markers.forEach(marker => {
    if (zoom >= zoomThreshold) {
      if (map.getBounds().hasLatLng(marker.getPosition())) marker.setMap(map);
    } else {
      marker.setMap(null);
    }
  });
});

function searchAddress(query) {
  naver.maps.Service.geocode(
    { query: query },
    function (status, response) {
      if (status === naver.maps.Service.Status.ERROR || !response.v2.addresses.length) {
        alert("주소를 찾을 수 없습니다. 지번 주소 또는 정확한 도로명 주소를 입력해주세요.");
        return;
      }
      const result = response.v2.addresses[0];
      const lat = parseFloat(result.y);
      const lng = parseFloat(result.x);
      const newCenter = new naver.maps.LatLng(lat, lng);
      map.setCenter(newCenter);
      map.setZoom(19);
    }
  );
}

async function loadHouseKind(house_kind){
  try {
    markers.forEach(marker => marker.setMap(null));
    markers.length = 0;  // 마커 배열 비우기
    markerData.length = 0;  // 데이터 배열 비우기

    const response = await fetch(`${env_path}/${house_kind}`);
    const data = await response.json();
    markerData.push(...data);
    await createMarkersInBatch(markerData);
  } catch (error) {
    console.error("데이터 가져오기 실패:", error);
  }
};

function formatNumberedText(raw) {
  // “1) ”, “2) ”, “3) ” 앞에서만 섹션 분리
  const parts = raw.split(/\n(?=\d+\)\s+)/g);

  return parts.map(part => {
    const m = part.match(/^(\d+\))\s*([^\n]*)\n?([\s\S]*)$/);
    if (m) {
      const [, num, title, rest] = m;
      // 섹션 제목
      let html = `<p class="section-title"><strong>${num} ${title.trim()}</strong></p>`;

      // 본문 줄별 처리
      rest
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .forEach(line => {
          if (line.startsWith('-')) {
            // 대시 항목은 그대로
            html += `<p class="section-item">${line}</p>`;
          } else {
            // 일반 문장은 “다.” 기준으로 분할해 각각 한 줄로
            const sentences = line.split(/(?<=다\.)\s*/);
            sentences.forEach(sent => {
              const text = sent.trim();
              if (text) {
                html += `<p class="section-item">${text}</p>`;
              }
            });
          }
        });

      return `<div class="section-block">${html}</div>`;
    }

    // 번호 없는 조각(혹시 있을 경우)
    return `<p>${part.trim()}</p>`;
  })
  // 섹션 간에는 한 줄(<br/>)만 띄우기
  .join('<br/>');
}

let currentAbortController = null;

async function fetchStreamPrompt(url, prompt, containerId) {
  if (currentAbortController) {
    currentAbortController.abort(); // 이전 요청 취소
  }
  currentAbortController = new AbortController();

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ prompt }),
    signal: currentAbortController.signal
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  const container = document.getElementById(containerId);
  container.innerHTML = "<em>…</em>";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
    container.innerHTML = formatNumberedText(raw);
  }
}

async function house_imfo_box(id, house_kind) {
  try {
    const res = await fetch(`${env_path}/house_${house_kind}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id})
    });

    const data = await res.json();
    globalMarkerData = data;
    let risk_text;
    let position_color;

    adress_info.textContent = data.address
    imfo_price.textContent = `${data.jeonse_price}/${data.estimated_jeonse_price} (전세가/추정가)`
    room_box[0].textContent = data.room_type
    room_box[1].textContent = data.agency_name
    imfo_grid.children[0].textContent = data.area
    imfo_grid.children[1].textContent = `방 ${data.num_rooms}`
    imfo_grid.children[2].textContent = `화장실 ${data.num_bathrooms}`
    imfo_grid.children[3].textContent = `주차 ${data.parking_available}`
    imfo_grid.children[4].textContent = `엘레베이터 ${data.has_elevator}`
    imfo_grid.children[5].textContent = data.building_usage
    imfo_grid.children[6].textContent = `${data.current_floor}/${data.building_floor}`
    imfo_grid.children[7].textContent = data.direction
    house_date[0].textContent = `사용승인일 ${data.building_year}`
    house_date[1].textContent = `매물등록일 ${data.listing_date}`
    imfo_year.textContent = `입주 여부 ${data.immediate_move_in}`

    const uuid = uuidv4();
    // 오차율 박스
    level_box.innerHTML = `
      <canvas id="${uuid}" width="130" height="60"></canvas>
    `
    // level_box.innerHTML = `
    //   <canvas id="${data.property_id}" width="130" height="60"></canvas>
    // `

    if(data.risk_level > 26){
      position_color = 'high'
      risk_text = "위험 매물"
    }
    else if(data.risk_level > 11){
      position_color = 'medium'
      risk_text = "주의 매물"
    }
    else if(data.risk_level >= 0){
      position_color = 'safe'
      risk_text = "안전 매물"
    }

    mistake_prices[0].textContent = risk_text
    mistake_prices[0].className = position_color
    mistake_prices[1].textContent = `전세가 ${data.jeonse_price}`
    mistake_prices[2].textContent = `추정가 ${data.estimated_jeonse_price}`

    canvas_chart(uuid, data.property_id, data.risk_level);
    radar_chart(data.log_building_age, data.log_area,data.price_pyeong_score,data.jeonse_pyeong_score,data.population_score,data.average_age_score,data.direction_score);

    // opa_op.addEventListener('click',(e)=>{
    //   favInsert("cha",data.address,data.jeonse_price,data.estimated_jeonse_price,data.risk_level,data.property_id,"원룸")
    // })
    // opa_op.removeEventListener("click",)

    const p = {
      jeonse_price:       data.jeonse_price,
      estimated_price:    data.estimated_jeonse_price,
      risk_level:         data.risk_level,
      grade:              data.grade,
      log_building_age:   data.log_building_age,
      log_area:           data.log_area,
      price_pyeong_score: data.price_pyeong_score,
      jeonse_pyeong_score:data.jeonse_pyeong_score,
      population_score:   data.population_score,
      average_age_score:  data.average_age_score,
      direction_score:    data.direction_score
    };

    // 6) GPT 프롬프트 
    const prompt = `
      아래 매물 정보를 보고

      1) 오차율: ${p.risk_level}%

      2) 레이더 차트 해석:
        - log 건축연차(${p.log_building_age}), 
        - log 전용면적(${p.log_area}), 
        - 평균평당가격(${p.price_pyeong_score}), 
        - 평균평당전세가(${p.jeonse_pyeong_score}), 
        - 총인구수(${p.population_score}), 
        - 동별평균연령(${p.average_age_score}), 
        -방향(${p.direction_score})  
        위 점수들이 전세가와 추정가 오차율에 “어떤 방향으로”, “어느 정도” 기여했는지 각각 1~2문장으로 간결하게 설명해 주세요.

      3) 종합평가:
        - 이 매물의 전세가와 추정가 오차율이 ${p.risk_level}%인 이유를 종합적으로 설명해 주세요.
        이 매물이 사기 위험이 있는지, 있다면 어떤것을 주의해야하는지 설명해주세요.


      형식:
      - 번호 매기기 유지
      - 마크다운·불필요한 수식어 금지
      - 오차율 level은  0 ~ 10 안전 / 11 ~ 25 주의 / 26 ~ 100 위험  이렇게 정해놓았습니다. 참고해서 평가 해 주세요.
      - 종합평가에서는 -하다로 끝나기보다는 -합니다로 끝나주세요.
      - 종합평가는 가독성이 좋게 3단락을 나눠서 작성해 주세요  
    `;

    // 7) 스트리밍 호출
    fetchStreamPrompt(
      `${env_path}/mapsummary`,
      prompt,
      "dchart_text"
    );
    
    await updateFavoriteIcon();
    bindFavListEvents();
  } catch (error) {
      console.error("실패:", error);
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function favInsert(user_id,address,jeonse_price,estimated_jeonse_price,risk_level,property_id,room_type) {
  try {
    const res = await fetch(`${env_path}/insert_fav`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id,address,jeonse_price,estimated_jeonse_price,risk_level,property_id,room_type})
    });
  } catch (error) {
    console.error("실패", error);
  }
}

async function favDelete(user_id,property_id) {
  try {
    const res = await fetch(`${env_path}/delete_fav`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id,property_id})
    });
  } catch (error) {
    console.error("실패", error);
  }
}

function canvas_chart(uuid, id, level){
  let Acolor;
  const canvas = document.getElementById(uuid);
  if (!canvas) {
    return;
  }

  if(level > 26){
    Acolor = 'rgb(180, 14, 14)'
  }
  else if(level > 11){
    Acolor = 'rgba(137, 146, 12, 0.747)'
  }
  else if(level >= 0){
    Acolor = 'rgba(47, 128, 51, 0.747)'
  }

  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['위험도', '나머지'],
      datasets: [{
        data: [level, 100 - level],
        backgroundColor: [Acolor, 'lightgray']
      }]
    },
    options: {
      responsive: false,
      cutout: '90%',
      rotation: -90,
      circumference: 180,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw: function(chart) {
        const { width, height, ctx } = chart;
        ctx.restore();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textBaseline = 'middle';
        const text = `${level}%`;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 1.4;
        ctx.fillText(text, textX, textY);
        ctx.save();
      }
    }]
  });
}

function gara_chart(id, level){
  let Acolor;
  let risk_text;
  const canvas = document.getElementById(id);
  if (!canvas) return;

  if(level > 26){
    Acolor = 'rgb(180, 14, 14)'
    risk_text = "위험"
  }
  else if(level > 11){
    Acolor = 'rgba(194, 207, 12, 0.75)'
    risk_text = "주의"
  }
  else if(level >= 0){
    Acolor = 'rgba(47, 128, 51, 0.747)'
    risk_text = "안전"
  }

  if (chartInstances[id]) {
    chartInstances[id].destroy();
  }


  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['위험도', '나머지'],
      datasets: [{
        data: [level],
        backgroundColor: [Acolor]
      }]
    },
    options: {
      responsive: false,
      cutout: '85%',
      rotation: -90,
      circumference: 180,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw: function(chart) {
        const { width, height, ctx } = chart;
        ctx.restore();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#333';
        ctx.textBaseline = 'middle';
        const text = risk_text;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 1.4;
        ctx.fillText(text, textX, textY);
        ctx.save();
      }
    }]
  });
}

function radar_chart(log_building_age,log_area,price_pyeong_score,jeonse_pyeong_score,population_score,average_age_score,direction_score) {
  const canvas = document.querySelector("#radar_chart");
  if (!canvas) return;

  const id = 'radar_chart';

  if (randarChartInstances[id]){
    randarChartInstances[id].destroy();
  }

  randarChartInstances[id] = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: [
        'log 건축연차',
        'log 전용면적',
        '평균평당가격',
        '평균평당전세가',
        '총인구수',
        '동별평균연령',
        '방향'
      ],
      datasets: [{
        label: 'My First Dataset',
        data: [log_building_age,log_area,price_pyeong_score,jeonse_pyeong_score,population_score,average_age_score,direction_score],
        fill: true,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgb(255, 99, 132)',
        pointBackgroundColor: 'rgb(255, 99, 132)',
        pointBorderColor: '#fff',
        borderWidth: 1,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(255, 99, 132)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: '전세가 예측 근거',
          font: {
            size: 17
          }
        }
      }
    }
  });
}

opa_op.onclick = async() =>{
  if(!userId){
    alert("로그인 후 사용가능한 기능입니다.")
    return;
  }
  // 좋아요 아이콘 유무 확인 후 적용
  // 좋아요 추가
  const currentBg = window.getComputedStyle(opa_op).backgroundImage;

  if(currentBg.includes("love1.png")){
    await favInsert(
      userId,
      globalMarkerData.address,
      globalMarkerData.jeonse_price,
      globalMarkerData.estimated_jeonse_price,
      globalMarkerData.risk_level,
      globalMarkerData.property_id,
      house_kind
    );
  }
  // 좋아요 삭제
  else{
    await favDelete(userId, globalMarkerData.property_id)
  }
  if(userId){
    await fetchFavList(userId);
  }
  await updateFavoriteIcon();
  bindFavListEvents();
};

// 좋아요 리스트
async function fetchFavList(user_id) {
  try {
      fav_box_ul.innerHTML = "";
      const response = await fetch(`${env_path}/fav_list`,{
          method:"POST",
          headers: {"Content-Type": "application/json"},
          credentials:"include",
          body: JSON.stringify({user_id}),
      });
      const data = await response.json();
      data.forEach(item => {
          let Acolor;
          let risk;
          let type;
          if(item.risk_level > 26){
              Acolor = 'rgb(180, 14, 14)'
              risk = '위험'
          }
          else if(item.risk_level > 11){
              Acolor = 'rgba(137, 146, 12, 0.747)'
              risk = '주의'
          }
          else if(item.risk_level >= 0){
              Acolor = 'rgba(47, 128, 51, 0.747)'
              risk = '안전'
          }

          if(item.room_type == "opi"){
              type = "오피스텔"
          }
          else if(item.room_type == "oneroom"){
              type = "원/투룸"
          }
          else if(item.room_type == "villa"){
              type = "빌라"
          }

          const li = document.createElement("li");
          li.innerHTML = `
              <div class='fav_address'><span>${item.address}</span><span>(${type})</span></div>
              <div class="fav_risk">
                  <div class="fav_risk_item" style="border: 2px solid ${Acolor}; font-weight: 700;">
                      <div style = "font-size: 13px">${item.risk_level}</div>
                      <p style="color: ${Acolor};">${risk}</p>
                  </div>
                  <div class="fav_price">
                      <p>전세가 ${item.jeonse_price}</p>
                      <p>전세추정가 ${item.estimated_jeonse_price}</p>
                  </div>
              </div>
          `;
          fav_box_ul.appendChild(li);
      });
      favoriteList = data;
      return data;
  } catch (error) {
      console.error("데이터 가져오기 실패:", error);
      return [];
  }
}

async function fav_li_click(user_id, index) {
  try {
    const res = await fetch(`${env_path}/fav_list`,{
      method:"POST",
      headers: {"Content-Type": "application/json"},
      credentials:"include",
      body: JSON.stringify({user_id}),
  });
    const dataList = await res.json();  // 즐겨찾기 리스트 가져오기

    const data = dataList[index]; 

    // 지도 패널 열기
    Ipanel.style.opacity = "0";
    setTimeout(() => {
      Ipanel.style.opacity = "1";
      Ipanel.style.visibility = "visible";
    }, 150);

    // 매물 상세 정보 불러오기
    house_imfo_box(data.property_id, data.room_type);  // 여기 room_type 넘겨야 정확
  } catch (error) {
    console.error("fav_list 가져오기 실패:", error);
  }
}

// 좋아요 이동
function bindFavListEvents() {
  const fav_box_li = document.querySelectorAll(".fav_box ul li");
  fav_box_li.forEach((e, index) => {
    // 마우스 호버했을때 이동
    // e.onmouseover = () => {  
    //   const query = e.children[0].children[0].textContent;
    //   if (query) searchAddress(query);
    // };
    e.onclick = () => {
      const query = e.children[0].children[0].textContent;
      console.log(house_kind)
      loadHouseKind(house_kind) // 매물종류이동
      if (query) searchAddress(query);
      fav_li_click(userId, index);
    };
  });
}

// 좋아요 아이콘 이미지 교체
async function updateFavoriteIcon() {
  if (!globalMarkerData) return; // 아직 매물 정보가 없으면 중단

  const isFavorite = favoriteList.some(e => e.property_id === globalMarkerData.property_id);

  opa_op.style.backgroundImage = isFavorite
    ? "url(../../assets/love.png)"
    : "url(../../assets/love1.png)";
}