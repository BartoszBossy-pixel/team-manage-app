import React, { useState, useEffect, useMemo } from 'react';
import { JiraIssue } from '../api/jiraClient';
import AnimatedTooltip from './AnimatedTooltip';
import ColumnResizer from './ColumnResizer';
import { getInitials } from '../utils/avatarUtils';
import { useUsers } from '../hooks/useUsers';
import { useTableSettings } from '../hooks/useTableSettings';

interface ToTakeTableProps {
  teamName?: string;
}

const ToTakeTable: React.FC<ToTakeTableProps> = ({ teamName = "Pixels" }) => {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getUserAvatarStyle } = useUsers();
  
  // Use table settings hook for localStorage integration
  const {
    settings: tableSettings,
    updateFilters,
    updateSort,
    updateColumnWidth,
    getColumnWidth
  } = useTableSettings('to-take');

  // Dropdown visibility state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Local state for UI (derived from table settings)
  const [showFilters, setShowFilters] = useState(false);
  
  // Get current filters and sort from settings
  const filters = {
    status: tableSettings?.filters?.status || [],
    assignee: tableSettings?.filters?.assignee || [],
    type: tableSettings?.filters?.type || [],
    priority: tableSettings?.filters?.priority || [],
    searchText: tableSettings?.filters?.searchText || ''
  };
  
  const sortConfig = tableSettings?.sort ? {
    key: tableSettings.sort.column,
    direction: tableSettings.sort.direction
  } : null;

  // Get column widths from settings
  const getColumnWidthPercent = (columnKey: string): number => {
    const width = getColumnWidth(columnKey);
    if (width) return (width / 12); // Convert from pixels to percentage (assuming 1200px total width)
    
    // Default widths for to-take table
    const defaultWidths: { [key: string]: number } = {
      number: 5, key: 10, summary: 35, status: 12, type: 10, priority: 6, assignee: 8, created: 14
    };
    return defaultWidths[columnKey] || 8;
  };

  // Cache for API responses
  const [dataCache, setDataCache] = useState<{
    data: JiraIssue[];
    timestamp: number;
    teamName: string;
  } | null>(null);

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  const fetchToTakeIssues = async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && dataCache &&
        dataCache.teamName === teamName &&
        Date.now() - dataCache.timestamp < CACHE_DURATION) {
      setIssues(dataCache.data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // JQL query for "Do wzięcia" statuses
      let jql = `project="${import.meta.env.VITE_GLOBAL_DELIVERY || 'Global Delivery'}"`;
      
      // Add team filter
      if (teamName && teamName.toLowerCase() === 'pixels') {
        jql += ` AND ("Team (GOLD)[Dropdown]"=Pixels OR assignee in(${import.meta.env.VITE_ID_ALICJA},${import.meta.env.VITE_ID_RAKU},${import.meta.env.VITE_ID_TOMEK}, ${import.meta.env.VITE_ID_KRZYSIEK}, ${import.meta.env.VITE_ID_OLIWER}))`;
      } else if (teamName && teamName.toLowerCase() !== 'all') {
        jql += ` AND ("Team (GOLD)[Dropdown]"="${teamName}")`;
      }
      
      // Fixed status filter for "Do wzięcia"
      jql += ` AND (status IN ("On Hold", "New", "Prioritized", "Accepted", "To Do"))`;
      
      // Add platform filter
      jql += ` AND "Platform[Dropdown]" in (SE)`;
      
      // Add sorting
      jql += ` ORDER BY cf[14219] ASC, assignee ASC, status ASC`;

      console.log('=== DEBUG FETCH TO TAKE ISSUES ===');
      console.log('JQL Query:', jql);
      console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);
      console.log('Jira Domain:', import.meta.env.VITE_JIRA_DOMAIN);
      console.log('Jira Email:', import.meta.env.VITE_JIRA_EMAIL);
      console.log('Has API Token:', !!import.meta.env.VITE_JIRA_API_TOKEN);

      // Use the general search endpoint
      const params = new URLSearchParams({
        domain: import.meta.env.VITE_JIRA_DOMAIN || '',
        auth: btoa(`${import.meta.env.VITE_JIRA_EMAIL || ''}:${import.meta.env.VITE_JIRA_API_TOKEN || ''}`),
        jql: jql,
        maxResults: '100'
      });
      
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/jira-search?${params}`;
      console.log('Full API URL:', apiUrl);
      
      const response = await fetch(apiUrl);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      console.log('Issues count:', data.issues?.length || 0);
      
      const issuesData = data.issues || [];
      
      // Cache the response
      setDataCache({
        data: issuesData,
        timestamp: Date.now(),
        teamName: teamName || 'all'
      });
      
      setIssues(issuesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch to take issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToTakeIssues();
  }, [teamName]);


  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    // Update sort in database
    updateSort({ column: key, direction });
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <i className="fas fa-sort" style={{ fontSize: '12px', opacity: 0.7 }}></i>;
    }
    return sortConfig.direction === 'asc' ?
      <i className="fas fa-sort-up" style={{ fontSize: '12px', opacity: 0.7 }}></i> :
      <i className="fas fa-sort-down" style={{ fontSize: '12px', opacity: 0.7 }}></i>;
  };

  const handleColumnResize = (columnKey: string, newWidth: number) => {
    // Update column width in database
    updateColumnWidth(columnKey, newWidth);
  };

  const truncateText = (text: string, availableWidth: number) => {
    const maxLength = Math.floor(availableWidth / 8);
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const getColumnPixelWidth = (percentage: number) => {
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      return (tableContainer.clientWidth * percentage) / 100;
    }
    return 100;
  };


  const getPriorityIcon = (priority?: string) => {
    const priorityLower = priority?.toLowerCase();
    switch (priorityLower) {
      case 'blocker':
        return { icon: <i className="fas fa-ban"></i>, color: '#8b0000' };
      case 'critical':
      case 'highest':
        return { icon: <i className="fas fa-exclamation-triangle"></i>, color: '#d04437' };
      case 'major':
      case 'high':
        return { icon: <i className="fas fa-exclamation"></i>, color: '#f79232' };
      case 'medium':
      case 'normal':
        return { icon: <i className="fas fa-minus"></i>, color: '#59afe1' };
      case 'minor':
      case 'low':
        return { icon: <i className="fas fa-chevron-down"></i>, color: '#14892c' };
      case 'trivial':
      case 'lowest':
        return { icon: <i className="fas fa-circle"></i>, color: '#707070' };
      default:
        return { icon: <i className="fas fa-circle"></i>, color: '#707070' };
    }
  };

  const getTypeColor = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case 'bug':
        return '#ff6b6b';
      case 'story':
        return '#4ecdc4';
      case 'task':
      case 'technical task':
        return '#45b7d1';
      case 'feature':
      case 'new feature':
        return '#96ceb4';
      case 'epic':
        return '#feca57';
      case 'sub-task':
        return '#87ceeb';
      case 'improvement':
        return '#32cd32';
      default:
        return '#a8a8a8';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'to do':
        return '#a8a8a8';
      case 'new':
        return '#87ceeb';
      case 'prioritized':
        return '#ffa500';
      case 'accepted':
        return '#32cd32';
      case 'on hold':
        return '#ff6b6b';
      default:
        return '#666666';
    }
  };

  // All possible Jira options (not just from current data)
  const getAllJiraOptions = (field: string) => {
    switch (field) {
      case 'status':
        return [
          'On Hold',
          'New',
          'Prioritized',
          'Accepted',
          'To Do'
        ].sort();
      
      case 'assignee':
        // Get current assignees from data and add common ones
        const currentAssignees = new Set<string>();
        issues.forEach(issue => {
          const assignee = issue.fields.assignee?.displayName || 'Nieprzypisane';
          currentAssignees.add(assignee);
        });
        return Array.from(currentAssignees).sort();
      
      case 'type':
        return [
          'Bug',
          'Story',
          'Task',
          'Technical Task',
          'Feature',
          'New Feature',
          'Epic',
          'Sub-task',
          'Improvement',
          'Development',
          'TechEpic',
          'Integration Task',
          'Research',
          'Spike',
          'Defect',
          'Enhancement',
          'Support',
          'Incident',
          'Change Request',
          'Documentation'
        ].sort();
      
      case 'priority':
        return [
          'Blocker',
          'Critical',
          'Highest',
          'High',
          'Major',
          'Medium',
          'Normal',
          'Minor',
          'Low',
          'Lowest',
          'Trivial',
          'Brak priorytetu'
        ];
      
      default:
        return [];
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      status: [],
      assignee: [],
      type: [],
      priority: [],
      searchText: ''
    };
    updateFilters(clearedFilters);
  };

  // Handle multiselect changes
  const handleMultiSelectChange = (field: 'status' | 'assignee' | 'type' | 'priority', value: string) => {
    const currentValues = filters[field] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    const newFilters = {
      ...filters,
      [field]: newValues
    };
    
    // Update filters in database
    updateFilters(newFilters);
  };

  // Get display text for multiselect
  const getMultiSelectDisplayText = (field: 'status' | 'assignee' | 'type' | 'priority') => {
    const values = filters[field] as string[];
    if (values.length === 0) {
      switch (field) {
        case 'status': return 'Wszystkie statusy';
        case 'assignee': return 'Wszyscy użytkownicy';
        case 'type': return 'Wszystkie typy';
        case 'priority': return 'Wszystkie priorytety';
      }
    }
    if (values.length === 1) {
      return values[0];
    }
    return `Wybrano ${values.length}`;
  };

  // Handle dropdown toggle
  const toggleDropdown = (dropdownName: string) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  // Handle click outside to close dropdown
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element;
    if (!target.closest('.multiselect-container')) {
      setOpenDropdown(null);
    }
  };

  // Add event listener for clicking outside
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter and sort logic
  const filteredIssues = useMemo(() => {
    let filtered = [...issues];

    // Apply filters
    if (filters.status.length > 0) {
      filtered = filtered.filter(issue => filters.status.includes(issue.fields.status.name));
    }
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(issue => {
        const assigneeName = issue.fields.assignee?.displayName || 'Nieprzypisane';
        return filters.assignee.includes(assigneeName);
      });
    }
    if (filters.type.length > 0) {
      filtered = filtered.filter(issue => filters.type.includes(issue.fields.issuetype.name));
    }
    if (filters.priority.length > 0) {
      filtered = filtered.filter(issue => {
        const priorityName = issue.fields.priority?.name || 'Brak priorytetu';
        return filters.priority.includes(priorityName);
      });
    }
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(issue =>
        issue.key.toLowerCase().includes(searchLower) ||
        issue.fields.summary.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (!sortConfig) return filtered;

    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'number':
          aValue = issues.indexOf(a) + 1;
          bValue = issues.indexOf(b) + 1;
          break;
        case 'key':
          aValue = a.key;
          bValue = b.key;
          break;
        case 'summary':
          aValue = a.fields.summary;
          bValue = b.fields.summary;
          break;
        case 'status':
          aValue = a.fields.status.name;
          bValue = b.fields.status.name;
          break;
        case 'type':
          aValue = a.fields.issuetype.name;
          bValue = b.fields.issuetype.name;
          break;
        case 'priority':
          aValue = a.fields.priority?.name || '';
          bValue = b.fields.priority?.name || '';
          break;
        case 'assignee':
          aValue = a.fields.assignee?.displayName || '';
          bValue = b.fields.assignee?.displayName || '';
          break;
        case 'created':
          aValue = new Date(a.fields.created);
          bValue = new Date(b.fields.created);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [issues, filters, sortConfig]);


  if (loading) {
    return (
      <div className="kpi-card">
        <h3><i className="fas fa-inbox"></i> Do wzięcia - Zespół {teamName}</h3>
        <div className="loading" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '40px',
          color: 'var(--win11-dark-text-secondary)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0, 95, 184, 0.3)',
            borderTop: '3px solid var(--win11-accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
              <i className="fas fa-hourglass-half"></i> Ładowanie zadań...
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              {dataCache ? 'Aktualizowanie danych...' : 'Pobieranie danych z Jira...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kpi-card">
        <h3><i className="fas fa-inbox"></i> Do wzięcia - Zespół {teamName}</h3>
        <div className="error">
          <p><i className="fas fa-times-circle"></i> Błąd: {error}</p>
          <button onClick={() => fetchToTakeIssues(true)} className="refresh-icon-button" title="Spróbuj ponownie">
            <i className="fas fa-redo-alt"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-card">
      <div className="table-header">
        <h3>Do wzięcia ({filteredIssues.length})</h3>
        <div className="header-controls">
          <button
            className="refresh-icon-button"
            onClick={() => setShowFilters(!showFilters)}
            title={showFilters ? "Ukryj filtry" : "Pokaż filtry"}
          >
            <i className="fas fa-search"></i>
          </button>
          <button onClick={() => fetchToTakeIssues(true)} className="refresh-icon-button" title="Odśwież">
            <i className="fas fa-redo-alt"></i>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Status:</label>
              <div className="multiselect-container">
                <AnimatedTooltip
                  content={filters.status.length > 0 ? `Wybrane statusy: ${filters.status.join(', ')}` : 'Wszystkie statusy'}
                  position="top"
                >
                  <div
                    className="multiselect-display"
                    onClick={() => toggleDropdown('status')}
                  >
                    {getMultiSelectDisplayText('status')}
                  </div>
                </AnimatedTooltip>
                <div className={`multiselect-options ${openDropdown === 'status' ? 'open' : ''}`}>
                  {getAllJiraOptions('status').map(status => (
                    <label key={status} className="multiselect-option">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => handleMultiSelectChange('status', status)}
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label>Przypisany:</label>
              <div className="multiselect-container">
                <AnimatedTooltip
                  content={filters.assignee.length > 0 ? `Wybrani użytkownicy: ${filters.assignee.join(', ')}` : 'Wszyscy użytkownicy'}
                  position="top"
                >
                  <div
                    className="multiselect-display"
                    onClick={() => toggleDropdown('assignee')}
                  >
                    {getMultiSelectDisplayText('assignee')}
                  </div>
                </AnimatedTooltip>
                <div className={`multiselect-options ${openDropdown === 'assignee' ? 'open' : ''}`}>
                  {getAllJiraOptions('assignee').map(assignee => (
                    <label key={assignee} className="multiselect-option">
                      <input
                        type="checkbox"
                        checked={filters.assignee.includes(assignee)}
                        onChange={() => handleMultiSelectChange('assignee', assignee)}
                      />
                      <span>{assignee}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label>Typ:</label>
              <div className="multiselect-container">
                <AnimatedTooltip
                  content={filters.type.length > 0 ? `Wybrane typy: ${filters.type.join(', ')}` : 'Wszystkie typy'}
                  position="top"
                >
                  <div
                    className="multiselect-display"
                    onClick={() => toggleDropdown('type')}
                  >
                    {getMultiSelectDisplayText('type')}
                  </div>
                </AnimatedTooltip>
                <div className={`multiselect-options ${openDropdown === 'type' ? 'open' : ''}`}>
                  {getAllJiraOptions('type').map(type => (
                    <label key={type} className="multiselect-option">
                      <input
                        type="checkbox"
                        checked={filters.type.includes(type)}
                        onChange={() => handleMultiSelectChange('type', type)}
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label>Priorytet:</label>
              <div className="multiselect-container">
                <AnimatedTooltip
                  content={filters.priority.length > 0 ? `Wybrane priorytety: ${filters.priority.join(', ')}` : 'Wszystkie priorytety'}
                  position="top"
                >
                  <div
                    className="multiselect-display"
                    onClick={() => toggleDropdown('priority')}
                  >
                    {getMultiSelectDisplayText('priority')}
                  </div>
                </AnimatedTooltip>
                <div className={`multiselect-options ${openDropdown === 'priority' ? 'open' : ''}`}>
                  {getAllJiraOptions('priority').map(priority => (
                    <label key={priority} className="multiselect-option">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(priority)}
                        onChange={() => handleMultiSelectChange('priority', priority)}
                      />
                      <span>{priority}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-group">
              <label>Szukaj:</label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => {
                  const newFilters = {...filters, searchText: e.target.value};
                  updateFilters(newFilters);
                }}
                placeholder="Wpisz tekst..."
              />
            </div>

            <div className="filter-group">
              <button className="refresh-icon-button" onClick={clearFilters} title="Wyczyść filtry">
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredIssues.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-check-circle"></i> Brak zadań do wzięcia dla zespołu {teamName}!
        </div>
      ) : (
        <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
          <table className="team-tasks-table" style={{
            width: '100%',
            tableLayout: 'fixed',
            minWidth: '1000px'
          }}>
            <thead>
              <tr>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('number')}%`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1628)',
                    textAlign: 'center'
                  }}
                  onClick={() => handleSort('number')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="#">#</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('number')}</span>
                  </div>
                  <ColumnResizer columnKey="number" onResize={handleColumnResize} minWidth={30} maxWidth={100} />
                </th>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('key')}%`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1628)'
                  }}
                  onClick={() => handleSort('key')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="Klucz"><i className="fas fa-key"></i> Klucz</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('key')}</span>
                  </div>
                  <ColumnResizer columnKey="key" onResize={handleColumnResize} minWidth={60} maxWidth={150} />
                </th>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('summary')}%`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1628)'
                  }}
                  onClick={() => handleSort('summary')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="Tytuł"><i className="fas fa-file-alt"></i> Tytuł</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('summary')}</span>
                  </div>
                  <ColumnResizer columnKey="summary" onResize={handleColumnResize} minWidth={200} maxWidth={500} />
                </th>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('status')}%`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1628)'
                  }}
                  onClick={() => handleSort('status')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="Status"><i className="fas fa-chart-bar"></i> Status</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('status')}</span>
                  </div>
                  <ColumnResizer columnKey="status" onResize={handleColumnResize} minWidth={80} maxWidth={150} />
                </th>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('type')}%`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1628)'
                  }}
                  onClick={() => handleSort('type')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="Typ"><i className="fas fa-tag"></i> Typ</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('type')}</span>
                  </div>
                  <ColumnResizer columnKey="type" onResize={handleColumnResize} minWidth={60} maxWidth={120} />
                </th>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('priority')}%`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1628)'
                  }}
                  onClick={() => handleSort('priority')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="Priorytet"><i className="fas fa-bolt"></i> Priorytet</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('priority')}</span>
                  </div>
                  <ColumnResizer columnKey="priority" onResize={handleColumnResize} minWidth={50} maxWidth={100} />
                </th>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('assignee')}%`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1628)'
                  }}
                  onClick={() => handleSort('assignee')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="Przypisany"><i className="fas fa-user"></i> Przypisany</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('assignee')}</span>
                  </div>
                  <ColumnResizer columnKey="assignee" onResize={handleColumnResize} minWidth={60} maxWidth={120} />
                </th>
                <th
                  className="resizable-column"
                  style={{
                    width: `${getColumnWidthPercent('created')}%`,
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => handleSort('created')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flex: 1
                    }} title="Utworzono"><i className="fas fa-calendar-alt"></i> Utworzono</span>
                    <span style={{ fontSize: '12px', opacity: 0.7, flexShrink: 0, marginLeft: '4px' }}>{getSortIcon('created')}</span>
                  </div>
                  <ColumnResizer columnKey="created" onResize={handleColumnResize} minWidth={100} maxWidth={180} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((issue, index) => (
                <tr key={issue.key}>
                  <td style={{ width: `${getColumnWidthPercent('number')}%` }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: 'var(--win11-dark-text-secondary)',
                      fontWeight: '500'
                    }}>
                      {index + 1}
                    </div>
                  </td>
                  <td style={{ width: `${getColumnWidthPercent('key')}%` }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <AnimatedTooltip content={issue.key} position="top">
                        <a
                          href={`https://${import.meta.env.VITE_JIRA_DOMAIN}/browse/${issue.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="issue-key-link"
                        >
                          {truncateText(issue.key, getColumnPixelWidth(getColumnWidthPercent('key')))}
                        </a>
                      </AnimatedTooltip>
                    </div>
                  </td>
                  <td style={{ width: `${getColumnWidthPercent('summary')}%` }}>
                    <AnimatedTooltip content={issue.fields.summary} position="top">
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--win11-dark-text-primary)'
                      }}>
                        {truncateText(issue.fields.summary, getColumnPixelWidth(getColumnWidthPercent('summary')))}
                      </div>
                    </AnimatedTooltip>
                  </td>
                  <td style={{ width: `${getColumnWidthPercent('status')}%` }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <AnimatedTooltip content={issue.fields.status.name} position="top">
                        <span className="issue-type-badge" style={{
                          backgroundColor: getStatusColor(issue.fields.status.name)
                        }}>
                          {truncateText(issue.fields.status.name, getColumnPixelWidth(getColumnWidthPercent('status')))}
                        </span>
                      </AnimatedTooltip>
                    </div>
                  </td>
                  <td style={{ width: `${getColumnWidthPercent('type')}%` }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <AnimatedTooltip content={issue.fields.issuetype.name} position="top">
                        <span className="issue-type-badge" style={{
                          backgroundColor: getTypeColor(issue.fields.issuetype.name)
                        }}>
                          {truncateText(issue.fields.issuetype.name, getColumnPixelWidth(getColumnWidthPercent('type')))}
                        </span>
                      </AnimatedTooltip>
                    </div>
                  </td>
                  <td style={{ width: `${getColumnWidthPercent('priority')}%` }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {issue.fields.priority ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }}>
                          <AnimatedTooltip content={`Priorytet: ${issue.fields.priority.name}`} position="top">
                            <span
                              style={{
                                fontSize: '16px',
                                cursor: 'help',
                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                              }}
                            >
                              {getPriorityIcon(issue.fields.priority.name).icon}
                            </span>
                          </AnimatedTooltip>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }}>
                          <AnimatedTooltip content="Brak priorytetu" position="top">
                            <span
                              style={{
                                fontSize: '16px',
                                cursor: 'help'
                              }}
                            >
                              {getPriorityIcon().icon}
                            </span>
                          </AnimatedTooltip>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ width: `${getColumnWidthPercent('assignee')}%` }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {issue.fields.assignee ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }}>
                          <AnimatedTooltip content={issue.fields.assignee.displayName} position="top">
                            <div
                              className="assignee-avatar"
                              style={{
                                ...getUserAvatarStyle(issue.fields.assignee.displayName),
                                cursor: 'help'
                              }}
                            >
                              {getInitials(issue.fields.assignee.displayName)}
                            </div>
                          </AnimatedTooltip>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }}>
                          <AnimatedTooltip content="Nieprzypisane" position="top">
                            <span
                              style={{
                                color: 'var(--win11-dark-text-tertiary)',
                                fontSize: '12px',
                                cursor: 'help'
                              }}
                            >
                              -
                            </span>
                          </AnimatedTooltip>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{
                    width: `${getColumnWidthPercent('created')}%`,
                    fontSize: '14px',
                    color: 'var(--win11-dark-text-secondary)'
                  }}>
                    <AnimatedTooltip content={formatDate(issue.fields.created)} position="top">
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatDate(issue.fields.created)}
                      </div>
                    </AnimatedTooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ToTakeTable;