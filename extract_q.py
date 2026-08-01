import json
import re
import random
import sys

def parse_text(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
        
    questions = []
    current_q = []
    current_options = {}
    current_explanation = []
    state = "QUESTION"
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip watermarks and noise
        if "+91" in line or "PARMAR" in line or "For queries" in line or "For calling" in line or "Under Content section" in line or line == "राष्ट्रीयपुरस्कार(National Award)":
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
                save_question(questions, current_q, current_options, current_explanation)
                
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
        save_question(questions, current_q, current_options, current_explanation)

    print(f"[{output_file}] Extracted {len(questions)} questions.")
    
    random.shuffle(questions)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=4, ensure_ascii=False)
        
def save_question(questions, q_lines, options, exp_lines):
    correct = "A"
    exp_text = " ".join(exp_lines).lower()
    
    # Rigorous double check for correct answer
    # Find the option whose text appears earliest in the explanation
    best_match = None
    earliest_index = 999999
    
    for opt, text in options.items():
        parts = text.split("/")
        
        for part in parts:
            part_clean = part.strip().lower()
            if len(part_clean) < 2: continue
            
            # Find index in explanation
            idx = exp_text.find(part_clean)
            if idx != -1 and idx < earliest_index:
                earliest_index = idx
                best_match = opt
                
    if best_match:
        correct = best_match
    else:
        # Fallback to single word match
        for opt, text in options.items():
            parts = text.split("/")
            if len(parts) > 1:
                words = parts[-1].strip().lower().split()
                if len(words) > 0:
                    idx = exp_text.find(words[0])
                    if idx != -1 and idx < earliest_index:
                        earliest_index = idx
                        correct = opt

    q_text = " ".join(q_lines)
    q_text = re.sub(r'^\d+\.\s*', '', q_text)
    
    if options:
        questions.append({
            "question": q_text,
            "options": options,
            "correct": correct,
            "explanation": "\n".join(exp_lines)
        })

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_q.py <input.txt> <output.json>")
    else:
        parse_text(sys.argv[1], sys.argv[2])
