import React, { useState, useRef, useEffect } from 'react'; // Import useEffect
import { ChevronRight, Code, Zap, Globe, ArrowLeft, FileText, Eye, Sparkles, Heart } from 'lucide-react';
import "./App.css";

// ✅ Memoized PromptInput - UPDATED TO MAINTAIN FOCUS
const PromptInput = React.memo(({ prompt, setPrompt }) => {
  const inputRef = useRef(null); // Create a ref

  // Use useEffect to focus the input after every render
  // This ensures focus is restored if it's lost during a re-render
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }); // No dependency array means it runs after every render

  return (
    <input
      ref={inputRef} // Attach the ref to the input element
      type="text"
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      placeholder="Describe your website..."
      className="prompt-input"
    />
  );
});

// ✅ Memoized CodeEditor
const CodeEditor = React.memo(({ code, activeTab, handleCodeChange }) => (
  <textarea
    value={code[activeTab] || ''}
    onChange={(e) => handleCodeChange(e, activeTab)}
    className="code-editor"
    placeholder={`Enter your ${activeTab.toUpperCase()} code here...`}
  />
));

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState({ html: '', css: '', js: '' });
  const [activeTab, setActiveTab] = useState('html');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveUrl, setLiveUrl] = useState(null);

  const iframeRef = useRef(null);

  const handleGenerateCode = async () => {
    setLoading(true);
    setError(null);
    setLiveUrl(null);
    try {
      const response = await fetch('http://localhost:3001/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate code from backend.');
      }
      const generatedCode = await response.json();
      setCode(generatedCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(code),
      });
      if (!response.ok) {
        throw new Error('Failed to publish to Netlify.');
      }
      const data = await response.json();
      setLiveUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e, fileType) => {
    setCode(prevCode => ({
      ...prevCode,
      [fileType]: e.target.value,
    }));
  };

  const HomePage = () => (
    <div className="home-page">
      <div className="home-background"></div>
      
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <Code size={24} />
            <span>CodeGen</span>
          </div>
        </div>
      </nav>

      <div className="hero-section">
        <div className="ai-badge">
          <Sparkles size={16} />
          <span>Powered by Advanced AI</span>
        </div>

        <h1 className="hero-title">
          Build websites with just a <span className="highlight">prompt</span>
        </h1>

        <p className="hero-description">
          Transform your ideas into fully functional, responsive websites instantly. 
          Our AI-powered editor generates clean HTML, CSS, and JavaScript code from natural language.
        </p>

        <div className="hero-buttons">
          <button 
            onClick={() => setCurrentPage('editor')}
            className="btn-primary"
          >
            <span>Get Started Now</span>
            <ChevronRight size={18} />
          </button>
          
          <button className="btn-secondary">
            <span>Learn More</span>
            <span className="arrow">→</span>
          </button>
        </div>
      </div>

      <div className="features-section">
        <h2 className="features-title">From prompt to production</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon purple">
              <Zap size={28} />
            </div>
            <h3>AI-Powered Generation</h3>
            <p>Generate complete websites from natural language descriptions.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon blue">
              <Eye size={28} />
            </div>
            <h3>Real-time Preview</h3>
            <p>See your changes instantly with live preview functionality.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon pink">
              <Globe size={28} />
            </div>
            <h3>One-Click Deploy</h3>
            <p>Publish your projects to Netlify with a single click.</p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <span>Made with</span>
          <Heart size={16} color="#ff6b6b" />
          <span>by CodeGen Team</span>
        </div>
      </footer>
    </div>
  );

  const EditorPage = () => (
    <div className="editor-container">
      <header className="editor-header">
        <div className="header-content">
          <button
            onClick={() => setCurrentPage('home')}
            className="back-button"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </button>
          <div className="header-title">
            <Code size={24} />
            <h1>AI Code Editor</h1>
          </div>
          <div></div>
        </div>
      </header>

      <div className="editor-main">
        <div className="left-panel">
          <div className="prompt-section">
            {/* ✅ Fixed prompt input */}
            <PromptInput prompt={prompt} setPrompt={setPrompt} />
            
            <div className="button-group">
              <button
                onClick={handleGenerateCode}
                disabled={loading || !prompt.trim()}
                className="generate-btn"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={handlePublish}
                disabled={loading || !code.html}
                className="publish-btn"
              >
                
                Publish
              </button>
            </div>

            {loading && <div className="status loading">Generating code...</div>}
            {error && <div className="status error">Error: {error}</div>}
            {liveUrl && (
              <div className="status success">
                Published! <a href={liveUrl} target="_blank" rel="noopener noreferrer">View Site</a>
              </div>
            )}
          </div>

          <div className="files-section">
            <div className="files-header">
              <FileText size={20} />
              <span>Files</span>
            </div>
            
            <div className="file-tabs">
              {['html', 'css', 'js'].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`file-tab ${activeTab === type ? 'active' : ''}`}
                >
                  {type === 'html' ? 'index.html' : type === 'css' ? 'styles.css' : 'script.js'}
                </button>
              ))}
            </div>

            <div className="code-editor-container">
              {/* ✅ Fixed code editor */}
              <CodeEditor code={code} activeTab={activeTab} handleCodeChange={handleCodeChange} />
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="preview-header">
            <Eye size={20} />
            <span>Live Preview</span>
          </div>
          <div className="preview-container">
            <iframe
              ref={iframeRef}
              className="preview-iframe"
              title="preview"
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>${code.css}</style>
                  </head>
                  <body>
                    ${code.html}
                    <script>${code.js}</script>
                  </body>
                </html>
              `}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return currentPage === 'home' ? <HomePage /> : <EditorPage />;
}

export default App;



