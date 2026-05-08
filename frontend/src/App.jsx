import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Search, BrainCircuit, Database, FileText, Globe, Plus, Link, 
  UploadCloud, Moon, Sun, Trash2, ExternalLink, Sparkles, X, ChevronRight
} from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Admin State
  const [adminTab, setAdminTab] = useState('text'); // text, url, file
  const [allDocuments, setAllDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  // Form State
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

  // Theme Toggle
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }, [isDarkMode]);

  // Fetch Documents for Admin
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    try {
      const response = await axios.get(`${API_URL}/documents`);
      setAllDocuments(response.data.documents);
    } catch (error) {
      console.error("Fetch docs error:", error);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchDocuments();
    }
  }, [activeTab, fetchDocuments]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setAiSummary(null);
    try {
      const response = await axios.post(`${API_URL}/search`, { query: query, top_k: 5 });
      setResults(response.data.results);
      setAiSummary(response.data.ai_summary);
    } catch (error) {
      console.error("Search error:", error);
      showToast("Error performing search. Check if backend is running.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleIndex = async (e) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;
    setIsIndexing(true);
    try {
      await axios.post(`${API_URL}/index`, { title: docTitle, content: docContent, url: docUrl });
      showToast("Document indexed!");
      setDocTitle(''); setDocContent(''); setDocUrl('');
      fetchDocuments();
    } catch (error) { showToast("Indexing failed."); } finally { setIsIndexing(false); }
  };

  const handleIndexUrl = async (e) => {
    e.preventDefault();
    if (!indexUrl) return;
    setIsIndexing(true);
    try {
      await axios.post(`${API_URL}/index/url`, { url: indexUrl });
      showToast("URL indexed!");
      setIndexUrl('');
      fetchDocuments();
    } catch (error) { showToast("URL indexing failed."); } finally { setIsIndexing(false); }
  };

  const handleIndexFile = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    if (fileTitle) formData.append("title", fileTitle);
    setIsIndexing(true);
    try {
      await axios.post(`${API_URL}/index/file`, formData);
      showToast("File indexed!");
      setFile(null); setFileTitle('');
      fetchDocuments();
    } catch (error) { showToast("File indexing failed."); } finally { setIsIndexing(false); }
  };

  const handleDeleteDoc = async (id) => {
    try {
      await axios.delete(`${API_URL}/documents/${id}`);
      showToast("Document removed.");
      fetchDocuments();
    } catch (error) { showToast("Deletion failed."); }
  };

  // Helper to highlight terms
  const highlightText = (text, highlight) => {
    if (!highlight || !highlight.trim()) return text;
    // Escape special regex characters to prevent crashes
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
      <span key={i} className="highlight">{part}</span> : part
    );
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <BrainCircuit className="logo-icon" size={32} />
          <span>SmartSearch</span>
        </div>
        
        <div className="header-actions">
          <div className="nav-tabs">
            <button 
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={18} /> Search
            </button>
            <button 
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Database size={18} /> Knowledge
            </button>
          </div>
          
          <button 
            className="theme-toggle" 
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Light/Dark Mode"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'search' ? (
          <div className={`search-container ${hasSearched ? 'has-results' : ''}`}>
            {!hasSearched && (
              <h1 className="title-huge">
                Ask your knowledge base<br/>
                <span style={{ color: 'var(--accent-color)' }}>anything.</span>
              </h1>
            )}
            
            <form onSubmit={handleSearch} className="search-box">
              <input
                type="text"
                className="search-input"
                placeholder="Search by meaning... e.g. 'How do I setup FastAPI?'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <Search className="search-icon" size={24} />
              {isSearching && (
                <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <div className="loading-spinner"></div>
                </div>
              )}
            </form>

            {hasSearched && !isSearching && (
              <div className="results-container">
                {aiSummary && (
                  <div className="ai-summary-box">
                    <div className="ai-title">
                      <Sparkles size={20} /> Smart AI Response
                    </div>
                    <div className="ai-content">
                      {aiSummary}
                    </div>
                  </div>
                )}

                <div className="results-header">
                  {results.length > 0 ? `Found ${results.length} relevant documents` : "No matches found"}
                </div>

                {results.map((result) => (
                  <div key={result.id} className="result-card">
                    <div className="result-badge">
                      {(result.score * 100).toFixed(0)}% Match
                    </div>
                    <h3 className="result-title">{result.title}</h3>
                    {result.url && (
                      <a href={result.url.startsWith('http') ? result.url : '#'} target="_blank" rel="noopener noreferrer" className="result-link">
                        <Link size={14} /> {result.url} <ExternalLink size={12} />
                      </a>
                    )}
                    <p className="result-content">
                      {highlightText(result.content.length > 300 ? result.content.substring(0, 300) + '...' : result.content, query)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="admin-container">
            <div className="admin-grid">
              <div className="admin-form-side">
                <h2 className="admin-section-title"><Plus size={22} className="logo-icon" /> Add Knowledge</h2>
                <div className="form-card">
                  <div className="admin-tabs-small">
                    <button className={`admin-tab-btn-small ${adminTab === 'text' ? 'active' : ''}`} onClick={() => setAdminTab('text')}><FileText size={16}/> Text</button>
                    <button className={`admin-tab-btn-small ${adminTab === 'url' ? 'active' : ''}`} onClick={() => setAdminTab('url')}><Globe size={16}/> URL</button>
                    <button className={`admin-tab-btn-small ${adminTab === 'file' ? 'active' : ''}`} onClick={() => setAdminTab('file')}><UploadCloud size={16}/> File</button>
                  </div>

                  {adminTab === 'text' && (
                    <form onSubmit={handleIndex}>
                      <div className="form-group">
                        <label className="form-label">Document Title</label>
                        <input type="text" className="form-input" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Title..." required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Content</label>
                        <textarea className="form-textarea" value={docContent} onChange={(e) => setDocContent(e.target.value)} placeholder="Paste text here..." required />
                      </div>
                      <button type="submit" className="btn-primary" disabled={isIndexing}>
                        {isIndexing ? <div className="loading-spinner"></div> : <>Index Document</>}
                      </button>
                    </form>
                  )}

                  {adminTab === 'url' && (
                    <form onSubmit={handleIndexUrl}>
                      <div className="form-group">
                        <label className="form-label">Website URL</label>
                        <input type="url" className="form-input" value={indexUrl} onChange={(e) => setIndexUrl(e.target.value)} placeholder="https://example.com/article" required />
                      </div>
                      <button type="submit" className="btn-primary" disabled={isIndexing}>
                        {isIndexing ? <div className="loading-spinner"></div> : <>Fetch & Index</>}
                      </button>
                    </form>
                  )}

                  {adminTab === 'file' && (
                    <form onSubmit={handleIndexFile}>
                      <div className="form-group">
                        <label className="form-label">Upload PDF/DOCX/TXT</label>
                        <input type="file" className="form-input" onChange={(e) => setFile(e.target.files[0])} required />
                      </div>
                      <button type="submit" className="btn-primary" disabled={isIndexing}>
                        {isIndexing ? <div className="loading-spinner"></div> : <>Upload & Index</>}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="admin-list-side">
                <h2 className="admin-section-title"><Database size={22} className="logo-icon" /> Managed Documents</h2>
                <div className="documents-card">
                  {isLoadingDocs ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="loading-spinner"></div></div>
                  ) : (
                    <div className="doc-list">
                      {allDocuments.length > 0 ? (
                        allDocuments.map((doc) => (
                          <div key={doc.id} className="doc-item">
                            <div className="doc-info">
                              <div className="doc-name">{doc.title}</div>
                              <div className="doc-meta">{doc.snippet.substring(0, 60)}...</div>
                            </div>
                            <div className="doc-actions">
                              <button className="btn-icon" onClick={() => handleDeleteDoc(doc.id)} title="Delete document">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">No documents indexed yet.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
