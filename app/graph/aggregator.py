from datetime import datetime, timedelta, timezone
import json
import logging
import re
from typing import Any, Dict

from app.graph.state import ORCAState
from app.graph.trace import TraceCollector
from app.llm.client import call_llm

logger = logging.getLogger(__name__)


def get_ist_now_str() -> str:
    """Returns the current Indian Standard Time (IST, UTC+5:30) formatted for natural speech."""
    ist = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(ist)
    return now.strftime("%I:%M %p, %A, %d %B %Y")


AGGREGATOR_SYSTEM_TEMPLATE = (
    "You are ORCA, an intelligent and caring multilingual AI voice assistant for fishermen and coastal communities. "
    "You communicate warmly, clearly, and naturally like a real human maritime expert, NEVER like a robot.\n\n"
    "CRITICAL HUMAN CONVERSATIONAL RULES:\n"
    "1. Speak naturally like a real person. NEVER output robotic machine labels like 'Verdict: GO', 'నిర్ణయం GO', 'Verdict: NO_GO', 'నిర్ణయం: NO_GO', or 'కీలక పరిస్థితి'.\n"
    "2. If the conditions are safe (GO), say warmly and directly that it is safe to go out (e.g. in Telugu: 'అవును, ఇప్పుడు మీరు సముద్రంలోకి వెళ్లవచ్చు. వాతావరణం మరియు అలలు చాలా అనుకూలంగా ఉన్నాయి.', in English: 'Yes, it is completely safe to head out to sea right now. Conditions are calm.').\n"
    "3. If conditions require caution (CAUTION), advise them with care to take precautions (e.g. in Telugu: 'సముద్ర పరిస్థితులు కాస్త అస్థిరంగా ఉన్నాయి, జాగ్రత్త వహించండి.').\n"
    "4. If conditions are unsafe (NO_GO), advise them firmly and caring not to go to sea (e.g. in Telugu: 'ఇప్పుడు సముద్రంలోకి వెళ్లవద్దు, ఇది సురక్షితం కాదు. అలలు మరియు గాలులు ఎక్కువగా ఉన్నాయి.', in English: 'Do not go out to sea right now, conditions are dangerous.').\n"
    "5. Write the entire answer natively and completely in {language} (use the native script of {language}: e.g., Devanagari for hi, Bengali script for bn, Telugu for te, Tamil for ta). "
    "For hi/bn/mr use the native word for verdict (Hindi: निर्णय, Bengali: রায়); never transliterate the English word. "
    "NEVER reply in English unless {language} is en.\n"
    "6. Strictly DO NOT use phrasing like 'First option', 'Second option', 'Option 1', 'Alternatively', or bullet points. Give a single, warm, direct answer.\n"
    "7. Do NOT use asterisks (*), hashtags (#), bullet points (-), bold formatting, or emojis. Plain natural text only.\n"
    "8. Keep responses concise and spoken-friendly — 1 to 2 natural sentences.\n\n"
    "DOMAIN AND SAFETY RULES:\n"
    "Directly answer the user's specific query using ONLY the JSON data provided. "
    "A deterministic rule engine has already computed a safety verdict. "
    "If the query is purely informational (e.g. weather, wave height, port distances, PFZ) and no safety verdict applies, directly and helpfully answer the user's question with the relevant data. "
    "You are forbidden from upgrading or downgrading the verdict. If the verdict is UNKNOWN say data is "
    "insufficient and point to official IMD/INCOIS advisories. "
    "Geofence results are absolute: only name a restricted zone when restricted.inside is true; when user=null, never imply presence in or near any zone. "
    "When eez.inside=false AND the user position is known, state the position is outside Indian waters. When the user position is UNKNOWN (user=null), you MUST say the location is unknown/needed — NEVER claim the vessel is outside Indian waters, near a boundary, or inside any zone. Never soften a NO-GO. "
    "When pfz zones exist, state the nearest zone's distance and bearing. Never invent coordinates. "
    "When route data is present, present each route with distance, mean wave height, and the departure window. "
    "Routes are ADVISORY comparisons, not safety verdicts; the GO/CAUTION/NO_GO verdict (if any) comes only from the safety rule engine. "
    "If route.origin/destination failed to resolve, say the route could not be computed and ask for clearer locations. "
    "Numbers, distances, and zone names stay as-is."
)

GENERAL_QA_SYSTEM_TEMPLATE = (
    "You are ORCA, a friendly, intelligent multilingual AI voice assistant. "
    "You communicate warmly, conversationally, and naturally like a real human friend, NEVER like a robot.\n\n"
    "LIVE REAL-TIME CLOCK: {current_time} (Indian Standard Time, IST).\n\n"
    "CRITICAL HUMAN CONVERSATIONAL RULES:\n"
    "1. Speak naturally like a real human. NEVER use robotic prefixes, labels, bullet points, asterisks, or emojis. Plain text only.\n"
    "2. Write the ENTIRE response in {language} using its native script (Telugu=తెలుగు, Hindi=हिंदी, Tamil=தமிழ், Bengali=বাংলা). NEVER reply in English unless {language} is en.\n"
    "3. Be warm, direct, and conversational — answer in 1 to 2 short, spoken sentences.\n"
    "4. If asked what time or date it is, state the current time naturally (e.g. in Telugu: 'ప్రస్తుతం సమయం రాత్రి 11 గంటల 30 నిమిషాలు.').\n"
    "5. If asked distances (e.g. Kakinada to Bhimavaram), answer naturally (e.g. 'కాకినాడ నుండి భీమవరం రోడ్డు మార్గంలో సుమారు 108 కిలోమీటర్లు, కారులో దాదాపు రెండున్నర గంటల సమయం పడుతుంది.').\n"
    "6. Strictly DO NOT say 'First option', 'Second option', 'Option 1', or 'Alternatively'. Just give the natural direct answer."
)


def sanitize_voice_friendly_text(text: str) -> str:
    """
    Cleans response text to strictly guarantee no markdown, bullets, or emojis:
    - Strips markdown headers (#), bold/italics (*), backticks (`), tildes (~).
    - Removes bullet markers ('- ', '* ', '• ').
    - Strips emojis and pictographs so speech engines do not stutter.
    """
    if not text:
        return ""
    cleaned = text
    # Strip markdown headers (# Header)
    cleaned = re.sub(r"^#{1,6}\s*", "", cleaned, flags=re.MULTILINE)
    # Strip asterisks
    cleaned = cleaned.replace("*", "")
    # Strip backticks
    cleaned = cleaned.replace("`", "")
    # Strip bullet markers at start of lines
    cleaned = re.sub(r"^\s*[-•]\s+", "", cleaned, flags=re.MULTILINE)
    # Strip emojis (SMP Unicode emoji planes and symbol blocks)
    cleaned = re.sub(r"[\U00010000-\U0010FFFF\u2600-\u26FF\u2700-\u27BF\uFE00-\uFE0F]", "", cleaned)
    return cleaned.strip()


async def aggregator_node(state: ORCAState, collector: TraceCollector) -> Dict[str, Any]:
    """
    Aggregator LangGraph node.
    Synthesizes a factual, concise natural-language response based on agent outputs and verdict.
    Emits the 'final_answer' event live via TraceCollector and stores the result in final_answer.
    """
    query = state.get("query", "")
    language = state.get("language", "en")
    agent_outputs = state.get("agent_outputs", {})
    verdict = state.get("verdict")
    needed_agents = state.get("needed_agents", [])

    # Fast path: instant response for greetings or casual conversation
    clean_q = query.strip().lower()
    if not needed_agents and not state.get("safety_relevant", True):
        if re.search(r"^(thanks|thank you|ధన్యవాదాలు|धन्यवाद|நன்றி|ধন্যবাদ)\b", clean_q):
            thanks_map = {
                "te": "ధన్యవాదాలు! మీ ప్రయాణం సురక్షితంగా సాగాలి.",
                "hi": "आपका स्वागत है! आपकी समुद्री यात्रा सुरक्षित रहे।",
                "ta": "வரவேற்கிறோம்! உங்கள் பயணம் பாதுகாப்பாக அமையட்டும்.",
                "bn": "স্বাগতম! আপনার যাত্রা নিরাপদ হোক।",
                "en": "You are welcome! Safe sailing.",
            }
            ans = thanks_map.get(language, thanks_map["en"])
            await collector.emit("final_answer", None, {"text": ans})
            return {"final_answer": ans}

        if re.search(r"^(who are you|what are you|what can you do|నువ్వు ఎవరు|तुम कौन हो)\b", clean_q):
            who_map = {
                "te": "నేను ఓర్కా, మీ AI సహాయకుడిని. సముద్ర వాతావరణం, చేపల వేట జోన్లు, దూరాలు, మరియు ఏ ప్రశ్నైనా అడగండి.",
                "hi": "मैं ऑर्का हूँ, आपकी AI सहायक। मौसम, मछली पकड़ने के क्षेत्र, दूरी, या कोई भी सवाल पूछें।",
                "ta": "நான் ஆர்கா, உங்கள் AI உதவியாளர். வானிலை, மீன்பிடி பகுதிகள், தூரங்கள் அல்லது எந்த கேள்வியும் கேளுங்கள்.",
                "bn": "আমি ওর্কা, আপনার AI সহায়ক। আবহাওয়া, মৎস্যজীবী অঞ্চল, দূরত্ব বা যেকোনো প্রশ্ন জিজ্ঞাসা করুন।",
                "en": "I am ORCA, your AI assistant. Ask me about weather, fishing zones, distances, or anything else.",
            }
            ans = who_map.get(language, who_map["en"])
            await collector.emit("final_answer", None, {"text": ans})
            return {"final_answer": ans}

        # Check if it was a pure greeting (planner flagged it as non-safety with no agents)
        is_greeting = re.search(
            r"^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening)|howdy|నమస్కారం|నమస్తే|హలో|హాయ్|నమస్తే|नमस्ते|नमस्कार|हेलो|हाय|வணக்கம்|ஹலோ|নমস্কার|হ্যালো)\b",
            query.strip(),
            re.IGNORECASE,
        )
        if is_greeting and len(query.strip().split()) <= 5:
            greeting_map = {
                "te": "నమస్కారం! నేను ఓర్కా. మీకు ఎలా సహాయపడగలను?",
                "hi": "नमस्ते! मैं ऑर्का हूँ। मैं आपकी क्या मदद कर सकती हूँ?",
                "ta": "வணக்கம்! நான் ஆர்கா. இன்று உங்களுக்கு எவ்வாறு உதவ முடியும்?",
                "bn": "নমস্কার! আমি ওর্কা। আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
                "en": "Hello! I am ORCA. How can I help you today?",
            }
            ans = greeting_map.get(language, greeting_map["en"])
            await collector.emit("final_answer", None, {"text": ans})
            return {"final_answer": ans}

        # General knowledge query — no marine agents needed, call LLM directly as general assistant
        system_prompt = GENERAL_QA_SYSTEM_TEMPLATE.format(language=language, current_time=get_ist_now_str())
        try:
            final_answer = await call_llm(prompt=query, system=system_prompt)
            final_answer = sanitize_voice_friendly_text(final_answer)
        except Exception as exc:
            logger.error("General QA LLM call failed: %s", exc)
            fallback_map = {
                "te": "క్షమించండి, ఇప్పుడు సమాచారం అందుబాటులో లేదు.",
                "hi": "क्षमा करें, अभी जानकारी उपलब्ध नहीं है।",
                "ta": "மன்னிக்கவும், தகவல் இப்போது கிடைக்கவில்லை.",
                "bn": "দুঃখিত, এই মুহূর্তে তথ্য পাওয়া যাচ্ছে না।",
                "en": "Sorry, I could not fetch that information right now.",
            }
            final_answer = fallback_map.get(language, fallback_map["en"])

        await collector.emit("final_answer", None, {"text": final_answer})
        return {"final_answer": final_answer}

    # Marine data query — use marine domain system prompt with agent outputs
    system_prompt = AGGREGATOR_SYSTEM_TEMPLATE.format(language=language)
    user_message = (
        f"User Query: {query}\n\n"
        f"Deterministic Safety Verdict:\n"
        f"{json.dumps(verdict, indent=2)}\n\n"
        f"Data from Marine & Meteorological Agents:\n"
        f"{json.dumps(agent_outputs, indent=2)}"
    )

    try:
        final_answer = await call_llm(prompt=user_message, system=system_prompt)
        final_answer = sanitize_voice_friendly_text(final_answer)
    except Exception as exc:
        logger.error("Aggregator LLM call failed: %s", exc)
        v_dict = verdict if isinstance(verdict, dict) else {}
        v_label = v_dict.get("verdict")
        w_data = agent_outputs.get("weather", {})
        o_data = agent_outputs.get("ocean", {})

        w_speed = w_data.get("wind_knots")
        o_wave = o_data.get("wave_height_m")

        if language == "te":
            parts = []
            if v_label == "GO":
                parts.append("అవును, ఇప్పుడు మీరు సముద్రంలోకి వెళ్లవచ్చు. వాతావరణం మరియు అలలు చాలా అనుకూలంగా ఉన్నాయి.")
            elif v_label == "CAUTION":
                parts.append("సముద్ర పరిస్థితులు కాస్త అస్థిరంగా ఉన్నాయి, జాగ్రత్త వహించండి.")
            elif v_label == "NO_GO":
                parts.append("ఇప్పుడు సముద్రంలోకి వెళ్లవద్దు, ఇది సురక్షితం కాదు.")
            elif v_label:
                parts.append("సముద్ర పరిస్థితులపై అధికారిక హెచ్చరికలు గమనించండి.")

            if w_speed is not None:
                parts.append(f"గాలి వేగం {w_speed} నాట్లుగా ఉంది.")
            if o_wave is not None:
                parts.append(f"అలల ఎత్తు {o_wave} మీటర్లుగా ఉంది.")
            if not parts:
                parts.append("సముద్ర వాతావరణ వివరాలు అందుబాటులో ఉన్నాయి.")
            final_answer = " ".join(parts)
        elif language == "hi":
            parts = []
            if v_label == "GO":
                parts.append("हाँ, अभी समुद्र में जाना सुरक्षित है। मौसम अनुकूल है।")
            elif v_label == "CAUTION":
                parts.append("समुद्र की स्थिति थोड़ी अशांत है, कृपया सावधानी बरतें।")
            elif v_label == "NO_GO":
                parts.append("अभी समुद्र में न जाएँ, यह सुरक्षित नहीं है।")
            elif v_label:
                parts.append("समुद्र की स्थिति के लिए आधिकारिक सलाह देखें।")

            if w_speed is not None:
                parts.append(f"हवा की गति {w_speed} नॉट्स है।")
            if o_wave is not None:
                parts.append(f"लहरों की ऊंचाई {o_wave} मीटर है।")
            if not parts:
                parts.append("समुद्री मौसम का विवरण उपलब्ध है।")
            final_answer = " ".join(parts)
        elif language == "ta":
            parts = []
            if v_label == "GO":
                parts.append("ஆம், இப்போது கடலுக்குச் செல்வது பாதுகாப்பானது. வானிலை சீராக உள்ளது.")
            elif v_label == "CAUTION":
                parts.append("கடல் சூழல் சற்று கொந்தளிப்பாக உள்ளது, எச்சரிக்கையுடன் இருங்கள்.")
            elif v_label == "NO_GO":
                parts.append("இப்போது கடலுக்குச் செல்ல வேண்டாம், இது பாதுகாப்பானது அல்ல.")
            elif v_label:
                parts.append("கடல் நிலைமை குறித்த அதிகாரப்பூர்வ எச்சரிக்கைகளை கவனியுங்கள்.")

            if w_speed is not None:
                parts.append(f"காற்றின் வேகம் {w_speed} நாட்ஸ்.")
            if o_wave is not None:
                parts.append(f"அலை உயரம் {o_wave} மீட்டர்.")
            if not parts:
                parts.append("கடல் வானிலை தகவல்கள் கிடைக்கின்றன.")
            final_answer = " ".join(parts)
        else:
            parts = []
            if v_label == "GO":
                parts.append("Yes, it is completely safe to head out to sea right now. Conditions are favorable.")
            elif v_label == "CAUTION":
                parts.append("Please exercise caution, sea conditions are moderately rough.")
            elif v_label == "NO_GO":
                parts.append("Do not head out to sea right now, conditions are dangerous.")
            elif v_label:
                parts.append("Please check official maritime advisories for safety updates.")

            if w_speed is not None:
                parts.append(f"Wind speed is {w_speed} knots.")
            if o_wave is not None:
                parts.append(f"Wave height is {o_wave} meters.")
            if not parts:
                parts.append("Marine weather conditions are available.")
            final_answer = " ".join(parts)

    await collector.emit("final_answer", None, {"text": final_answer})

    return {
        "final_answer": final_answer,
    }
