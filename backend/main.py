import os
import threading
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Optional
from search_engine import SmartSearchEngine
from extractors import extract_text_from_url, extract_text_from_pdf, extract_text_from_docx
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

# Setup Gemini Client if API key is present
client = None
try:
    # pyrefly: ignore [missing-import]
    from google import genai
    if os.getenv("GEMINI_API_KEY"):
        client = genai.Client()
except ImportError:
    pass


app = FastAPI(title="Smart AI Search Engine API")

# Setup CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Search Engine
search_engine = SmartSearchEngine()

def background_indexing_task():
    print("Background indexing started...")
    data_dir = "../data"
    
    if not os.path.exists(data_dir):
        return

    indexed_titles = {doc.get("title", "") for doc in search_engine.metadata if doc is not None}
    
    for filename in os.listdir(data_dir):
        file_path = os.path.join(data_dir, filename)
        if not os.path.isfile(file_path):
            continue
            
        if filename in ["faiss_index.bin", "metadata.json"] or filename in indexed_titles:
            continue
            
        print(f"Auto-indexing new file: {filename}")
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
                
            if content.strip():
                search_engine.index_document(title=filename, content=content, url=filename)
                print(f"Successfully auto-indexed: {filename}")
        except Exception as e:
            print(f"Error auto-indexing {filename}: {e}")

@app.on_event("startup")
def startup_event():
    # Start the indexing process in a background thread so it doesn't block the API
    thread = threading.Thread(target=background_indexing_task, daemon=True)
    thread.start()

class DocumentInput(BaseModel):
    title: str
    content: str
    url: Optional[str] = ""

class SearchQuery(BaseModel):
    query: str
    top_k: int = 10

class UrlInput(BaseModel):
    url: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Smart AI Search Engine API is running"}

@app.post("/index")
def index_document(doc: DocumentInput):
    try:
        doc_id = search_engine.index_document(doc.title, doc.content, doc.url)
        return {"status": "success", "message": "Document indexed", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/index/url")
def index_url(input_data: UrlInput):
    try:
        content = extract_text_from_url(input_data.url)
        # Use the URL as the title if one isn't explicitly provided
        doc_id = search_engine.index_document(input_data.url, content, input_data.url)
        return {"status": "success", "message": "URL indexed", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/index/file")
async def index_file(file: UploadFile = File(...), title: Optional[str] = Form(None)):
    try:
        content = ""
        file_bytes = await file.read()
        
        if file.filename.lower().endswith(".pdf"):
            content = extract_text_from_pdf(file_bytes)
        elif file.filename.lower().endswith(".txt"):
            content = file_bytes.decode("utf-8")
        elif file.filename.lower().endswith(".docx"):
            content = extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF, TXT, or DOCX.")
            
        doc_title = title if title else file.filename
        doc_id = search_engine.index_document(doc_title, content, file.filename)
        return {"status": "success", "message": "File indexed", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
def search(query: SearchQuery):
    try:
        results = search_engine.search(query.query, query.top_k)
        
        ai_summary = None
        if client and results:
            # Combine top 3 results for context to avoid exceeding token limits
            context_texts = [f"Source: {r.get('title')}\nContent: {r.get('content')}" for r in results[:3]]
            context = "\n\n".join(context_texts)
            
            prompt = f"""
Answer the following question using ONLY the provided context. 
If the answer is not contained in the context, clearly state that you don't know based on the documents.
Be concise, accurate, and professional. If the question is in Arabic, respond in Arabic.

Context:
{context}

Question: {query.query}

Answer:"""
            
            try:
                response = client.models.generate_content(
                    model='gemini-2.0-flash',
                    contents=prompt,
                )
                ai_summary = response.text
            except Exception as e:
                print(f"Gemini API Error: {e}")
                ai_summary = "Failed to generate AI summary. Please check your API key."

        return {"status": "success", "results": results, "ai_summary": ai_summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents")
def get_documents():
    try:
        docs = search_engine.get_all_documents()
        return {"status": "success", "documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{doc_id}")
def delete_document(doc_id: int):
    try:
        success = search_engine.delete_document(doc_id)
        if success:
            return {"status": "success", "message": "Document deleted"}
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/clear")
def clear_index():
    try:
        search_engine.clear_index()
        return {"status": "success", "message": "Index cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
