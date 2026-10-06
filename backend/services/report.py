import asyncio
import json

from datetime import UTC, datetime

from services.graph import GraphService
from database.llm_client import llm_client


class ReportService:

    # ============================================================
    # GENERATE TARGET DOSSIER
    # ============================================================

    @staticmethod
    async def generate_target_dossier(
        entity_key
    ):

        # --------------------------------------------------------
        # Get graph context
        # --------------------------------------------------------

        context = await GraphService.get_target_context(
            entity_key
        )

        if not context:

            raise ValueError(
                "Target entity not found."
            )

        target_name = context.get(
            "target_name",
            "UNKNOWN"
        )

        target_type = str(
            context.get(
                "target_type",
                "UNKNOWN"
            )
        ).upper()

        target_confidence = context.get(
            "target_confidence"
        )

        neighbors = context.get(
            "neighbors",
            []
        )

        if not isinstance(
            neighbors,
            list
        ):
            neighbors = []

        # --------------------------------------------------------
        # Target-owned intelligence
        # --------------------------------------------------------

        aliases = context.get(
            "aliases",
            []
        )

        identifiers = context.get(
            "identifiers",
            []
        )

        locations = context.get(
            "locations",
            []
        )

        temporal = context.get(
            "temporal",
            []
        )

        # --------------------------------------------------------
        # Normalize arrays
        # --------------------------------------------------------

        if not isinstance(
            aliases,
            list
        ):
            aliases = []

        if not isinstance(
            identifiers,
            list
        ):
            identifiers = []

        if not isinstance(
            locations,
            list
        ):
            locations = []

        if not isinstance(
            temporal,
            list
        ):
            temporal = []

        # --------------------------------------------------------
        # Categorize connected entities
        # --------------------------------------------------------

        people = []

        organizations = []

        connected_locations = []

        other_entities = []

        for item in neighbors:

            if not isinstance(
                item,
                dict
            ):
                continue

            item_type = str(
                item.get(
                    "type",
                    "OTHER"
                )
            ).upper().strip()

            # Do not include the target itself
            if (
                str(
                    item.get(
                        "entity_key",
                        ""
                    )
                ).lower()
                ==
                str(
                    entity_key
                ).lower()
            ):
                continue

            if item_type == "PERSON":

                people.append(
                    item
                )

            elif item_type in {
                "ORGANIZATION",
                "COMPANY",
                "INSTITUTION",
                "ORG",
            }:

                organizations.append(
                    item
                )

            elif item_type == "LOCATION":

                connected_locations.append(
                    item
                )

            else:

                other_entities.append(
                    item
                )

        # --------------------------------------------------------
        # Evidence
        # --------------------------------------------------------

        evidence = []

        for item in neighbors:

            if not isinstance(
                item,
                dict
            ):
                continue

            evidence_text = item.get(
                "evidence"
            )

            if not evidence_text:
                continue

            evidence.append(
                {
                    "entity": item.get(
                        "name"
                    ),

                    "entity_type": item.get(
                        "type"
                    ),

                    "relationship": item.get(
                        "relationship"
                    ),

                    "evidence": evidence_text,

                    "confidence": item.get(
                        "confidence"
                    ),

                    "document_id": item.get(
                        "document_id"
                    ),
                }
            )

        # --------------------------------------------------------
        # Network metrics
        # --------------------------------------------------------

        degree = float(
            context.get(
                "degree_centrality",
                0
            ) or 0
        )

        betweenness = float(
            context.get(
                "betweenness_centrality",
                0
            ) or 0
        )

        network_score = (
            GraphService.calculate_threat_score(
                neighbors=neighbors,
                degree_centrality=degree,
                betweenness_centrality=betweenness,
            )
        )

        # --------------------------------------------------------
        # Prepare AI context
        # --------------------------------------------------------

        target_profile = {
            "name": target_name,
            "type": target_type,
            "confidence": target_confidence,
            "aliases": aliases,
            "identifiers": identifiers,
            "locations": locations,
            "temporal": temporal,
        }

        network_data = json.dumps(
            neighbors,
            ensure_ascii=False,
            indent=2,
            default=str,
        )

        evidence_data = json.dumps(
            evidence,
            ensure_ascii=False,
            indent=2,
            default=str,
        )

        profile_data = json.dumps(
            target_profile,
            ensure_ascii=False,
            indent=2,
            default=str,
        )

        # --------------------------------------------------------
        # Gemini prompt
        # --------------------------------------------------------

        prompt = f"""
You are the intelligence analysis component of the
Vigilant Intelligence Platform.

Generate an evidence-based dossier for the selected PERSON.

============================================================
TARGET PROFILE
============================================================

{profile_data}


============================================================
NETWORK SIGNALS
============================================================

Degree Centrality:
{degree}

Betweenness Centrality:
{betweenness}

Network Score:
{network_score}/100


IMPORTANT:
The network score is an analytical graph-connectivity
signal only. It is NOT a measure of criminality,
dangerousness, guilt, or wrongdoing.


============================================================
CONNECTED ENTITIES
============================================================

{network_data}


============================================================
SOURCE EVIDENCE
============================================================

{evidence_data}


============================================================
ANALYTICAL RULES
============================================================

1. Use ONLY the supplied information.

2. Do NOT invent facts.

3. Do NOT invent relationships.

4. Do NOT invent locations.

5. Do NOT invent dates.

6. Do NOT invent organizations.

7. Do NOT infer criminality from association.

8. Distinguish clearly between:
   - documented facts
   - graph observations
   - analytical interpretation

9. If information is unavailable, explicitly say:
   "Not available in the current dataset."

10. Do not identify people from images.

11. Do not claim wrongdoing based solely on
    network connectivity.

12. Mention source document IDs when available.

13. Keep the assessment professional and concise.


============================================================
OUTPUT FORMAT
============================================================

EXECUTIVE ASSESSMENT

IDENTITY ASSESSMENT

NETWORK ASSESSMENT

KEY CONNECTIONS

EVIDENCE ASSESSMENT

ANALYTICAL LIMITATIONS
"""

        # --------------------------------------------------------
        # Generate AI assessment
        # --------------------------------------------------------

        summary = (
            await llm_client.generate(
                prompt
            )
        )

        summary = (
            summary or ""
        ).strip()

        # --------------------------------------------------------
        # Final dossier
        # --------------------------------------------------------

        dossier = {

            "target_id": entity_key,

            "target_name": target_name,

            "target_type": target_type,

            "network_score": network_score,

            # Backward compatibility
            "threat_score": network_score,

            "identity": {

                "name": target_name,

                "type": target_type,

                "confidence": target_confidence,

                "aliases": aliases,

            },

            "target_intelligence": {

                "identifiers": identifiers,

                "locations": locations,

                "temporal": temporal,

            },

            "network_signals": {

                "degree_centrality": degree,

                "betweenness_centrality": betweenness,

                "connected_entities": len(
                    neighbors
                ),

            },

            "associations": {

                "people": people,

                "organizations": organizations,

                "locations": connected_locations,

                "identifiers": identifiers,

                "other": other_entities,

            },

            "neighbors": neighbors,

            "evidence": evidence,

            "summary": summary,

            "generated_at": (
                datetime.now(
                    UTC
                ).isoformat()
            ),
        }

        return dossier

    # ============================================================
    # STREAM TARGET DOSSIER
    # ============================================================

    @staticmethod
    async def stream_target_dossier(
        entity_key
    ):

        yield {
            "event": "progress",
            "data": {
                "percent": 10,
                "phase": "GRAPH CONTEXT",
            },
        }

        dossier = (
            await ReportService.generate_target_dossier(
                entity_key
            )
        )

        yield {
            "event": "progress",
            "data": {
                "percent": 60,
                "phase": "AI ASSESSMENT",
            },
        }

        summary = dossier.get(
            "summary",
            ""
        )

        chunk_size = 500

        total_length = max(
            1,
            len(summary)
        )

        for index in range(
            0,
            len(summary),
            chunk_size
        ):

            chunk = summary[
                index:
                index + chunk_size
            ]

            progress = min(
                95,
                60
                +
                int(
                    (
                        (
                            index
                            +
                            len(chunk)
                        )
                        /
                        total_length
                    )
                    * 35
                )
            )

            yield {
                "event": "chunk",

                "data": {
                    "text": chunk,
                    "percent": progress,
                },
            }

            await asyncio.sleep(0)

        yield {
            "event": "complete",
            "data": dossier,
        }