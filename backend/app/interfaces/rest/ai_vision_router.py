"""Router pour la reconnaissance IA et Vision de listes/bordereaux de colis numérisés."""

import base64
import json
import os
import re
from typing import List, Optional
import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status, Body
from pydantic import BaseModel
from backend.app.core.config import settings

router = APIRouter(prefix="/manifests", tags=["AI Vision & OCR"])


class RecognizedParcelItem(BaseModel):
    tracking_number: Optional[str] = None
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    merchandise_amount: int = 0
    delivery_fee: int = 4000
    observation: Optional[str] = None


class AIRecognitionResponse(BaseModel):
    status: str
    engine: str
    model: str
    parcels: List[RecognizedParcelItem]
    count: int
    message: str
    has_api_key: bool


class AIRecognitionRequest(BaseModel):
    image_base64: Optional[str] = None
    custom_api_key: Optional[str] = None
    is_sample: Optional[bool] = False


SAMPLE_PARCELS: List[RecognizedParcelItem] = [
    RecognizedParcelItem(
        tracking_number="BDR-9021",
        recipient_name="Rasoa Ravalomanana",
        recipient_phone="034 12 345 67",
        delivery_address="Analakely près pharmacie",
        merchandise_amount=45000,
        delivery_fee=3000,
        observation="Appeler à l'arrivée",
    ),
    RecognizedParcelItem(
        tracking_number="BDR-9022",
        recipient_name="Rakoto Jean",
        recipient_phone="032 45 678 90",
        delivery_address="Ankorondrano en face Total",
        merchandise_amount=60000,
        delivery_fee=4000,
        observation=None,
    ),
    RecognizedParcelItem(
        tracking_number="BDR-9023",
        recipient_name="Société Alpha",
        recipient_phone="033 78 901 23",
        delivery_address="Tanjombato zone Zital",
        merchandise_amount=120000,
        delivery_fee=5000,
        observation="Livraison bureau",
    ),
    RecognizedParcelItem(
        tracking_number="BDR-9024",
        recipient_name="Andry Randria",
        recipient_phone="034 99 888 77",
        delivery_address="Itaosy Cité",
        merchandise_amount=35000,
        delivery_fee=4000,
        observation=None,
    ),
    RecognizedParcelItem(
        tracking_number="BDR-9025",
        recipient_name="Bao Marie",
        recipient_phone="032 11 222 33",
        delivery_address="Sabotsy Namehana Marché",
        merchandise_amount=50000,
        delivery_fee=4000,
        observation="Matinée souhaitée",
    ),
]


async def get_candidate_models(client: httpx.AsyncClient, active_key: str) -> List[tuple[str, str]]:
    """
    Interroge l'API Google pour obtenir la liste exacte des modèles disponibles,
    et complète avec une liste de secours ordonnée par performance.
    Retourne une liste de tuples (api_version, model_name).
    """
    discovered: List[tuple[str, str]] = []

    # 1. Tenter d'interroger ListModels rapidement (timeout 3.5s)
    try:
        list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={active_key}"
        list_resp = await client.get(list_url, timeout=3.5)
        if list_resp.status_code == 200:
            data = list_resp.json()
            for m in data.get("models", []):
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" in methods:
                    m_name = m.get("name", "").replace("models/", "")
                    discovered.append(("v1beta", m_name))
        elif list_resp.status_code == 400:
            # Clé rejetée immédiatement
            err_text = list_resp.text
            if any(k in err_text for k in ["API key not valid", "API_KEY_INVALID", "key not valid"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Clé API Gemini non valide (Erreur Google 400). "
                        "Vérifiez que votre clé commence par 'AIzaSy' et a été générée gratuitement sur Google AI Studio "
                        "(https://aistudio.google.com/app/apikey)."
                    ),
                )
    except HTTPException:
        raise
    except Exception:
        pass

    # Trier les modèles découverts selon la rapidité / multimodalité
    def sort_key(item: tuple[str, str]):
        name = item[1].lower()
        if "2.5-flash" in name:
            return 1
        if "2.0-flash" in name:
            return 2
        if "1.5-flash-latest" in name:
            return 3
        if "1.5-flash-002" in name:
            return 4
        if "1.5-flash-001" in name:
            return 5
        if "1.5-flash" in name:
            return 6
        if "flash" in name:
            return 7
        if "gemini-2" in name:
            return 8
        if "gemini-1.5" in name:
            return 9
        return 20

    discovered.sort(key=sort_key)

    # 2. Liste de secours (fallback) garantie avec les modèles Google 2025/2026
    fallbacks = [
        ("v1beta", "gemini-2.0-flash"),
        ("v1beta", "gemini-1.5-flash-latest"),
        ("v1", "gemini-1.5-flash"),
        ("v1beta", "gemini-1.5-flash-002"),
        ("v1beta", "gemini-1.5-flash-001"),
        ("v1beta", "gemini-2.5-flash"),
        ("v1beta", "gemini-1.5-pro"),
    ]

    all_candidates: List[tuple[str, str]] = []
    seen = set()
    for item in discovered + fallbacks:
        if item not in seen:
            seen.add(item)
            all_candidates.append(item)

    return all_candidates


async def process_manifest_recognition(
    image_bytes: Optional[bytes],
    mime_type: str,
    custom_api_key: Optional[str],
    is_sample: bool = False,
) -> AIRecognitionResponse:
    if is_sample:
        return AIRecognitionResponse(
            status="SUCCESS",
            engine="SAMPLE_DEMO",
            model="sample-manifest",
            parcels=SAMPLE_PARCELS,
            count=len(SAMPLE_PARCELS),
            message="Données d'exemple chargées avec succès.",
            has_api_key=False,
        )

    raw_key = custom_api_key or os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")
    active_key = (raw_key or "").strip()
    # Nettoyage automatique des guillemets et préfixes fréquents
    if "GEMINI_API_KEY=" in active_key:
        active_key = active_key.split("GEMINI_API_KEY=")[-1].strip()
    active_key = active_key.strip('"\'`')
    if active_key.lower() in ("undefined", "null", "none", "", "test", "fake_key"):
        active_key = ""

    # Détection explicite de clé DeepSeek / OpenAI
    if active_key.startswith("sk-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Clé DeepSeek / OpenAI détectée (commence par 'sk-'). "
                "La reconnaissance photo / scan de bordereaux s'appuie sur Google Gemini Vision. "
                "Veuillez générer une clé gratuite sur Google AI Studio (https://aistudio.google.com/app/apikey) "
                "qui commence par 'AIzaSy'."
            ),
        )

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Veuillez fournir une image ou un scan numérisé.",
        )

    if not active_key:
        return AIRecognitionResponse(
            status="SUCCESS",
            engine="FALLBACK_DEMO",
            model="fallback-offline",
            parcels=SAMPLE_PARCELS,
            count=len(SAMPLE_PARCELS),
            message="Aucune clé Gemini fournie : analyse de démonstration effectuée.",
            has_api_key=False,
        )

    # Préparation de l'image et du prompt d'extraction
    b64_data = base64.b64encode(image_bytes).decode("utf-8")

    system_instruction = (
        "Tu es un assistant expert en logistique et reconnaissance optique pour TMS EXPRESS à Madagascar. "
        "Analyse avec précision l'image fournie représentant une liste de colis, un bordereau d'expédition ou un manifeste. "
        "Extrais l'ensemble des colis détectés sous la forme d'un tableau JSON d'objets. "
        "Chaque objet doit comporter exactement ces clés :\n"
        "- tracking_number: (string ou null, ex: '1001', 'BDR-1002')\n"
        "- recipient_name: (string, nom du destinataire ou de l'entreprise)\n"
        "- recipient_phone: (string, numéro de téléphone malgache au format local ex: '0341234567')\n"
        "- delivery_address: (string, quartier, ville, repère de livraison)\n"
        "- merchandise_amount: (int, montant de la marchandise en Ariary MGA, 0 si port payé)\n"
        "- delivery_fee: (int, frais de livraison, généralement entre 3000 et 10000 Ar)\n"
        "- observation: (string ou null, notes ou créneaux horaires)\n\n"
        "Réponds EXCLUSIVEMENT avec le tableau JSON valide, sans texte d'introduction ni explications."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": system_instruction},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64_data,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            candidates = await get_candidate_models(client, active_key)
            last_error = None
            successful_data = None
            used_model_info = "gemini-2.0-flash"

            for api_version, candidate_model in candidates:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{candidate_model}:generateContent?key={active_key}"
                try:
                    resp = await client.post(url, json=payload)
                except httpx.RequestError as exc:
                    last_error = f"Erreur de connexion au modèle {candidate_model}: {str(exc)}"
                    continue

                if resp.status_code == 200:
                    successful_data = resp.json()
                    used_model_info = f"{candidate_model} ({api_version})"
                    break

                err_text = resp.text

                # Si erreur clé invalide, inutile d'essayer les autres modèles
                if resp.status_code == 400 and any(
                    k in err_text for k in ["API key not valid", "API_KEY_INVALID", "key not valid"]
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "Clé API Gemini non valide (Erreur Google 400). "
                            "Vérifiez que votre clé commence par 'AIzaSy' et a été générée gratuitement sur Google AI Studio "
                            "(https://aistudio.google.com/app/apikey). Si vous avez collé 'GEMINI_API_KEY=', ne conservez que les caractères de la clé."
                        ),
                    )

                if resp.status_code == 403:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            "Accès refusé par Google (Erreur 403). Vérifiez que l'API 'Generative Language API' "
                            "est bien activée sur votre compte Google AI Studio / Google Cloud."
                        ),
                    )

                if resp.status_code == 429:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Quota d'appels Gemini dépassé temporairement (Erreur 429). Veuillez patienter quelques instants.",
                    )

                # Si 404 ou 400 (modèle non trouvé/supporté sur cette version), continuer vers le modèle suivant
                last_error = f"Modèle {candidate_model} ({resp.status_code}): {err_text[:120]}"
                continue

            if not successful_data:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Aucun modèle Gemini disponible n'a pu répondre. {last_error or ''}",
                )

            data = successful_data
            raw_text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "[]")
            )

            # Nettoyer d'éventuels backticks markdown
            cleaned_json = re.sub(r"^```json\s*", "", raw_text.strip())
            cleaned_json = re.sub(r"\s*```$", "", cleaned_json)

            parsed = json.loads(cleaned_json)
            if not isinstance(parsed, list):
                if isinstance(parsed, dict) and "parcels" in parsed:
                    parsed = parsed["parcels"]
                else:
                    parsed = [parsed]

            parcels: List[RecognizedParcelItem] = []
            for item in parsed:
                parcels.append(
                    RecognizedParcelItem(
                        tracking_number=str(item.get("tracking_number") or ""),
                        recipient_name=str(item.get("recipient_name") or "Client"),
                        recipient_phone=str(item.get("recipient_phone") or ""),
                        delivery_address=str(item.get("delivery_address") or "Antananarivo"),
                        merchandise_amount=int(item.get("merchandise_amount") or 0),
                        delivery_fee=int(item.get("delivery_fee") or 4000),
                        observation=item.get("observation"),
                    )
                )

            return AIRecognitionResponse(
                status="SUCCESS",
                engine="GEMINI_VISION",
                model=used_model_info,
                parcels=parcels,
                count=len(parcels),
                message=f"{len(parcels)} colis extraits avec succès par Gemini Vision ({used_model_info}).",
                has_api_key=True,
            )

    except json.JSONDecodeError as jde:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du décodage du format JSON retourné par l'IA: {str(jde)}",
        )
    except httpx.RequestError as req_err:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Erreur de communication avec le service Gemini: {str(req_err)}",
        )


@router.post("/recognize-ai", response_model=AIRecognitionResponse)
async def recognize_manifest_form(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    custom_api_key: Optional[str] = Form(None),
):
    image_bytes = None
    mime_type = "image/jpeg"

    if file:
        image_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"
    elif image_base64:
        if "," in image_base64:
            header, encoded = image_base64.split(",", 1)
            image_bytes = base64.b64decode(encoded)
            match = re.search(r"data:([^;]+);base64", header)
            if match:
                mime_type = match.group(1)
        else:
            image_bytes = base64.b64decode(image_base64)

    return await process_manifest_recognition(
        image_bytes=image_bytes,
        mime_type=mime_type,
        custom_api_key=custom_api_key,
    )


@router.post("/recognize-ai-json", response_model=AIRecognitionResponse)
async def recognize_manifest_json(
    req: AIRecognitionRequest = Body(...),
):
    image_bytes = None
    mime_type = "image/jpeg"

    if req.image_base64:
        if "," in req.image_base64:
            header, encoded = req.image_base64.split(",", 1)
            image_bytes = base64.b64decode(encoded)
            match = re.search(r"data:([^;]+);base64", header)
            if match:
                mime_type = match.group(1)
        else:
            image_bytes = base64.b64decode(req.image_base64)

    return await process_manifest_recognition(
        image_bytes=image_bytes,
        mime_type=mime_type,
        custom_api_key=req.custom_api_key,
        is_sample=bool(req.is_sample),
    )
