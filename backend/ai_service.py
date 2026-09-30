import os
import json
import base64
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def analyze_civic_image(base64_image_data: str, mime_type: str, selected_category: str) -> dict:
    """
    Analyzes civic issue image using Gemini Vision API if GEMINI_API_KEY is configured.
    Otherwise falls back to a realistic DEMO MODE response based on category heuristics or simulation.
    """
    api_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY

    if not api_key:
        return _demo_mode_analysis(selected_category)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        # Remove header if present (e.g. data:image/jpeg;base64,...)
        if "," in base64_image_data:
            base64_image_data = base64_image_data.split(",", 1)[1]

        image_bytes = base64.b64decode(base64_image_data)

        prompt = f"""
You are an expert AI civic infrastructure inspector for 'Civic Pulse'.
Analyze this image of a civic/urban issue reported by a citizen.
The citizen selected the category: "{selected_category}".

Examine what is visible in the image and return a STRICT JSON object with these exact keys:
1. "detected_issue": A concise name of the civic issue identified in the photo (e.g., "Potholes / Road Damage", "Garbage Overflow", "Broken Streetlights", "Water Leakage", "Sewage Problems", "Fallen Trees", "Flooded Roads", "Public Toilet Issues", etc.).
2. "category_match": boolean (true if the detected issue logically matches or is relevant to the citizen's selected category "{selected_category}", false otherwise).
3. "confidence": integer percentage between 50 and 99.
4. "explanation": A 1-2 sentence factual explanation of what is visible in the image supporting your analysis.
5. "is_demo": false

Return ONLY valid JSON.
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type or "image/jpeg",
                ),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        result_text = response.text.strip()
        parsed = json.loads(result_text)
        parsed["is_demo"] = False
        return parsed

    except Exception as e:
        print(f"Gemini API call failed or error encountered: {e}. Falling back to Demo Mode.")
        demo = _demo_mode_analysis(selected_category)
        demo["note"] = f"Fallback active ({str(e)[:60]}...)"
        return demo


def _demo_mode_analysis(selected_category: str) -> dict:
    """
    Realistic demo mode response generator.
    """
    category_lower = (selected_category or "").lower()

    if "pothole" in category_lower or "road" in category_lower:
        return {
            "detected_issue": "Potholes / Road Damage",
            "category_match": True,
            "confidence": 94,
            "explanation": "The uploaded photo shows asphalt breakdown with clear pothole cavities on the road surface.",
            "is_demo": True
        }
    elif "garbage" in category_lower or "waste" in category_lower:
        return {
            "detected_issue": "Garbage Overflow",
            "category_match": True,
            "confidence": 92,
            "explanation": "Accumulation of uncollected municipal solid waste and overflowing street bins detected.",
            "is_demo": True
        }
    elif "light" in category_lower:
        return {
            "detected_issue": "Broken Streetlights",
            "category_match": True,
            "confidence": 88,
            "explanation": "Damaged streetlight fixture and exposed electrical pole wiring identified.",
            "is_demo": True
        }
    elif "water" in category_lower or "flood" in category_lower or "leak" in category_lower:
        return {
            "detected_issue": "Water Leakage",
            "category_match": True,
            "confidence": 91,
            "explanation": "Visible pooling and pressurized municipal pipeline rupture identified along the curb.",
            "is_demo": True
        }
    elif "tree" in category_lower:
        return {
            "detected_issue": "Fallen Trees",
            "category_match": True,
            "confidence": 96,
            "explanation": "Large fallen tree limb blocking pedestrian pathway and obstructing road traffic.",
            "is_demo": True
        }
    elif "sewage" in category_lower or "drain" in category_lower:
        return {
            "detected_issue": "Sewage Problems",
            "category_match": True,
            "confidence": 90,
            "explanation": "Overflowing manhole and clogged drain with wastewater stagnation visible.",
            "is_demo": True
        }
    else:
        return {
            "detected_issue": selected_category or "Civic Issue",
            "category_match": True,
            "confidence": 89,
            "explanation": f"Visual features confirm civic disturbance matching {selected_category or 'reported problem'}.",
            "is_demo": True
        }
