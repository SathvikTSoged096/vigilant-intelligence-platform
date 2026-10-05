from datetime import UTC,datetime,timedelta
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException
from config import settings

pwd=CryptContext(schemes=['bcrypt'],deprecated='auto')
def hash_password(x): return pwd.hash(x)
def verify_password(x,h): return pwd.verify(x,h)
def create_access_token(sub): return jwt.encode({'sub':str(sub),'iat':datetime.now(UTC),'exp':datetime.now(UTC)+timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)},settings.SECRET_KEY,algorithm='HS256')
def decode_access_token(t):
 try: return str(jwt.decode(t,settings.SECRET_KEY,algorithms=['HS256'])['sub'])
 except jwt.InvalidTokenError as e: raise HTTPException(401,'Invalid or expired token.') from e
