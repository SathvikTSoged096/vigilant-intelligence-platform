from neo4j import AsyncGraphDatabase
from config import settings
class Neo4jClient:
 def __init__(self): self.driver=AsyncGraphDatabase.driver(settings.NEO4J_URI,auth=(settings.NEO4J_USERNAME,settings.NEO4J_PASSWORD))
 async def verify(self): await self.driver.verify_connectivity()
 async def execute(self,q,**p):
  async with self.driver.session() as s:
   r=await s.run(q,**p); return [x async for x in r]
 async def close(self): await self.driver.close()
neo4j_client=Neo4jClient()
