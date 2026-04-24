from backend.entur.api import query_entur

QUERY = """
query FlexibleFare($from: String!, $to: String!) {
  trip(
    from: { place: $from }
    to: { place: $to }
    modes: { include: rail }
    numTripPatterns: 3
  ) {
    tripPatterns {
      legs {
        distance
        line {
          authority {
            name
          }
        }
        fares {
          type
          isFlexible
          amount
          currency
        }
      }
    }
  }
}
"""

def fetch_oslo_bergen_flexible():
    response = query_entur(
        QUERY,
        {
            "from": "NSR:StopPlace:582",
            "to": "NSR:StopPlace:595"
        }
    )

    # 🔒 Håndter GraphQL-feil eksplisitt
    if "errors" in response:
        return {
            "status": "entur_error",
            "errors": response["errors"]
        }

    if "data" not in response or response["data"]["trip"] is None:
        return {
            "status": "no_data",
            "message": "Ingen reiseforslag fra Entur"
        }

    out = []

    for pattern in response["data"]["trip"]["tripPatterns"]:
        for leg in pattern["legs"]:
            for fare in leg.get("fares", []):
                if fare.get("isFlexible") and fare.get("currency") == "NOK":
                    out.append({
                        "carrier": leg["line"]["authority"]["name"],
                        "distance_km": round(leg["distance"] / 1000),
                        "amount_nok": fare["amount"],
                        "fare_type": fare["type"]
                    })

    return {
        "status": "ok",
        "results": out
    }
