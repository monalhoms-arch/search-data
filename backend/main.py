from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from search_engine import SmartSearchEngine
from extractors import extract_text_from_url, extract_text_from_pdf
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

class DocumentInput(BaseModel):
    title: str
    content: str
    url: Optional[str] = ""

class SearchQuery(BaseModel):
    query: str
    top_k: int = 5

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
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF or TXT.")
            
        doc_title = title if title else file.filename
        doc_id = search_engine.index_document(doc_title, content, file.filename)
        return {"status": "success", "message": "File indexed", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
def search(query: SearchQuery):
    try:
        results = search_engine.search(query.query, query.top_k)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/clear")
def clear_index():
    try:
        search_engine.clear_index()
        return {"status": "success", "message": "Index cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
