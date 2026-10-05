from functools import lru_cache
from pathlib import Path
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings,SettingsConfigDict
class Settings(BaseSettings):
 APP_NAME:str='Gotham Intelligence Platform'; APP_ENV:str='development'; SECRET_KEY:str='change-me'
 CORS_ORIGINS:list[str]=Field(default_factory=lambda:['http://localhost','http://localhost:5173'])
 DATABASE_URL:str='postgresql+asyncpg://gotham:gotham@localhost:5432/gotham'
 NEO4J_URI:str='bolt://localhost:7687'; NEO4J_USERNAME:str='neo4j'; NEO4J_PASSWORD:str='change-me'
 ACCESS_TOKEN_EXPIRE_MINUTES:int=60; STORAGE_DIR:str='./storage'; MAX_UPLOAD_MB:int=25
 AI_PROVIDER:Literal['openai','gemini','anthropic']='gemini'; AI_MODEL:str='gemini-2.5-flash'; AI_TEMPERATURE:float=.1
 GEMINI_API_KEY:str|None=None; OPENAI_API_KEY:str|None=None; OPENAI_BASE_URL:str|None=None; ANTHROPIC_API_KEY:str|None=None
 model_config=SettingsConfigDict(env_file=Path(__file__).resolve().parent.parent/'.env',extra='ignore',case_sensitive=False)
@lru_cache
def get_settings(): return Settings()
settings=get_settings()
