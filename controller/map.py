from fastapi import APIRouter, Request
from controller import pgsql_map
router = APIRouter()

@router.get("/position")
def test():
    results = pgsql_map.map_imfo()
    return results

@router.post("/house_imfo")
async  def house(request: Request):
    body = await request.json()
    id = body.get("id")
    results = pgsql_map.house_imfo(id)
    return results