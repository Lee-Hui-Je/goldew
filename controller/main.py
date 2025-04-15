import os
from dotenv import load_dotenv
import openai
from pathlib import Path
from fastapi import FastAPI, Form,HTTPException,Depends,Request
from fastapi.middleware.cors import CORSMiddleware
from controller import pgsql_test
from fastapi.responses import FileResponse
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from controller.authen import create_access_token, SECRET_KEY, ALGORITHM
from pydantic import BaseModel
from openai import OpenAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from fastapi.responses import StreamingResponse
app = FastAPI()

@app.get("/")
def test():
    return {"Hello": "World"}
origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
]
app.add_middleware(
    CORSMiddleware,
     allow_origins=["*"],  # 또는 ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

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
async def login(id: str = Form(...), pw: str = Form(...)):
    user = pgsql_test.get_user_id(id)
    if user is None:
        raise HTTPException(status_code=401, detail="존재하지 않는 아이디입니다.")
    hashed_pw = user['pw']
    
    if bcrypt.checkpw(pw.encode('utf-8'), hashed_pw.encode('utf-8')):
        token = create_access_token(data={"sub": id})
        return {"access_token": token, "token_type": "bearer" ,"user_id" : id}
    else:
        raise HTTPException(status_code=401, detail="비밀번호가 틀렸습니다.")


# JWT 토큰 검증
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")  

def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰 검증 실패")

@app.get("/my-page")
def my_page(user_id: str = Depends(verify_token)):
    return {"message": f"{user_id}님 환영합니다!"}

# 회원 정보 수정 
@app.post("/edit")
async def edit(
    id: str = Form(...),
    pw: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...)
):
    hashed_pw = hash_password(pw)
    success = pgsql_test.update_mem(id, hashed_pw, phone, email)
    if success:
        return {"message": "수정 성공"}
    else:
        raise HTTPException(status_code=500, detail="수정 실패")


load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
openai.api_key = os.getenv("OPENAI_API_KEY")

# 1. 모델 설정
chat_llm = ChatOpenAI(model_name='gpt-4o-mini', streaming=True)

class ChatInput(BaseModel):
    input: str
    type: str
    chat_bool:bool



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
    # system + 이전 대화 + 현재 입력 합치기
    messages = [{"role": "system", "content": 
        f"""
        지금부터 너는 사용자와 함께 **대화형 전세사기 예방 시뮬레이션**을 진행할 거야.
        전세사기 종류는 {ty.type}이야.

        너는 지금부터 전세 계약 현장에 있는 부동산 중개인이자 임대인의 역할을 맡게 된다.
        사용자와 실제 계약처럼 대화하며, 사기 여부를 가정하거나 확인하고 조언을 제공해야 한다.

        🎭 [역할]
        - 너는 한 명의 부동산 중개인이며, 동시에 임대인의 대리 역할도 겸한다.
        - 상황에 따라 중개인/임대인/사기방지도우미 역할을 전환하며 연기한다.
        - 사용자는 전세방을 보러 온 예비 세입자다.

        💬 [진행 방식]
        - 대화는 자연스럽게 계약을 유도하거나 사용자의 반응에 따라 사기 상황을 판단한다.
        - 첫 응답에서는 중개인의 입장에서 매물을 소개하며 말문을 연다.
        - 사용자의 답변이 나오면 그에 대해 긍정/위험 피드백을 제공하라.
        - 자유 응답을 받으며, 선택지를 제시하지 않는다.

        💡 [주의사항]
        - 잘못된 선택 → 즉시 위험 경고와 이유 설명
        - 좋은 선택 → 긍정 피드백 + 실전 꿀팁 추가
        - 부동산 용어가 나오면 꼭 쉬운 설명을 함께 제시
        - 대화는 반드시 한국어로 진행
        - "좋습니다!"라는 문장 대신 "시뮬레이션을 시작할게요! 🏠"로 시작 """
        }] + history

    async def token_stream():
        async for chunk in chat_llm.astream(messages):
            if chunk.content:
                yield chunk.content
        # 응답 완료 후 AI 응답을 히스토리에 저장 (전체 content는 따로 누적하거나 reconstruct 해야 함)
        history.append(chunk)

    return StreamingResponse(token_stream(), media_type="text/plain")
