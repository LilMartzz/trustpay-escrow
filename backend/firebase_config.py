import json
import os
import firebase_admin
from firebase_admin import credentials

_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
_SERVICE_ACCOUNT_FILE = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")


def init_firebase():
    if firebase_admin._apps:
        return

    if _SERVICE_ACCOUNT_JSON:
        cred = credentials.Certificate(json.loads(_SERVICE_ACCOUNT_JSON))
    elif _SERVICE_ACCOUNT_FILE:
        cred = credentials.Certificate(_SERVICE_ACCOUNT_FILE)
    else:
        raise RuntimeError(
            "Falta configurar Firebase: define FIREBASE_SERVICE_ACCOUNT_FILE "
            "(ruta al JSON de la service account, para desarrollo local) o "
            "FIREBASE_SERVICE_ACCOUNT_JSON (contenido JSON como variable de entorno, para despliegue)."
        )

    firebase_admin.initialize_app(cred)
