import json
import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def parse_with_gemini(input_file, output_file):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env file.")
        sys.exit(1)
        
    genai.configure(api_key=api_key)
    
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            raw_text = f.read()
    except Exception as e:
        print(f"Error reading {input_file}: {e}")
        sys.exit(1)
        
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = """
You are an expert educational content parser. I will provide you with raw text extracted from a Mock Test PDF.
Your task is to parse this text and return a perfectly formatted JSON array of questions.

CRITICAL INSTRUCTIONS:
1. EXCLUSIVELY ENGLISH: Translate any Hindi or non-English text to English. The output JSON must be 100% in English.
2. NO COLLISIONS: Each JSON object must represent exactly ONE question. Do not merge or collide 2 or 3 questions into a single object.
3. ACCURACY: Ensure the 'correct' option matches the explanation provided in the text. Ensure the explanation is logically sound and accurate.
4. FORMAT: You MUST return ONLY a raw JSON array. No markdown, no conversational text.

The JSON array must have this structure:
[
  {
    "question": "What is the capital of India?",
    "options": {
      "A": "Mumbai",
      "B": "New Delhi",
      "C": "Kolkata",
      "D": "Chennai"
    },
    "correct": "B",
    "explanation": "New Delhi is the capital of India."
  }
]

Here is the raw text from the mock test:
"""

    print(f"Sending {len(raw_text)} characters to Gemini for parsing...")
    try:
        response = model.generate_content(prompt + raw_text)
        result_text = response.text.strip()
        
        if result_text.startswith('```json'):
            result_text = result_text.replace('```json', '', 1)
        if result_text.startswith('```'):
            result_text = result_text.replace('```', '', 1)
        if result_text.endswith('```'):
            result_text = result_text[:-3]
            
        result_text = result_text.strip()
        
        questions = json.loads(result_text)
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=4, ensure_ascii=False)
            
        print(f"Successfully extracted {len(questions)} questions and saved to {output_file}")
        
    except Exception as e:
        print(f"Error during AI parsing: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_q.py <input.txt> <output.json>")
    else:
        parse_with_gemini(sys.argv[1], sys.argv[2])
