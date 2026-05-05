# ---------------------------------------------------------------------
# Bygg-steg
# ---------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /app

# Installer byggeavhengigheter
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Kopier og installer Python-avhengigheter
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------------------------------------------------------------------
# Kjøresteg
# ---------------------------------------------------------------------
FROM python:3.12-slim AS runtime

WORKDIR /app

# Installer kun kjøretidsavhengigheter for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Kopier installerte pakker fra bygg-steget
COPY --from=builder /install /usr/local

# Kopier applikasjonskode
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY data/input/ ./data/input/
COPY schemas/ ./schemas/

# Lag output-mappe
RUN mkdir -p data/output

# Ikke kjør som root
RUN useradd --no-create-home --shell /bin/false appuser
RUN chown -R appuser:appuser /app
USER appuser

# Eksponér port
EXPOSE 8000

# Helsejekk
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Start applikasjonen
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
