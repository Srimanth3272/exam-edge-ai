import json
import re
import random
import sys

def parse_text(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        raw_lines = [line.strip() for line in f if line.strip()]
        
    # Clean watermarks
    lines = []
    for line in raw_lines:
        if "+91" in line or "PARMAR" in line or "For queries" in line or "For calling" in line or "Under Content section" in line or "राष्ट्रीयपुरस्कार" in line:
            continue
        lines.append(line)
        
    questions = []
    
    # Split into blocks by "A)"
    blocks = []
    current_block = []
    for line in lines:
        if line.startswith("A)"):
            blocks.append(current_block)
            current_block = [line]
        else:
            current_block.append(line)
    if current_block:
        blocks.append(current_block)
        
    if len(blocks) < 2:
        print(f"[{output_file}] No questions found.")
        return
        
    # Block 0 is the text of Question 1
    q1_text = " ".join(blocks[0])
    q1_text = re.sub(r'^\d+\.\s*', '', q1_text)
    
    for i in range(1, len(blocks)):
        block = blocks[i]
        
        # Parse options
        options = {}
        options["A"] = block[0][2:].strip()
        
        idx = 1
        while idx < len(block):
            if block[idx].startswith("B)"):
                options["B"] = block[idx][2:].strip()
            elif block[idx].startswith("C)"):
                options["C"] = block[idx][2:].strip()
            elif block[idx].startswith("D)"):
                options["D"] = block[idx][2:].strip()
            else:
                if "B" in options and "C" in options and "D" in options:
                    break
            idx += 1
            
        # The rest of this block is Explanation for the CURRENT question, and text for the NEXT question
        rest = block[idx:]
        
        # Skip question number if present
        if len(rest) > 0 and re.match(r'^\d+\.$', rest[0]):
            rest = rest[1:]
            
        # If this is the last block, all of 'rest' is explanation
        if i == len(blocks) - 1:
            exp_lines = rest
            next_q_text = ""
        else:
            # We need to split 'rest' into exp_lines and next_q_text
            # Find the last bullet point
            last_bullet_idx = -1
            for j in range(len(rest)):
                if rest[j].startswith("•"):
                    last_bullet_idx = j
                    
            if last_bullet_idx == -1:
                # No bullet points found? Just assume the last 2 lines are the next question
                split_idx = max(0, len(rest) - 2)
            else:
                # The explanation might wrap after the last bullet.
                # Look for a line that seems like a new question.
                # A new question usually has a '?' or doesn't start with a lowercase letter.
                split_idx = last_bullet_idx + 1
                for j in range(last_bullet_idx + 1, len(rest)):
                    # if the line contains a ?, it's definitely part of the question
                    if "?" in rest[j] or rest[j].endswith(":") or re.search(r'[\u0900-\u097F]', rest[j]):
                        # Wait, hindi chars usually mean new question because the last bullet is English!
                        # The PDF usually has Hindi bullet then English bullet. So the last bullet is English.
                        # If a line has Hindi chars and doesn't start with a bullet, it's the next question!
                        if re.search(r'[\u0900-\u097F]', rest[j]):
                            split_idx = j
                            break
                        if "?" in rest[j]:
                            split_idx = j
                            break
                            
            exp_lines = rest[:split_idx]
            next_q_text = " ".join(rest[split_idx:])
            next_q_text = re.sub(r'^\d+\.\s*', '', next_q_text)
            
        # Save the CURRENT question
        # We need the q_text from the PREVIOUS block's next_q_text
        if i == 1:
            current_q_text = q1_text
        else:
            current_q_text = prev_next_q_text
            
        save_question(questions, current_q_text, options, exp_lines)
        
        prev_next_q_text = next_q_text

    print(f"[{output_file}] Extracted {len(questions)} questions.")
    
    random.shuffle(questions)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=4, ensure_ascii=False)
        
def save_question(questions, q_text, options, exp_lines):
    correct = "A"
    exp_text = " ".join(exp_lines).lower()
    
    best_match = None
    earliest_index = 999999
    
    for opt, text in options.items():
        parts = text.split("/")
        for part in parts:
            part_clean = part.strip().lower()
            if len(part_clean) < 2: continue
            
            idx = exp_text.find(part_clean)
            if idx != -1 and idx < earliest_index:
                earliest_index = idx
                best_match = opt
                
    if best_match:
        correct = best_match
    else:
        for opt, text in options.items():
            parts = text.split("/")
            if len(parts) > 1:
                words = parts[-1].strip().lower().split()
                if len(words) > 0:
                    idx = exp_text.find(words[0])
                    if idx != -1 and idx < earliest_index:
                        earliest_index = idx
                        correct = opt

    if options and q_text.strip():
        questions.append({
            "question": q_text.strip(),
            "options": options,
            "correct": correct,
            "explanation": "\n".join(exp_lines)
        })

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_q.py <input.txt> <output.json>")
    else:
        parse_text(sys.argv[1], sys.argv[2])
