import os
from search_engine import SmartSearchEngine
from extractors import extract_text_from_pdf, extract_text_from_docx

def main():
    data_dir = "../data"
    engine = SmartSearchEngine()
    
    # Get already indexed titles
    indexed_titles = {doc.get("title", "") for doc in engine.metadata if doc is not None}
    
    indexed_count = 0

    print("Starting batch indexing for all files...")
    
    for filename in os.listdir(data_dir):
        file_path = os.path.join(data_dir, filename)
        if not os.path.isfile(file_path):
            continue
            
        # Skip metadata/index files
        if filename in ["faiss_index.bin", "metadata.json"]:
            continue
            
        if filename in indexed_titles:
            print(f"Skipping already indexed file: {filename}")
            continue
            
        print(f"Indexing {filename}...")
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
                
            content = ""
            if filename.lower().endswith(".pdf"):
                content = extract_text_from_pdf(file_bytes)
            elif filename.lower().endswith(".docx"):
                content = extract_text_from_docx(file_bytes)
            elif filename.lower().endswith(".txt"):
                content = file_bytes.decode("utf-8", errors="ignore")
            else:
                print(f"Skipping unsupported file type: {filename}")
                continue
                
            if content.strip():
                engine.index_document(title=filename, content=content, url=filename)
                indexed_count += 1
                print(f"Successfully indexed: {filename}")
            else:
                print(f"No text extracted from: {filename}")
                
        except Exception as e:
            print(f"Error indexing {filename}: {e}")

    print(f"Batch indexing complete. Indexed {indexed_count} new files.")

if __name__ == "__main__":
    main()
