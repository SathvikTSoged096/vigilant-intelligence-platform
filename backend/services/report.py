import asyncio
import json
from datetime import UTC, datetime

from services.graph import GraphService
from database.llm_client import llm_client


class ReportService:

    @staticmethod
    async def generate_target_dossier(entity_key):

        context = await GraphService.get_target_context(
            entity_key
        )

        if not context:
            raise ValueError(
                "Target entity not found."
            )

        neighbors = context.get(
            "neighbors",
            []
        )

        degree = context.get(
            "degree_centrality",
            0
        )

        betweenness = context.get(
            "betweenness_centrality",
            0
        )

        network_score = (
            GraphService.calculate_threat_score(
                neighbors,
                degree,
                betweenness
            )
        )

        evidence = [
            item
            for item in neighbors
            if item.get("evidence")
        ]


        # ---------------------------------------------------------
        # Separate connected entities by type
        # ---------------------------------------------------------

        people = []

        organizations = []

        locations = []

        identifiers = []

        other_entities = []


        for item in neighbors:

            entity_type = str(
                item.get("type", "")
            ).upper()

            if entity_type == "PERSON":

                people.append(item)

            elif entity_type == "ORGANIZATION":

                organizations.append(item)

            elif entity_type == "LOCATION":

                locations.append(item)

            elif entity_type in {
                "IDENTIFIER",
                "ACCOUNT"
            }:

                identifiers.append(item)

            else:

                other_entities.append(item)


        # ---------------------------------------------------------
        # AI PROMPT
        # ---------------------------------------------------------

        target_name = context.get(
            "target_name",
            "Unknown"
        )

        target_type = context.get(
            "target_type",
            "Unknown"
        )


        prompt = f"""
You are an intelligence-analysis assistant for the Vigilant
Intelligence Platform.

Create an evidence-based intelligence assessment for the
following graph entity.

TARGET
Name: {target_name}
Type: {target_type}

NETWORK SIGNALS
Degree centrality: {degree}
Betweenness centrality: {betweenness}
Network score: {network_score}/100

CONNECTED ENTITIES
{json.dumps(neighbors, indent=2, default=str)}

AVAILABLE EVIDENCE
{json.dumps(evidence, indent=2, default=str)}

IMPORTANT ANALYTIC RULES:

1. Do not invent facts.
2. Do not invent relationships.
3. Do not invent locations.
4. Do not invent dates.
5. Do not infer criminal activity from association alone.
6. Do not describe a person as dangerous merely because they have
   many graph connections.
7. Clearly distinguish:
   - VERIFIED FACTS
   - NETWORK OBSERVATIONS
   - AI ASSESSMENT
   - LIMITATIONS
8. Only use information contained in the supplied graph context
   and evidence.
9. If information is unavailable, explicitly state "Not available".
10. The network score is NOT proof of wrongdoing. Describe it only
    as a graph/network signal.

Return the assessment in exactly this structure:

EXECUTIVE ASSESSMENT

IDENTITY ASSESSMENT

NETWORK OBSERVATIONS

KEY ASSOCIATIONS

ANALYTIC ASSESSMENT

LIMITATIONS

SOURCE ASSESSMENT

Keep the assessment concise and professional.
"""


        ai_assessment = (
            await llm_client.generate(
                prompt
            )
        ).strip()


        # ---------------------------------------------------------
        # Return structured dossier
        # ---------------------------------------------------------

        return {

            "target_id":
                entity_key,

            "target_name":
                target_name,

            "target_type":
                target_type,

            "network_score":
                network_score,

            "threat_score":
                network_score,

            "identity": {

                "name":
                    target_name,

                "type":
                    target_type,

                "confidence":
                    context.get(
                        "confidence"
                    ),

            },

            "network_signals": {

                "degree_centrality":
                    degree,

                "betweenness_centrality":
                    betweenness,

                "connected_entities":
                    len(neighbors),

            },

            "associations": {

                "people":
                    people,

                "organizations":
                    organizations,

                "locations":
                    locations,

                "identifiers":
                    identifiers,

                "other":
                    other_entities,

            },

            "neighbors":
                neighbors,

            "evidence":
                evidence,

            "summary":
                ai_assessment,

            "generated_at":
                datetime.now(
                    UTC
                ).isoformat(),

        }


    @staticmethod
    async def stream_target_dossier(
        entity_key
    ):

        # ---------------------------------------------------------
        # GRAPH CONTEXT
        # ---------------------------------------------------------

        yield {
            "event": "progress",
            "data": {
                "percent": 10,
                "phase": "GRAPH CONTEXT"
            }
        }


        dossier = (
            await ReportService
            .generate_target_dossier(
                entity_key
            )
        )


        # ---------------------------------------------------------
        # AI ASSESSMENT
        # ---------------------------------------------------------

        yield {
            "event": "progress",
            "data": {
                "percent": 60,
                "phase": "AI ASSESSMENT"
            }
        }


        summary = dossier.get(
            "summary",
            ""
        )


        # ---------------------------------------------------------
        # Stream AI text
        # ---------------------------------------------------------

        chunk_size = 500


        for i in range(
            0,
            len(summary),
            chunk_size
        ):

            chunk = summary[
                i:i + chunk_size
            ]


            percent = min(
                95,
                60 + int(
                    (
                        (i + chunk_size)
                        /
                        max(
                            1,
                            len(summary)
                        )
                    )
                    * 35
                )
            )


            yield {
                "event": "chunk",
                "data": {
                    "text": chunk,
                    "percent": percent
                }
            }


            await asyncio.sleep(0)


        # ---------------------------------------------------------
        # COMPLETE
        # ---------------------------------------------------------

        yield {
            "event": "complete",
            "data": dossier
        }