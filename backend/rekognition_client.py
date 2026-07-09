import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError

SIMILARITY_THRESHOLD = 80

_client = None


def _get_client():
    global _client
    if _client is None:
        access_key = os.getenv("AWS_ACCESS_KEY_ID")
        secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        region = os.getenv("AWS_REGION")
        if not (access_key and secret_key and region):
            return None
        _client = boto3.client(
            "rekognition",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )
    return _client


def comparar_rostros(selfie_bytes: bytes, dni_bytes: bytes):
    """Compara el rostro de la selfie contra la foto del DNI.
    Devuelve (coincide, similitud). Si el servicio no está configurado o falla,
    devuelve (False, None) para que el llamador haga fallback a revisión manual."""
    client = _get_client()
    if client is None:
        return False, None

    try:
        # Umbral 0 para que AWS devuelva la similitud real aunque sea baja;
        # con SimilarityThreshold=80 las coincidencias menores llegan vacías
        # y no habría porcentaje que mostrar en la revisión manual.
        resp = client.compare_faces(
            SourceImage={"Bytes": selfie_bytes},
            TargetImage={"Bytes": dni_bytes},
            SimilarityThreshold=0,
        )
    except (BotoCoreError, ClientError) as e:
        print(f"[Rekognition] compare_faces falló: {e}")
        return False, None

    matches = resp.get("FaceMatches", [])
    if not matches:
        # No se detectó rostro comparable en alguna de las imágenes.
        return False, None

    similitud = max(m["Similarity"] for m in matches)
    return similitud >= SIMILARITY_THRESHOLD, similitud
