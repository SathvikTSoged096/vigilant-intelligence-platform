import json,asyncio
from datetime import UTC,datetime
from services.graph import GraphService
from database.llm_client import llm_client
class ReportService:
 @staticmethod
 async def generate_target_dossier(entity_id):
  c=await GraphService.get_target_context(entity_id)
  if not c: raise ValueError('Target entity not found.')
  n=c['neighbors']; score=GraphService.calculate_threat_score(n,c.get('degree_centrality',0),c.get('betweenness_centrality',0)); ev=[x for x in n if x.get('evidence')]
  prompt=f'''Create an evidence-based dossier for {c.get('target_name')} ({c.get('target_type')}). Score: {score}/100. Connected entities: {json.dumps(n,default=str)} Evidence: {json.dumps(ev,default=str)}. Do not invent facts or infer wrongdoing from association. Distinguish facts, observations and limitations.'''
  s=(await llm_client.generate(prompt)).strip()
  return {'target_id':entity_id,'target_name':c.get('target_name'),'target_type':c.get('target_type'),'threat_score':score,'summary':s,'neighbors':n,'evidence':ev,'network_signals':{'degree_centrality':c.get('degree_centrality',0),'betweenness_centrality':c.get('betweenness_centrality',0)},'generated_at':datetime.now(UTC).isoformat()}
 @staticmethod
 async def stream_target_dossier(entity_id):
  yield {'event':'progress','data':{'percent':10,'phase':'GRAPH CONTEXT'}}; d=await ReportService.generate_target_dossier(entity_id); yield {'event':'progress','data':{'percent':60,'phase':'AI ASSESSMENT'}}
  for i in range(0,len(d['summary']),500): yield {'event':'chunk','data':{'text':d['summary'][i:i+500],'percent':min(95,60+int((i+500)/max(1,len(d['summary']))*35))}}; await asyncio.sleep(0)
  yield {'event':'complete','data':d}
