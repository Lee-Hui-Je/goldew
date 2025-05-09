from selenium import webdriver as wb
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import StackingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_percentage_error, mean_absolute_error, r2_score
from lightgbm import LGBMRegressor
import re
from datetime import datetime
from tqdm import tqdm
from selenium.common.exceptions import NoSuchElementException, WebDriverException, ElementNotInteractableException
import psycopg
import psycopg_pool
import joblib
import os
import shap
from xgboost import XGBRegressor
from catboost import CatBoostRegressor
from selenium.webdriver.chrome.options import Options

# pip install selenium pandas numpy tqdm scikit-learn lightgbm

options = Options()
options.add_argument('--headless=new')  # 새로운 Headless 모드 (구버전보다 안정적)
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--disable-gpu')  # GPU 렌더링 이슈 방지
options.add_argument('--window-size=1920,1080')  # 뷰포트 사이즈 설정
options.add_argument('--disable-blink-features=AutomationControlled')  # 자동화 감지 방지
options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36')

# 크롬 드라이버 실행
driver = wb.Chrome(options=options)
url = 'https://www.dabangapp.com/map/officetel?m_lat=35.1464492&m_lng=126.8851831&m_zoom=12'
driver.get(url)
time.sleep(2)

# 링크 수집 리스트
href_list = []
MAX_PAGES = 40  # 페이지 개수 제한 (필요시 조절)

for page in range(MAX_PAGES):
    print(f"\n📄 {page+1} 페이지 수집 중...")

    # ✅ 리스트 영역 스크롤 (예외 처리 추가)
    try:
        body = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '#officetel-list'))
        )
        if not body.is_displayed():
            print("🚫 리스트 영역이 화면에 보이지 않습니다. 크롤링 종료.")
            break

        for _ in range(3):
            try:
                body.send_keys(Keys.END)
                time.sleep(0.5)
            except ElementNotInteractableException as e:
                print(f"❌ body 요소가 상호작용할 수 없습니다. 종료합니다. {e}")
                break

    except Exception as e:
        print(f"❌ 리스트 스크롤 중 오류 발생: {e}")
        break

    WebDriverWait(driver, 10).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, '#officetel-list li'))
    )

    items = driver.find_elements(By.CSS_SELECTOR, '#officetel-list li')
    print(f"▶ {len(items)}개 항목 발견")

    for i in range(len(items)):
        try:
            items = driver.find_elements(By.CSS_SELECTOR, '#officetel-list li')
            item = items[i]

            driver.execute_script("arguments[0].scrollIntoView(true);", item)
            time.sleep(0.2)
            WebDriverWait(driver, 5).until(EC.element_to_be_clickable((By.CSS_SELECTOR, '#officetel-list li')))
            driver.execute_script("arguments[0].click();", item)
            time.sleep(0.5)

            current_url = driver.current_url
            if 'detail_type=room' in current_url and 'detail_id=' in current_url:
                if current_url not in href_list:
                    href_list.append(current_url)

        except Exception as e:
            print(f"{i}번째 항목 클릭 실패: {e}")

    # 다음 페이지 버튼 클릭 시도
    try:
        next_button = driver.find_element(By.CSS_SELECTOR, 'button[aria-label="다음 페이지"]')
        driver.execute_script("arguments[0].click();", next_button)
        time.sleep(2)
    except:
        print("🚫 다음 페이지 버튼이 없거나 더 이상 페이지가 없습니다.")
        break

# 결과 출력
print(f"\n 총 수집된 링크 수: {len(href_list)}")
for link in href_list:
    print(link)

# 링크를 CSV로 저장
df = pd.DataFrame(href_list, columns=["URL"])
df.to_csv("다방_광주_링크_오피스텔.csv", index=False)
print("\n💾 링크 저장 완료: 다방_광주_링크_오피스텔.csv")

driver.quit()

# 옵션, 중개사무소명, 주소시도, 공급, 사용면적 합침, 엘리베이터 없음 뜨기


# 크롬 드라이버 실행
driver = wb.Chrome(options=options)

# 링크 불러오기
df = pd.read_csv("다방_광주_링크_오피스텔.csv")
href_list = df['URL'].tolist()

# 저장할 리스트
data_rows = []

for i in tqdm(range(len(href_list))):
    print(f"\n🔗 {i+1}/{len(href_list)} 번째 링크 접근 중...\nURL: {href_list[i]}")
    row_data = {"URL": href_list[i]}

    try:
        driver.get(href_list[i])
        time.sleep(0.8)

        #  가격정보 수집
        try:
            price_items = driver.find_elements(By.CSS_SELECTOR, 'section[data-scroll-spy-element="price-info"] li')
            for item in price_items:
                try:
                    key = item.find_element(By.TAG_NAME, 'h1').text.strip()
                    value = item.find_element(By.TAG_NAME, 'p').text.strip()
                    row_data[key] = value
                except:
                    continue
        except:
            print("⚠️ 가격정보 수집 실패")

        # 상세정보 수집 (전용면적만 수집 + 엘리베이터 없을 시 '없음' 처리 + 항목 분리)
        try:
            detail_items = driver.find_elements(By.CSS_SELECTOR, 'section[data-scroll-spy-element="detail-info"] li')
            for item in detail_items:
                try:
                    key = item.find_element(By.TAG_NAME, 'h1').text.strip()
                    value = item.find_element(By.TAG_NAME, 'p').text.strip()

                    # 전용/공급면적 또는 전용/계약면적 → 전용만 수집
                    if ("전용/공급면적" in key or "전용/계약면적" in key) and "/" in value:
                        전용 = value.split("/")[0].strip()
                        row_data["전용면적"] = 전용

                    # 방 수 / 욕실 수 분리
                    elif "방 수/욕실 수" in key and "/" in value:
                        parts = value.split("/")
                        row_data["방 수"] = parts[0].strip()
                        row_data["욕실 수"] = parts[1].strip()

                    # 해당층 / 건물층 분리
                    elif "해당층/건물층" in key and "/" in value:
                        parts = value.split("/")
                        row_data["해당층"] = parts[0].strip()
                        row_data["건물층"] = parts[1].strip()

                    else:
                        row_data[key] = value
                except:
                    continue

            # 엘리베이터 항목 없으면 기본값 '없음' 넣기
            if "엘리베이터" not in row_data:
                row_data["엘리베이터"] = "없음"

        except:
            print("⚠️ 상세정보 수집 실패")




        # 옵션 정보 수집
        try:
            option_section = driver.find_element(By.CSS_SELECTOR, 'div[data-scroll-spy-element="options"]')
            option_tags = option_section.find_elements(By.TAG_NAME, 'p')
            options = [opt.text.strip() for opt in option_tags if opt.text.strip()]
            row_data["옵션정보"] = ", ".join(options)
        except:
            print("⚠️ 옵션정보 수집 실패")

        # 중개사무소 정보 수집
        try:
            office_name = driver.find_element(By.CSS_SELECTOR, 'section[data-scroll-spy-element="agent-info"] div h1').text.strip()
            row_data["중개사무소명"] = office_name
        except:
            print("⚠️ 중개사무소명 수집 실패")

        # 매물 위치 주소 수집 (JavaScript + Wait)


        try:
            address_element = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'section[data-scroll-spy-element="near"] p'))
        )
            address_text = driver.execute_script("return arguments[0].innerText;", address_element).strip()
            row_data["매물주소"] = address_text
        except:
            print("⚠️ 매물 주소 수집 실패 (JS 활용)")

    


    except WebDriverException:
        print(f"[❌ 오류] 웹 드라이버 문제 발생: {href_list[i]}")
    except Exception as e:
        print(f"[❌ 오류] 알 수 없는 문제 발생: {href_list[i]} - {e}")

    data_rows.append(row_data)
    time.sleep(0.3)

driver.quit()
print("\n 전체 수집 완료!")

# 결과 저장
result_df = pd.DataFrame(data_rows)
result_df.to_csv("다방_광주_오피스텔.csv", index=False)
print("💾 저장 완료: 다방_광주_오피스텔.csv")

# CSV 파일 불러오기
file_path = '다방_광주_오피스텔.csv'
df = pd.read_csv(file_path)

#  '매매' 컬럼이 있는 경우에만 필터링
if '매매' in df.columns:
    df = df[df['매매'].isna() | (df['매매'].astype(str).str.strip() == '')]
else:
    print("⚠️ '매매' 컬럼이 없어 필터링을 건너뜁니다.")

# '기 보증금/월세' 컬럼이 있는 경우에만 필터링
if '기 보증금/월세' in df.columns:
    df = df[df['기 보증금/월세'].isna() | (df['기 보증금/월세'].astype(str).str.strip() == '')]
else:
    print("⚠️ '기 보증금/월세' 컬럼이 없어 필터링을 건너뜁니다.")
# 컬럼이 존재하는 경우에만 삭제
columns_to_drop = [
    '한달\n예상 주거비용', '건물이름', '난방종류', '해당 면적\n세대 수', '총 세대수', 
                '총 주차대수', '세대당 주차수', '현관유형','융자금', '복층여부', '매매', '기 보증금/월세',
                'LH 전세임대', '준공인가일' 
]
actual_columns_to_drop = [col for col in columns_to_drop if col in df.columns]
df.drop(columns=actual_columns_to_drop, inplace=True)

# '전용면적' 컬럼에 값이 없는 행 제거
df = df[~df['전용면적'].isna() & (df['전용면적'].astype(str).str.strip() != '')]
# '주차가능여부' 컬럼에 값이 없는 행 제거
df = df[~df['사용승인일'].isna() & (df['사용승인일'].astype(str).str.strip() != '')]
# '매물주소'에 중개라고 들어간 행 제거
df = df[~df['매물주소'].astype(str).str.contains('중개', na=False)]
# 매물주소에 '광주'가 안 적혀있는 행 제거 
df = df[df['매물주소'].astype(str).str.contains('광주', na=False)]

# 날짜 형식으로 잘못 들어간 월세 제거
df['월세'] = df['월세'].astype(str).str.strip()
df = df[~df['월세'].str.match(r'^[A-Za-z]{3}-\d{2}$', na=False)]

def convert_price(text):
    if pd.isna(text):
        return None
    text = str(text).replace(',', '').strip()

    # "1억1000" 같은 형식 처리
    if '억' in text:
        match = re.match(r'(\d+)억(\d+)?', text)
        if match:
            억 = int(match.group(1)) * 10000
            천 = int(match.group(2)) if match.group(2) else 0
            return 억 + 천
    elif text.isdigit():
        return int(text)
    else:
        return None

# 나누기
df[['월세보증금', '월세가격']] = df['월세'].str.split('/', expand=True)

# 숫자 변환
df['월세보증금'] = df['월세보증금'].apply(convert_price)
df['월세가격'] = pd.to_numeric(df['월세가격'], errors='coerce')  # 월세는 보통 숫자이므로 그대로 처리


columns_to_drop = ['월세']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

df['전세_여부'] = df['전세'].apply(lambda x: 'O' if pd.notnull(x) and str(x).strip() != '' else 'X')

# 매물 데이터에서 '구'와 '법정동' 뽑기
def extract_gu(address):
    if pd.isna(address):
        return None
    parts = address.split()
    for part in parts:
        if part.endswith('구'):
            return part
    return None

def extract_dong(address):
    if pd.isna(address):
        return None
    parts = address.split()
    for part in parts:
        if part.endswith(('동', '가')):
            return part
    return None

df['구'] = df['매물주소'].apply(extract_gu)
df['법정동'] = df['매물주소'].apply(extract_dong)

# 광주광역시 전체 행정동-법정동 매핑표 (5개 지역구 기준 완성)
광주_행정동_법정동_매핑 = {
    # 동구
    ("동구", "충장동"): ["충장로1가", "충장로2가", "충장로3가", "충장로4가", "충장로5가", "금남로1가", "금남로2가", "금남로3가", "금남로4가", "금남로5가", "대인동", "수기동", "궁동", "대의동", "장동", "불로동", "호남동", "황금동"],
    ("동구", "동명동"): ["동명동"],
    ("동구", "계림1동"): ["계림동"],
    ("동구", "계림2동"): ["계림동"],
    ("동구", "산수1동"): ["산수동"],
    ("동구", "산수2동"): ["산수동"],
    ("동구", "지산1동"): ["지산동"],
    ("동구", "지산2동"): ["지산동"],
    ("동구", "서남동"): ["서석동", "남동", "광산동", "금동", "불로동", "장동", "학동"],
    ("동구", "학동"): ["학동"],
    ("동구", "학운동"): ["학동", "운림동"],
    ("동구", "지원1동"): ["소태동", "용산동"],
    ("동구", "지원2동"): ["소태동", "용연동", "월남동", "선교동", "내남동", "용산동"],

    # 서구
    ("서구", "양동"): ["양동"],
    ("서구", "양3동"): ["양동"],
    ("서구", "농성1동"): ["농성동"],
    ("서구", "농성2동"): ["농성동"],
    ("서구", "광천동"): ["광천동"],
    ("서구", "유덕동"): ["유촌동", "덕흥동", "치평동", "쌍촌동", "내방동"],
    ("서구", "치평동"): ["치평동", "쌍촌동"],
    ("서구", "상무1동"): ["쌍촌동", "치평동"],
    ("서구", "상무2동"): ["쌍촌동", "치평동"],
    ("서구", "화정1동"): ["화정동", "내방동"],
    ("서구", "화정2동"): ["화정동"],
    ("서구", "화정3동"): ["화정동"],
    ("서구", "화정4동"): ["화정동"],
    ("서구", "서창동"): ["세하동", "용두동", "서창동", "벽진동", "매월동", "마륵동"],
    ("서구", "금호1동"): ["금호동"],
    ("서구", "금호2동"): ["금호동"],
    ("서구", "풍암동"): ["풍암동"],
    ("서구", "동천동"): ["동천동"],

    # 남구
    ("남구", "양림동"): ["양림동"],
    ("남구", "방림1동"): ["방림동"],
    ("남구", "방림2동"): ["방림동"],
    ("남구", "봉선1동"): ["봉선동"],
    ("남구", "봉선2동"): ["봉선동"],
    ("남구", "사직동"): ["사동", "구동", "서동"],
    ("남구", "월산동"): ["월산동"],
    ("남구", "월산4동"): ["월산동"],
    ("남구", "월산5동"): ["월산동"],
    ("남구", "백운1동"): ["백운동"],
    ("남구", "백운2동"): ["백운동"],
    ("남구", "주월1동"): ["주월동"],
    ("남구", "주월2동"): ["주월동", "월산동", "백운동"],
    ("남구", "효덕동"): ["노대동", "덕남동"],
    ("남구", "진월동"): ["진월동"],
    ("남구", "송암동"): ["송하동", "임암동", "행암동"],
    ("남구", "대촌동"): ["양과동", "원산동", "이장동", "압촌동", "도금동", "지석동", "석정동", "대지동", "칠석동", "화장동", "월성동", "신장동", "구소동", "양촌동", "승촌동"],

    # 북구
    ("북구", "중흥동"): ["중흥동"],
    ("북구", "중흥1동"): ["중흥동"],
    ("북구", "중앙동"): ["유동", "누문동", "북동", "중흥동"],
    ("북구", "임동"): ["임동"],
    ("북구", "신안동"): ["신안동"],
    ("북구", "용봉동"): ["용봉동"],
    ("북구", "운암1동"): ["운암동"],
    ("북구", "운암2동"): ["운암동"],
    ("북구", "운암3동"): ["운암동"],
    ("북구", "동림동"): ["동림동"],
    ("북구", "우산동"): ["우산동"],
    ("북구", "풍향동"): ["풍향동"],
    ("북구", "문화동"): ["각화동", "문흥동"],
    ("북구", "문흥1동"): ["문흥동"],
    ("북구", "문흥2동"): ["문흥동"],
    ("북구", "두암1동"): ["두암동"],
    ("북구", "두암2동"): ["두암동"],
    ("북구", "두암3동"): ["두암동"],
    ("북구", "삼각동"): ["삼각동"],
    ("북구", "일곡동"): ["일곡동"],
    ("북구", "매곡동"): ["매곡동"],
    ("북구", "오치1동"): ["오치동"],
    ("북구", "오치2동"): ["오치동"],
    ("북구", "석곡동"): ["충효동", "덕의동", "금곡동", "망월동", "청풍동", "화암동", "장등동", "운정동"],
    ("북구", "건국동"): ["본촌동", "용두동", "지야동", "태령동", "수곡동", "효령동", "용전동", "용강동", "생용동", "월출동", "대촌동", "오룡동"],
    ("북구", "양산동"): ["양산동", "연제동", "일곡동"],
    ("북구", "신용동"): ["신용동"],

    # 광산구
    ("광산구", "송정1동"): ["송정동"],
    ("광산구", "송정2동"): ["송정동"],
    ("광산구", "도산동"): ["도산동", "황룡동"],
    ("광산구", "신흥동"): ["신촌동", "도호동"],
    ("광산구", "어룡동"): ["박호동", "서봉동", "선암동", "운수동", "소촌동"],
    ("광산구", "우산동"): ["우산동"],
    ("광산구", "월곡1동"): ["월곡동"],
    ("광산구", "월곡2동"): ["월곡동", "산정동"],
    ("광산구", "비아동"): ["비아동", "도천동", "수완동"],
    ("광산구", "첨단1동"): ["월계동", "쌍암동", "비아동"],
    ("광산구", "첨단2동"): ["월계동", "산월동", "쌍암동", "수완동"],
    ("광산구", "신가동"): ["신가동", "신창동"],
    ("광산구", "운남동"): ["운남동", "신가동"],
    ("광산구", "수완동"): ["신가동", "수완동", "장덕동", "흑석동"],
    ("광산구", "하남동"): ["하남동", "진곡동", "오선동", "안청동", "장수동", "산정동", "장덕동", "흑석동"],
    ("광산구", "임곡동"): ["임곡동", "동임동", "삼막동", "고룡동", "신룡동", "두정동", "광산동", "오산동", "사호동"],
    ("광산구", "동곡동"): ["하산동", "유계동", "본덕동", "용봉동", "요기동", "복룡동", "송대동"],
    ("광산구", "평동"): ["옥동", "월전동", "장록동", "송촌동", "지죽동", "용동", "용곡동", "지정동", "명화동", "동산동", "연산동"],
    ("광산구", "삼도동"): ["도덕동", "송산동", "지평동", "오운동", "삼거동", "양동", "내산동", "대산동", "송학동", "신동", "삼도동"],
    ("광산구", "본량동"): ["남산동", "송치동", "산수동", "선동", "지산동", "왕동", "북산동", "명도동", "동호동", "덕림동", "양산동", "동림동"]
}

# 법정동+구 조합으로 행정동 찾기
def find_administrative_dong(gu, legal_dong):
    if gu is None or legal_dong is None:
        return None
    for (mapping_gu, admin_dong), legal_dongs in 광주_행정동_법정동_매핑.items():
        if gu == mapping_gu and legal_dong.replace('(일부)', '') in [x.replace('(일부)', '') for x in legal_dongs]:
            return admin_dong
    return None

# ------------------------- [1] 원룸 데이터 불러오기 -------------------------

# 구, 법정동 추출
df['구'] = df['매물주소'].apply(extract_gu)
df['법정동'] = df['매물주소'].apply(extract_dong)
df['행정동'] = df.apply(lambda row: find_administrative_dong(row['구'], row['법정동']), axis=1)

# ------------------------- [2] 총인구수, 평균연령 추가 -------------------------
pop_age_df = pd.read_csv('지역구_동별_총인구수_평균연령.csv', encoding='cp949')

# 총인구수 추가
df = df.merge(pop_age_df[['동이름', '총인구수']], how='left', left_on='행정동', right_on='동이름')
df = df.drop(columns=['동이름'])

# 평균연령 추가
df = df.merge(pop_age_df[['동이름', '평균연령']], how='left', left_on='행정동', right_on='동이름')
df = df.rename(columns={'평균연령': '동별평균연령'})
df = df.drop(columns=['동이름'])

print("✅ 총인구수와 평균연령 추가 완료!")

# ------------------------- [3] 평당전세가 추가 -------------------------
price_df = pd.read_csv('광주_오피스텔_지역구_동별_평균평당전세가.csv', encoding='utf-8-sig')

df = df.merge(
    price_df[['지역구', '동이름', '평균평당전세가(만원)']],
    how='left',
    left_on=['구', '행정동'],
    right_on=['지역구', '동이름']
)

df['평균평당전세가(만원)'] = df['평균평당전세가(만원)'].round()

# 필요 없는 컬럼 삭제
df = df.drop(columns=['지역구', '동이름'])

print("✅ 평당전세가 추가 완료!")

# ------------------------- [4] 평균평당가격 추가 -------------------------
price_land_df = pd.read_csv('광주_토지_지역구_동별_평균평당전세가.csv', encoding='utf-8-sig')

# 구, 법정동, 행정동 추출
df['구'] = df['매물주소'].apply(extract_gu)
df['법정동'] = df['매물주소'].apply(extract_dong)
df['행정동'] = df.apply(lambda row: find_administrative_dong(row['구'], row['법정동']), axis=1)

# 평균평당가격 추가
df = df.merge(price_land_df[['지역구', '동이름', '평균평당가격(만원)']],
                        how='left', left_on=['구', '행정동'], right_on=['지역구', '동이름'])
df = df.drop(columns=['지역구', '동이름'])
df['평균평당가격(만원)'] = df['평균평당가격(만원)'].round()

print("✅ 토지 데이터 처리 완료!")

df = df[~df['평균평당가격(만원)'].isna() & (df['평균평당가격(만원)'].astype(str).str.strip() != '')]
df = df[~df['평균평당전세가(만원)'].isna() & (df['평균평당전세가(만원)'].astype(str).str.strip() != '')]
df = df[~df['동별평균연령'].isna() & (df['동별평균연령'].astype(str).str.strip() != '')]
df = df[~df['총인구수'].isna() & (df['총인구수'].astype(str).str.strip() != '')]

df.to_csv('다방_오피스텔_DB_초기.csv', index=False)

# '전세_여부' 컬럼에 X 값이 있는 행 제거
df = df[df['전세_여부'].isna() | (df['전세_여부'].astype(str).str.strip() == 'O')]

# 전세만 저장
df.to_csv('다방_오피스텔_DB_넣기파일.csv', index=False)

# ㅡㅡㅡㅡㅡㅡㅡㅡ 페이지에 사용할 파일 저장 ㅡㅡㅡㅡㅡㅡㅡㅡ



# CSV 파일 불러오기
file_path = '다방_오피스텔_DB_초기.csv'
df = pd.read_csv(file_path)

# 숫자 추출 함수
def extract_fee(text):
    if pd.isna(text):
        return 0
    text = str(text).strip()
    if '확인불가' in text or '없음' in text:
        return 0
    match = re.search(r'\d+', text)
    return int(match.group()) if match else 0

# 적용
df['관리비'] = df['관리비'].apply(extract_fee)

# 2차 변환: 5000이면 그대로, 그 외는 x 10000
df['관리비'] = df['관리비'].apply(lambda x: x if x == 5000 else x * 10000)

# '주차가능여부' 컬럼 값 치환
df['주차가능여부'] = df['주차가능여부'].map({'가능': 1, '불가능': 0})

# '주차가능여부' 컬럼 값 치환
df['엘리베이터'] = df['엘리베이터'].map({'있음': 1, '없음': 0})

# 건물층 문자열 → 숫자형 층수로 변환하는 함수
def extract_floor(text):
    if pd.isna(text):
        return None
    text = str(text)
    if '지하' in text:
        match = re.search(r'\d+', text)
        return -int(match.group()) if match else None
    match = re.search(r'\d+', text)
    return int(match.group()) if match else None

# 숫자층수 컬럼 생성
df['건물층수'] = df['건물층'].apply(extract_floor)

# 조건: 건물층수 >= 6인 행은 엘리베이터를 무조건 1로 바꿈
df.loc[df['건물층수'] >= 6, '엘리베이터'] = 1

# 건물층과 해당층 → 숫자로 변환
def floor_to_number(text):
    if pd.isna(text):
        return None
    text = str(text).strip()
    
    if '지하' in text or '반지하' in text:
        return 0
    if '옥탑' in text:
        return 0
    
    match = re.search(r'\d+', text)
    if match:
        return int(match.group())
    
    # 상대적 층 표현은 여기선 None
    return None

df['건물층수'] = df['건물층'].apply(floor_to_number)
df['해당층수'] = df['해당층'].apply(floor_to_number)

# 층등급 결정 함수
def assign_floor_grade(row):
    층표현 = str(row['해당층']) if pd.notna(row['해당층']) else ''
    
    if any(x in 층표현 for x in ['고층']):
        return 3
    elif any(x in 층표현 for x in ['중층']):
        return 2
    elif any(x in 층표현 for x in ['저층', '반지하', '옥탑']):
        return 1
    elif row['해당층수'] is not None and row['건물층수'] not in [0, None, '']:

        # 비율 계산
        try:
            ratio = row['해당층수'] / row['건물층수']
            if ratio <= 1/3:
                return 1
            elif ratio <= 2/3:
                return 2
            else:
                return 3
        except:
            return None
    else:
        return None

# 층등급 적용
df['층등급'] = df.apply(assign_floor_grade, axis=1)

# 삭제할 컬럼 목록
columns_to_drop = ['해당층', '건물층', '해당층수', '건물층수']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

# 숫자 추출 함수
def extract_number(text):
    if pd.isna(text):
        return None
    match = re.search(r'\d+', str(text))
    return int(match.group()) if match else None
# 적용
df['방 수'] = df['방 수'].apply(extract_number)
df['욕실 수'] = df['욕실 수'].apply(extract_number)

# 변환 대상 컬럼 리스트
columns_to_convert = ['월세보증금', '월세가격']

# 각 컬럼에 대해 변환 적용
for col in columns_to_convert:
    df[col] = pd.to_numeric(df[col], errors='coerce')  # 숫자로 변환
    df[col] = df[col].apply(lambda x: x * 10000 if pd.notna(x) else x)  # 만원 단위 변환

# 전세 금액 처리 함수
def convert_jeonse(value):
    if pd.isna(value):
        return None
    value = str(value).strip().replace(',', '')

    # '억' 단위가 포함된 경우
    if '억' in value:
        match = re.match(r'(\d+)억(\d+)?', value)
        if match:
            억 = int(match.group(1)) * 10000
            천 = int(match.group(2)) if match.group(2) else 0
            return 억 + 천
        else:
            return None
    else:
        # 그냥 숫자일 경우
        match = re.search(r'\d+', value)
        return int(match.group()) if match else None

# 전세 숫자화 → 원 단위로 변환
df['전세'] = df['전세'].apply(convert_jeonse)
df['전세'] = df['전세'].apply(lambda x: x * 10000 if pd.notna(x) else x)

# 전월세 전환율
conversion_rate = 0.07

# 전세 추정가 계산 함수
def estimate_jeonse(row):
    if not pd.isna(row['전세']):
        return row['전세']
    elif pd.notna(row['월세보증금']) and pd.notna(row['월세가격']):
        return row['월세보증금'] + (row['월세가격'] * 12 / conversion_rate)
    else:
        return None

# 계산 적용
df['전세추정가'] = df.apply(estimate_jeonse, axis=1)

# 🔁 백만 원 단위 반올림
df['전세추정가'] = df['전세추정가'].apply(lambda x: round(x, -6) if pd.notna(x) else None)

# 삭제할 컬럼 목록
columns_to_drop = ['월세보증금', '월세가격', '전세']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

# '㎡' 및 공백 제거 → 숫자(float) 변환
df['전용면적'] = df['전용면적'].astype(str).str.replace(r'[^\d\.]', '', regex=True).astype(float)

# 평수 계산 (정수로 변환)
df['전용면적_평'] = (df['전용면적'] * 0.3025).astype(int)

# 삭제할 컬럼 목록
columns_to_drop = ['전용면적']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

# 방향별 점수 매핑 딕셔너리
direction_score = {
    '남': 5,
    '남동': 4.5,
    '남서': 4,
    '동': 3.5,
    '서': 3,
    '북동': 2.5,
    '북서': 2,
    '북': 1
}

# 방향점수 계산 (없거나 이상값은 0으로 처리)
df['방향점수'] = df['방향'].map(direction_score).fillna(0)

# '입주가능' 컬럼에 '즉시 입주'가 포함되어 있으면 1, 아니면 0
df['즉시입주여부'] = df['입주가능일'].apply(lambda x: 1 if pd.notna(x) and '즉시 입주' in str(x) else 0)

# 값이 있으면 1, 없으면 0
df['단기임대여부'] = df['단기임대'].apply(lambda x: 1 if pd.notna(x) and str(x).strip() != '' else 0)

# 삭제할 컬럼 목록
columns_to_drop = ['단기임대', '입주가능일', '방향']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

# 점수 매핑 딕셔너리
score_map = {
    '공동주택': 1.0,
    '단독주택': 0.3,
    '업무시설': 0.1,
    '숙박시설': 0.0,
    '제1종근린생활시설': 0.0,
    '제2종근린생활시설': 0.0,
    '교육연구시설': 0.0,
    '공장': 0.0,
    '미등기건물': 0.0,
    '기타(정착물 등)': 0.0,
    '그 밖에 토지의 정착물': 0.0
}

# 전처리: 문자열로 변환 + strip 처리
df['건축물용도'] = df['건축물용도'].astype(str).str.strip()

# '없음', 'nan', '', 등 처리 포함
df['보증보험점수'] = df['건축물용도'].apply(lambda x: score_map.get(x, 0.0) if x.lower() not in ['nan', '없음', ''] else 0.0)

# 삭제할 컬럼 목록
columns_to_drop = ['건축물용도']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

# 기준 날짜: 2025년 4월 11일
today = datetime(2025, 4, 11)

# 사용승인일 → 연차 계산 함수
def get_building_age(approval_date):
    try:
        date = pd.to_datetime(approval_date, errors='coerce')
        if pd.isna(date):
            return None
        # 연차에 따라 점수 부여 함수
        year_diff = today.year - date.year
        if (today.month, today.day) < (date.month, date.day):
            year_diff -= 1
        return year_diff
    except:
        return None

# 연차에 따라 점수 부여 함수
def get_building_score(years):
    if years is None:
        return 0.0
    elif years <= 5:
        return 1.0  # 신축
    elif years <= 15:
        return 0.5  # 준신축
    else:
        return 0.0  # 구축

# 적용
df['건축연차'] = df['사용승인일'].apply(get_building_age)
df['건축점수'] = df['건축연차'].apply(get_building_score)

# 삭제할 컬럼 목록
columns_to_drop = ['사용승인일']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

# 옵션 점수 매핑
option_scores = {
    '냉장고': 1.0,
    '세탁기': 1.0,
    '가스레인지': 1.0,
    '전자레인지': 1.0,
    '침대': 0.8,
    '옷장': 0.6,
    '책상': 0.4,
    '쇼파': 0.3,
    '식탁': 0.5,
    '싱크대': 1.0,
    '인덕션': 0.4,
    '가스오븐': 0.3,
    '건조기': 0.8,
    '스탠드형': 0.5,
    '벽걸이형': 0.6,
    '마당': 0.3,
    '무인택배함': 0.3,
    '비데': 0.5,
    '샤워부스': 0.5,
    '욕조': 0.4,
    '불박이장': 0.5,
    '신발장': 0.6,
    '천장형': 0.4,
    '화재경보기': 0.2,
    '베란다': 0.4,
    '식기세척기': 0.3,
    'TV': 0.3
}

# 옵션 점수 계산 함수
def calculate_option_score(option_text):
    if pd.isna(option_text):
        return 0.0
    score = 0.0
    for keyword, point in option_scores.items():
        if keyword in option_text:
            score += point
    return round(score, 1)  # ← 소수점 1자리 반올림

# 적용
df['옵션점수'] = df['옵션정보'].apply(calculate_option_score)

# 삭제할 컬럼 목록
columns_to_drop = ['옵션정보']

# 컬럼 삭제
df.drop(columns=columns_to_drop, inplace=True)

# 컬럼명 변경
df.rename(columns={'전세추정가': '전세'}, inplace=True)

# 저장
df.to_csv('다방_광주_오피스텔_수치화.csv', index=False)


# 4. MLOps

# ✅ 4-1. 데이터 불러오기
df = pd.read_csv('다방_광주_오피스텔_수치화.csv')
df = df.dropna()

# ✅ 4-2. 로그 변환
df['log_전세'] = np.log1p(df['전세'])
df['log_건축연차'] = np.log1p(df['건축연차'])
df['log_전용면적'] = np.log1p(df['전용면적_평'])

# ✅ 4-3. 피처 정의
features = [
    '방 수', '욕실 수', '엘리베이터', '층등급',
    '건축점수', '보증보험점수', '즉시입주여부', '단기임대여부', '방향점수',
    'log_건축연차', 'log_전용면적', '총인구수', '동별평균연령', '평균평당전세가(만원)', '평균평당가격(만원)'
]

X = df[features].reset_index(drop=True)
y_log = df['log_전세'].reset_index(drop=True)

# ✅ 4-4. 학습/테스트 데이터 분할 (8:2)
X_train, X_test, y_train_log, y_test_log = train_test_split(X, y_log, test_size=0.2, random_state=42)

# ✅ 4-5. 스케일링
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ✅ 4-6. 모델 정의
models = {
    'LightGBM': LGBMRegressor(random_state=42),
    'XGBoost': XGBRegressor(random_state=42),
    'CatBoost': CatBoostRegressor(verbose=0, random_state=42),
    'Stacking(LGBM+XGB+Cat)': StackingRegressor(
        estimators=[
            ('lgbm', LGBMRegressor(random_state=42)),
            ('xgb', XGBRegressor(random_state=42)),
            ('cat', CatBoostRegressor(verbose=0, random_state=42))
        ],
        final_estimator=LinearRegression(),
        cv=5
    )
}

# ✅ 4-7. 여러 모델 학습 및 평가
results = {}

for name, model in models.items():
    model.fit(X_train_scaled, y_train_log)
    log_pred = model.predict(X_test_scaled)
    pred = np.expm1(log_pred)
    y_real = np.expm1(y_test_log)

    mae = mean_absolute_error(y_real, pred)
    mape = mean_absolute_percentage_error(y_real, pred)
    r2 = r2_score(y_real, pred)

    results[name] = (model, mae, mape, r2)

# ✅ 4-8. 가장 좋은 모델 선택 (MAPE 우선, MAE tie-breaker)
best_name, (best_model, best_mae, best_mape, best_r2) = sorted(
    results.items(),
    key=lambda item: (item[1][2], item[1][1])
)[0]

# ✅ 4-9. 결과 출력
print("\n📊 오늘 전체 모델 성능 요약:")
results_df = pd.DataFrame(
    {name: {'MAE': mae, 'MAPE': mape, 'R2': r2} for name, (_, mae, mape, r2) in results.items()}
).T
results_df['MAE'] = results_df['MAE'].apply(lambda x: f"{x:,.0f} 원")
results_df['MAPE'] = results_df['MAPE'].apply(lambda x: f"{x*100:.2f} %")
results_df['R2'] = results_df['R2'].apply(lambda x: f"{x:.4f}")
print(results_df)

print(f"\n🌟 오늘 가장 좋은 모델은: {best_name}")
print(f" - MAE: {best_mae:.2f}원")
print(f" - MAPE: {best_mape*100:.2f}%")
print(f" - R²: {best_r2:.4f}")

# ✅ 4-10. 최신 모델 저장
joblib.dump(best_model, "of_model_latest.pkl")
print("💾 of_model_latest.pkl 저장 완료!")

# ✅ 4-11. 기존 모델과 비교
if os.path.exists("of_model_best.pkl"):
    prev_best_model = joblib.load("of_model_best.pkl")
    log_pred_prev = prev_best_model.predict(X_test_scaled)
    pred_prev = np.expm1(log_pred_prev)

    prev_mae = mean_absolute_error(y_real, pred_prev)
    prev_mape = mean_absolute_percentage_error(y_real, pred_prev)

    print(f"\n🏆 기존 best 모델 평가 결과:")
    print(f" - MAE: {prev_mae:.2f}원")
    print(f" - MAPE: {prev_mape*100:.2f}%")
else:
    print("\n⚠️ 기존 of_model_best.pkl이 없습니다. 최초 저장 진행.")
    prev_mape = float('inf')
    prev_mae = float('inf')

# ✅ 4-12. 성능 비교하여 갱신 여부 판단
if (best_mape < prev_mape) or (best_mape == prev_mape and best_mae < prev_mae):
    joblib.dump(best_model, "of_model_best.pkl")
    print("\n✅ 새로운 모델이 더 좋아서 best 모델로 갱신되었습니다.")
else:
    print("\n❌ 기존 best 모델이 더 우수하여 갱신하지 않았습니다.")


#### 5. 예측 데이터 가져오기

# 5-1. 데이터 불러오기
df = pd.read_csv("다방_광주_오피스텔_수치화.csv")
df = df.dropna()

# 5-2. 로그 전용면적, 건축연차 추가 (모델 학습 때 사용한 파생변수)
df['log_전세'] = np.log1p(df['전세'])
df['log_건축연차'] = np.log1p(df['건축연차'])
df['log_전용면적'] = np.log1p(df['전용면적_평'])

# 5-3. 피처 정의 (학습 시 사용한 순서와 동일하게)
features = [
    '방 수', '욕실 수', '엘리베이터', '층등급',
    '건축점수', '보증보험점수', '즉시입주여부', '단기임대여부', '방향점수',
    'log_건축연차', 'log_전용면적', '총인구수', '동별평균연령', '평균평당전세가(만원)', '평균평당가격(만원)'
]

X = df[features].reset_index(drop=True)

# 5-4. 스케일링
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 5-5. 모델 불러오기 (latest 또는 best)
model = joblib.load("of_model_best.pkl")  # 또는 "model_latest.pkl"

# 5-6. 예측 및 역변환
log_pred = model.predict(X_scaled)
pred = np.expm1(log_pred)
y_real = np.expm1(y_log)

# 5-7 결과 정리
df_selected = df.copy().reset_index(drop=True)
df_selected["실제 전세가"] = (y_real / 10000).round(1)
df_selected["예측 전세가"] = (pred / 10000).round(1)
df_selected["오차(만원)"] = (df_selected["예측 전세가"] - df_selected["실제 전세가"]).round(1)
df_selected["오차율(%)"] = ((df_selected["오차(만원)"].abs() / df_selected["실제 전세가"]) * 100).round(2)

# 5-8 사기위험도 분류 함수
def classify_risk(error):
    if error < 10:
        return "🟢 안전"
    elif error < 25:
        return "🟡 주의"
    else:
        return "🔴 위험"

df_selected["사기위험도"] = df_selected["오차율(%)"].apply(classify_risk)

# 5-9 불필요한 컬럼 제거
df_selected.drop(columns=["log_전세", "log_건축연차", "log_전용면적"], inplace=True)

# 저장
df_selected.to_csv("전세예측_오피스텔_정리본.csv", index=False)
print("📁 저장 완료: 전세예측_오피스텔_정리본.csv")


# 6. 페이지 표시를 위한 데이터 처리

# 🔸 원본 불러오기
df = pd.read_csv("전세예측_오피스텔_정리본.csv")

# 🔸 가격 포맷 함수
def format_price(val):
    val = int(val)
    if val >= 10000:
        man = val % 10000
        return f"1억{man}" if man != 0 else "1억"
    else:
        return str(val)

# 🔸 예측 전세가는 100단위 반올림 후 포맷
def format_predicted(val):
    val = int(round(val, -2))
    if val >= 10000:
        man = val % 10000
        return f"1억{man}" if man != 0 else "1억"
    else:
        return str(val)

# 🔸 다시 숫자로 파싱하는 함수
def parse_price_string(s):
    if "억" in s:
        s = s.replace("억", "")
        return 10000 + int(s) if s else 10000
    else:
        return int(s)

# 🔸 실제 숫자 열 추출
real_values = df["실제 전세가"].astype(float)
pred_values = df["예측 전세가"].astype(float)

# 🔸 오차 및 오차율 계산
df["오차(만원)"] = (pred_values - real_values).astype(int)
df["오차율(%)"] = ((df["오차(만원)"].abs() / real_values) * 100).round(2)

# 🔸 다시 보기 좋게 포맷
df["실제 전세가"] = real_values.apply(format_price)
df["예측 전세가"] = pred_values.round(-2).apply(format_predicted)

# 🔸 저장
df.to_csv("전세예측_오피스텔_표시완료.csv", index=False)
print("📁 저장 완료: 전세예측_오피스텔_표시완료.csv")

# CSV 파일 불러오기
file_path = '전세예측_오피스텔_표시완료.csv'
df = pd.read_csv(file_path)

# 데이터 불러오기
df = pd.read_csv('전세예측_오피스텔_표시완료.csv').dropna()

# 파생변수 추가
df['log_건축연차'] = np.log1p(df['건축연차'])
df['log_전용면적'] = np.log1p(df['전용면적_평'])

# 전체 모델 학습 피처 (15개)
full_features = [
    '방 수', '욕실 수', '엘리베이터', '층등급',
    '건축점수', '보증보험점수', '즉시입주여부', '단기임대여부', '방향점수',
    'log_건축연차', 'log_전용면적', '총인구수', '동별평균연령', '평균평당전세가(만원)', '평균평당가격(만원)'
]

# SHAP 기여도를 보고 싶은 주요 피처 (7개)
target_features = [    
    'log_건축연차',  
    'log_전용면적',         
    '평균평당가격(만원)',        
    '평균평당전세가(만원)',           
    '총인구수',           
    '동별평균연령',              
    '방향점수'         
]

# 새로 추가할 컬럼명 지정
new_columns = [
    'log_건축연차 점수',
    'log_전용면적 점수',
    '평균평당가격(만원) 점수',
    '평균평당전세가(만원) 점수',
    '총인구수 점수',
    '동별평균연령 점수',
    '방향 점수'
]

# 입력 값 준비 및 스케일링
X = df[full_features].reset_index(drop=True)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 모델 불러오기 및 추출
model = joblib.load("of_model_best.pkl")

# SHAP 기여도 계산
if isinstance(model, LGBMRegressor):
    shap_values = model.predict(X, pred_contrib=True)
    contrib_df = pd.DataFrame(shap_values[:, :-1], columns=full_features)

elif isinstance(model, XGBRegressor):
    explainer = shap.Explainer(model, X_scaled)
    shap_values = explainer(X_scaled)
    contrib_df = pd.DataFrame(shap_values.values, columns=full_features)

elif isinstance(model, CatBoostRegressor):
    explainer = shap.Explainer(model, X_scaled)
    shap_values = explainer(X_scaled)
    contrib_df = pd.DataFrame(shap_values.values, columns=full_features)

elif isinstance(model, StackingRegressor):
    explainer = shap.KernelExplainer(model.predict, shap.sample(X_scaled, 100))
    shap_values = explainer.shap_values(X_scaled)
    contrib_df = pd.DataFrame(shap_values, columns=full_features)

else:
    raise ValueError("❌ 알 수 없는 모델입니다. SHAP 계산 불가.")
# 필요한 피처만 선택 후 새 컬럼명으로 변경
contrib_selected = contrib_df[target_features]
contrib_selected.columns = new_columns

# SHAP 점수 0~100 정규화
contrib_normalized = contrib_selected.apply(lambda x: 100 * (x - x.min()) / (x.max() - x.min()))
contrib_normalized = contrib_normalized.round(2)
contrib_normalized.columns = [col.replace("점수", "지표") for col in new_columns]  # 점수 → 지표


# 수정: 백분율 변환된 SHAP 점수 사용
df_with_scores = pd.concat([df.reset_index(drop=True), contrib_normalized], axis=1)


# 저장
df_with_scores.to_csv("전세예측_오피스텔_SHAP점수추가.csv", index=False)
print("✅ SHAP 기여도 컬럼이 추가된 파일 저장 완료: 전세예측_오피스텔_SHAP점수추가.csv")

# '전세_여부' 컬럼에 X 값이 있는 행 제거
df_with_scores = df_with_scores[df_with_scores['전세_여부'].isna() | 
                                (df_with_scores['전세_여부'].astype(str).str.strip() == 'O')]

# 전세만 저장 (SHAP 점수 포함됨)
df_with_scores.to_csv('다방_오피스텔_DB_최종넣기.csv', index=False)



# 7. PostgreSQL 연결 설정
DB_URL = "postgresql://goldew:12345@project-db-campus.smhrd.com:3310/goldew"
pool = psycopg_pool.ConnectionPool(DB_URL, min_size=1, max_size=5)

def truncate_and_insert_and_update():
    # 1단계: 데이터 삽입용 CSV
    df_insert = pd.read_csv("다방_오피스텔_DB_넣기파일.csv")

    # 2단계: 예측값 업데이트용 CSV
    df_update = pd.read_csv("다방_오피스텔_DB_최종넣기.csv")

    with pool.connection() as conn:
        cur = conn.cursor()
        try:
            # STEP 1: 테이블 초기화
            cur.execute("""
                TRUNCATE TABLE public.tb_property_detail, public.tb_property CASCADE;
            """)
            print("✅ 테이블 TRUNCATE 완료!")

            # STEP 2: INSERT
            for idx, row in df_insert.iterrows():
                property_id = idx + 1

                # tb_property 삽입
                cur.execute("""
                    INSERT INTO tb_property (
                        property_id, jeonse_price, address, area, current_floor,
                        immediate_move_in, listing_date
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    property_id,
                    row['전세'],
                    str(row['매물주소']),
                    row['전용면적'],
                    row['해당층'],
                    row['입주가능일'],
                    row['최초등록일']
                ))

                # tb_property_detail 삽입
                cur.execute("""
                    INSERT INTO tb_property_detail (
                        property_id, jeonse_price, maintenance_fee, options, area, num_rooms,
                        num_bathrooms, has_elevator, parking_available, building_year,
                        building_usage, address, current_floor, immediate_move_in,
                        listing_date, room_type, building_floor, direction, agency_name
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    property_id,
                    row['전세'],
                    row['관리비'],
                    row['옵션정보'],
                    row['전용면적'],
                    row['방 수'],
                    row['욕실 수'],
                    row['엘리베이터'],
                    row['주차가능여부'],
                    row['사용승인일'],
                    row['건축물용도'],
                    str(row['매물주소']),
                    row['해당층'],
                    row['입주가능일'],
                    row['최초등록일'], 
                    row['방종류'],
                    row['건물층'],
                    row['방향'],
                    row['중개사무소명']
                ))

            print("✅ 데이터 삽입 완료!")

            # STEP 3: risk_level 및 estimated_jeonse_price 업데이트
            for idx, row in df_update.iterrows():
                property_id = idx + 1
                risk_level = str(row["오차율(%)"])
                estimated_jeonse_price = str(row["예측 전세가"])

                # tb_property 업데이트
                cur.execute("""
                    UPDATE tb_property
                    SET 
                        risk_level = CASE WHEN risk_level IS NULL THEN %s ELSE risk_level END,
                        estimated_jeonse_price = CASE WHEN estimated_jeonse_price IS NULL THEN %s ELSE estimated_jeonse_price END
                    WHERE property_id = %s
                """, (risk_level, estimated_jeonse_price, property_id))

                # tb_property_detail 업데이트
                cur.execute("""
                    UPDATE tb_property_detail
                    SET 
                        risk_level = CASE WHEN risk_level IS NULL THEN %s ELSE risk_level END,
                        estimated_jeonse_price = CASE WHEN estimated_jeonse_price IS NULL THEN %s ELSE estimated_jeonse_price END
                    WHERE property_id = %s
                """, (risk_level, estimated_jeonse_price, property_id))

            conn.commit()
            print("✅ risk_level 및 estimated_jeonse_price 업데이트 완료!")

        except Exception as e:
            conn.rollback()
            print("❌ 에러 발생:", e)
        finally:
            cur.close()

# 실행
truncate_and_insert_and_update()

# PostgreSQL 연결 설정
DB_URL = "postgresql://goldew:12345@project-db-campus.smhrd.com:3310/goldew"
pool = psycopg_pool.ConnectionPool(DB_URL, min_size=1, max_size=5)

def truncate_and_insert_and_update():
    # 2단계: 예측값 업데이트용 CSV
    df_update = pd.read_csv("다방_오피스텔_DB_최종넣기.csv")

    with pool.connection() as conn:
        cur = conn.cursor()
        try:
            # STEP 3: risk_level 및 estimated_jeonse_price 업데이트
            for idx, row in df_update.iterrows():
                property_id = idx + 1
                log_building_age = str(row["log_건축연차 지표"])
                log_area = str(row["log_전용면적 지표"])
                price_pyeong_score = str(row["평균평당가격(만원) 지표"])
                jeonse_pyeong_score = str(row["평균평당전세가(만원) 지표"])
                population_score = str(row["총인구수 지표"])
                average_age_score = str(row["동별평균연령 지표"])
                direction_score = str(row["방향 지표"])    
                # tb_property_detail 업데이트
                cur.execute("""
                    UPDATE tb_property_detail
                    SET 
                        log_building_age = CASE WHEN log_building_age IS NULL THEN %s ELSE log_building_age END,
                        log_area = CASE WHEN log_area IS NULL THEN %s ELSE log_area END,
                        price_pyeong_score = CASE WHEN price_pyeong_score IS NULL THEN %s ELSE price_pyeong_score END,
                        jeonse_pyeong_score = CASE WHEN jeonse_pyeong_score IS NULL THEN %s ELSE jeonse_pyeong_score END,
                        population_score = CASE WHEN population_score IS NULL THEN %s ELSE population_score END,
                        average_age_score = CASE WHEN average_age_score IS NULL THEN %s ELSE average_age_score END,
                        direction_score = CASE WHEN direction_score IS NULL THEN %s ELSE direction_score END
                    WHERE property_id = %s
                """, (log_building_age, log_area, price_pyeong_score, jeonse_pyeong_score,population_score,average_age_score,
                    direction_score, property_id))

            conn.commit()
            print("✅ 가중치 업데이트 완료!")

        except Exception as e:
            conn.rollback()
            print("❌ 에러 발생:", e)
        finally:
            cur.close()

# 실행
truncate_and_insert_and_update()