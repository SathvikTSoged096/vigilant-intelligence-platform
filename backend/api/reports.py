import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from api.auth import current_user
from services.report import ReportService


router = APIRouter(
    prefix="/reports"
)


def sse(event, data):

    return (
        f"event: {event}\n"
        f"data: {json.dumps(data, default=str)}\n\n"
    )


@router.post("/generate")
async def generate(
    payload: dict,
    user=Depends(current_user),
):

    entity_key = str(
        payload.get(
            "entity_key",
            ""
        )
    ).strip()


    if not entity_key:

        async def invalid_stream():

            yield sse(
                "error",
                {
                    "message":
                        "entity_key is required."
                }
            )


        return StreamingResponse(
            invalid_stream(),
            media_type="text/event-stream"
        )


    async def stream():

        try:

            async for event in (
                ReportService
                .stream_target_dossier(
                    entity_key
                )
            ):

                yield sse(
                    event["event"],
                    event["data"]
                )


        except Exception as exc:

            yield sse(
                "error",
                {
                    "message":
                        str(exc)
                }
            )


    return StreamingResponse(

        stream(),

        media_type=
            "text/event-stream",

        headers={

            "Cache-Control":
                "no-cache",

            "X-Accel-Buffering":
                "no",

            "Connection":
                "keep-alive",

        },

    )