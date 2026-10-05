from fastapi import APIRouter,Depends,UploadFile,File,BackgroundTasks,HTTPException
from fastapi.responses import FileResponse
from api.auth import current_user
from database.postgres import get_db
from services.document import DocumentService
from utils.files import get_upload_path
router=APIRouter(prefix='/documents')
@router.get('/list')
async def listing(u=Depends(current_user),db=Depends(get_db)): return await DocumentService.list(db,u.id)
@router.post('/upload')
async def upload(bg:BackgroundTasks,file:UploadFile=File(...),u=Depends(current_user),db=Depends(get_db)):
 if file.content_type!='application/pdf': raise HTTPException(415,'Only PDF uploads are supported.')
 d=await DocumentService.ingest(db,u.id,file.filename or 'document.pdf',await file.read(),file.content_type); bg.add_task(DocumentService.process,d.id); return {'document':d}
@router.get('/{document_id}/pdf')
async def pdf(document_id:int,u=Depends(current_user),db=Depends(get_db)):
 d=await DocumentService.get(db,document_id); p=get_upload_path(d.object_name) if d else None
 if not d or not p.exists(): raise HTTPException(404,'Document not found.')
 return FileResponse(p,media_type='application/pdf',filename=d.filename)

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    u=Depends(current_user),
    db=Depends(get_db),
):
    try:
        result = await DocumentService.delete(
            db,
            document_id,
            u.id,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {exc}",
        )