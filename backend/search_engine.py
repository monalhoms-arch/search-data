import os
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

class SmartSearchEngine:
    def __init__(self, model_name="all-MiniLM-L6-v2", data_dir="../data"):
        self.model = SentenceTransformer(model_name)
        self.data_dir = data_dir
        self.index_path = os.path.join(data_dir, "faiss_index.bin")
        self.meta_path = os.path.join(data_dir, "metadata.json")
        
        # Ensure data directory exists
        os.makedirs(self.data_dir, exist_ok=True)
        
        self.dimension = self.model.get_sentence_embedding_dimension()
        self.index = faiss.IndexFlatL2(self.dimension)
        self.metadata = []
        
        self._load_index()

    def _load_index(self):
        """Loads the FAISS index and metadata if they exist."""
        if os.path.exists(self.index_path) and os.path.exists(self.meta_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.meta_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            print(f"Loaded index with {self.index.ntotal} documents.")
        else:
            print("No existing index found. Starting fresh.")

    def _save_index(self):
        """Saves the FAISS index and metadata to disk."""
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)

    def index_document(self, title: str, content: str, url: str = ""):
        """Indexes a document by splitting it into smaller chunks for better search accuracy."""
        # Split content into chunks of roughly 500-1000 characters
        # This improves semantic search for specific parts of large documents
        chunks = self._chunk_text(content)
        
        doc_ids = []
        for i, chunk in enumerate(chunks):
            # Generate embedding for the chunk
            embedding = self.model.encode([chunk]).astype('float32')
            
            # Add to FAISS index
            self.index.add(embedding)
            
            # Add to metadata
            chunk_id = len(self.metadata)
            self.metadata.append({
                "id": chunk_id,
                "title": title,
                "content": chunk, # Store the chunk itself
                "full_content_ref": content if i == 0 else None, # Store full content once or reference it
                "url": url,
                "chunk_index": i
            })
            doc_ids.append(chunk_id)
        
        self._save_index()
        return doc_ids

    def _chunk_text(self, text, chunk_size=800, overlap=100):
        """Splits text into overlapping chunks."""
        chunks = []
        if not text:
            return chunks
            
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
        return chunks

    def search(self, query: str, top_k: int = 10):
        """Performs a hybrid search (semantic + keyword)."""
        if self.index.ntotal == 0 or not self.metadata:
            return []
            
        # 1. Semantic Search
        query_embedding = self.model.encode([query]).astype('float32')
        distances, indices = self.index.search(query_embedding, min(top_k * 2, self.index.ntotal))
        
        results_map = {}
        
        # Process semantic results
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata):
                doc = self.metadata[idx]
                if doc:
                    score = float(1.0 / (1.0 + distances[0][i]))
                    # Use title to group chunks from same document
                    title = doc["title"]
                    if title not in results_map or score > results_map[title]["score"]:
                        results_map[title] = {
                            "id": doc["id"],
                            "title": title,
                            "content": doc["content"],
                            "url": doc["url"],
                            "score": score,
                            "type": "semantic"
                        }

        # 2. Keyword Fallback/Boost (Simple string match)
        query_lower = query.lower()
        keyword_matches = 0
        for doc in self.metadata:
            if doc and query_lower in doc["content"].lower():
                title = doc["title"]
                if title not in results_map:
                    results_map[title] = {
                        "id": doc["id"],
                        "title": title,
                        "content": doc["content"],
                        "url": doc["url"],
                        "score": 0.5, # Baseline score for keyword match
                        "type": "keyword"
                    }
                    keyword_matches += 1
                else:
                    # Boost existing semantic result if it also contains the keyword
                    results_map[title]["score"] += 0.2
                    results_map[title]["type"] = "hybrid"
                
                if keyword_matches >= top_k:
                    break

        # Sort by score and take top_k
        sorted_results = sorted(results_map.values(), key=lambda x: x["score"], reverse=True)
        return sorted_results[:top_k]

    def get_all_documents(self):
        """Returns all valid documents."""
        docs = []
        for doc in self.metadata:
            if doc is not None:
                # Omit full content for brevity in lists, just return snippet
                snippet = doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"]
                docs.append({
                    "id": doc["id"],
                    "title": doc["title"],
                    "snippet": snippet,
                    "url": doc["url"]
                })
        # Return in reverse chronological order
        return docs[::-1]

    def delete_document(self, doc_id: int):
        """Soft deletes a document by setting its metadata to None."""
        if 0 <= doc_id < len(self.metadata):
            self.metadata[doc_id] = None
            self._save_index()
            return True
        return False

    def clear_index(self):
        """Clears the entire index."""
        self.index = faiss.IndexFlatL2(self.dimension)
        self.metadata = []
        self._save_index()
