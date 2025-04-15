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
    zoom: 15
});

const markerData = [
    {
    address: "서울특별시 중구 세종대로 110",
    price: "15억 / 3억",
    level: "★★★★★",
    label: "최고",
    danger: "high",
    date: "2024.04.04"
    },
    {
    address: "광주 광산구 신가삼효로 22-12",
    price: "5억 / 2.5억",
    level: "★★★☆☆",
    label: "중간",
    danger: "medium",
    date: "2024.03.11"
    },
    {
    address: "광주 서구 상무대로 1175",
    price: "8억 / 2.5억",
    level: "★★★★☆",
    label: "높음",
    danger: "high",
    date: "2024.03.12"
    },
    {
    address: "광주 서구 쌍촌동 948-33, 1동",
    price: "8억 / 2.5억",
    level: "★★★★☆",
    label: "높음",
    danger: "high",
    date: "2024.03.12"
    }
];

const bounds = new naver.maps.LatLngBounds();

markerData.forEach((data) => {
    naver.maps.Service.geocode(
        { query: data.address },
        function (status, response) {
            if (status !== naver.maps.Service.Status.OK) {
                console.error("주소 변환 실패:", data.address);
                return;
            }

            const result = response.v2.addresses[0];
            console.log("지오코딩 결과:", result);

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
                    content: `<div class="marker ${data.danger}">⚠️</div>`,
                    size: new naver.maps.Size(30, 30),
                    anchor: new naver.maps.Point(15, 15)
                }
            });

            markers.push(marker);

            if (map.getZoom() >= zoomThreshold) {
                marker.setMap(map);
            }

            const infoWindow = new naver.maps.InfoWindow({
                content: `
                    <div class="map-info-window">
                    <strong>${data.address}</strong><br/>
                    매매가 / 전세가: ${data.price}<br/>
                    위험도: ${data.level} (${data.label})<br/>
                    등록일: ${data.date}
                    </div>
                `
            });

            naver.maps.Event.addListener(marker, "mouseover", function () {
                infoWindow.open(map, marker);
            });
            naver.maps.Event.addListener(marker, "mouseout", function () {
                infoWindow.close();
            });
            naver.maps.Event.addListener(marker, "click", function () {
                Ipanel.style.opacity = "1";
                Ipanel.style.visibility = "visible";
                console.log(marker)
            });

            map.fitBounds(bounds); // 모든 마커 보이도록 지도 자동 조정
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
  
  