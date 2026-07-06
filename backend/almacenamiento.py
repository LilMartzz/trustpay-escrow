import os
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError

# Documentos de identidad (DNI, selfies): NUNCA van a la carpeta pública
# /uploads. Se guardan en S3 (si AWS_S3_BUCKET está configurado) o en un
# directorio local no montado como estático, y solo se sirven a su dueño
# vía GET /perfil/documento/{tipo}.

DIR_PRIVADO = "uploads_privados"

_TIPOS_MIME = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "webm": "video/webm",
    "pdf": "application/pdf",
}

_s3 = None


def _get_s3():
    global _s3
    if not os.getenv("AWS_S3_BUCKET"):
        return None
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION"),
        )
    return _s3


def guardar_documento_privado(contenido: bytes, prefijo: str, ext: str, carpeta: str = "identidad") -> str:
    """Guarda el documento y devuelve una referencia opaca:
    's3:<clave>' o 'local:<nombre>'. En Railway el disco es efímero, así que
    S3 es el destino recomendado; el disco local es el respaldo para dev.
    `carpeta` separa los espacios (identidad, evidencias)."""
    nombre = f"{prefijo}_{uuid.uuid4()}.{ext}"
    s3 = _get_s3()
    if s3 is not None:
        clave = f"{carpeta}/{nombre}"
        try:
            s3.put_object(
                Bucket=os.getenv("AWS_S3_BUCKET"),
                Key=clave,
                Body=contenido,
                ContentType=_TIPOS_MIME.get(ext, "application/octet-stream"),
            )
            return f"s3:{clave}"
        except (BotoCoreError, ClientError):
            pass  # cae al disco local

    os.makedirs(DIR_PRIVADO, exist_ok=True)
    with open(os.path.join(DIR_PRIVADO, nombre), "wb") as f:
        f.write(contenido)
    return f"local:{nombre}"


def leer_documento_privado(referencia: str):
    """Devuelve (bytes, content_type) o None si no existe.
    Acepta referencias 's3:', 'local:' y las '/uploads/...' heredadas de
    verificaciones hechas antes de privatizar el almacenamiento."""
    if not referencia:
        return None

    if referencia.startswith("s3:"):
        s3 = _get_s3()
        if s3 is None:
            return None
        try:
            obj = s3.get_object(Bucket=os.getenv("AWS_S3_BUCKET"), Key=referencia[3:])
            return obj["Body"].read(), obj.get("ContentType") or "image/jpeg"
        except (BotoCoreError, ClientError):
            return None

    if referencia.startswith("local:"):
        ruta = os.path.join(DIR_PRIVADO, os.path.basename(referencia[6:]))
    elif referencia.startswith("/uploads/"):
        ruta = os.path.join("uploads", os.path.basename(referencia))
    else:
        return None

    if not os.path.isfile(ruta):
        return None
    ext = ruta.rsplit(".", 1)[-1].lower()
    with open(ruta, "rb") as f:
        return f.read(), _TIPOS_MIME.get(ext, "application/octet-stream")
