import os

SESSION_SECRET = os.getenv("SESSION_SECRET", "CHANGE_ME_BEFORE_PROD")
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SENDER_EMAIL   = os.getenv("SENDER_EMAIL", "noreply@livetsmiler.no")
APP_URL        = os.getenv("APP_URL", "https://livetsmiler.no")
