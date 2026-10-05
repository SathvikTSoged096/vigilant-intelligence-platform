from pydantic import BaseModel
class GraphNode(BaseModel): id:str; name:str; type:str; confidence:float|None=None
class GraphRelationship(BaseModel): source:str; target:str; relationship:str; confidence:float|None=None; evidence:str|None=None; document_id:int|None=None
