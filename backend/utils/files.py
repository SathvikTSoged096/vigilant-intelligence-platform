from pathlib import Path
from uuid import uuid4
from config import settings
def save_upload(filename,content):
 r=Path(settings.STORAGE_DIR); r.mkdir(parents=True,exist_ok=True); n=f'{uuid4().hex}_{Path(filename).name}'; (r/n).write_bytes(content); return n
def get_upload_path(name):
 r=Path(settings.STORAGE_DIR).resolve(); p=(r/Path(name).name).resolve()
 if r not in p.parents: raise ValueError('Invalid storage object.')
 return p
