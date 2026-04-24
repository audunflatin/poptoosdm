import sys
import os

# Sørg for at prosjektroten er på Python path
sys.path.insert(0, os.path.dirname(__file__))

# Importer FastAPI-appen (ny, ryddig entry)
from backend.main import app as application
