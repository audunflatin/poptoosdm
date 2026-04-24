from fastapi import Request, HTTPException

def require_login(request: Request):
    if "user_email" not in request.session:
        raise HTTPException(status_code=401, detail="Ikke innlogget")
