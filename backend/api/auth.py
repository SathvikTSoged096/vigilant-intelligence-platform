from fastapi import APIRouter,Depends,HTTPException
from fastapi.security import HTTPBearer,HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from database.postgres import get_db
from schemas.auth import *
from services.auth import authenticate, get_user
from core.security import decode_access_token
router=APIRouter(prefix='/auth'); security=HTTPBearer()
async def current_user(c:HTTPAuthorizationCredentials=Depends(security),db:AsyncSession=Depends(get_db)):
 u=await get_user(db,int(decode_access_token(c.credentials))); 
 if not u: raise HTTPException(401,'User not found.')
 return u
@router.post('/login',response_model=TokenResponse)
async def login(p:LoginRequest,db=Depends(get_db)):
 t=await authenticate(db,p.username,p.password)
 if not t: raise HTTPException(401,'Invalid credentials.')
 return {'access_token':t}
@router.get('/me',response_model=UserResponse)
async def me(u=Depends(current_user)): return u
@router.post('/logout')
async def logout(): return {'status':'ok'}
