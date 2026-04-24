import json

def load_osdm(path: str) -> dict:
    with open(path) as f:
        return json.load(f)
