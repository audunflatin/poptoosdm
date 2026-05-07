import logging
import requests
from backend.core.settings import RESEND_API_KEY, SENDER_EMAIL, APP_URL

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, html: str) -> None:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY er ikke satt – e-post ikke sendt til %s", to)
        return
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html},
        timeout=10,
    )
    resp.raise_for_status()


def send_welcome_email(to: str, password: str) -> None:
    _send(
        to=to,
        subject="Welcome to PopToOSDM",
        html=f"""
        <p>You have been granted access to <strong>PopToOSDM</strong>.</p>
        <p>
          <strong>Email:</strong> {to}<br>
          <strong>Temporary password:</strong> <code>{password}</code>
        </p>
        <p>You will be asked to choose a new password on your first login.</p>
        <p><a href="{APP_URL}">Log in here</a></p>
        """,
    )


def send_reset_email(to: str, password: str) -> None:
    _send(
        to=to,
        subject="New password – PopToOSDM",
        html=f"""
        <p>Your password for <strong>PopToOSDM</strong> has been reset.</p>
        <p>
          <strong>Email:</strong> {to}<br>
          <strong>Temporary password:</strong> <code>{password}</code>
        </p>
        <p>You will be asked to choose a new password on your next login.</p>
        <p><a href="{APP_URL}">Log in here</a></p>
        """,
    )
