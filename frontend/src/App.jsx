import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, BrainCircuit, Database, FileText, Globe, Plus } from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin Form State
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const response = await axios.post(`${API_URL}/search`, { query: query, top_k: 5 });
      setResults(response.data.results);
    } catch (error) {
      console.error("Search error:", error);
      showToast("Error performing search. Is the backend running?");
    } finally {
      setIsSearching(false);
    }
  };

  const handleIndex = async (e) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;

    setIsIndexing(true);
    try {
      await axios.post(`${API_URL}/index`, {
        title: docTitle,
        content: docContent,
        url: docUrl
      });
      showToast("Document indexed successfully!");
      setDocTitle('');
      setDocContent('');
      setDocUrl('');
    } catch (error) {
      console.error("Indexing error:", error);
      showToast("Error indexing document.");
    } finally {
      setIsIndexing(false);
    }
  };

  // Clear results when typing empty
  useEffect(() => {
    if (query === '') {
      setResults([]);
      setHasSearched(false);
    }
  }, [query]);

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <BrainCircuit className="logo-icon" size={28} />
          <span>SmartSearch</span>
        </div>
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
            Search
          </button>
          <button 
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Database size={18} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
            Data Source
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'search' ? (
          <div className={`search-container ${hasSearched ? 'has-results' : ''}`}>
            {!hasSearched && <h1 className="title-huge">What are you looking for?</h1>}
            
            <form onSubmit={handleSearch} className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="Search by meaning, not just words..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <Search className="search-icon" size={24} />
            </form>

            {isSearching && (
              <div className="loading-spinner" style={{ margin: '2rem auto' }}></div>
            )}

            {!isSearching && hasSearched && (
              <div className="results-container">
                {results.length > 0 ? (
                  results.map((result) => (
                    <div key={result.id} className="result-card">
                      <div className="result-score">
                        Match: {(result.score * 100).toFixed(1)}%
                      </div>
                      <h3 className="result-title">{result.title}</h3>
                      {result.url && (
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-url">
                          {result.url}
                        </a>
                      )}
                      <p className="result-content">{result.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <BrainCircuit size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>No semantic matches found for your query.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="admin-container">
            <div className="form-card">
              <h2 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={24} className="logo-icon" />
                Add to Knowledge Base
              </h2>
              
              <form onSubmit={handleIndex}>
                <div className="form-group">
                  <label className="form-label">
                    <FileText size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
                    Title
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g., Python FastAPI Guide"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    <Globe size={16} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
                    URL (Optional)
                  </label>
                  <input
                    type="url"
                    className="form-input"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-textarea"
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Paste the document content here. The AI will read and understand this text..."
                    required
                  />
                </div>
                
                <button type="submit" className="btn-primary" disabled={isIndexing}>
                  {isIndexing ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <>
                      <Database size={20} />
                      Index Document
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
