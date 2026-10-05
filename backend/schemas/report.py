from pydantic import BaseModel,Field
class DossierRequest(BaseModel): entity_id:str=Field(min_length=1)
