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
        """Indexes a new document."""
        # Generate embedding for the content
        embedding = self.model.encode([content]).astype('float32')
        
        # Add to FAISS index
        self.index.add(embedding)
        
        # Add to metadata
        doc_id = len(self.metadata)
        self.metadata.append({
            "id": doc_id,
            "title": title,
            "content": content,
            "url": url
        })
        
        self._save_index()
        return doc_id

    def search(self, query: str, top_k: int = 10):
        """Searches for the most relevant documents."""
        if self.index.ntotal == 0:
            return []
            
        # Generate embedding for the query
        query_embedding = self.model.encode([query]).astype('float32')
        
        # Perform search
        distances, indices = self.index.search(query_embedding, min(top_k, self.index.ntotal))
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx < len(self.metadata): # -1 means not enough results
                doc = self.metadata[idx]
                if doc is not None:
                    results.append({
                        "id": doc["id"],
                        "title": doc["title"],
                        "content": doc["content"],
                        "url": doc["url"],
                        "score": float(1.0 / (1.0 + distances[0][i])) # Convert distance to a simple similarity score
                    })
        return results

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
