import requests
from backend.config import ENTUR_CLIENT_NAME

ENTUR_URL = "https://api.entur.io/journey-planner/v3/graphql"

def query_entur(query: str, variables: dict):
    response = requests.post(
        ENTUR_URL,
        json={"query": query, "variables": variables},
        headers={
            "Content-Type": "application/json",
            "ET-Client-Name": ENTUR_CLIENT_NAME
        }
    )
    response.raise_for_status()
    return response.json()
