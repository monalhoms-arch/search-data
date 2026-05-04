# Smart AI Search Engine 🚀

A modern, fast, and intelligent semantic search engine built with **FastAPI**, **React**, and **FAISS**. This project uses vector embeddings to provide highly relevant search results based on meaning rather than just keywords.

## 🌟 Features
- **Semantic Search**: Uses `Sentence-Transformers` to understand the context and meaning of queries.
- **Fast Indexing**: Powered by `FAISS` (Facebook AI Similarity Search) for efficient similarity search in high-dimensional spaces.
- **Modern UI**: Clean and responsive interface built with `React` and `Vite`.
- **API First**: Fully documented REST API with `FastAPI`.

## 🛠️ Technology Stack
- **Backend**: Python, FastAPI, FAISS, Sentence-Transformers (all-MiniLM-L6-v2).
- **Frontend**: React, Vite, CSS3.
- **Database**: Metadata stored in JSON, Vector index stored in FAISS binary format.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.9+
- Node.js & npm

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

---

## 📖 API Usage

### Index a Document
`POST /index`
```json
{
  "title": "Document Title",
  "content": "Full content to be indexed...",
  "url": "https://example.com"
}
```

### Search
`POST /search`
```json
{
  "query": "Your search query",
  "top_k": 5
}
```

---

## 📝 License
MIT License - feel free to use this project for your own needs!

---
*Created with ❤️ by Monal Homs*
