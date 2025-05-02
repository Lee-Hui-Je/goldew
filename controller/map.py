from fastapi import HTTPException, APIRouter, Request
from controller import pgsql_map
router = APIRouter()

@router.get("/opi")
def test():
    results = pgsql_map.map_opi()
    return results

@router.get("/villa")
def test():
    results = pgsql_map.map_villa()
    return results

@router.get("/oneroom")
def test():
    results = pgsql_map.map_oneroom()
    return results


@router.post("/house_opi")
async def house(request: Request):
    body = await request.json()
    id = body.get("id")
    results = pgsql_map.house_opi(id)
    return results

@router.post("/house_villa")
async def house(request: Request):
    body = await request.json()
    id = body.get("id")
    results = pgsql_map.house_villa(id)
    return results

@router.post("/house_oneroom")
async def house(request: Request):
    body = await request.json()
    id = body.get("id")
    results = pgsql_map.house_oneroom(id)
    return results

@router.post("/insert_fav")
async def insert_fav(data: dict):
    user_id = data['user_id']
    address = data['address']
    jeonse_price = data['jeonse_price']
    estimated_jeonse_price = data['estimated_jeonse_price']
    risk_level = data['risk_level']
    property_id = data['property_id']
    room_type = data['room_type']
    print(address)
    results = pgsql_map.insert_fav(user_id, address, jeonse_price, estimated_jeonse_price, risk_level,property_id,room_type)
    return {"success": True}

@router.get("/fav_list")
def fav_list(request: Request):
    user_id = request.session.get('user_id')
    print(user_id)
    results = pgsql_map.fav_list(user_id)
    return results

@router.post("/delete_fav")
async def delete_fav_endpoint(data: dict):
    user_id = data['user_id']
    property_id = data['property_id']
    result = pgsql_map.delete_fav(user_id, property_id)
    
    if result:
        return {"success": True}
    else:
        return {"success": False, "error": "삭제 실패"}