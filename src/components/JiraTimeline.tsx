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
  startLabel: string; // human-readable source of start date
  endLabel: string;   // human-readable source of end date
  startDate: Date;
  endDate: Date;
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

const LEGEND_ITEMS = [
  { label: 'In Development / In Progress', color: '#146EF5' },
  { label: 'In Review',                    color: '#8A61FF' },
  { label: 'More Info Requested',          color: '#F85900' },
  { label: 'Testing',                      color: '#2FC862' },
];
const DEFAULT_COLOR = '#3a4a6b';
const TODO_COLOR    = '#4a7a6a'; // distinct teal-grey for queued/backlog tasks

// ─── Component ────────────────────────────────────────────────────────────────

const JiraTimeline: React.FC = () => {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [todoIssues, setTodoIssues] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevelopment, setShowDevelopment] = useState(true);
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
  const buildParams = (jql: string) => new URLSearchParams({
    domain: env.VITE_JIRA_DOMAIN || '',
    auth: btoa(`${env.VITE_JIRA_EMAIL || ''}:${env.VITE_JIRA_API_TOKEN || ''}`),
    jql, maxResults: '100',
  });

  const fetchIssues = async () => {
    setLoading(true); setError(null);
    try {
      const base = `project="${env.VITE_GLOBAL_DELIVERY || 'Global Delivery'}" AND "Team (GOLD)[Dropdown]"=Pixels AND "Platform[Dropdown]" in (SE)`;

      const [activeRes, todoRes] = await Promise.all([
        fetch(`${env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/jira-search?` +
          buildParams(`${base} AND status IN ("In development","In progress","In review","More Info Requested Internal","More Info Requested External","Testing") ORDER BY assignee ASC, cf[14219] ASC`)),
        fetch(`${env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/jira-search?` +
          buildParams(`${base} AND status IN ("On Hold","New","Prioritized","Accepted","To Do") ORDER BY cf[14219] ASC`)),
      ]);

      if (!activeRes.ok) throw new Error(`HTTP ${activeRes.status}`);
      const activeData = await activeRes.json();
      setIssues(activeData.issues || []);

      if (todoRes.ok) {
        const todoData = await todoRes.json();
        setTodoIssues(todoData.issues || []);
      }
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
        // cf_13568 = ETA Dev = planned dev START date
        // cf_14219 = EDD Dev = planned dev END date (delivery deadline)
        const inProgressDate = (issue.fields as any).statuscategorychangedate; // actual status change
        const etaDev         = (issue.fields as any).customfield_13568; // ETA Dev = dev start
        const eddDev         = (issue.fields as any).customfield_14219; // EDD Dev = dev end

        // End date
        const end      = eddDev ? new Date(eddDev) : null;
        const endLabel = eddDev ? 'EDD Dev' : 'Szacowany (+7d)';

        // Start: actual In-Progress date → ETA Dev (planned dev start) → today
        // Only use statuscategorychangedate when it is earlier than the end date
        // (guards against a recently-reopened task collapsing the bar to 1 day).
        const statusDate    = inProgressDate ? new Date(inProgressDate) : null;
        const useStatusDate = statusDate !== null && (end === null || statusDate < end);

        const start      = useStatusDate ? statusDate!
                         : etaDev        ? new Date(etaDev)
                         : today;
        const startLabel = useStatusDate ? 'In Progress od'
                         : etaDev        ? 'ETA Dev'
                         : 'Dziś (brak dat)';

        const effectiveEnd = end ?? addDays(start, 7);
        const hasEdd       = !!eddDev || !!etaDev;

        const startDay = diffDays(start,       timelineStart);
        const endDay   = diffDays(effectiveEnd, timelineStart);
        const durationDays = Math.max(1, endDay - startDay);

        const color = STATUS_COLORS[issue.fields.status.name.toLowerCase()] || DEFAULT_COLOR;

        // Find first free lane
        let lane = laneEnd.findIndex(e => e <= startDay);
        if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
        laneEnd[lane] = startDay + durationDays;

        return { issue, startDay, durationDays, hasEdd, color, lane, startLabel, endLabel, startDate: start, endDate: effectiveEnd };
      });

      const lanes = Math.max(1, ...tasks.map(t => t.lane + 1));
      return { assigneeName: name, tasks, lanes };
    });
  }, [issues, timelineStart, today]);

  // ── TO DO row ──────────────────────────────────────────────────────────────
  const todoRow = useMemo((): DevRow | null => {
    if (todoIssues.length === 0) return null;

    const laneEnd: number[] = [];

    const tasks: TaskBar[] = todoIssues.map(issue => {
      const etaDev = (issue.fields as any).customfield_13568;
      const eddDev = (issue.fields as any).customfield_14219;
      const labels: string[] = (issue.fields as any).labels || [];

      // Parse quarter labels: Q1_2026, Q2_2026, Q2-2026, Q2 2026, Q2 (year optional → current year)
      const currentYear = new Date().getFullYear();
      const quarters = labels
        .map(l => l.match(/^Q([1-4])(?:[_\- ]?(\d{4}))?$/i))
        .filter(Boolean)
        .map(m => ({ q: parseInt(m![1]), year: m![2] ? parseInt(m![2]) : currentYear }));

      let start: Date;
      let startLabel: string;
      let end: Date | null;
      let endLabel: string;
      let hasEdd: boolean;

      if (eddDev) {
        end      = new Date(eddDev);
        endLabel = 'EDD Dev';
        hasEdd   = true;
        start      = etaDev ? new Date(etaDev) : today;
        startLabel = etaDev ? 'ETA Dev' : 'Dziś (brak dat)';
      } else if (quarters.length > 0) {
        quarters.sort((a, b) => a.year !== b.year ? a.year - b.year : a.q - b.q);
        const earliest = quarters[0];
        const latest   = quarters[quarters.length - 1];
        start      = new Date(earliest.year, (earliest.q - 1) * 3, 1);          // 1st day of earliest quarter
        end        = new Date(latest.year,   latest.q * 3, 0);                   // last day of latest quarter
        startLabel = `Q${earliest.q} ${earliest.year}`;
        endLabel   = `Q${latest.q} ${latest.year}`;
        hasEdd     = true;
      } else {
        end        = null;
        endLabel   = 'Szacowany (+7d)';
        start      = etaDev ? new Date(etaDev) : today;
        startLabel = etaDev ? 'ETA Dev' : 'Dziś (brak dat)';
        hasEdd     = !!etaDev;
      }

      const effectiveEnd = end ?? addDays(start, 7);

      const startDay     = diffDays(start, timelineStart);
      const endDay       = diffDays(effectiveEnd, timelineStart);
      const durationDays = Math.max(1, endDay - startDay);

      let lane = laneEnd.findIndex(e => e <= startDay);
      if (lane === -1) { lane = laneEnd.length; laneEnd.push(0); }
      laneEnd[lane] = startDay + durationDays;

      return { issue, startDay, durationDays, hasEdd, color: TODO_COLOR, lane, startLabel, endLabel, startDate: start, endDate: effectiveEnd };
    });

    const lanes = Math.max(1, ...tasks.map(t => t.lane + 1));
    return { assigneeName: 'TO DO', tasks, lanes };
  }, [todoIssues, timelineStart, today]);

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

  const renderRow = (row: DevRow, isTodo = false) => (
    <div key={row.assigneeName} style={{
      display: 'flex', alignItems: 'stretch',
      borderTop: isTodo
        ? '2px dashed rgba(255,255,255,0.12)'
        : '1px solid rgba(255,255,255,0.04)',
      minHeight: `${row.lanes * LANE_H + 8}px`,
    }}>
      {/* Label */}
      <div style={{
        width: `${ROW_LABEL_W}px`, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        fontSize: '12px', fontWeight: isTodo ? 700 : 500, fontFamily: 'Inter, sans-serif',
        color: isTodo ? 'var(--win11-dark-text-primary)' : 'var(--win11-dark-text-secondary)',
        paddingRight: '10px', paddingLeft: '4px',
      }}>
        <i className={`fas ${isTodo ? 'fa-inbox' : 'fa-user-circle'}`}
           style={{ marginRight: '6px', opacity: 0.4, fontSize: '11px' }} />
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
          if (!showDevelopment && task.issue.fields.issuetype.name.toLowerCase().includes('development')) {
            return null;
          }
          const leftPct  = (task.startDay / totalDays) * 100;
          const rightPct = ((task.startDay + task.durationDays) / totalDays) * 100;
          const top      = 4 + task.lane * LANE_H;

          const clampedLeft  = Math.max(0, leftPct);
          const clampedRight = Math.min(100, rightPct);
          const clampedWidth = clampedRight - clampedLeft;
          if (clampedWidth <= 0) return null;

          const label = task.issue.fields.summary.length > 30
            ? task.issue.fields.summary.slice(0, 28) + '…'
            : task.issue.fields.summary;

          const dimmed = task.startDay < 0 && (task.startDay + task.durationDays) < 0;

          const tooltipContent = (
            <div>
              <div style={{ fontWeight: 700, marginBottom: '3px' }}>
                <span style={{ opacity: 0.6, marginRight: '5px' }}>{task.issue.key}</span>
                {task.issue.fields.summary}
              </div>
              <div style={{ opacity: 0.7, marginBottom: '4px' }}>
                {task.issue.fields.issuetype.name} · {task.issue.fields.status.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ opacity: 0.55 }}>{task.startLabel}</span>
                <span>{fmt(task.startDate)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ opacity: 0.55 }}>{task.endLabel}</span>
                <span>{fmt(task.endDate)}</span>
              </div>
            </div>
          );

          return (
            <AnimatedTooltip
              key={task.issue.key}
              content={tooltipContent}
              position="top"
              style={{
                position: 'absolute',
                left:   `${clampedLeft}%`,
                width:  `${clampedWidth}%`,
                top:    `${top}px`,
                height: `${LANE_H - 6}px`,
                zIndex: 5,
              }}
            >
              <a
                href={`https://${env.VITE_JIRA_DOMAIN}/browse/${task.issue.key}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center',
                  width: '100%', height: '100%',
                  background: task.color,
                  borderRadius: '4px',
                  padding: '0 6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  boxShadow: `0 1px 4px rgba(0,0,0,0.4)`,
                  border: task.hasEdd ? 'none' : '1px dashed rgba(255,255,255,0.3)',
                  opacity: dimmed ? 0.45 : 0.9,
                  transition: 'opacity 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 12px ${task.color}66`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.opacity = dimmed ? '0.45' : '0.9';
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
  );

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

            {devRows.map(row => renderRow(row))}
            {todoRow && renderRow(todoRow, true)}

          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && !error && devRows.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {LEGEND_ITEMS.map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--win11-dark-text-tertiary)', fontFamily: 'Inter, sans-serif' }}>
                {label}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: TODO_COLOR, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--win11-dark-text-tertiary)', fontFamily: 'Inter, sans-serif' }}>
              TO DO
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

      {/* Filters */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap', paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            fontSize: '12px', color: 'var(--win11-dark-text-secondary)', fontFamily: 'Inter, sans-serif',
            userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={showDevelopment}
              onChange={e => setShowDevelopment(e.target.checked)}
              style={{ accentColor: 'var(--win11-accent)', width: '14px', height: '14px', cursor: 'pointer' }}
            />
            Pokaż zadania typu Development
          </label>
        </div>
      )}
    </div>
  );
};

export default JiraTimeline;
