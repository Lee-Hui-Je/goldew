import os
import openai
from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, Form,HTTPException,Depends,Request,UploadFile,File,Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from controller import pgsql_test
from fastapi.responses import FileResponse
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from openai import OpenAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from fastapi.responses import StreamingResponse
from .pdf_parser import extract_text_from_pdf
from .risk import analyze_register_with_user_input, generate_summary_and_actions
import requests

app = FastAPI()

# 라우터
from controller.map import router as map_router

# 라우터 등록
app.include_router(map_router)

origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY"),
    same_site="none",      
    https_only=False       
)



def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# 로그인된 사용자 가져오기
def hows_user(request: Request):
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return user_id

# 회원가입
@app.post("/join")
async def join(
    id: str = Form(...),
    pw: str = Form(...),
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...)
):
    hashed_pw = hash_password(pw)
    pgsql_test.insert_mem(id, hashed_pw, name, phone, email)
    return {"message": "success"}

# 로그인
@app.post("/login")
async def login(request: Request, id: str = Form(...), pw: str = Form(...)):
    request.session.clear()
    user = pgsql_test.get_user_id(id)
    if user is None:
        raise HTTPException(status_code=401, detail="존재하지 않는 아이디입니다.")

    if not bcrypt.checkpw(pw.encode('utf-8'), user['pw'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="비밀번호가 틀렸습니다.")

    request.session['user_id'] = id
    print(f"세션 저장 완료: {request.session['user_id']}")  
    return {"message": "로그인 성공", "user_id": id}



# 회원 정보 수정 
@app.post("/edit")
async def edit(
    request: Request,
    pw: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...)
):
    user_id = request.session.get('user_id')
    print(user_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")

    hashed_pw = hash_password(pw)
    success = pgsql_test.update_mem(user_id, hashed_pw, phone, email)
    if success:
        return {"message": "수정 성공"}
    else:
        raise HTTPException(status_code=500, detail="수정 실패")
@app.post("/logout")
async def logout(request: Request):
    request.session.clear()
    response = JSONResponse(content={"message": "로그아웃 성공"})
    response.delete_cookie("session") 
    return response

@app.get("/userinfo")
async def userinfo(request: Request):
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return {"user_id": user_id}

@app.post("/trust-check")
async def trust_check(
    landlord: str = Form(...),
    contract_date: str = Form(...),
    address: str = Form(...),
    deposit: str = Form(...),
    file1: UploadFile = File(...)
):
    # 1. PDF 텍스트 추출
    text = extract_text_from_pdf(file1)

    # 2. 분석
    
    deductions, warnings = analyze_register_with_user_input(text, landlord, contract_date, deposit,address)
    

    
    summary, actions, warnings = generate_summary_and_actions(deductions, warnings)
    
    total_deduction = sum(d["point"] for d in deductions)
    score = max(100 + total_deduction, 0)
    grade = "A등급" if score >= 90 else "B등급" if score >= 75 else "C등급" if score >= 60 else "D등급" if score >= 40 else "E등급"
    risk = "안전" if score >= 90 else "주의" if score >= 60 else "위험"

    # 5. 결과 반환
    result = {
        "input": {
            "landlord": landlord or "입력되지 않음",
            "date": contract_date or "입력되지 않음",
            "address": address or "입력되지 않음",
            "deposit": deposit or "입력되지 않음"
        },
        "score": score,
        "grade": grade,
        "risk": risk,
        "deductions": deductions,
        "summary": summary,  
        "actions": actions,   
        "warnings": warnings 
    }

    return JSONResponse(content=result)

openai.api_key = os.getenv("OPENAI_API_KEY")

# 1. 모델 설정
chat_llm = ChatOpenAI(model_name='gpt-4o-mini', streaming=True)

class ChatInput(BaseModel):
    input: str
    type: str
    chat_bool:bool

@app.post("/reportsummary")
async def stream_summary(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")
    client = OpenAI()

    def generate():
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "부동산 등기부 분석 리포트를 형식에 맞게 작성해주세요."},
                {"role": "user", "content": prompt}
            ],
            stream=True,
        )
        for chunk in response:
            delta = chunk.choices[0].delta
            if hasattr(delta, "content") and delta.content:
                yield delta.content

    return StreamingResponse(generate(), media_type="text/plain")

# 대화 기록 누적용
history = []
@app.post("/chat")
async def chat(request: Request, ty: ChatInput):
    global history
    if ty.chat_bool:
        history = []
    data = await request.json()
    user_input = data.get("input", "")
    # 대화 히스토리 갱신
    history.append({"role": "user", "content": user_input})
    scenario = {
        "깡통전세": "전세 보증금이 매매가보다 높고, 근저당이나 압류가 잡혀 있어 세입자가 보증금을 돌려받지 못할 위험이 있는 상황을 구성하라.",
        "위조계약": "등기부등본상 집주인이 아닌 사람이 가짜 서류로 계약을 진행하는 상황을 구성하라.",
        "이중계약": "같은 집에 두 명 이상의 세입자와 계약을 진행하고 있는 상황을 구성하라.",
        "명의신탁": "실소유주가 아닌 명의자(예: 지인 이름)로 등기된 주택을 계약하는 상황을 구성하라.",
        "보증보험 악용": "보증보험 가입을 미끼로 안전하다고 속이며 실제로는 보험가입 요건이 안 되거나 허위로 신청한 상황을 구성하라.",
        "분양형 사기": "실제로는 허가가 안 난 건물이나 가짜 분양권으로 계약을 유도하는 상황을 구성하라.",
        "위장 임대인": "임차인이 집주인인 척하고, 원래 소유자의 모르게 전세 계약을 체결하는 상황을 구성하라.",
        "전세권 미설정": "전세권 설정을 하지 않고 단순 임차로 계약을 유도하면서, 후순위 보증금 보호가 안 되는 상황을 구성하라.",
    }
    scenario_text= scenario.get(ty.type, "해당 사기유형에 맞게 위험한 상황을 구상하라")
    messages = [{"role": "system", "content": 
        f"""
지금부터 너는 사용자와 함께 **대화형 전세사기 예방 시뮬레이션**을 진행할 거야.
전세사기 종류는 {ty.type}이야.
[사기 시나리오 설정]
- {scenario_text}
[상황]
- 너는 실제 부동산 계약 현장에서 사용자를 맞이한 중개인이자 임대인의 대리인이야.
- 사용자는 매물을 보러 온 예비 세입자야.
- 현실적인 말투와 자연스러운 대화 흐름을 유지하라.

[역할과 말투]
- 너는 처음부터 친절하고 적극적인 중개인의 말투로 시작해야 해.
- 처음 대화는 **인사 없이** 바로 매물 정보 소개로 시작해.  
  예) "지금 보시는 방은 역세권 5분 거리에 있는 신축 원룸이에요. 햇빛 잘 들고 관리비도 저렴해서 인기가 많아요."
- 이후 사용자의 반응에 따라 임대인, 사기방지도우미의 역할도 자연스럽게 오가며 대화하라.

[진행 방식]
- 사용자의 발언을 듣고, 사기 징후가 있으면 바로 경고해.
- 사기를 피한 발언엔 칭찬과 실전 팁을 알려줘.
- 부동산 용어는 등장할 때마다 반드시 쉬운 설명을 추가해줘.

[주의사항]
- 선택지를 제시하지 마. 자유롭게 대화를 이어가.
- 사기유형은 '{ty.type}'에 기반하여 상황을 만들어.
- 대화는 반드시 한국어로만 진행해.
"""
}] + history
    
    async def token_stream():
        full_response = ""
        async for chunk in chat_llm.astream(messages):
         if chunk.content:
            full_response += chunk.content
            yield chunk.content
        history.append({"role": "assistant", "content": full_response})

    return StreamingResponse(token_stream(), media_type="text/plain")

   
@app.post("/mapsummary")
async def mapsummary(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")
    client = OpenAI()

    def generate():
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "지도 매물 요약을 형식에 맞게 작성해주세요."},
                {"role": "user", "content": prompt}
            ],
            stream=True,
        )
        for chunk in response:
            delta = chunk.choices[0].delta
            if hasattr(delta, "content") and delta.content:
                yield delta.content

    return StreamingResponse(generate(), media_type="text/plain")

@app.get("/naver-news")
def get_naver_news(query: str = "부동산"):
    url = "https://openapi.naver.com/v1/search/news.json"
    headers = {
        "X-Naver-Client-Id": "kkKsLuX2h62tf_CLjh2n",
        "X-Naver-Client-Secret": "W1z2_3i06q"
    }
    params = {
        "query": query,
        "display": 100,
        "sort": "date"
    }
    response = requests.get(url, headers=headers, params=params)
    return response.json()