from openai import AsyncOpenAI
from google import genai
from anthropic import AsyncAnthropic
from config import settings
class LLMClient:
 def __init__(self):
  p=settings.AI_PROVIDER; self.provider=p
  if p=='openai': self.client=AsyncOpenAI(api_key=settings.OPENAI_API_KEY,base_url=settings.OPENAI_BASE_URL or None)
  elif p=='gemini': self.client=genai.Client(api_key=settings.GEMINI_API_KEY)
  else: self.client=AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
 async def generate(self,prompt):
  if self.provider=='gemini': return (await self.client.aio.models.generate_content(model=settings.AI_MODEL,contents=prompt,config={'temperature':settings.AI_TEMPERATURE})).text or ''
  if self.provider=='openai': return (await self.client.chat.completions.create(model=settings.AI_MODEL,temperature=settings.AI_TEMPERATURE,messages=[{'role':'user','content':prompt}])).choices[0].message.content or ''
  r=await self.client.messages.create(model=settings.AI_MODEL,max_tokens=4096,temperature=settings.AI_TEMPERATURE,messages=[{'role':'user','content':prompt}]); return ''.join(getattr(x,'text','') for x in r.content)
llm_client=LLMClient()
