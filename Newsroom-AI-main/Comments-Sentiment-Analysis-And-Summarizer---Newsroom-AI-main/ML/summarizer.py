import os
from google import genai

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def summarize_comments(comments_list):
    if not comments_list:
        return {
            "short": "No comments available.",
            "medium": "No comments available.",
            "long": "No comments available."
        }

    combined_text = "\n".join(comments_list)

    prompt = f"""
You are an AI media analyst.

Analyze the public opinion from the comments below.

Return your response STRICTLY in this format:

SHORT:
<2-3 sentence summary>

MEDIUM:
<5-8 sentence structured summary>

LONG:
<detailed professional analysis with themes and sentiment breakdown>

Comments:
{combined_text}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        text = response.text

        # Basic parsing
        short = ""
        medium = ""
        long = ""

        if "SHORT:" in text and "MEDIUM:" in text and "LONG:" in text:
            short = text.split("SHORT:")[1].split("MEDIUM:")[0].strip()
            medium = text.split("MEDIUM:")[1].split("LONG:")[0].strip()
            long = text.split("LONG:")[1].strip()
        else:
            # fallback if formatting slightly off
            short = text[:300]
            medium = text[:800]
            long = text

        return {
            "short": short,
            "medium": medium,
            "long": long
        }

    except Exception as e:
        print("Gemini summarization failed:", e)
        return {
            "short": "Summary generation failed.",
            "medium": "Summary generation failed.",
            "long": "Summary generation failed."
        }