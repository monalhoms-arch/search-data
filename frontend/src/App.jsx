import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, BrainCircuit, Database, FileText, Globe, Plus, Link, UploadCloud } from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin Form State
  const [adminTab, setAdminTab] = useState('text'); // text, url, file
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docUrl, setDocUrl] = useState('');
  
  const [indexUrl, setIndexUrl] = useState('');
  
  const [file, setFile] = useState(null);
  const [fileTitle, setFileTitle] = useState('');

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
      showToast("Text document indexed successfully!");
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

  const handleIndexUrl = async (e) => {
    e.preventDefault();
    if (!indexUrl) return;

    setIsIndexing(true);
    try {
      await axios.post(`${API_URL}/index/url`, {
        url: indexUrl
      });
      showToast("URL content indexed successfully!");
      setIndexUrl('');
    } catch (error) {
      console.error("URL Indexing error:", error);
      showToast("Error indexing URL.");
    } finally {
      setIsIndexing(false);
    }
  };

  const handleIndexFile = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (fileTitle) {
      formData.append("title", fileTitle);
    }

    setIsIndexing(true);
    try {
      await axios.post(`${API_URL}/index/file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      showToast("File indexed successfully!");
      setFile(null);
      setFileTitle('');
    } catch (error) {
      console.error("File Indexing error:", error);
      showToast(error.response?.data?.detail || "Error indexing file. Ensure it's a PDF, TXT, or DOCX.");
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
              <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={24} className="logo-icon" />
                Add to Knowledge Base
              </h2>

              <div className="admin-tabs">
                <button 
                  className={`admin-tab-btn ${adminTab === 'text' ? 'active' : ''}`}
                  onClick={() => setAdminTab('text')}
                >
                  <FileText size={16} /> Text
                </button>
                <button 
                  className={`admin-tab-btn ${adminTab === 'url' ? 'active' : ''}`}
                  onClick={() => setAdminTab('url')}
                >
                  <Globe size={16} /> URL
                </button>
                <button 
                  className={`admin-tab-btn ${adminTab === 'file' ? 'active' : ''}`}
                  onClick={() => setAdminTab('file')}
                >
                  <UploadCloud size={16} /> File
                </button>
              </div>
              
              {adminTab === 'text' && (
                <form onSubmit={handleIndex} className="fade-in">
                  <div className="form-group">
                    <label className="form-label">Title</label>
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
                    <label className="form-label">URL (Optional)</label>
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
                      placeholder="Paste the document content here..."
                      required
                    />
                  </div>
                  
                  <button type="submit" className="btn-primary" disabled={isIndexing}>
                    {isIndexing ? <div className="loading-spinner"></div> : <> <Database size={20} /> Index Text </>}
                  </button>
                </form>
              )}

              {adminTab === 'url' && (
                <form onSubmit={handleIndexUrl} className="fade-in">
                  <div className="form-group">
                    <label className="form-label">Website URL</label>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      The AI will visit this URL, extract the visible text, and index it.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <Link size={20} color="#94a3b8" />
                      <input
                        type="url"
                        className="form-input"
                        value={indexUrl}
                        onChange={(e) => setIndexUrl(e.target.value)}
                        placeholder="https://example.com/article"
                        required
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                  
                  <button type="submit" className="btn-primary" disabled={isIndexing}>
                    {isIndexing ? <div className="loading-spinner"></div> : <> <Globe size={20} /> Fetch & Index URL </>}
                  </button>
                </form>
              )}

              {adminTab === 'file' && (
                <form onSubmit={handleIndexFile} className="fade-in">
                  <div className="form-group">
                    <label className="form-label">Upload File (PDF, TXT, DOCX)</label>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      Upload a document. The AI will extract the text content and index it.
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      className="form-input"
                      onChange={(e) => setFile(e.target.files[0])}
                      required
                      style={{ padding: '0.5rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Title (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      placeholder="Leave blank to use filename"
                    />
                  </div>
                  
                  <button type="submit" className="btn-primary" disabled={isIndexing}>
                    {isIndexing ? <div className="loading-spinner"></div> : <> <UploadCloud size={20} /> Upload & Index File </>}
                  </button>
                </form>
              )}
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
