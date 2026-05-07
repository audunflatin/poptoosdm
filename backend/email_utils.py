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
        subject="Velkommen til PopToOSDM",
        html=f"""
        <p>Du har fått tilgang til <strong>PopToOSDM</strong>.</p>
        <p>
          <strong>E-post:</strong> {to}<br>
          <strong>Midlertidig passord:</strong> <code>{password}</code>
        </p>
        <p>Du vil bli bedt om å velge et nytt passord ved første innlogging.</p>
        <p><a href="{APP_URL}">Logg inn her</a></p>
        """,
    )


def send_reset_email(to: str, password: str) -> None:
    _send(
        to=to,
        subject="Nytt passord – PopToOSDM",
        html=f"""
        <p>Passordet ditt for <strong>PopToOSDM</strong> er blitt tilbakestilt.</p>
        <p>
          <strong>E-post:</strong> {to}<br>
          <strong>Midlertidig passord:</strong> <code>{password}</code>
        </p>
        <p>Du vil bli bedt om å velge et nytt passord ved neste innlogging.</p>
        <p><a href="{APP_URL}">Logg inn her</a></p>
        """,
    )
