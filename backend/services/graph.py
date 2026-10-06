import json

from database.neo4j import neo4j_client
from utils.geocoding import geocode_location


class GraphService:

    # ============================================================
    # UPSERT ENTITIES + RELATIONSHIPS
    # ============================================================

    @staticmethod
    async def upsert(document_id, entities, relationships):

        for entity in entities:

            name = str(
                entity.get("name", "")
            ).strip()

            entity_type = str(
                entity.get("type", "OTHER")
            ).upper().strip()

            if not name:
                continue

            aliases = entity.get(
                "aliases",
                []
            )

            identifiers = entity.get(
                "identifiers",
                []
            )

            locations = entity.get(
                "locations",
                []
            )

            temporal = entity.get(
                "temporal",
                []
            )

            # ----------------------------------------------------
            # Normalize arrays
            # ----------------------------------------------------

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

            # ----------------------------------------------------
            # IMPORTANT:
            #
            # Gemini can return:
            #
            # {
            #   "name": "California",
            #   "type": "LOCATION",
            #   "locations": []
            # }
            #
            # Convert that LOCATION entity into an actual
            # location object so it can be geocoded.
            # ----------------------------------------------------

            if (
                entity_type == "LOCATION"
                and not locations
            ):

                locations = [
                    {
                        "name": name,
                        "address": entity.get(
                            "address"
                        ),
                        "city": entity.get(
                            "city"
                        ),
                        "state": entity.get(
                            "state"
                        ),
                        "country": entity.get(
                            "country"
                        ),
                        "postal_code": entity.get(
                            "postal_code"
                        ),
                        "latitude": entity.get(
                            "latitude"
                        ),
                        "longitude": entity.get(
                            "longitude"
                        ),
                    }
                ]

            # ----------------------------------------------------
            # GEOCODING
            # ----------------------------------------------------

            enriched_locations = []

            for location in locations:

                if not isinstance(
                    location,
                    dict
                ):
                    continue

                location = dict(location)

                latitude = location.get(
                    "latitude"
                )

                longitude = location.get(
                    "longitude"
                )

                # ------------------------------------------------
                # Only geocode when coordinates are missing
                # ------------------------------------------------

                if (
                    latitude is None
                    or longitude is None
                ):

                    try:

                        coordinates = await geocode_location(
                            name=location.get(
                                "name"
                            ),
                            address=location.get(
                                "address"
                            ),
                            city=location.get(
                                "city"
                            ),
                            state=location.get(
                                "state"
                            ),
                            country=location.get(
                                "country"
                            ),
                        )

                        if coordinates:

                            location[
                                "latitude"
                            ] = coordinates.get(
                                "latitude"
                            )

                            location[
                                "longitude"
                            ] = coordinates.get(
                                "longitude"
                            )

                            location[
                                "display_name"
                            ] = coordinates.get(
                                "display_name"
                            )

                            location[
                                "geocoded_query"
                            ] = coordinates.get(
                                "geocoded_query"
                            )

                    except Exception as exc:

                        print(
                            "GEOCODING FAILED:",
                            name,
                            exc,
                        )

                enriched_locations.append(
                    location
                )

            locations = enriched_locations

            # ----------------------------------------------------
            # STORE ENTITY IN NEO4J
            # ----------------------------------------------------

            await neo4j_client.execute(
                """
                MERGE (n:Entity {
                    key: toLower($name) + '|' + toUpper($type)
                })

                SET
                    n.name = $name,
                    n.type = toUpper($type),
                    n.confidence = $confidence,

                    n.aliases_json = $aliases_json,
                    n.identifiers_json = $identifiers_json,
                    n.locations_json = $locations_json,
                    n.temporal_json = $temporal_json

                MERGE (d:Document {
                    id: $doc
                })

                MERGE (n)-[:MENTIONED_IN]->(d)
                """,

                name=name,

                type=entity_type,

                confidence=float(
                    entity.get(
                        "confidence",
                        0
                    ) or 0
                ),

                aliases_json=json.dumps(
                    aliases,
                    ensure_ascii=False,
                ),

                identifiers_json=json.dumps(
                    identifiers,
                    ensure_ascii=False,
                ),

                locations_json=json.dumps(
                    locations,
                    ensure_ascii=False,
                ),

                temporal_json=json.dumps(
                    temporal,
                    ensure_ascii=False,
                ),

                doc=document_id,
            )

        # ========================================================
        # RELATIONSHIPS
        # ========================================================

        for relationship in relationships:

            source = str(
                relationship.get(
                    "source",
                    ""
                )
            ).strip()

            target = str(
                relationship.get(
                    "target",
                    ""
                )
            ).strip()

            if not source or not target:
                continue

            relationship_type = str(
                relationship.get(
                    "relationship",
                    "RELATED_TO"
                )
            ).upper().strip()

            await neo4j_client.execute(
                """
                MATCH (a:Entity)
                WHERE toLower(a.name) = toLower($source)

                MATCH (b:Entity)
                WHERE toLower(b.name) = toLower($target)

                MERGE (
                    a
                )-[r:RELATED {
                    type: toUpper($relationship)
                }]->(
                    b
                )

                SET
                    r.confidence = $confidence,
                    r.evidence = $evidence,
                    r.document_id = $doc
                """,

                source=source,

                target=target,

                relationship=relationship_type,

                confidence=float(
                    relationship.get(
                        "confidence",
                        0
                    ) or 0
                ),

                evidence=relationship.get(
                    "evidence",
                    ""
                ),

                doc=document_id,
            )

        return {
            "nodes": len(entities),
            "relationships": len(relationships),
        }

    # ============================================================
    # GRAPH NODES
    # ============================================================

    @staticmethod
    async def nodes():

        records = await neo4j_client.execute(
            """
            MATCH (n:Entity)

            OPTIONAL MATCH
                (n)-[:RELATED]-(m:Entity)

            WITH
                n,
                count(m) AS degree

            RETURN
                elementId(n) AS id,
                n.key AS entity_key,
                n.name AS name,
                n.type AS type,
                n.confidence AS confidence,
                degree

            ORDER BY degree DESC

            LIMIT 5000
            """
        )

        return [
            dict(record)
            for record in records
        ]

    # ============================================================
    # GRAPH RELATIONSHIPS
    # ============================================================

    @staticmethod
    async def relationships():

        records = await neo4j_client.execute(
            """
            MATCH
                (a:Entity)-[r:RELATED]->(b:Entity)

            RETURN
                elementId(a) AS source,
                elementId(b) AS target,
                r.type AS relationship,
                r.confidence AS confidence,
                r.evidence AS evidence,
                r.document_id AS document_id

            LIMIT 10000
            """
        )

        return [
            dict(record)
            for record in records
        ]

    # ============================================================
    # TIMELINE
    # ============================================================

    @staticmethod
    async def timeline():

        records = await neo4j_client.execute(
            """
            MATCH (n:Entity)

            WHERE
                n.temporal_json IS NOT NULL

            RETURN
                elementId(n) AS entity_id,
                n.name AS label,
                n.temporal_json AS temporal_json

            LIMIT 5000
            """
        )

        timeline = []

        for record in records:

            data = dict(record)

            try:

                temporal = json.loads(
                    data.get(
                        "temporal_json"
                    ) or "[]"
                )

            except (
                TypeError,
                json.JSONDecodeError,
            ):

                temporal = []

            if not isinstance(
                temporal,
                list
            ):
                continue

            for event in temporal:

                if not isinstance(
                    event,
                    dict
                ):
                    continue

                timeline.append(
                    {
                        "entity_id": data[
                            "entity_id"
                        ],
                        "label": data[
                            "label"
                        ],
                        "timestamp": event.get(
                            "value"
                        ),
                        "type": event.get(
                            "type"
                        ),
                    }
                )

        timeline.sort(
            key=lambda x: str(
                x.get(
                    "timestamp"
                ) or ""
            )
        )

        return timeline[:5000]

    # ============================================================
    # GEOINT
    # ============================================================

    @staticmethod
    async def geospatial():

        records = await neo4j_client.execute(
            """
            MATCH (n:Entity)

            WHERE
                n.locations_json IS NOT NULL

            RETURN
                elementId(n) AS entity_id,
                n.name AS name,
                n.type AS type,
                n.locations_json AS locations_json

            LIMIT 5000
            """
        )

        locations = []

        for record in records:

            data = dict(record)

            try:

                entity_locations = json.loads(
                    data.get(
                        "locations_json"
                    ) or "[]"
                )

            except (
                TypeError,
                json.JSONDecodeError,
            ):

                entity_locations = []

            if not isinstance(
                entity_locations,
                list
            ):
                continue

            for location in entity_locations:

                if not isinstance(
                    location,
                    dict
                ):
                    continue

                latitude = location.get(
                    "latitude"
                )

                longitude = location.get(
                    "longitude"
                )

                if (
                    latitude is None
                    or longitude is None
                ):
                    continue

                try:

                    latitude = float(
                        latitude
                    )

                    longitude = float(
                        longitude
                    )

                except (
                    TypeError,
                    ValueError,
                ):

                    continue

                # Reject impossible coordinates
                if not (
                    -90 <= latitude <= 90
                    and
                    -180 <= longitude <= 180
                ):
                    continue

                locations.append(
                    {
                        "entity_id": data[
                            "entity_id"
                        ],

                        "name": data[
                            "name"
                        ],

                        "type": data.get(
                            "type"
                        ),

                        "location_name": location.get(
                            "name"
                        ),

                        "address": location.get(
                            "address"
                        ),

                        "city": location.get(
                            "city"
                        ),

                        "state": location.get(
                            "state"
                        ),

                        "country": location.get(
                            "country"
                        ),

                        "postal_code": location.get(
                            "postal_code"
                        ),

                        "display_name": location.get(
                            "display_name"
                        ),

                        "latitude": latitude,

                        "longitude": longitude,
                    }
                )

        return locations[:5000]

    # ============================================================
    # TARGET CONTEXT FOR AI REPORT
    # ============================================================

        # ============================================================
    # TARGET CONTEXT FOR AI REPORT
    # ============================================================

    @staticmethod
    async def get_target_context(
        entity_key
    ):

        records = await neo4j_client.execute(
            """
            MATCH (n:Entity)

            WHERE
                n.key = $entity_key

            OPTIONAL MATCH
                (n)-[r:RELATED]-(m:Entity)

            RETURN
                n.key AS entity_key,
                n.name AS target_name,
                n.type AS target_type,
                n.confidence AS target_confidence,

                n.aliases_json AS aliases_json,
                n.identifiers_json AS identifiers_json,
                n.locations_json AS locations_json,
                n.temporal_json AS temporal_json,

                collect({
                    name: m.name,
                    type: m.type,
                    entity_key: m.key,
                    confidence: m.confidence,
                    relationship: r.type,
                    evidence: r.evidence,
                    document_id: r.document_id
                }) AS neighbors
            """,

            entity_key=entity_key,
        )

        if not records:
            return {}

        context = dict(
            records[0]
        )

        # --------------------------------------------------------
        # Parse JSON properties stored on target
        # --------------------------------------------------------

        def parse_json_array(value):

            if value is None:
                return []

            if isinstance(
                value,
                list
            ):
                return value

            if isinstance(
                value,
                str
            ):
                try:

                    parsed = json.loads(
                        value
                    )

                    if isinstance(
                        parsed,
                        list
                    ):
                        return parsed

                except (
                    TypeError,
                    json.JSONDecodeError,
                ):
                    pass

            return []

        context["aliases"] = parse_json_array(
            context.get(
                "aliases_json"
            )
        )

        context["identifiers"] = parse_json_array(
            context.get(
                "identifiers_json"
            )
        )

        context["locations"] = parse_json_array(
            context.get(
                "locations_json"
            )
        )

        context["temporal"] = parse_json_array(
            context.get(
                "temporal_json"
            )
        )

        # --------------------------------------------------------
        # Clean neighbors
        # --------------------------------------------------------

        cleaned_neighbors = []

        for neighbor in context.get(
            "neighbors",
            []
        ):

            if not isinstance(
                neighbor,
                dict
            ):
                continue

            name = neighbor.get(
                "name"
            )

            if not name:
                continue

            cleaned_neighbors.append(
                {
                    "name": name,

                    "type": str(
                        neighbor.get(
                            "type",
                            "OTHER"
                        )
                    ).upper(),

                    "entity_key": neighbor.get(
                        "entity_key"
                    ),

                    "relationship": neighbor.get(
                        "relationship"
                    ),

                    "confidence": neighbor.get(
                        "confidence"
                    ),

                    "evidence": neighbor.get(
                        "evidence"
                    ),

                    "document_id": neighbor.get(
                        "document_id"
                    ),
                }
            )

        context["neighbors"] = cleaned_neighbors

        # --------------------------------------------------------
        # Network metrics
        # --------------------------------------------------------

        context[
            "degree_centrality"
        ] = min(
            len(
                cleaned_neighbors
            ) / 20,
            1,
        )

        # Placeholder until actual graph-wide
        # betweenness calculation is implemented.
        context[
            "betweenness_centrality"
        ] = 0.0

        return context

    # ============================================================
    # THREAT / RISK SCORE
    # ============================================================

    @staticmethod
    def calculate_threat_score(
        neighbors,
        degree_centrality,
        betweenness_centrality,
    ):

        if neighbors:

            average_confidence = (
                sum(
                    float(
                        neighbor.get(
                            "confidence"
                        ) or 0
                    )
                    for neighbor in neighbors
                )
                /
                len(neighbors)
            )

        else:

            average_confidence = 0.0

        score = (
            degree_centrality * 45
            +
            betweenness_centrality * 25
            +
            min(
                len(neighbors) / 10,
                1
            ) * 20
            +
            average_confidence * 10
        )

        return round(
            min(
                100,
                score
            ),
            2,
        )

    # ============================================================
    # DELETE DOCUMENT FROM NEO4J
    # ============================================================

    @staticmethod
    async def delete_document(
        document_id
    ):

        # --------------------------------------------------------
        # Delete relationships belonging to this document
        # --------------------------------------------------------

        await neo4j_client.execute(
            """
            MATCH ()-[r:RELATED]->()

            WHERE
                r.document_id = $document_id

            DELETE r
            """,

            document_id=document_id,
        )

        # --------------------------------------------------------
        # Delete Document node and all
        # MENTIONED_IN relationships
        # --------------------------------------------------------

        await neo4j_client.execute(
            """
            MATCH (
                d:Document {
                    id: $document_id
                }
            )

            DETACH DELETE d
            """,

            document_id=document_id,
        )

        # --------------------------------------------------------
        # Delete orphan entities
        #
        # An Entity is kept only if it is still mentioned
        # by at least one remaining Document.
        # --------------------------------------------------------

        await neo4j_client.execute(
            """
            MATCH (n:Entity)

            WHERE NOT (
                n
            )-[:MENTIONED_IN]->(:Document)

            DETACH DELETE n
            """
        )