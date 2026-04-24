def validate(osdm_json: dict):
    errors = []

    for price in osdm_json["fareStructure"]["prices"]:
        p = price["price"][0]
        if p["currency"] != "EUR":
            errors.append(f"{price['id']}: wrong currency")
        if p["scale"] != 2:
            errors.append(f"{price['id']}: wrong scale")
        if p["amount"] < 0:
            errors.append(f"{price['id']}: negative amount")

    return errors
