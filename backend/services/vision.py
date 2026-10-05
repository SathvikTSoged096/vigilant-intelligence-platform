from pathlib import Path
from pypdf import PdfReader
class VisionService:
 @staticmethod
 async def analyze(path:Path):
  if not path.exists(): return [{'status':'FILE_NOT_FOUND','objects':[],'bounding_boxes':[]}]
  count=sum(len(getattr(p,'images',[])) for p in PdfReader(str(path)).pages)
  return [{'image_index':i,'objects':[],'bounding_boxes':[],'faces':[],'license_plates':[],'status':'IMAGE_DETECTED_ANALYSIS_REQUIRED'} for i in range(count)] or [{'image_index':0,'objects':[],'bounding_boxes':[],'faces':[],'license_plates':[],'status':'NO_EMBEDDED_IMAGES'}]
vision_service=VisionService()
