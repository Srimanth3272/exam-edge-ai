import os
import glob
import fitz
import json
import extract_q

def process_pdfs():
    pdf_files = glob.glob("*.pdf")
    print(f"Found {len(pdf_files)} PDF files.")
    
    mock_count = 1
    generated_mocks = []
    
    for pdf in pdf_files:
        print(f"Processing {pdf}...")
        txt_file = f"temp_{mock_count}.txt"
        json_file = f"mock_{mock_count}.json"
        
        try:
            # 1. Extract Text
            doc = fitz.open(pdf)
            text = ""
            for page in doc:
                text += page.get_text()
            
            with open(txt_file, "w", encoding="utf-8") as f:
                f.write(text)
                
            # 2. Extract Questions
            extract_q.parse_text(txt_file, json_file)
            
            # 3. Limit to 60 questions
            if os.path.exists(json_file):
                with open(json_file, "r", encoding="utf-8") as f:
                    questions = json.load(f)
                
                selected_q = questions[:60]
                print(f"Extracted {len(selected_q)} questions from {pdf}")
                
                with open(json_file, "w", encoding="utf-8") as f:
                    json.dump(selected_q, f, indent=4, ensure_ascii=False)
                
                generated_mocks.append(f"mock_{mock_count}")
                mock_count += 1
                
            # Clean up temp text file
            if os.path.exists(txt_file):
                os.remove(txt_file)
                
        except Exception as e:
            print(f"Error processing {pdf}: {e}")
            
    print(f"Successfully generated {len(generated_mocks)} mock tests.")
    print("Generated Mocks:", generated_mocks)

if __name__ == "__main__":
    process_pdfs()
