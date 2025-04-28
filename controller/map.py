from fastapi import APIRouter, Request
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
