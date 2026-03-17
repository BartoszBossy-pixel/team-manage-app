import React, { useState, useEffect, useMemo } from 'react';
import { JiraIssue } from '../api/jiraClient';
import AnimatedTooltip from './AnimatedTooltip';
import ColumnResizer from './ColumnResizer';
import { getInitials } from '../utils/avatarUtils';
import { useUsers } from '../hooks/useUsers';
import { usePixelsTeam } from '../hooks/usePixelsTeam';
import { groupIssuesWithSubtasks } from '../utils/subtaskGrouping';

const STORAGE_KEY = 'devTasksSelectedDevId';

const DevTasksTable: React.FC = () => {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getUserAvatarStyle } = useUsers();
  const { members: pixelsTeam } = usePixelsTeam();
  const env = import.meta.env;

  const [selectedDevId, setSelectedDevId] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) { localStorage.setItem(STORAGE_KEY, ''); return ''; }
    return stored;
  });

  // Set first team member as default once the list loads
  useEffect(() => {
    if (!selectedDevId && pixelsTeam.length > 0) {
      setSelectedDevId(pixelsTeam[0].accountId);
    }
  }, [pixelsTeam, selectedDevId]);

  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const toggleParent = (key: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleDevChange = (id: string) => {
    setSelectedDevId(id);
    localStorage.setItem(STORAGE_KEY, id);
    setOpenDropdown(false);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.dev-selector')) setOpenDropdown(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const devOptions = useMemo(
    () => pixelsTeam.map(m => ({ id: m.accountId, name: m.displayName })),
    [pixelsTeam],
  );

  const selectedDevName = devOptions.find(d => d.id === selectedDevId)?.name || 'Wybierz dewelopera';

  const fetchIssues = async () => {
    if (!selectedDevId) return;
    setLoading(true);
    setError(null);
    try {
      let jql = `project="${env.VITE_GLOBAL_DELIVERY || 'Global Delivery'}"`;
      jql += ` AND assignee = "${selectedDevId}"`;
      jql += ` AND (status IN ("In development", "In progress", "In review", "More Info Requested Internal", "More Info Requested External"))`;
      jql += ` AND "Platform[Dropdown]" in (SE)`;
      jql += ` ORDER BY cf[14219] ASC, status ASC`;

      const response = await fetch(
        `${env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/jira-search?` +
        new URLSearchParams({
          domain: env.VITE_JIRA_DOMAIN || '',
          auth: btoa(`${env.VITE_JIRA_EMAIL || ''}:${env.VITE_JIRA_API_TOKEN || ''}`),
          jql,
          maxResults: '50',
        })
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIssues(); }, [selectedDevId]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const getColumnWidthPercent = (col: string) => {
    if (columnWidths[col]) return columnWidths[col] / 12;
    const defaults: Record<string, number> = {
      number: 4, key: 12, summary: 28, status: 11, type: 9, priority: 5,
      assignee: 6, eddDev: 10, days: 7,
    };
    return defaults[col] || 8;
  };

  const getColumnPixelWidth = (pct: number) => {
    const el = document.querySelector('.table-container');
    return el ? (el.clientWidth * pct) / 100 : 100;
  };

  const truncateText = (text: string, w: number) => {
    const max = Math.floor(w / 8);
    return text.length <= max ? text : text.slice(0, max - 3) + '...';
  };

  const formatDate = (d: Date | null) => {
    if (!d) return '-';
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getEddDevDate = (issue: JiraIssue) => {
    const v = (issue.fields as any).customfield_14219;
    return v ? new Date(v) : null;
  };

  const getDaysInProgress = (created: string) => {
    return Math.floor((Date.now() - new Date(created).getTime()) / 86400000);
  };

  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'in development': case 'in progress': return '#1a6fc4';
      case 'in review': case 'code review': return '#8A61FF';
      case 'more info requested internal': case 'more info requested external': return '#F85900';
      case 'testing': return '#2FC862';
      default: return '#555577';
    }
  };

  const getTypeColor = (t: string) => {
    switch (t.toLowerCase()) {
      case 'bug': return '#ff6b6b';
      case 'story': return '#4ecdc4';
      case 'task': case 'technical task': return '#45b7d1';
      case 'feature': case 'new feature': return '#96ceb4';
      case 'sub-task': case 'development': return '#87ceeb';
      default: return '#a8a8a8';
    }
  };

  const getPriorityIcon = (p?: string) => {
    switch (p?.toLowerCase()) {
      case 'blocker': return { icon: <i className="fas fa-ban" />, color: '#8b0000' };
      case 'critical': case 'highest': return { icon: <i className="fas fa-exclamation-triangle" />, color: '#d04437' };
      case 'major': case 'high': return { icon: <i className="fas fa-exclamation" />, color: '#f79232' };
      case 'medium': case 'normal': return { icon: <i className="fas fa-minus" />, color: '#59afe1' };
      case 'minor': case 'low': return { icon: <i className="fas fa-chevron-down" />, color: '#14892c' };
      default: return { icon: <i className="fas fa-circle" />, color: '#707070' };
    }
  };

  // ── grouping ─────────────────────────────────────────────────────────────

  const groupedIssues = useMemo(() => groupIssuesWithSubtasks(issues), [issues]);

  // ── render ────────────────────────────────────────────────────────────────

  const renderRow = (rowIssue: JiraIssue, rowIndex: number, isSubtask: boolean, hasSubtasks: boolean, parentKey: string) => (
    <tr
      key={rowIssue.key}
      className={isSubtask ? 'subtask-row' : (hasSubtasks ? 'has-subtasks' : '')}
      onClick={(!isSubtask && hasSubtasks) ? () => toggleParent(parentKey) : undefined}
      style={{ cursor: (!isSubtask && hasSubtasks) ? 'pointer' : 'default' }}
    >
      <td style={{ width: `${getColumnWidthPercent('number')}%` }}>
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--win11-dark-text-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          {isSubtask ? '–' : (
            <>
              {hasSubtasks && <span style={{ fontSize: '9px', opacity: 0.6 }}>{expandedParents.has(parentKey) ? '▼' : '▶'}</span>}
              {rowIndex + 1}
            </>
          )}
        </div>
      </td>

      <td style={{ width: `${getColumnWidthPercent('key')}%` }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          paddingLeft: isSubtask ? '12px' : '0' }}>
          {isSubtask && <span style={{ color: 'var(--win11-dark-text-tertiary)', marginRight: '4px', fontSize: '10px' }}>└</span>}
          <AnimatedTooltip content={rowIssue.key} position="top">
            <a href={`https://${env.VITE_JIRA_DOMAIN}/browse/${rowIssue.key}`}
              target="_blank" rel="noopener noreferrer" className="issue-key-link"
              onClick={e => e.stopPropagation()}>
              {truncateText(rowIssue.key, getColumnPixelWidth(getColumnWidthPercent('key')))}
            </a>
          </AnimatedTooltip>
          {!isSubtask && hasSubtasks && (
            <span style={{ marginLeft: '4px', fontSize: '11px', opacity: 0.5, color: 'var(--win11-dark-text-tertiary)' }}>
              ({groupedIssues.find(g => g.parent.key === parentKey)?.subtasks.length})
            </span>
          )}
        </div>
      </td>

      <td style={{ width: `${getColumnWidthPercent('summary')}%` }}>
        <AnimatedTooltip content={rowIssue.fields.summary} position="top">
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'var(--win11-dark-text-primary)', paddingLeft: isSubtask ? '12px' : '0' }}>
            {truncateText(rowIssue.fields.summary, getColumnPixelWidth(getColumnWidthPercent('summary')))}
          </div>
        </AnimatedTooltip>
      </td>

      <td style={{ width: `${getColumnWidthPercent('status')}%` }}>
        <AnimatedTooltip content={rowIssue.fields.status.name} position="top">
          <span className="issue-type-badge" style={{ backgroundColor: getStatusColor(rowIssue.fields.status.name) }}>
            {truncateText(rowIssue.fields.status.name, getColumnPixelWidth(getColumnWidthPercent('status')))}
          </span>
        </AnimatedTooltip>
      </td>

      <td style={{ width: `${getColumnWidthPercent('type')}%` }}>
        <AnimatedTooltip content={rowIssue.fields.issuetype.name} position="top">
          <span className="issue-type-badge" style={{ backgroundColor: getTypeColor(rowIssue.fields.issuetype.name) }}>
            {truncateText(rowIssue.fields.issuetype.name, getColumnPixelWidth(getColumnWidthPercent('type')))}
          </span>
        </AnimatedTooltip>
      </td>

      <td style={{ width: `${getColumnWidthPercent('priority')}%` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatedTooltip content={rowIssue.fields.priority?.name || 'Brak priorytetu'} position="top">
            <span style={{ fontSize: '15px', cursor: 'help' }}>
              {getPriorityIcon(rowIssue.fields.priority?.name).icon}
            </span>
          </AnimatedTooltip>
        </div>
      </td>

      <td style={{ width: `${getColumnWidthPercent('assignee')}%` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {rowIssue.fields.assignee ? (
            <AnimatedTooltip content={rowIssue.fields.assignee.displayName} position="top">
              <div className="assignee-avatar"
                style={{ ...getUserAvatarStyle(rowIssue.fields.assignee.displayName), cursor: 'help' }}>
                {getInitials(rowIssue.fields.assignee.displayName)}
              </div>
            </AnimatedTooltip>
          ) : (
            <span style={{ color: 'var(--win11-dark-text-tertiary)', fontSize: '12px' }}>–</span>
          )}
        </div>
      </td>

      <td style={{ width: `${getColumnWidthPercent('eddDev')}%`, fontSize: '13px', color: 'var(--win11-dark-text-secondary)' }}>
        <AnimatedTooltip content={formatDate(getEddDevDate(rowIssue))} position="top">
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatDate(getEddDevDate(rowIssue))}
          </div>
        </AnimatedTooltip>
      </td>

      <td style={{ width: `${getColumnWidthPercent('days')}%`, fontSize: '13px',
        color: 'var(--win11-dark-text-secondary)', textAlign: 'center' }}>
        <AnimatedTooltip content={`${getDaysInProgress(rowIssue.fields.created)} dni w toku`} position="top">
          <div>{getDaysInProgress(rowIssue.fields.created)}</div>
        </AnimatedTooltip>
      </td>
    </tr>
  );

  return (
    <div className="kpi-card">
      <div className="table-header">
        <h3>
          <i className="fas fa-user-circle" style={{ color: 'var(--win11-accent)' }} />
          {' '}
          <span style={{ color: 'var(--win11-dark-text-secondary)', fontWeight: 400, fontSize: '13px' }}>Zadania: </span>

          {/* Developer selector */}
          <div className="dev-selector" style={{ display: 'inline-block', position: 'relative' }}>
            <span
              onClick={() => setOpenDropdown(o => !o)}
              style={{
                cursor: 'pointer',
                color: 'var(--win11-accent)',
                borderBottom: '1px dashed rgba(20,110,245,0.4)',
                paddingBottom: '1px',
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              {selectedDevName} <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
            </span>
            {openDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '6px', zIndex: 10000,
                background: '#0f0f1e', border: '1px solid rgba(20,110,245,0.25)', borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)', minWidth: '160px', overflow: 'hidden',
              }}>
                {devOptions.map(dev => (
                  <div
                    key={dev.id}
                    onClick={() => handleDevChange(dev.id)}
                    style={{
                      padding: '8px 14px', cursor: 'pointer', fontSize: '13px',
                      color: dev.id === selectedDevId ? 'var(--win11-accent)' : 'var(--win11-dark-text-primary)',
                      background: dev.id === selectedDevId ? 'rgba(20,110,245,0.1)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: dev.id === selectedDevId ? 600 : 400,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (dev.id !== selectedDevId) (e.currentTarget as HTMLElement).style.background = 'rgba(20,110,245,0.07)'; }}
                    onMouseLeave={e => { if (dev.id !== selectedDevId) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {dev.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </h3>

        <div className="header-controls">
          <span style={{ fontSize: '12px', color: 'var(--win11-dark-text-tertiary)', marginRight: '8px' }}>
            {issues.length} zadań
          </span>
          <button className="refresh-icon-button" onClick={() => fetchIssues()} title="Odśwież">
            <i className="fas fa-redo-alt" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 16px' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid rgba(20,110,245,0.2)',
            borderTop: '2px solid var(--win11-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--win11-dark-text-secondary)', fontSize: '14px' }}>Pobieranie zadań...</span>
        </div>
      )}

      {error && (
        <div className="error">
          <i className="fas fa-times-circle" /> Błąd: {error}
        </div>
      )}

      {!loading && !error && groupedIssues.length === 0 && (
        <div className="empty-state">
          <i className="fas fa-check-circle" /> Brak aktywnych zadań dla {selectedDevName}.
        </div>
      )}

      {!loading && !error && groupedIssues.length > 0 && (
        <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
          <table className="team-tasks-table" style={{ width: '100%', tableLayout: 'fixed', minWidth: '900px' }}>
            <thead>
              <tr>
                {[
                  { key: 'number', label: '#', icon: null, min: 30, max: 60 },
                  { key: 'key', label: 'Klucz', icon: 'fa-key', min: 80, max: 150 },
                  { key: 'summary', label: 'Tytuł', icon: 'fa-file-alt', min: 180, max: 500 },
                  { key: 'status', label: 'Status', icon: 'fa-chart-bar', min: 80, max: 150 },
                  { key: 'type', label: 'Typ', icon: 'fa-tag', min: 60, max: 120 },
                  { key: 'priority', label: 'Priorytet', icon: 'fa-bolt', min: 50, max: 100 },
                  { key: 'assignee', label: 'Przypisany', icon: 'fa-user', min: 60, max: 100 },
                  { key: 'eddDev', label: 'EDD Dev', icon: 'fa-bullseye', min: 80, max: 140 },
                  { key: 'days', label: 'Dni', icon: 'fa-clock', min: 50, max: 90 },
                ].map(col => (
                  <th key={col.key} className="resizable-column"
                    style={{ width: `${getColumnWidthPercent(col.key)}%`, userSelect: 'none',
                      borderRight: col.key !== 'days' ? '1px solid rgba(255,255,255,0.06)' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {col.icon && <i className={`fas ${col.icon}`} style={{ marginRight: '4px' }} />}
                        {col.label}
                      </span>
                    </div>
                    <ColumnResizer columnKey={col.key} onResize={(k, w) => setColumnWidths(prev => ({ ...prev, [k]: w }))}
                      minWidth={col.min} maxWidth={col.max} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedIssues.map((group, idx) => {
                const { parent, subtasks, isOrphanSubtask } = group;
                const hasSubtasks = subtasks.length > 0;
                const isExpanded = expandedParents.has(parent.key);
                return (
                  <React.Fragment key={parent.key}>
                    {renderRow(parent, idx, false, hasSubtasks && !isOrphanSubtask, parent.key)}
                    {isExpanded && subtasks.map(st => renderRow(st, 0, true, false, parent.key))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DevTasksTable;
