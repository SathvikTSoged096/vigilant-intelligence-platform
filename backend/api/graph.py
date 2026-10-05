from fastapi import APIRouter,Depends
from api.auth import current_user
from services.graph import GraphService
router=APIRouter(prefix='/graph')
@router.get('/nodes')
async def nodes(u=Depends(current_user)): return {'nodes':await GraphService.nodes()}
@router.get('/relationships')
async def relationships(u=Depends(current_user)): return {'relationships':await GraphService.relationships()}
@router.get('/timeline')
async def timeline(u=Depends(current_user)): return {'events':await GraphService.timeline()}
@router.get('/geospatial')
async def geospatial(u=Depends(current_user)): return {'points':await GraphService.geospatial()}
@router.post('/query')
async def query(u=Depends(current_user)): return {'error':'Arbitrary Cypher is disabled.'}
