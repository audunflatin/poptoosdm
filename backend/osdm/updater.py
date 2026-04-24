def update_prices(osdm_json: dict, fare_candidates: list):
    prices = {p["id"]: p for p in osdm_json["fareStructure"]["prices"]}

    for fare in fare_candidates:
        price_id = fare["price_id"]
        if price_id not in prices:
            continue

        prices[price_id]["price"][0]["amount"] = fare["amount_eur"]

    return osdm_json
