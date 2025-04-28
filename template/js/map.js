import { fetchFavList } from './map2.js';

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
  await fetchFavList();
  await loadHouseKind(house_kind);
});


// 바뀌는 값
let house_kind = "opi" //집 종류

// 집 유형 선택
opi.addEventListener("click", ()=>{
  house_kind = "opi"
  loadHouseKind(house_kind)
})
villa.addEventListener("click", ()=>{
  house_kind = "villa"
  loadHouseKind(house_kind)
})
oneroom.addEventListener("click", ()=>{
  house_kind = "oneroom"
  loadHouseKind(house_kind)
})


const map = new naver.maps.Map('map', {
  center: new naver.maps.LatLng(35.1595, 126.8526),
  zoom: 12
});

const bounds = new naver.maps.LatLngBounds();
const markerData = [];

// ✅ 마커 생성 배치 처리 (100개씩)
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
          fetchFavList()
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

window.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("address-input");
  if (!searchInput) return;
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) searchAddress(query);
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
      map.setZoom(18);
    }
  );
}

async function loadHouseKind(house_kind){
  try {
    markers.forEach(marker => marker.setMap(null));
    markers.length = 0;  // 마커 배열 비우기
    markerData.length = 0;  // 데이터 배열 비우기

    const response = await fetch(`http://localhost:8000/${house_kind}`);
    const data = await response.json();
    markerData.push(...data);
    await createMarkersInBatch(markerData);
  } catch (error) {
    console.error("데이터 가져오기 실패:", error);
  }
};


async function house_imfo_box(id, house_kind) {
  try {
    const res = await fetch(`http://localhost:8000/house_${house_kind}`, {
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
    radar_chart(data.dong_score, data.area_score,data.log_building_age,data.room_score,data.direction_score,data.floor_score,data.insurance_score);

    // opa_op.addEventListener('click',(e)=>{
    //   favInsert("cha",data.address,data.jeonse_price,data.estimated_jeonse_price,data.risk_level,data.property_id,"원룸")
    // })
    // opa_op.removeEventListener("click",)

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

let globalMarkerData = undefined;
opa_op.addEventListener('click',(e)=>{
  favInsert("cha",
    globalMarkerData.address,
    globalMarkerData.jeonse_price,
    globalMarkerData.estimated_jeonse_price,
    globalMarkerData.risk_level,
    globalMarkerData.property_id,"원룸")
});

async function favInsert(user_id,address,jeonse_price,estimated_jeonse_price,risk_level,property_id,room_type) {
  try {
    const res = await fetch("http://localhost:8000/insert_fav", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id,address,jeonse_price,estimated_jeonse_price,risk_level,property_id,room_type})
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

function radar_chart(dong_score, area_score,log_building_age,room_score,direction_score,floor_score,insurance_score) {
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
        '동',
        '전용면적 평',
        'log 건축연차',
        '방 수',
        '방향',
        '층 등급',
        '보증보험'
      ],
      datasets: [{
        label: 'My First Dataset',
        data: [dong_score, area_score,log_building_age,room_score,direction_score,floor_score,insurance_score],
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
