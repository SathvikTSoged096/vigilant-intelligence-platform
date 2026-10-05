from pydantic import BaseModel
class DocumentOut(BaseModel): id:int; filename:str; object_name:str; content_type:str; size_bytes:int; status:str; error_message:str|None=None
class UploadResponse(BaseModel): document:DocumentOut
