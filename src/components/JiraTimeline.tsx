import React, { useState, useEffect, useMemo } from 'react';
import { JiraIssue } from '../api/jiraClient';
import AnimatedTooltip from './AnimatedTooltip';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const MS_DAY = 86400000;

const getMondayOfWeek = (d: Date): Date => {
  const copy = new Date(d);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - (day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (d: Date, n: number): Date =>
  new Date(d.getTime() + n * MS_DAY);

const diffDays = (a: Date, b: Date): number =>
  Math.round((a.getTime() - b.getTime()) / MS_DAY);

const getQuarterLabel = (d: Date): string => {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
};

const getWeekNumber = (d: Date): number => {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = getMondayOfWeek(jan4);
  const weekMs = 7 * MS_DAY;
  return Math.floor((d.getTime() - startOfWeek1.getTime()) / weekMs) + 1;
};

const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

const fmt = (d: Date) =>
  d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskBar {
  issue: JiraIssue;
  startDay: number;   // offset from timelineStart in days
  durationDays: number;
  hasEdd: boolean;
  color: string;
  lane: number;       // vertical lane index within dev row (for overlap avoidance)
}

interface DevRow {
  assigneeName: string;
  tasks: TaskBar[];
  lanes: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKS_BEFORE = 2;
const WEEKS_TOTAL  = 16;
const LANE_H       = 28;   // px per task lane
const ROW_LABEL_W  = 120;  // px

const STATUS_COLORS: Record<string, string> = {
  'in development': '#146EF5',
  'in progress':    '#146EF5',
  'in review':      '#8A61FF',
  'code review':    '#8A61FF',
  'more info requested internal': '#F85900',
  'more info requested external': '#F85900',
  'testing':        '#2FC862',
};
const DEFAULT_COLOR = '#3a4a6b';

// ─── Component ────────────────────────────────────────────────────────────────

const JiraTimeline: React.FC = () => {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const env = import.meta.env;

  // ── timeline bounds ────────────────────────────────────────────────────────
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const timelineStart = useMemo(() => addDays(getMondayOfWeek(today), -WEEKS_BEFORE * 7), [today]);
  const timelineEnd   = useMemo(() => addDays(timelineStart, WEEKS_TOTAL * 7), [timelineStart]);
  const totalDays     = WEEKS_TOTAL * 7;

  // Array of Mondays
  const weeks = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < WEEKS_TOTAL; i++) arr.push(addDays(timelineStart, i * 7));
    return arr;
  }, [timelineStart]);

  // Today offset %
  const todayPct = useMemo(() =>
    Math.max(0, Math.min(100, (diffDays(today, timelineStart) / totalDays) * 100)),
  [today, timelineStart, totalDays]);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchIssues = async () => {
    setLoading(true); setError(null);
    try {
      let jql = `project="${env.VITE_GLOBAL_DELIVERY || 'Global Delivery'}"`;
      jql += ` AND ("Team (GOLD)[Dropdown]"=Pixels OR assignee in(${env.VITE_ID_ALICJA},${env.VITE_ID_RAKU},${env.VITE_ID_TOMEK},${env.VITE_ID_KRZYSIEK},${env.VITE_ID_OLIWER}))`;
      jql += ` AND (status IN ("In development","In progress","In review","More Info Requested Internal","More Info Requested External","Testing"))`;
      jql += ` AND "Platform[Dropdown]" in (SE)`;
      jql += ` ORDER BY assignee ASC, cf[14219] ASC`;

      const res = await fetch(
        `${env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/jira-search?` +
        new URLSearchParams({
          domain: env.VITE_JIRA_DOMAIN || '',
          auth: btoa(`${env.VITE_JIRA_EMAIL || ''}:${env.VITE_JIRA_API_TOKEN || ''}`),
          jql, maxResults: '100',
        })
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIssues(); }, []);

  // ── build rows ─────────────────────────────────────────────────────────────
  const devRows = useMemo((): DevRow[] => {
    const map = new Map<string, JiraIssue[]>();

    issues.forEach(issue => {
      const name = issue.fields.assignee?.displayName || 'Nieprzypisane';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(issue);
    });

    return Array.from(map.entries()).map(([name, devIssues]) => {
      // Assign lanes to avoid overlap
      const laneEnd: number[] = []; // laneEnd[i] = last day used by lane i

      const tasks: TaskBar[] = devIssues.map(issue => {
        const eddStart = (issue.fields as any).customfield_13587;
        const eddDev   = (issue.fields as any).customfield_14219;

        const start   = eddStart ? new Date(eddStart) : today;
        const end     = eddDev   ? new Date(eddDev)   : addDays(start, 7);
        const hasEdd  = !!eddDev;

        const startDay = diffDays(start, timelineStart);
        const endDay   = diffDays(end,   timelineStart);
        const durationDays = Math.max(1, endDay - startDay);

        const color = STATUS_COLORS[issue.fields.status.name.toLowerCase()] || DEFAULT_COLOR;

        // Find first free lane
        let lane = laneEnd.findIndex(e => e <= startDay);
        if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
        laneEnd[lane] = startDay + durationDays;

        return { issue, startDay, durationDays, hasEdd, color, lane };
      });

      const lanes = Math.max(1, ...tasks.map(t => t.lane + 1));
      return { assigneeName: name, tasks, lanes };
    });
  }, [issues, timelineStart, today]);

  // ── quarter groups ─────────────────────────────────────────────────────────
  const quarterGroups = useMemo(() => {
    const groups: { label: string; startWeek: number; spanWeeks: number }[] = [];
    let cur = '';
    weeks.forEach((w, i) => {
      const q = getQuarterLabel(w);
      if (q !== cur) {
        cur = q;
        groups.push({ label: q, startWeek: i, spanWeeks: 1 });
      } else {
        groups[groups.length - 1].spanWeeks++;
      }
    });
    return groups;
  }, [weeks]);

  // ─── render ────────────────────────────────────────────────────────────────

  const colW = `calc((100% - ${ROW_LABEL_W}px) / ${WEEKS_TOTAL})`;

  return (
    <div className="kpi-card" style={{ marginTop: '12px' }}>
      <div className="table-header">
        <h3><i className="fas fa-stream" style={{ color: 'var(--win11-accent)' }} /> Timeline zadań</h3>
        <div className="header-controls">
          <span style={{ fontSize: '12px', color: 'var(--win11-dark-text-tertiary)', marginRight: '8px' }}>
            {weeks[0] && `${fmt(timelineStart)} – ${fmt(timelineEnd)}`}
          </span>
          <button className="refresh-icon-button" onClick={fetchIssues} title="Odśwież">
            <i className="fas fa-redo-alt" />
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 0', color: 'var(--win11-dark-text-secondary)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%',
            border: '2px solid rgba(20,110,245,0.2)', borderTop: '2px solid var(--win11-accent)',
            animation: 'spin 1s linear infinite' }} />
          Pobieranie danych...
        </div>
      )}

      {error && (
        <div className="error"><i className="fas fa-times-circle" /> {error}</div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto', marginTop: '4px' }}>
          <div style={{ minWidth: `${ROW_LABEL_W + WEEKS_TOTAL * 70}px` }}>

            {/* ── Quarter header ─────────────────────────────── */}
            <div style={{ display: 'flex', marginLeft: `${ROW_LABEL_W}px`, marginBottom: '2px' }}>
              {quarterGroups.map(g => (
                <div key={g.label} style={{
                  width: `calc(${colW} * ${g.spanWeeks})`,
                  fontSize: '10px', fontWeight: 700, color: 'var(--win11-accent)',
                  textTransform: 'uppercase', letterSpacing: '0.8px',
                  paddingLeft: '6px', paddingBottom: '2px',
                  borderLeft: '2px solid rgba(20,110,245,0.35)',
                }}>
                  {g.label}
                </div>
              ))}
            </div>

            {/* ── Week header ─────────────────────────────────── */}
            <div style={{ display: 'flex', marginLeft: `${ROW_LABEL_W}px`, marginBottom: '6px' }}>
              {weeks.map((w, i) => {
                const isCurrentWeek = diffDays(today, w) >= 0 && diffDays(today, w) < 7;
                const isMonthStart  = w.getDate() <= 7;
                return (
                  <div key={i} style={{
                    width: colW, flexShrink: 0, textAlign: 'center',
                    fontSize: '10px', fontWeight: isCurrentWeek ? 700 : 400,
                    color: isCurrentWeek ? 'var(--win11-accent)' : 'var(--win11-dark-text-tertiary)',
                    background: isCurrentWeek ? 'rgba(20,110,245,0.08)' : 'transparent',
                    borderLeft: isMonthStart ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.03)',
                    borderRadius: isCurrentWeek ? '3px 3px 0 0' : '0',
                    padding: '3px 0',
                    userSelect: 'none',
                  }}>
                    <div>W{getWeekNumber(w)}</div>
                    {isMonthStart && (
                      <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '1px' }}>
                        {monthNames[w.getMonth()]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Developer rows ──────────────────────────────── */}
            {devRows.length === 0 && (
              <div className="empty-state">
                <i className="fas fa-check-circle" /> Brak aktywnych zadań na timeline.
              </div>
            )}

            {devRows.map(row => (
              <div key={row.assigneeName} style={{
                display: 'flex', alignItems: 'stretch',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                minHeight: `${row.lanes * LANE_H + 8}px`,
              }}>
                {/* Label */}
                <div style={{
                  width: `${ROW_LABEL_W}px`, flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                  fontSize: '12px', fontWeight: 500, fontFamily: 'Inter, sans-serif',
                  color: 'var(--win11-dark-text-secondary)',
                  paddingRight: '10px', paddingLeft: '4px',
                }}>
                  <i className="fas fa-user-circle" style={{ marginRight: '6px', opacity: 0.4, fontSize: '11px' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.assigneeName}
                  </span>
                </div>

                {/* Cells + task bars */}
                <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                  {/* Background week columns */}
                  {weeks.map((w, i) => {
                    const isCurrentWeek = diffDays(today, w) >= 0 && diffDays(today, w) < 7;
                    const isMonthStart  = w.getDate() <= 7;
                    return (
                      <div key={i} style={{
                        width: colW, flexShrink: 0, height: '100%',
                        background: isCurrentWeek ? 'rgba(20,110,245,0.04)' : 'transparent',
                        borderLeft: isMonthStart
                          ? '1px solid rgba(255,255,255,0.07)'
                          : '1px solid rgba(255,255,255,0.025)',
                      }} />
                    );
                  })}

                  {/* Today line */}
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `${todayPct}%`,
                    width: '2px',
                    background: 'rgba(20,110,245,0.7)',
                    zIndex: 10,
                    pointerEvents: 'none',
                  }} />

                  {/* Task bars */}
                  {row.tasks.map(task => {
                    const leftPct  = (task.startDay / totalDays) * 100;
                    const widthPct = (task.durationDays / totalDays) * 100;
                    const top      = 4 + task.lane * LANE_H;

                    // clamp to visible area
                    const clampedLeft  = Math.max(0, leftPct);
                    const clampedWidth = Math.min(widthPct, 100 - clampedLeft);
                    if (clampedWidth <= 0) return null;

                    const label = task.issue.fields.summary.length > 30
                      ? task.issue.fields.summary.slice(0, 28) + '…'
                      : task.issue.fields.summary;

                    const tooltipText = [
                      task.issue.key,
                      task.issue.fields.summary,
                      `Status: ${task.issue.fields.status.name}`,
                      task.hasEdd
                        ? `EDD Dev: ${fmt(addDays(timelineStart, task.startDay + task.durationDays))}`
                        : 'Brak EDD Dev',
                    ].join('\n');

                    return (
                      <AnimatedTooltip key={task.issue.key} content={tooltipText} position="top">
                        <a
                          href={`https://${env.VITE_JIRA_DOMAIN}/browse/${task.issue.key}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{
                            position: 'absolute',
                            left:  `${clampedLeft}%`,
                            width: `${clampedWidth}%`,
                            top:   `${top}px`,
                            height: `${LANE_H - 6}px`,
                            background: task.color,
                            borderRadius: '4px',
                            display: 'flex', alignItems: 'center',
                            padding: '0 6px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            zIndex: 5,
                            boxShadow: `0 1px 4px rgba(0,0,0,0.4)`,
                            border: task.hasEdd
                              ? 'none'
                              : '1px dashed rgba(255,255,255,0.3)',
                            opacity: task.startDay < 0 && (task.startDay + task.durationDays) < 0 ? 0.45 : 0.9,
                            transition: 'opacity 0.15s, box-shadow 0.15s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.opacity = '1';
                            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${task.color}66`;
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.opacity = task.startDay < 0 && (task.startDay + task.durationDays) < 0 ? '0.45' : '0.9';
                            (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
                          }}
                        >
                          <span style={{
                            fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.95)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            fontFamily: 'Inter, sans-serif', letterSpacing: '0.1px',
                          }}>
                            <span style={{ opacity: 0.65, marginRight: '4px', fontSize: '9px' }}>
                              {task.issue.key}
                            </span>
                            {label}
                          </span>
                        </a>
                      </AnimatedTooltip>
                    );
                  })}
                </div>
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && !error && devRows.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {Object.entries(STATUS_COLORS).filter(([k]) => !k.includes('more')).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--win11-dark-text-tertiary)', fontFamily: 'Inter, sans-serif',
                textTransform: 'capitalize' }}>
                {status}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px',
              background: DEFAULT_COLOR, border: '1px dashed rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--win11-dark-text-tertiary)', fontFamily: 'Inter, sans-serif' }}>
              brak EDD
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}>
            <div style={{ width: '2px', height: '14px', background: 'rgba(20,110,245,0.7)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--win11-dark-text-tertiary)', fontFamily: 'Inter, sans-serif' }}>
              dziś
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default JiraTimeline;
