import json
import re
import random

def parse_text():
    with open("pdf_text.txt", "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
        
    questions = []
    current_q = []
    current_options = {}
    current_explanation = []
    state = "QUESTION" # QUESTION, OPTIONS, EXPLANATION
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip watermarks
        if "+91" in line or "PARMAR" in line or "For queries" in line or "For calling" in line:
            i += 1
            continue
            
        if state == "QUESTION":
            if line.startswith("A)"):
                state = "OPTIONS"
                current_options["A"] = line[2:].strip()
            elif re.match(r'^\d+\.$', line):
                pass
            else:
                if not line.startswith("•"):
                    current_q.append(line)
            i += 1
            
        elif state == "OPTIONS":
            if line.startswith("B)"):
                current_options["B"] = line[2:].strip()
            elif line.startswith("C)"):
                current_options["C"] = line[2:].strip()
            elif line.startswith("D)"):
                current_options["D"] = line[2:].strip()
            elif line.startswith("•"):
                state = "EXPLANATION"
                current_explanation.append(line)
            i += 1
            
        elif state == "EXPLANATION":
            if not line.startswith("•") and not line.startswith("A)") and len(line) > 10 and "?" in line and not line.startswith("B)") and not line.startswith("C)"):
                # End of explanation, start of next question
                # Let's save the current question
                
                # Deduce correct answer by checking options in explanation
                correct = "A" # default
                exp_text = " ".join(current_explanation)
                exp_text_lower = exp_text.lower()
                
                for opt, text in current_options.items():
                    # extract the english part (after /)
                    parts = text.split("/")
                    eng_part = parts[-1].strip().lower()
                    if len(eng_part) > 2 and eng_part in exp_text_lower:
                        correct = opt
                        break
                        
                q_text = " ".join(current_q)
                # Clean up if a number was caught in question
                q_text = re.sub(r'^\d+\.\s*', '', q_text)
                
                if current_options:
                    questions.append({
                        "question": q_text,
                        "options": current_options,
                        "correct": correct,
                        "explanation": "\n".join(current_explanation)
                    })
                
                # Reset
                current_q = [line]
                current_options = {}
                current_explanation = []
                state = "QUESTION"
            else:
                if line.startswith("•") or (len(line) > 10 and not re.match(r'^\d+\.$', line)):
                    current_explanation.append(line)
            i += 1

    # Add the last one
    if current_options:
        correct = "A"
        exp_text = " ".join(current_explanation)
        exp_text_lower = exp_text.lower()
        for opt, text in current_options.items():
            parts = text.split("/")
            eng_part = parts[-1].strip().lower()
            if len(eng_part) > 2 and eng_part in exp_text_lower:
                correct = opt
                break
        q_text = " ".join(current_q)
        q_text = re.sub(r'^\d+\.\s*', '', q_text)
        questions.append({
            "question": q_text,
            "options": current_options,
            "correct": correct,
            "explanation": "\n".join(current_explanation)
        })

    print(f"Extracted {len(questions)} questions.")
    
    # Jumble them
    random.shuffle(questions)
    
    with open("international_affairs.json", "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=4, ensure_ascii=False)
        
    print("Saved to international_affairs.json")

if __name__ == "__main__":
    parse_text()
