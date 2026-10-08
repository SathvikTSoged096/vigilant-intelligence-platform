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
    # GEOINT → ASSOCIATED ENTITIES
    # ============================================================

    @staticmethod
    async def geospatial_associated(entity_id):

        records = await neo4j_client.execute(
            """
            MATCH (selected:Entity)
            WHERE elementId(selected) = $entity_id
            RETURN
                elementId(selected) AS entity_id,
                selected.key AS entity_key,
                selected.name AS name,
                selected.type AS type,
                selected.locations_json AS locations_json
            LIMIT 1
            """,
            entity_id=entity_id,
        )

        if not records:
            return None

        selected = dict(records[0])

        # Strongest association: entities explicitly connected to
        # the selected GEOINT node through a RELATED relationship.
        connected_records = await neo4j_client.execute(
            """
            MATCH (selected:Entity)-[r:RELATED]-(entity:Entity)
            WHERE elementId(selected) = $entity_id
            RETURN
                elementId(entity) AS id,
                entity.key AS entity_key,
                entity.name AS name,
                entity.type AS type,
                entity.confidence AS confidence,
                r.type AS relationship,
                r.evidence AS evidence,
                r.document_id AS document_id
            LIMIT 500
            """,
            entity_id=entity_id,
        )

        associated = []

        for record in connected_records:
            entity = dict(record)
            associated.append({
                "id": entity.get("id"),
                "entity_key": entity.get("entity_key"),
                "name": entity.get("name"),
                "type": entity.get("type"),
                "confidence": entity.get("confidence"),
                "relationship": entity.get("relationship"),
                "evidence": entity.get("evidence"),
                "document_id": entity.get("document_id"),
                "association": "GRAPH_RELATIONSHIP",
            })

        if associated:
            associated.sort(
                key=lambda entity: (
                    0 if str(entity.get("type") or "").upper() == "PERSON" else 1,
                    str(entity.get("name") or "").lower(),
                )
            )
            return associated

        # Fallback: compare location metadata. Do not require the
        # candidate entity itself to have locations_json.
        try:
            selected_locations = json.loads(
                selected.get("locations_json") or "[]"
            )
        except (TypeError, json.JSONDecodeError):
            selected_locations = []

        if not isinstance(selected_locations, list):
            selected_locations = []

        def normalize(value):
            if value is None:
                return ""
            return str(value).strip().lower()

        selected_name = normalize(selected.get("name"))
        selected_keys = set()

        if selected_name:
            selected_keys.add(("name", selected_name))

        for location in selected_locations:
            if not isinstance(location, dict):
                continue

            name = normalize(location.get("name"))
            address = normalize(location.get("address"))
            city = normalize(location.get("city"))
            state = normalize(location.get("state"))
            country = normalize(location.get("country"))
            latitude = location.get("latitude")
            longitude = location.get("longitude")

            if name:
                selected_keys.add(("name", name))
            if address:
                selected_keys.add(("address", address))

            try:
                if latitude is not None and longitude is not None:
                    selected_keys.add((
                        "coordinates",
                        round(float(latitude), 6),
                        round(float(longitude), 6),
                    ))
            except (TypeError, ValueError):
                pass

            region = (city, state, country)
            if any(region):
                selected_keys.add(("region", region))

        all_records = await neo4j_client.execute(
            """
            MATCH (n:Entity)
            RETURN
                elementId(n) AS entity_id,
                n.key AS entity_key,
                n.name AS name,
                n.type AS type,
                n.confidence AS confidence,
                n.locations_json AS locations_json
            LIMIT 5000
            """
        )

        for record in all_records:
            entity = dict(record)

            if str(entity.get("entity_id")) == str(entity_id):
                continue

            try:
                locations = json.loads(entity.get("locations_json") or "[]")
            except (TypeError, json.JSONDecodeError):
                locations = []

            if not isinstance(locations, list):
                continue

            matched = False

            for location in locations:
                if not isinstance(location, dict):
                    continue

                name = normalize(location.get("name"))
                address = normalize(location.get("address"))
                city = normalize(location.get("city"))
                state = normalize(location.get("state"))
                country = normalize(location.get("country"))

                if name and ("name", name) in selected_keys:
                    matched = True
                if address and ("address", address) in selected_keys:
                    matched = True

                try:
                    latitude = location.get("latitude")
                    longitude = location.get("longitude")
                    if latitude is not None and longitude is not None:
                        if (
                            "coordinates",
                            round(float(latitude), 6),
                            round(float(longitude), 6),
                        ) in selected_keys:
                            matched = True
                except (TypeError, ValueError):
                    pass

                region = (city, state, country)
                if any(region) and ("region", region) in selected_keys:
                    matched = True

                if matched:
                    break

            if matched:
                associated.append({
                    "id": entity.get("entity_id"),
                    "entity_key": entity.get("entity_key"),
                    "name": entity.get("name"),
                    "type": entity.get("type"),
                    "confidence": entity.get("confidence"),
                    "relationship": None,
                    "evidence": None,
                    "document_id": None,
                    "association": "LOCATION_MATCH",
                })

        unique = {}
        for entity in associated:
            key = str(entity.get("id"))
            if key not in unique:
                unique[key] = entity

        associated = list(unique.values())

        associated.sort(
            key=lambda entity: (
                0 if str(entity.get("type") or "").upper() == "PERSON" else 1,
                str(entity.get("name") or "").lower(),
            )
        )

        return associated

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


        

    # ============================================================
    # TARGET TIMELINE
    # ============================================================

    @staticmethod
    async def entity_timeline(entity_key
    ):

        records = await neo4j_client.execute(
            """
            MATCH (n:Entity)
            WHERE n.key = $entity_key

            RETURN
                n.key AS entity_key,
                n.name AS entity_name,
                n.type AS entity_type,
                n.temporal_json AS temporal_json

            LIMIT 1
            """,
            entity_key=entity_key,
        )

        if not records:
            return None

        data = dict(records[0])

        try:
            temporal = json.loads(
                data.get("temporal_json") or "[]"
            )
        except (
            TypeError,
            json.JSONDecodeError,
        ):
            temporal = []

        if not isinstance(temporal, list):
            temporal = []

        timeline = []

        for event in temporal:

            if not isinstance(event, dict):
                continue

            timeline.append(
                {
                    "entity_key": data.get("entity_key"),
                    "entity_name": data.get("entity_name"),
                    "entity_type": data.get("entity_type"),
                    "timestamp": event.get("value"),
                    "type": event.get("type"),
                }
            )

        timeline.sort(
            key=lambda x: str(
                x.get("timestamp") or ""
            )
        )

        return timeline