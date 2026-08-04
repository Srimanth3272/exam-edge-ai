import json
import os

os.chdir(r"c:\Users\akant\OneDrive\Desktop\ai asistant for aspirants")

with open("mock_topics.txt", "w", encoding="utf-8") as out:
    for i in range(1, 12):
        try:
            with open(f"mock_{i}.json", encoding="utf-8") as f:
                data = json.load(f)
                question = data[0]["question"][:150].replace('\n', ' ')
                out.write(f"Mock {i}: {question}\n")
        except Exception as e:
            out.write(f"Mock {i}: Error {e}\n")
