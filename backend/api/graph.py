from fastapi import APIRouter, Depends, HTTPException

from api.auth import current_user
from services.graph import GraphService


router = APIRouter(prefix="/graph")


# ============================================================
# GRAPH NODES
# ============================================================

@router.get("/nodes")
async def nodes(
    u=Depends(current_user),
):
    return {
        "nodes": await GraphService.nodes()
    }


# ============================================================
# GRAPH RELATIONSHIPS
# ============================================================

@router.get("/relationships")
async def relationships(
    u=Depends(current_user),
):
    return {
        "relationships": await GraphService.relationships()
    }


# ============================================================
# GLOBAL TIMELINE
# ============================================================

@router.get("/timeline")
async def timeline(
    u=Depends(current_user),
):
    return {
        "events": await GraphService.timeline()
    }


# ============================================================
# ENTITY TIMELINE
# ============================================================

@router.get("/timeline/{entity_key}")
async def entity_timeline(
    entity_key: str,
    u=Depends(current_user),
):

    events = await GraphService.entity_timeline(
        entity_key
    )

    if events is None:

        raise HTTPException(
            status_code=404,
            detail="Target entity not found.",
        )

    return {
        "events": events
    }


# ============================================================
# GEOINT
# ============================================================

@router.get("/geospatial")
async def geospatial(
    u=Depends(current_user),
):
    return {
        "points": await GraphService.geospatial()
    }


# ============================================================
# GEOINT → ASSOCIATED ENTITIES
# ============================================================

@router.get(
    "/geospatial/associated/{entity_id}"
)
async def geospatial_associated(
    entity_id: str,
    u=Depends(current_user),
):

    entities = await GraphService.geospatial_associated(
        entity_id
    )

    if entities is None:

        raise HTTPException(
            status_code=404,
            detail="GEOINT entity not found.",
        )

    return {
        "entities": entities
    }


# ============================================================
# ARBITRARY CYPHER DISABLED
# ============================================================

@router.post("/query")
async def query(
    u=Depends(current_user),
):
    return {
        "error": "Arbitrary Cypher is disabled."
    }