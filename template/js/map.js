// 개선된 전체 코드 (클러스터링 및 배치 로딩 포함)

const markers = []; // 마커 저장 배열
const chartInstances = {};
const zoomThreshold = 13;
const MHeader = document.querySelector(".main-header")
const logo = document.querySelector(".logo")
const Mtoolbar = document.querySelector(".map-toolbar")
const Ipanel = document.querySelector(".info-panel")
const back = document.querySelector(".back-box .back")

// 집 상세 정보 첫번째 박스
const imfo_price = document.querySelector(".imfo_price")
const imfo_ = document.querySelector(".imfo_")
const imfo_grid = document.querySelector(".imfo_grid")
const imfo_year = document.querySelector(".imfo_year")

window.onload = function() {
  Mtoolbar.classList.add('toact');
};

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
            content: `<div class="marker high"></div>`,
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
        let risk_math = Math.floor((data.risk_level / 30) * 100);

        naver.maps.Event.addListener(marker, "mouseover", function () {
          infoWindow.open(map, marker);
          setTimeout(() => {
            const canvas = document.getElementById(data.property_id);
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            if (chartInstances[data.property_id]) {
              chartInstances[data.property_id].destroy();
            }

            const gradient = ctx.createLinearGradient(0, 0, 300, 0);
            gradient.addColorStop(0, 'red');
            gradient.addColorStop(0.1, 'orange');
            gradient.addColorStop(0.2, 'yellow');
            gradient.addColorStop(0.5, 'green');
            new Chart(canvas, {
              type: 'doughnut',
              data: {
                labels: ['위험도', '나머지'],
                datasets: [{
                  data: [risk_math, 100 - risk_math],
                  backgroundColor: [gradient, 'lightgray']
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

                  ctx.font = 'bold 14px sans-serif';
                  ctx.fillStyle = '#333';
                  ctx.textBaseline = 'middle';
                  const text = `${risk_math}%`;
                  const textX = Math.round((width - ctx.measureText(text).width) / 2);
                  const textY = height / 1.4;
                  ctx.fillText(text, textX, textY);
                  ctx.save();
                }
              }]
            });
          }, 10);
        });

        naver.maps.Event.addListener(marker, "mouseout", () => infoWindow.close());
        naver.maps.Event.addListener(marker, "click", () => {
          Ipanel.style.opacity = "0";
          setTimeout(() => {
            Ipanel.style.opacity = "1";
            Ipanel.style.visibility = "visible";
          }, 150);
          house_imfo_box(data.property_id)
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

window.onload = async function () {
  try {
    const response = await fetch("http://localhost:8000/position");
    const data = await response.json();
    markerData.push(...data);
    await createMarkersInBatch(markerData);
  } catch (error) {
    console.error("데이터 가져오기 실패:", error);
  }
};

async function house_imfo_box(id) {
  try {
    const res = await fetch("http://localhost:8000/house_imfo", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id})
    });

    const data = await res.json();
    imfo_price.textContent = data.jeonse_price
    imfo_ .textContent = "원룸"
    imfo_grid.children[0].textContent = data.area
    imfo_grid.children[1].textContent = `방 ${data.num_rooms}`
    imfo_grid.children[2].textContent = `화장실 ${data.num_bathrooms}`
    imfo_grid.children[3].textContent = `주차 ${data.parking_available}`
    imfo_grid.children[4].textContent = `엘레베이터 ${data.has_elevator}`
    imfo_grid.children[5].textContent = data.building_usage
    imfo_year.textContent = `사용승인 ${data.building_year}`
  } catch (error) {
      console.error("실패:", error);
  }
}