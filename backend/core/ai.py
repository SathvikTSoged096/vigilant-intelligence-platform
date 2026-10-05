import json
import re

from database.llm_client import llm_client


def clean(s):
    s = re.sub(
        r"^```(?:json)?\s*",
        "",
        s.strip(),
        flags=re.I,
    )

    s = re.sub(
        r"\s*```$",
        "",
        s,
    )

    a = s.find("{")
    b = s.rfind("}")

    return (
        s[a:b + 1]
        if a >= 0 and b >= a
        else s
    )


def _normalise_location(location):
    if not isinstance(location, dict):
        return None

    return {
        "name": location.get("name"),
        "address": location.get("address"),
        "city": location.get("city"),
        "state": location.get("state"),
        "country": location.get("country"),
        "postal_code": location.get("postal_code"),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
    }


def _extract_explicit_address(text):
    """
    Deterministically extract an explicitly written address.

    This is intentionally conservative.
    It does not guess an address.
    """

    patterns = [
        r"Current Address\s*:\s*(.+)",
        r"Current address\s*:\s*(.+)",
        r"Address\s*:\s*(.+)",
        r"current residence\s*:\s*(.+)",
    ]

    for pattern in patterns:
        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        if not match:
            continue

        value = match.group(1).strip()

        # Remove common trailing fields if the PDF puts
        # multiple fields on the same line.
        value = re.split(
            r"\s+(?:Phone|Email|Employee ID|Occupation)\s*:",
            value,
            flags=re.IGNORECASE,
        )[0].strip()

        if value:
            return value

    return None


def _parse_explicit_address(address):
    """
    Parse an address such as:

    215 Maple Street, Denver, Colorado

    into structured fields.

    This does not invent a country if one is not present.
    """

    parts = [
        p.strip()
        for p in address.split(",")
        if p.strip()
    ]

    result = {
        "name": None,
        "address": None,
        "city": None,
        "state": None,
        "country": None,
        "postal_code": None,
        "latitude": None,
        "longitude": None,
    }

    if len(parts) >= 1:
        result["address"] = parts[0]

    if len(parts) >= 2:
        result["city"] = parts[1]
        result["name"] = parts[1]

    if len(parts) >= 3:
        result["state"] = parts[2]

    if len(parts) >= 4:
        result["country"] = parts[3]

    return result


def _add_explicit_location_association(text, entities):
    """
    Make explicit source-grounded addresses reliable.

    Example source:

    Current Address: 215 Maple Street, Denver, Colorado

    The PERSON entity will receive:

    locations: [
        {
            name: Denver,
            address: 215 Maple Street,
            city: Denver,
            state: Colorado
        }
    ]

    A separate LOCATION entity for Denver is also added.
    """

    address = _extract_explicit_address(text)

    if not address:
        return entities

    location = _parse_explicit_address(address)

    # ------------------------------------------------------------
    # Find a PERSON entity.
    # ------------------------------------------------------------

    person = None

    for entity in entities:
        if not isinstance(entity, dict):
            continue

        if str(entity.get("type", "")).upper() == "PERSON":
            person = entity
            break

    if person:
        existing_locations = person.get("locations", [])

        if not isinstance(existing_locations, list):
            existing_locations = []

        # Replace only if there is no explicit location already.
        has_location = any(
            isinstance(item, dict)
            and (
                item.get("address")
                or item.get("city")
                or item.get("state")
            )
            for item in existing_locations
        )

        if not has_location:
            existing_locations.append(location)

        person["locations"] = existing_locations

    # ------------------------------------------------------------
    # Add a LOCATION entity if the city exists.
    # ------------------------------------------------------------

    city = location.get("city")

    if city:
        already_exists = any(
            isinstance(entity, dict)
            and str(entity.get("type", "")).upper() == "LOCATION"
            and str(entity.get("name", "")).strip().lower()
            == city.strip().lower()
            for entity in entities
        )

        if not already_exists:
            entities.append(
                {
                    "name": city,
                    "type": "LOCATION",
                    "confidence": 1.0,
                    "evidence": f"Current Address: {address}",
                    "aliases": [],
                    "identifiers": [],
                    "locations": [location],
                    "temporal": [],
                }
            )

    return entities


async def extract_entities(text):

    prompt = f"""
You are an entity extraction system for an intelligence analysis platform.

Extract ONLY entities explicitly supported by the source.

Return ONLY valid JSON.
Do not return markdown.
Do not return explanations outside the JSON.

ENTITY TYPES:

PERSON
ORGANIZATION
LOCATION
VEHICLE
WEAPON
ACCOUNT
EVENT
IDENTIFIER
ROLE
OTHER

For every entity include:

- name
- type
- confidence
- evidence
- aliases
- identifiers
- locations
- temporal

GENERAL RULES:

1. Never invent facts.
2. Never infer facts that are not explicitly supported.
3. Never invent coordinates.
4. Never invent addresses.
5. Never invent dates.
6. Keep evidence grounded in the source.
7. Confidence represents extraction confidence only.
8. Do not infer guilt, criminality, threat, or wrongdoing.
9. If information is unavailable, use null or [].
10. Preserve names and places from the source.
11. Do not create information that does not appear in the source.

LOCATION RULES:

For every location explicitly mentioned in the source, extract the
most specific geographic information available.

A location object MUST use this structure:

{{
    "name": null,
    "address": null,
    "city": null,
    "state": null,
    "country": null,
    "postal_code": null,
    "latitude": null,
    "longitude": null
}}

If the source says:

"Los Angeles, California, USA"

return:

{{
    "name": "Los Angeles",
    "address": null,
    "city": "Los Angeles",
    "state": "California",
    "country": "USA",
    "postal_code": null,
    "latitude": null,
    "longitude": null
}}

If the source says:

"123 Main Street, Los Angeles, California, USA"

return:

{{
    "name": "Los Angeles",
    "address": "123 Main Street",
    "city": "Los Angeles",
    "state": "California",
    "country": "USA",
    "postal_code": null,
    "latitude": null,
    "longitude": null
}}

Do NOT convert a state into a city.

Do NOT guess a city.

Do NOT guess an address.

Do NOT invent coordinates.

Only provide latitude and longitude when the source explicitly contains
coordinates.

ENTITY LOCATION ASSOCIATION:

If the source explicitly associates a PERSON, ORGANIZATION, VEHICLE,
ACCOUNT, EVENT, or other entity with a location, put that location inside
the entity's "locations" array.

For example:

"Current Address: 215 Maple Street, Denver, Colorado"

means the associated PERSON should contain:

{{
    "name": "Denver",
    "address": "215 Maple Street",
    "city": "Denver",
    "state": "Colorado",
    "country": null,
    "postal_code": null,
    "latitude": null,
    "longitude": null
}}

Also extract Denver as a LOCATION entity.

Do NOT associate a person with a location merely because both are
mentioned in the same document.

TEMPORAL RULES:

Temporal objects must contain:

- type
- value

Only extract dates, times, periods, or temporal expressions explicitly
supported by the source.

ALIASES:

Only include aliases explicitly supported by the source.

IDENTIFIERS:

Only include identifiers explicitly supported by the source.

EVIDENCE:

Evidence must be directly supported by the source.

EXPECTED JSON:

{{
    "entities": [
        {{
            "name": "Daniel Carter",
            "type": "PERSON",
            "confidence": 0.95,
            "evidence": "Current Address: 215 Maple Street, Denver, Colorado",
            "aliases": [],
            "identifiers": [],
            "locations": [
                {{
                    "name": "Denver",
                    "address": "215 Maple Street",
                    "city": "Denver",
                    "state": "Colorado",
                    "country": null,
                    "postal_code": null,
                    "latitude": null,
                    "longitude": null
                }}
            ],
            "temporal": []
        }}
    ]
}}

SOURCE:

{text}
"""

    raw = await llm_client.generate(prompt)

    try:
        data = json.loads(clean(raw))
    except json.JSONDecodeError:
        return []

    entities = data.get("entities", [])

    if not isinstance(entities, list):
        return []

    # ------------------------------------------------------------
    # Deterministic source-grounded address association.
    # ------------------------------------------------------------

    entities = _add_explicit_location_association(
        text,
        entities,
    )

    return entities


async def extract_relationships(text, entities):

    if not entities:
        return []

    entity_names = [
        e.get("name")
        for e in entities
        if isinstance(e, dict) and e.get("name")
    ]

    prompt = f"""
Extract ONLY explicitly supported relationships between entities.

Return ONLY valid JSON.
Do not return markdown.
Do not return explanations.

RULES:

1. Do not invent relationships.
2. Do not infer relationships from proximity.
3. Do not infer relationships merely because entities occur in the same document.
4. The relationship must be supported by the source.
5. Use the exact entity names supplied below where possible.
6. Evidence must be grounded in the source.
7. Confidence represents extraction confidence.
8. Do not infer wrongdoing from association.

KNOWN ENTITIES:

{json.dumps(entity_names, ensure_ascii=False)}

SOURCE:

{text}

EXPECTED JSON:

{{
    "relationships": [
        {{
            "source": "A",
            "target": "B",
            "relationship": "RELATED_TO",
            "confidence": 0.9,
            "evidence": "Source-grounded evidence."
        }}
    ]
}}
"""

    raw = await llm_client.generate(prompt)

    try:
        data = json.loads(clean(raw))
    except json.JSONDecodeError:
        return []

    relationships = data.get(
        "relationships",
        [],
    )

    if not isinstance(relationships, list):
        return []

    return relationships


async def summarize(
    text,
    entities,
    relationships,
):

    prompt = f"""
Write a concise, evidence-based intelligence summary.

Rules:

- Do not invent facts.
- Do not infer wrongdoing from association.
- Do not introduce information not contained in the document.
- Clearly distinguish documented facts from uncertainty.
- Focus on important entities, relationships, locations, and temporal information.
- Keep the summary concise and analytical.

DOCUMENT:

{text}

ENTITIES:

{json.dumps(
    entities,
    ensure_ascii=False,
    indent=2,
)}

RELATIONSHIPS:

{json.dumps(
    relationships,
    ensure_ascii=False,
    indent=2,
)}
"""

    result = await llm_client.generate(prompt)

    return result.strip()