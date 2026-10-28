import { useState, useEffect, useCallback, useMemo } from 'react';
import './index.css';

function StatsModal({ isOpen, onClose, stats }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Collection Statistics</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Sets</div>
            <div className="stat-value">{stats.totalSets}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Pieces</div>
            <div className="stat-value">{stats.totalParts.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Pieces/Set</div>
            <div className="stat-value">{stats.avgParts}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Largest Set</div>
            <div className="stat-value-small">{stats.largestSet.name}</div>
            <div className="stat-subtext">{stats.largestSet.num_parts} pieces</div>
          </div>
        </div>

        <div className="modal-body">
          {stats.themeStats.length > 0 && (
            <div className="stats-section">
              <h4>Top Themes by Pieces</h4>
              <div className="stats-list">
                {stats.themeStats.slice(0, 5).map((theme, i) => (
                  <div key={i} className="stats-list-item">
                    <span>{theme.name}</span>
                    <span>{theme.sets} sets • {theme.parts.toLocaleString()} pieces</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.yearStats.length > 0 && (
            <div className="stats-section">
              <h4>Sets by Year</h4>
              <div className="stats-list">
                {stats.yearStats.map(([year, count]) => (
                  <div key={year} className="stats-list-item">
                    <span>{year}</span>
                    <span>{count} sets</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showStats, setShowStats] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [collectionPage, setCollectionPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [debouncedCollectionSearch, setDebouncedCollectionSearch] = useState('');
  const pageSize = 12;
  const collectionPageSize = 16;

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
    localStorage.setItem('lego-view-mode', isListView ? 'list' : 'grid');
  }, [collections, collectionNames, activeTab, isListView]);

  useEffect(() => {
    localStorage.setItem('lego-theme-names', JSON.stringify(themeNames));
  }, [themeNames]);

  useEffect(() => {
    if (!collectionSearchQuery) {
      setDebouncedCollectionSearch('');
      return;
    }
    const timer = setTimeout(() => setDebouncedCollectionSearch(collectionSearchQuery), 300);
    return () => clearTimeout(timer);
  }, [collectionSearchQuery]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const showConfirm = useCallback((message, onConfirm) => {
    setConfirmState({ message, onConfirm });
  }, []);

  const fetchMissingThemes = useCallback(async (themeIds) => {
    if (!themeIds || themeIds.length === 0) return;
    
    const promises = themeIds.map(id => 
      fetch(`/.netlify/functions/rebrickable?path=lego/themes/${id}/`)
        .then(r => r.json())
        .then(data => ({ [id]: data.name }))
        .catch(() => ({ [id]: `Theme ${id}` }))
    );
    
    const results = await Promise.all(promises);
    const newThemes = Object.assign({}, ...results);
    setThemeNames(prev => ({ ...prev, ...newThemes }));
  }, []);

  useEffect(() => {
    const currentCollection = collections[activeTab] || [];
    const uniqueThemeIds = [...new Set(currentCollection.map(set => set.theme_id))];
    const missingThemeIds = uniqueThemeIds.filter(id => id && !themeNames[id]);
    
    if (missingThemeIds.length > 0) {
      fetchMissingThemes(missingThemeIds);
    }
  }, [collections, activeTab, themeNames, fetchMissingThemes]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    setIsLoading(true);
    setHasSearched(true);
    setCurrentPage(1);

    try {
      const response = await fetch(
        `/.netlify/functions/rebrickable?path=lego/sets/&search=${encodeURIComponent(searchQuery)}&page=1&page_size=${pageSize}`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
      setTotalResults(data.count || 0);
    } catch (error) {
      showToast("An error occurred while searching.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPage = async (pageNumber) => {
    setIsLoading(true);
    setCurrentPage(pageNumber);
    
    try {
      const response = await fetch(
        `/.netlify/functions/rebrickable?path=lego/sets/&search=${encodeURIComponent(searchQuery)}&page=${pageNumber}&page_size=${pageSize}`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
      setTotalResults(data.count || 0);
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
    } catch (error) {
      showToast("Error loading page.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setTotalResults(0);
  };

  const addToCollection = (set) => {
    const newCollections = [...collections];
    const currentColl = newCollections[activeTab] || [];
    const exists = currentColl.find(item => item.set_num === set.set_num);
    
    if (!exists) {
      newCollections[activeTab] = [...currentColl, set];
      setCollections(newCollections);
    } else {
      showToast("This set is already in this collection!", 'warning');
    }
  };

  const removeFromCollection = (setNum) => {
    showConfirm("Do you really want to remove this set?", () => {
      const newCollections = [...collections];
      newCollections[activeTab] = (newCollections[activeTab] || []).filter(item => item.set_num !== setNum);
      setCollections(newCollections);
    });
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
      showToast("You need at least one collection tab.", 'warning');
      return;
    }
    showConfirm(`Delete collection "${collectionNames[index]}"?`, () => {
      const newCollections = collections.filter((_, i) => i !== index);
      const newNames = collectionNames.filter((_, i) => i !== index);
      setCollections(newCollections);
      setCollectionNames(newNames);
      setActiveTab(Math.max(0, activeTab - 1));
    });
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
      } catch (err) { showToast("Could not read file.", 'error'); }
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
      } catch (err) { showToast("Could not read file.", 'error'); }
    };
    reader.readAsText(file);
  };

  const currentCollection = useMemo(() => collections[activeTab] || [], [collections, activeTab]);

  const totalParts = useMemo(
    () => currentCollection.reduce((acc, set) => acc + (set.num_parts || 0), 0),
    [currentCollection]
  );

  const themes = useMemo(
    () => [...new Set(currentCollection.map(set => set.theme_id))].sort((a, b) => a - b),
    [currentCollection]
  );

  const getThemeName = useCallback((id) => themeNames[id] || `Theme ${id}`, [themeNames]);

  const filteredCollection = useMemo(() => {
    let result = selectedTheme
      ? currentCollection.filter(set => set.theme_id === selectedTheme)
      : currentCollection;
    if (debouncedCollectionSearch) {
      const q = debouncedCollectionSearch.toLowerCase();
      result = result.filter(set =>
        set.name.toLowerCase().includes(q) ||
        set.set_num.toLowerCase().includes(q)
      );
    }
    return result;
  }, [currentCollection, selectedTheme, debouncedCollectionSearch]);

  const sortedCollection = useMemo(() => [...filteredCollection].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name': comparison = a.name.localeCompare(b.name); break;
      case 'year': comparison = (a.year || 0) - (b.year || 0); break;
      case 'parts': comparison = (a.num_parts || 0) - (b.num_parts || 0); break;
      case 'set_num': comparison = a.set_num.localeCompare(b.set_num); break;
      case 'theme': {
        const themeA = getThemeName(a.theme_id);
        const themeB = getThemeName(b.theme_id);
        comparison = themeA.localeCompare(themeB);
        break;
      }
      default: comparison = 0;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  }), [filteredCollection, sortBy, sortOrder, getThemeName]);

  const collectionTotalPages = Math.ceil(sortedCollection.length / collectionPageSize);
  const displayedCollectionPage = Math.min(collectionPage, Math.max(collectionTotalPages, 1));
  const paginatedCollection = sortedCollection.slice(
    (displayedCollectionPage - 1) * collectionPageSize,
    displayedCollectionPage * collectionPageSize
  );

  useEffect(() => {
    setCollectionPage(1);
  }, [activeTab, selectedTheme, debouncedCollectionSearch, sortBy, sortOrder]);

  useEffect(() => {
    if (collectionPage > Math.max(collectionTotalPages, 1)) {
      setCollectionPage(Math.max(collectionTotalPages, 1));
    }
  }, [collectionPage, collectionTotalPages]);

  const filteredTotalParts = useMemo(
    () => filteredCollection.reduce((acc, set) => acc + (set.num_parts || 0), 0),
    [filteredCollection]
  );

  const stats = useMemo(() => ({
    totalSets: currentCollection.length,
    totalParts: totalParts,
    avgParts: currentCollection.length > 0 ? Math.round(totalParts / currentCollection.length) : 0,
    largestSet: currentCollection.reduce((max, set) => (set.num_parts || 0) > (max.num_parts || 0) ? set : max, { num_parts: 0, name: 'N/A' }),
    themeStats: themes.map(themeId => {
      const themeSets = currentCollection.filter(s => s.theme_id === themeId);
      return { name: getThemeName(themeId), sets: themeSets.length, parts: themeSets.reduce((acc, s) => acc + (s.num_parts || 0), 0) };
    }).sort((a, b) => b.parts - a.parts),
    yearStats: Object.entries(currentCollection.reduce((acc, set) => {
      const year = set.year || 'Unknown';
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[0] - a[0]).slice(0, 10)
  }), [currentCollection, totalParts, themes, getThemeName]);

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
              // FIX: Ändrat från <button> till <div> för att undvika nesting-fel
              <div 
                key={index} 
                className={`tab-button ${activeTab === index ? 'active' : ''}`} 
                onClick={() => setActiveTab(index)}
                role="button"
                tabIndex={0}
              >
                {name} <span className="tab-count">({collections[index]?.length || 0})</span>
                <button className="tab-rename" onClick={(e) => { e.stopPropagation(); renameTab(index); }}>✎</button>
                {collections.length > 1 && (
                  <button className="tab-close" onClick={(e) => { e.stopPropagation(); removeTab(index); }}>×</button>
                )}
              </div>
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
                    <img src={set.set_img_url} alt={set.name} onError={e => { e.target.onerror = null; e.target.src = '/icons8-lego-96.png'; }} />
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
        
        {/* PAGINERING LOGIK */}
        {searchResults.length > 0 && totalResults > pageSize && (() => {
          const totalPages = Math.ceil(totalResults / pageSize);
          return (
            <div className="pagination-container">
              <button disabled={currentPage === 1 || isLoading} onClick={() => goToPage(currentPage - 1)} className="pagination-btn">
                &laquo;
              </button>

              {totalPages <= 4 ? (
                <div className="pagination-numbers">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => goToPage(i + 1)}
                      className={`page-num-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      disabled={isLoading}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="pagination-info">Page <strong>{currentPage}</strong> of {totalPages}</span>
              )}

              <button disabled={currentPage === totalPages || isLoading} onClick={() => goToPage(currentPage + 1)} className="pagination-btn">
                &raquo;
              </button>
            </div>
          );
        })()}

        {!isLoading && hasSearched && searchResults.length === 0 && (
          <p style={{ textAlign: 'center', marginTop: '20px' }}>No results found for "{searchQuery}".</p>
        )}
      </section>

      <hr />

      <section className="collection-section">
        <div className="collection-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <h2>{collectionNames[activeTab]} ({sortedCollection.length}{selectedTheme || collectionSearchQuery ? ` of ${currentCollection.length}` : ''})</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <p className="total-stats">Total: <strong>{filteredTotalParts.toLocaleString()}</strong> pieces</p>
                <button onClick={() => setShowStats(!showStats)} className="stats-toggle-btn">📊</button>
                <button onClick={() => setIsListView(!isListView)} className="view-toggle-btn">{isListView ? '⊞' : '☰'}</button>
              </div>
            </div>

            <div className="collection-controls">
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <input type="text" placeholder="Search your collection..." value={collectionSearchQuery} onChange={(e) => setCollectionSearchQuery(e.target.value)} className="collection-search-input" />
                {collectionSearchQuery && <button type="button" onClick={() => setCollectionSearchQuery('')} className="clear-input-btn">×</button>}
              </div>
              <div className="sort-controls">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
                  <option value="name">Name</option>
                  <option value="year">Year</option>
                  <option value="parts">Pieces</option>
                  <option value="set_num">Set Number</option>
                  <option value="theme">Theme</option>
                </select>
                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="sort-order-btn">{sortOrder === 'asc' ? '↑' : '↓'}</button>
              </div>
            </div>

            {themes.length > 0 && (
              <div className="theme-filters">
                <button onClick={() => setSelectedTheme(null)} className={selectedTheme === null ? 'theme-tag active' : 'theme-tag'}>All Themes</button>
                {themes.map(id => (
                  <button key={id} onClick={() => setSelectedTheme(id)} className={selectedTheme === id ? 'theme-tag active' : 'theme-tag'}>{getThemeName(id)} ({currentCollection.filter(s => s.theme_id === id).length})</button>
                ))}
              </div>
            )}
          </div>
          <div className="data-actions">
            <button onClick={exportJSON} className="secondary-btn">Export JSON</button>
            <label className="file-upload">Import to This Tab<input type="file" accept=".json" onChange={importJSON} hidden /></label>
          </div>
        </div>

        {sortedCollection.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>{selectedTheme || collectionSearchQuery ? 'No sets found with current filters.' : 'This collection is empty.'}</p>
        ) : (
          <div className={isListView ? "lego-list-view" : "lego-grid"}>
            {paginatedCollection.map(set => (
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

        {collectionTotalPages > 1 && (
          <div className="pagination-container">
            <button
              disabled={displayedCollectionPage === 1}
              onClick={() => setCollectionPage(displayedCollectionPage - 1)}
              className="pagination-btn"
              aria-label="Previous collection page"
            >
              &laquo;
            </button>

            {collectionTotalPages <= 4 ? (
              <div className="pagination-numbers">
                {[...Array(collectionTotalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCollectionPage(i + 1)}
                    className={`page-num-btn ${displayedCollectionPage === i + 1 ? 'active' : ''}`}
                    aria-current={displayedCollectionPage === i + 1 ? 'page' : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            ) : (
              <span className="pagination-info">
                Page <strong>{displayedCollectionPage}</strong> of {collectionTotalPages}
              </span>
            )}

            <button
              disabled={displayedCollectionPage === collectionTotalPages}
              onClick={() => setCollectionPage(displayedCollectionPage + 1)}
              className="pagination-btn"
              aria-label="Next collection page"
            >
              &raquo;
            </button>
          </div>
        )}
      </section>

      <footer>
        <p className='credits'>Data provided by <a href="https://rebrickable.com/api/" target="_blank" rel="noopener noreferrer">Rebrickable API</a></p>
        <p className='credits'>Made by <a href="https://frontend-erik.se" target="_blank" rel="noopener noreferrer">Erik Karlsson</a></p>
      </footer>
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} stats={stats} />
      {confirmState && (
        <div className="modal-overlay" onClick={() => setConfirmState(null)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <p>{confirmState.message}</p>
            <div className="confirm-buttons">
              <button onClick={() => { confirmState.onConfirm(); setConfirmState(null); }}>Confirm</button>
              <button onClick={() => setConfirmState(null)} className="secondary-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;