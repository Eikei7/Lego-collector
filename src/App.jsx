import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [collection, setCollection] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [themeNames, setThemeNames] = useState({});

  const API_KEY = import.meta.env.VITE_REBRICKABLE_API_KEY;

  useEffect(() => {
    const savedData = localStorage.getItem('lego-collection');
    if (savedData) {
      try {
        setCollection(JSON.parse(savedData));
      } catch (e) {
        console.error("Could not load collection from localStorage", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lego-collection', JSON.stringify(collection));
    
    const uniqueThemeIds = [...new Set(collection.map(set => set.theme_id))];
    const missingThemeIds = uniqueThemeIds.filter(id => !themeNames[id]);
    
    if (missingThemeIds.length > 0) {
      missingThemeIds.forEach(async (themeId) => {
        try {
          const response = await fetch(
            `https://rebrickable.com/api/v3/lego/themes/${themeId}/?key=${API_KEY}`
          );
          const data = await response.json();
          setThemeNames(prev => ({ ...prev, [themeId]: data.name }));
        } catch (error) {
          console.error(`Could not fetch theme ${themeId}`, error);
        }
      });
    }
  }, [collection]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `https://rebrickable.com/api/v3/lego/sets/?search=${searchQuery}&key=${API_KEY}`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      alert("An error occurred while searching. Check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const addToCollection = (set) => {
    const exists = collection.find(item => item.set_num === set.set_num);
    if (!exists) {
      setCollection([...collection, set]);
    } else {
      alert("This set is already in your collection!");
    }
  };

  const removeFromCollection = (setNum) => {
    if (window.confirm("Do you really want to remove this set?")) {
      setCollection(collection.filter(item => item.set_num !== setNum));
    }
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(collection, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `lego-collection-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (Array.isArray(json)) {
          if (window.confirm("This will replace your current collection. Continue?")) {
            setCollection(json);
          }
        } else {
          alert("Invalid file format. The JSON file must contain an array.");
        }
      } catch (err) {
        alert("Could not read the file. Make sure it's a valid JSON.");
      }
    };
    reader.readAsText(file);
  };
  
  const totalParts = collection.reduce((acc, set) => acc + (set.num_parts || 0), 0);

  const themes = [...new Set(collection.map(set => set.theme_id))].sort((a, b) => a - b);
  
  const getThemeName = (themeId) => {
    return themeNames[themeId] || `Theme ${themeId}`;
  };

  const filteredCollection = selectedTheme 
    ? collection.filter(set => set.theme_id === selectedTheme)
    : collection;

  const filteredTotalParts = filteredCollection.reduce((acc, set) => acc + (set.num_parts || 0), 0);

  return (
    <div className="container">
      <header>
        <h1>LEGO® Collector</h1>
        <p>Manage your collection locally in your browser.</p>
      </header>

      <section className="search-section">
  <h2>Search Rebrickable Database</h2>
  <form onSubmit={handleSearch} className="input-group">
    <input 
      type="text" 
      placeholder="Set number or name (e.g. 10265)..." 
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <button type="submit" disabled={isLoading}>
      Search
    </button>
  </form>

  {isLoading ? (
    <div className="spinner-container">
      <span className="loader"></span>
      <p className="loading-text">Looking for bricks...</p>
    </div>
  ) : (
    searchResults.length > 0 && (
      <div className="lego-grid" style={{ marginTop: '20px' }}>
        {searchResults.map(set => {
          const isInCollection = collection.find(item => item.set_num === set.set_num);
          return (
            <div key={set.set_num} className="lego-card">
              <img src={set.set_img_url || 'https://via.placeholder.com/150?text=No+Image'} alt={set.name} />
              <div className="card-info">
                <h3>{set.name}</h3>
                <p>#{set.set_num}</p>
                <p>{set.num_parts} pieces ({set.year})</p>
              </div>
              <button 
                onClick={() => addToCollection(set)}
                disabled={isInCollection}
                style={{
                  backgroundColor: isInCollection ? '#ccc' : '',
                  cursor: isInCollection ? 'not-allowed' : 'pointer',
                  opacity: isInCollection ? 0.6 : 1
                }}
              >
                {isInCollection ? '✓ Added' : '+ Add'}
              </button>
            </div>
          );
        })}
      </div>
    )
  )}
  {!isLoading && hasSearched && searchResults.length === 0 && (
  <p style={{ textAlign: 'center', marginTop: '20px' }}>No results found for "{searchQuery}".</p>
)}
</section>

      <hr />

      <section className="collection-section">
  <div className="collection-header">
    <div>
      <h2>My Collection ({filteredCollection.length}{selectedTheme ? ` of ${collection.length}` : ''})</h2>
      <p className="total-stats">
        Total: <strong>{filteredTotalParts.toLocaleString()}</strong> pieces
        {selectedTheme && ` (${totalParts.toLocaleString()} total)`}
      </p>
      {themes.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedTheme(null)}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              borderRadius: '4px',
              border: selectedTheme === null ? '2px solid #007bff' : '1px solid #ddd',
              backgroundColor: selectedTheme === null ? '#007bff' : 'white',
              color: selectedTheme === null ? 'white' : '#333',
              cursor: 'pointer',
              fontWeight: selectedTheme === null ? 'bold' : 'normal'
            }}
          >
            All Themes
          </button>
          {themes.map(themeId => (
            <button
              key={themeId}
              onClick={() => setSelectedTheme(themeId)}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                borderRadius: '4px',
                border: selectedTheme === themeId ? '2px solid #007bff' : '1px solid #ddd',
                backgroundColor: selectedTheme === themeId ? '#007bff' : 'white',
                color: selectedTheme === themeId ? 'white' : '#333',
                cursor: 'pointer',
                fontWeight: selectedTheme === themeId ? 'bold' : 'normal'
              }}
            >
              {getThemeName(themeId)} ({collection.filter(s => s.theme_id === themeId).length})
            </button>
          ))}
        </div>
      )}
    </div>
    <div className="data-actions">
      <button onClick={exportJSON} className="secondary-btn">Export JSON</button>
      <label className="file-upload">
        Import JSON
        <input type="file" accept=".json" onChange={importJSON} hidden />
      </label>
    </div>
  </div>

        {filteredCollection.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
            {selectedTheme ? 'No sets found in this theme.' : 'Your collection is empty. Search above to add your first sets!'}
          </p>
        ) : (
          <div className="lego-grid">
            {filteredCollection.map(set => (
              <div key={set.set_num} className="lego-card saved">
                <img src={set.set_img_url} alt={set.name} />
                <div className="card-info">
                  <h3>{set.name}</h3>
                  <p>#{set.set_num}</p>
                  <p>{set.num_parts} pieces ({set.year})</p>
                </div>
                <button 
                  onClick={() => removeFromCollection(set.set_num)}
                  style={{ backgroundColor: '#ff4444' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        <p><small>Data provided by <a href="https://rebrickable.com/api/" target="_blank" rel="noopener noreferrer">Rebrickable API</a></small></p>
        <p><small>Made by <a href="https://frontend-erik.netlify.app" target="_blank" rel="noopener noreferrer">Erik Karlsson</a></small></p>
      </footer>
    </div>
  );
}

export default App;