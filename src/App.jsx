import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [collections, setCollections] = useState([[]]);
  const [activeTab, setActiveTab] = useState(0);
  const [collectionNames, setCollectionNames] = useState(['My Collection']);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [themeNames, setThemeNames] = useState({});
  const [isListView, setIsListView] = useState(false);

  const API_KEY = import.meta.env.VITE_REBRICKABLE_API_KEY;

  useEffect(() => {
    const savedCollections = localStorage.getItem('lego-collections');
    const savedNames = localStorage.getItem('lego-collection-names');
    const savedActiveTab = localStorage.getItem('lego-active-tab');
    const savedThemes = localStorage.getItem('lego-theme-names');
    const savedView = localStorage.getItem('lego-view-mode');
    
    if (savedCollections) {
      try { setCollections(JSON.parse(savedCollections)); } catch (e) { setCollections([[]]); }
    } else { setCollections([[]]); }
    
    if (savedNames) {
      try { setCollectionNames(JSON.parse(savedNames)); } catch (e) { setCollectionNames(['My Collection']); }
    }
    
    if (savedActiveTab) { setActiveTab(parseInt(savedActiveTab)); }

    if (savedThemes) {
      try { setThemeNames(JSON.parse(savedThemes)); } catch (e) { setThemeNames({}); }
    }

    if (savedView) {
      setIsListView(savedView === 'list');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lego-collections', JSON.stringify(collections));
    localStorage.setItem('lego-collection-names', JSON.stringify(collectionNames));
    localStorage.setItem('lego-active-tab', activeTab.toString());
    localStorage.setItem('lego-theme-names', JSON.stringify(themeNames));
    localStorage.setItem('lego-view-mode', isListView ? 'list' : 'grid');
    
    const currentCollection = collections[activeTab] || [];
    const uniqueThemeIds = [...new Set(currentCollection.map(set => set.theme_id))];
    const missingThemeIds = uniqueThemeIds.filter(id => id && !themeNames[id]);
    
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
  }, [collections, collectionNames, activeTab, themeNames, API_KEY, isListView]);

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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const addToCollection = (set) => {
    const newCollections = [...collections];
    const currentColl = newCollections[activeTab] || [];
    const exists = currentColl.find(item => item.set_num === set.set_num);
    
    if (!exists) {
      newCollections[activeTab] = [...currentColl, set];
      setCollections(newCollections);
    } else {
      alert("This set is already in this collection!");
    }
  };

  const removeFromCollection = (setNum) => {
    if (window.confirm("Do you really want to remove this set?")) {
      const newCollections = [...collections];
      newCollections[activeTab] = (newCollections[activeTab] || []).filter(item => item.set_num !== setNum);
      setCollections(newCollections);
    }
  };

  const addNewTab = () => {
    setCollections([...collections, []]);
    setCollectionNames([...collectionNames, `Collection ${collections.length + 1}`]);
    setActiveTab(collections.length);
  };

  const renameTab = (index) => {
    const newName = prompt("Enter new name for this collection:", collectionNames[index]);
    if (newName && newName.trim()) {
      const newNames = [...collectionNames];
      newNames[index] = newName.trim();
      setCollectionNames(newNames);
    }
  };

  const removeTab = (index) => {
    if (collections.length <= 1) {
      alert("You need at least one collection tab.");
      return;
    }
    if (window.confirm(`Delete collection "${collectionNames[index]}"?`)) {
      const newCollections = collections.filter((_, i) => i !== index);
      const newNames = collectionNames.filter((_, i) => i !== index);
      setCollections(newCollections);
      setCollectionNames(newNames);
      setActiveTab(Math.max(0, activeTab - 1));
    }
  };

  const exportJSON = () => {
    const currentColl = collections[activeTab] || [];
    const dataStr = JSON.stringify(currentColl, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${collectionNames[activeTab]}-${new Date().toISOString().split('T')[0]}.json`;
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
          const newCols = [...collections];
          newCols[activeTab] = json;
          setCollections(newCols);
        }
      } catch (err) { alert("Could not read file."); }
    };
    reader.readAsText(file);
  };

  const importToNewTab = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (Array.isArray(json)) {
          const newName = file.name.replace('.json', '');
          setCollections([...collections, json]);
          setCollectionNames([...collectionNames, newName]);
          setActiveTab(collections.length);
        }
      } catch (err) { alert("Could not read file."); }
    };
    reader.readAsText(file);
  };

  const currentCollection = collections[activeTab] || [];
  const totalParts = currentCollection.reduce((acc, set) => acc + (set.num_parts || 0), 0);
  const themes = [...new Set(currentCollection.map(set => set.theme_id))].sort((a, b) => a - b);
  const getThemeName = (id) => themeNames[id] || `Theme ${id}`;
  
  const filteredCollection = selectedTheme 
    ? currentCollection.filter(set => set.theme_id === selectedTheme)
    : currentCollection;

  const filteredTotalParts = filteredCollection.reduce((acc, set) => acc + (set.num_parts || 0), 0);

  return (
    <div className="container">
      <header>
        <h1>LEGO® Collector</h1>
        <p>Manage multiple collections in your browser.</p>
      </header>

      <div className="tabs-container">
        <div className="tabs-header">
          <div className="tabs-list">
            {collectionNames.map((name, index) => (
              <button key={index} className={`tab-button ${activeTab === index ? 'active' : ''}`} onClick={() => setActiveTab(index)}>
                {name} <span className="tab-count">({collections[index]?.length || 0})</span>
                <button className="tab-rename" onClick={(e) => { e.stopPropagation(); renameTab(index); }}>✎</button>
                {collections.length > 1 && (
                  <button className="tab-close" onClick={(e) => { e.stopPropagation(); removeTab(index); }}>×</button>
                )}
              </button>
            ))}
            <button className="tab-add" onClick={addNewTab}>+</button>
          </div>
          <div className="tab-import">
            <label className="file-upload">
              Import to New Tab
              <input type="file" accept=".json" onChange={importToNewTab} hidden />
            </label>
          </div>
        </div>
      </div>

      <section className="search-section">
        <h2>Search Rebrickable Database</h2>
        <form onSubmit={handleSearch} className="input-group">
          <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
            <input 
              type="text" 
              placeholder="Set number or name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingRight: '40px' }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="clear-input-btn">×</button>
            )}
          </div>
          <button type="submit" disabled={isLoading}>Search</button>
          {(searchResults.length > 0 || hasSearched) && (
            <button type="button" onClick={clearSearch} className="secondary-btn">Clear Results</button>
          )}
        </form>

        {isLoading ? (
          <div className="spinner-container"><span className="loader"></span><p className="loading-text">Looking for sets...</p></div>
        ) : (
          searchResults.length > 0 && (
            <div className="lego-grid">
              {searchResults.map(set => {
                const isInColl = currentCollection.find(item => item.set_num === set.set_num);
                return (
                  <div key={set.set_num} className="lego-card">
                    <img src={set.set_img_url || 'https://via.placeholder.com/150'} alt={set.name} />
                    <div className="card-info">
                      <h3>{set.name}</h3>
                      <p>#{set.set_num} ({set.year})</p>
                      <p>{set.num_parts} pieces</p>
                    </div>
                    <button onClick={() => addToCollection(set)} disabled={isInColl} className={isInColl ? 'btn-disabled' : ''}>
                      {isInColl ? '✓ Added' : '+ Add'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <h2>{collectionNames[activeTab]} ({filteredCollection.length}{selectedTheme ? ` of ${currentCollection.length}` : ''})</h2>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <p className="total-stats">
            Total: <strong>{filteredTotalParts.toLocaleString()}</strong> pieces
          </p>
          <button 
            onClick={() => setIsListView(!isListView)} 
            className="view-toggle-btn"
            title={isListView ? 'Switch to Grid View' : 'Switch to List View'}
          >
            {isListView ? '⊞' : '☰'}
          </button>
        </div>
      </div>
            {themes.length > 0 && (
              <div className="theme-filters">
                <button onClick={() => setSelectedTheme(null)} className={selectedTheme === null ? 'theme-tag active' : 'theme-tag'}>All Themes</button>
                {themes.map(id => (
                  <button key={id} onClick={() => setSelectedTheme(id)} className={selectedTheme === id ? 'theme-tag active' : 'theme-tag'}>
                    {getThemeName(id)} ({currentCollection.filter(s => s.theme_id === id).length})
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="data-actions">
          <button onClick={exportJSON} className="secondary-btn">Export JSON</button>
          <label className="file-upload">
            Import to This Tab
            <input type="file" accept=".json" onChange={importJSON} hidden />
          </label>
        </div>
      </div>

        {filteredCollection.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
            {selectedTheme ? 'No sets found in this theme.' : 'This collection is empty.'}
          </p>
        ) : (
          <div className={isListView ? "lego-list-view" : "lego-grid"}>
            {filteredCollection.map(set => (
              <div key={set.set_num} className={isListView ? "lego-list-item" : "lego-card saved"}>
                <img src={set.set_img_url} alt={set.name} />
                <div className="card-info">
                  <h3>{set.name}</h3>
                  <p>#{set.set_num} ({set.year}) | {set.num_parts} pieces</p>
                </div>
                <button onClick={() => removeFromCollection(set.set_num)} className="btn-remove">Remove</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        <p className='credits'>Data provided by <a href="https://rebrickable.com/api/" target="_blank" rel="noopener noreferrer">Rebrickable API</a></p>
        <p className='credits'>Made by <a href="https://frontend-erik.se" target="_blank" rel="noopener noreferrer">Erik Karlsson</a></p>
      </footer>
    </div>
  );
}

export default App;