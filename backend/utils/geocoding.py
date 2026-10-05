import httpx


async def geocode_location(
    name=None,
    address=None,
    city=None,
    state=None,
    country=None,
    postal_code=None,
):
    """
    Geocode a location using OpenStreetMap Nominatim.

    The most specific information available is included
    in the search query.
    """

    values = [
        address,
        name,
        city,
        state,
        country,
        postal_code,
    ]

    parts = []

    for value in values:
        if value is None:
            continue

        value = str(value).strip()

        if not value:
            continue

        # Prevent duplicate values such as:
        # name = California
        # state = California
        if value not in parts:
            parts.append(value)

    if not parts:
        return None

    query = ", ".join(parts)

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }

    headers = {
        "User-Agent": "Vigilant-Intelligence-Platform/1.0"
    }

    try:

        async with httpx.AsyncClient(
            timeout=15.0,
            headers=headers,
        ) as client:

            response = await client.get(
                url,
                params=params,
            )

            response.raise_for_status()

            results = response.json()

            if not results:
                print(
                    f"GEOCODING: no result for '{query}'"
                )

                return None

            result = results[0]

            latitude = result.get("lat")
            longitude = result.get("lon")

            if latitude is None or longitude is None:
                return None

            print(
                f"GEOCODING SUCCESS: "
                f"'{query}' -> "
                f"{latitude}, {longitude}"
            )

            return {
                "latitude": float(latitude),
                "longitude": float(longitude),
                "display_name": result.get(
                    "display_name"
                ),
                "geocoded_query": query,
            }

    except Exception as exc:

        print(
            f"GEOCODING ERROR: "
            f"'{query}' -> {exc}"
        )

        return None