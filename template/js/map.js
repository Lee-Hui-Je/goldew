const markers = []; // 마커 저장 배열
const zoomThreshold = 13;
const MHeader = document.querySelector(".main-header")
const logo = document.querySelector(".logo")
const Mtoolbar = document.querySelector(".map-toolbar")
const Ipanel = document.querySelector(".info-panel")
const back = document.querySelector(".back-box .back")


window.onload = function() {
    MHeader.classList.add('hact');
    logo.classList.add('lact');
    Mtoolbar.classList.add('toact');
  };



const map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(35.1595, 126.8526),
    zoom: 12
});

const bounds = new naver.maps.LatLngBounds();
const markerData = [
    {
    address: "서울특별시 중구 세종대로 110",
    price: "15억 / 3억",
    level: 98,
    danger: "high",
    area: "29.86m²",
    move: "입주 가능",
    date: "2024.04.04"
    },
    {
    address: "광주 광산구 신가삼효로 22-12",
    price: "5억 / 2.5억",
    level: 64,
    danger: "medium",
    area: "29.86m²",
    move: "입주 가능",
    date: "2024.03.11"
    },
    {
    address: "광주 서구 상무대로 1175",
    price: "8억 / 2.5억",
    level: 86,
    danger: "high",
    area: "29.86m²",
    move: "입주 가능",
    date: "2024.03.12"
    },
    {
    address: "광주 서구 쌍촌동 948-33, 1동",
    price: "8억 / 2.5억",
    level: 89,
    danger: "high",
    area: "29.86m²",
    move: "입주 가능",
    date: "2024.03.12"
    }
];


let remaining = markerData.length;

markerData.forEach((data) => {
    naver.maps.Service.geocode(
        { query: data.address },
        function (status, response) {
            if (status !== naver.maps.Service.Status.OK) {
                console.error("주소 변환 실패:", data.address);
                return;
            }
        
            const result = response.v2.addresses[0];
        
            if (!result) {
                console.error("주소 좌표가 없습니다:", data.address);
                return;
            }

            const latlng = new naver.maps.LatLng(result.y, result.x);
            bounds.extend(latlng); // 지도 중심 조정용

            const marker = new naver.maps.Marker({
                position: latlng,
                map: null,
                icon: {
                    content: `<div class="marker ${data.danger}"></div>`,
                    size: new naver.maps.Size(30, 30),
                    anchor: new naver.maps.Point(15, 15)
                }
            });

            markers.push(marker);

            if (map.getZoom() >= zoomThreshold) {
                marker.setMap(map);
            }

            const canvasId = `donutChart-${Math.random().toString(36).substr(2, 9)}`;

            const infoWindow = new naver.maps.InfoWindow({
                content: `
                    <div class="map-info-window">
                        <div class = "map-top">
                            <canvas id="${canvasId}" width="100" height="50"></canvas>
                            <div class="price">
                                <p>전세가: ${data.price}</p>
                                <p>추정가: ${data.price}</p>
                            </div>
                        </div>
                        <div class="map-bottom">
                            <div>${data.address}</div>
                            <div class ="area">
                                <p>${data.area}</p>
                                <p>${data.move}</p>
                            </div>
                        </div>
                    </div>
                `,
                backgroundColor: "transparent",
                borderWidth: 0
            });

            naver.maps.Event.addListener(marker, "mouseover", function () {
                infoWindow.open(map, marker);
              
                // infoWindow가 DOM에 렌더된 다음 실행
                setTimeout(() => {
                  const canvas = document.getElementById(canvasId);
                  if (!canvas) return;
                  
                  const ctx = canvas.getContext('2d');
                  const gradient = ctx.createLinearGradient(0, 0, 300, 0); // 가로 방향
                  gradient.addColorStop(0, 'red');
                  gradient.addColorStop(0.1, 'orange');
                  gradient.addColorStop(0.2, 'yellow');
                  gradient.addColorStop(0.5, 'green');
              
                  new Chart(canvas, {
                    type: 'doughnut',
                    data: {
                      labels: ['위험도', '나머지'],
                      datasets: [{
                        data: [data.level, 100 - data.level],
                        backgroundColor: [gradient, 'lightgray']
                      }]
                    },
                    options: {
                      responsive: false,
                      cutout: '90%',
                      rotation: -90,         // 시작 각도 (위쪽부터 시작)
                      circumference: 180,    // 그릴 범위 (180도 → 반원)
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

                          // 그림자 설정
                          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                          ctx.shadowBlur = 4;
                          ctx.shadowOffsetX = 2;
                          ctx.shadowOffsetY = 2;

                          ctx.font = 'bold 14px sans-serif';
                          ctx.fillStyle = '#333';
                          ctx.textBaseline = 'middle';
                          const text = `${data.level}%`;
                          const textX = Math.round((width - ctx.measureText(text).width) / 2);
                          const textY = height / 1.4;
                          ctx.fillText(text, textX, textY);
                          
                          ctx.save();
                        }
                      }]
                  });
                }, 10); // DOM 붙는 시간 약간 기다리기
              });
            naver.maps.Event.addListener(marker, "mouseout", function () {
                infoWindow.close();
            });
            naver.maps.Event.addListener(marker, "click", function () {
                Ipanel.style.opacity = "1";
                Ipanel.style.visibility = "visible";
                console.log(marker)
            });

             remaining--;
             if (remaining === 0) {
             map.setCenter(new naver.maps.LatLng(35.1595, 126.8526));
             map.setZoom(12);
             }
        }
    );
});

back.addEventListener('click', () => {
    Ipanel.style.opacity = "0";
    Ipanel.style.visibility = "hidden";
})

naver.maps.Event.addListener(map, 'zoom_changed', function () {
    const zoom = map.getZoom();

    markers.forEach(marker => {
    if (zoom >= zoomThreshold) {
        marker.setMap(map); // 보이게
    } else {
        marker.setMap(null); // 숨기기
    }
    });
});

// 🔍 주소 입력 후 Enter 누르면 검색
window.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("address-input");
  
    if (!searchInput) return;
  
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
          searchAddress(query);
        }
      }
    });
  });
  
  // 🧭 지도 이동 함수
  function searchAddress(query) {
    naver.maps.Service.geocode(
      { query: query },
      function (status, response) {
        if (status === naver.maps.Service.Status.ERROR || !response.v2.addresses.length) {
          alert("주소를 찾을 수 없습니다. 지번 주소 또는 정확한 도로명 주소를 입력해주세요.");
          return;
        }
  
        const result = response.v2.addresses[0];
        if (!result || !result.x || !result.y) {
          alert("유효한 주소가 없습니다.");
          return;
        }
  
        const lat = parseFloat(result.y);
        const lng = parseFloat(result.x);
        const newCenter = new naver.maps.LatLng(lat, lng);
  
        map.setCenter(newCenter);
        map.setZoom(18);
      }
    );
  }
  
//   chart.js

  