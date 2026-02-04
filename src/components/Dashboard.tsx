import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { createJiraClient } from '../api/jiraClient';
import { calculateKPIs, KPIMetrics, kpiEngine } from '../utils/kpiEngine';
import TeamTasksTable from './InProgressTable';
import AwaitingProdTable from './AwaitingProdTable';
import ToTakeTable from './ToTakeTable';
import MoreInfoRequestTable from './MoreInfoRequestTable';
import AnimatedTooltip from './AnimatedTooltip';

interface HiddenCards {
  [key: string]: boolean;
}

const COLORS = {
  newProduct: '#0088FE',
  maintenance: '#00C49F',
  primary: '#646cff',
  secondary: '#ff6b6b'
};

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Initialize hiddenCards from localStorage
  const [hiddenCards, setHiddenCards] = useState<HiddenCards>(() => {
    try {
      const saved = localStorage.getItem('dashboard-hidden-cards');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.warn('Failed to load hidden cards from localStorage:', error);
      return {};
    }
  });

  // Save to localStorage whenever hiddenCards changes
  useEffect(() => {
    try {
      localStorage.setItem('dashboard-hidden-cards', JSON.stringify(hiddenCards));
    } catch (error) {
      console.warn('Failed to save hidden cards to localStorage:', error);
    }
  }, [hiddenCards]);

  // Functions for managing hidden cards
  const hideCard = (cardId: string) => {
    setHiddenCards(prev => ({ ...prev, [cardId]: true }));
  };

  const showCard = (cardId: string) => {
    setHiddenCards(prev => ({ ...prev, [cardId]: false }));
  };

  const isCardHidden = (cardId: string) => {
    return hiddenCards[cardId] || false;
  };

  // Get card info for sidebar
  const getCardInfo = (cardId: string) => {
    const cardInfoMap: { [key: string]: { icon: JSX.Element; title: string } } = {
      'distribution': { icon: <i className="fas fa-chart-pie"></i>, title: 'Podział pracy' },
      'metrics': { icon: <i className="fas fa-chart-line"></i>, title: 'Kluczowe metryki' },
      'issueTypes': { icon: <i className="fas fa-wrench"></i>, title: 'Typy zadań' },
      'breakdown': { icon: <i className="fas fa-clipboard-list"></i>, title: 'Szczegółowy podział' },
      'target': { icon: <i className="fas fa-bullseye"></i>, title: 'Analiza celu 30/70' },
      'eddDelivery': { icon: <i className="fas fa-calendar-check"></i>, title: 'Dotrzymanie terminów EDD' },
      'inProgress': { icon: <i className="fas fa-clipboard-list"></i>, title: 'Zadania w toku' },
      'awaitingProd': { icon: <i className="fas fa-rocket"></i>, title: 'Awaiting Prod' },
      'toTake': { icon: <i className="fas fa-inbox"></i>, title: 'Do wzięcia' },
      'moreInfoRequest': { icon: <i className="fas fa-question-circle"></i>, title: 'More Info Request' }
    };
    return cardInfoMap[cardId] || { icon: <i className="fas fa-file"></i>, title: 'Kafelek' };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const jiraClient = createJiraClient();
      
      // Fetch all issues, completed issues (general), and Pixels completed issues in parallel
      const [allIssues, completedIssues, pixelsCompletedIssues] = await Promise.all([
        jiraClient.fetchProjectIssues(),
        jiraClient.fetchCompletedIssues(),
        jiraClient.fetchPixelsCompletedIssues()
      ]);

      // Calculate KPIs using general completed issues for overall metrics
      // but Pixels completed issues for EDD delivery metrics
      const calculatedKpis = calculateKPIs(allIssues, completedIssues);
      
      // Override EDD delivery metrics with Pixels-specific data
      const pixelsEDDMetrics = kpiEngine.calculateEDDDeliveryMetrics(pixelsCompletedIssues);
      calculatedKpis.eddDeliveryMetrics = pixelsEDDMetrics;
      
      setKpis(calculatedKpis);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const distributionData: ChartData[] = kpis ? [
    {
      name: 'Nowy Produkt',
      value: kpis.distribution.newProduct,
      color: COLORS.newProduct
    },
    {
      name: 'Utrzymanie',
      value: kpis.distribution.maintenance,
      color: COLORS.maintenance
    }
  ] : [];

  const issueTypesData = kpis ? [
    ...Object.entries(kpis.newProductTypes).map(([type, count]) => ({
      name: type,
      count,
      category: 'Nowy Produkt',
      fill: COLORS.newProduct
    })),
    ...Object.entries(kpis.maintenanceTypes).map(([type, count]) => ({
      name: type,
      count,
      category: 'Utrzymanie',
      fill: COLORS.maintenance
    }))
  ] : [];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          <h2><i className="fas fa-hourglass-half"></i> Ładowanie danych z Jiry...</h2>
          <p>Pobieranie i analiza zadań może potrwać kilka sekund.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">
          <h2><i className="fas fa-times-circle"></i> Błąd podczas pobierania danych</h2>
          <p>{error}</p>
          <AnimatedTooltip content="Spróbuj ponownie" position="bottom">
            <button onClick={fetchData} className="refresh-icon-button">
              <i className="fas fa-redo-alt"></i>
            </button>
          </AnimatedTooltip>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="dashboard">
        <div className="loading">
          <h2><i className="fas fa-inbox"></i> Brak danych do wyświetlenia</h2>
          <AnimatedTooltip content="Odśwież dane" position="bottom">
            <button onClick={fetchData} className="refresh-icon-button">
              <i className="fas fa-redo-alt"></i>
            </button>
          </AnimatedTooltip>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar */}
      <div className="sidebar">
        {Object.keys(hiddenCards).filter(cardId => hiddenCards[cardId]).map(cardId => {
          const cardInfo = getCardInfo(cardId);
          return (
            <AnimatedTooltip key={cardId} content={`Pokaż: ${cardInfo.title}`} position="right">
              <div
                className="sidebar-item active"
                onClick={() => showCard(cardId)}
              >
                {cardInfo.icon}
              </div>
            </AnimatedTooltip>
          );
        })}
      </div>

      <div className={`dashboard ${Object.values(hiddenCards).some(hidden => hidden) ? 'with-sidebar' : ''}`}>
      <div className="dashboard-header">
        <h1><i className="fas fa-rocket"></i> Engineering Team Dashboard</h1>
        <p>KPI Dashboard - Analiza pracy zespołu deweloperskiego</p>
        {lastUpdated && (
          <p style={{ fontSize: '0.875rem', color: 'var(--win11-dark-text-tertiary)', margin: '8px 0 16px 0' }}>
            Ostatnia aktualizacja: {lastUpdated.toLocaleString('pl-PL')}
          </p>
        )}
        <AnimatedTooltip content="Odśwież dane" position="bottom">
          <button onClick={fetchData} className="refresh-icon-button">
            <i className="fas fa-redo-alt"></i>
          </button>
        </AnimatedTooltip>
      </div>

      <div className="dashboard-grid">
        {/* Distribution Chart */}
        {!isCardHidden('distribution') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('distribution')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <h3><i className="fas fa-chart-pie"></i> Podział pracy: Nowy Produkt vs Utrzymanie</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Procent']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-value" style={{ color: COLORS.newProduct }}>
                {kpis.distribution.newProduct.toFixed(1)}%
              </div>
              <div className="metric-label">Nowy Produkt</div>
            </div>
            <div className="metric-item">
              <div className="metric-value" style={{ color: COLORS.maintenance }}>
                {kpis.distribution.maintenance.toFixed(1)}%
              </div>
              <div className="metric-label">Utrzymanie</div>
            </div>
          </div>
          </div>
        )}

        {/* Key Metrics */}
        {!isCardHidden('metrics') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('metrics')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <h3><i className="fas fa-chart-line"></i> Kluczowe metryki</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-value">{kpis.avgCycleTime}</div>
              <div className="metric-label">Średni Cycle Time (dni)</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{kpis.totalTasks}</div>
              <div className="metric-label">Wszystkie zadania</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{kpis.completedTasks}</div>
              <div className="metric-label">Ukończone zadania</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{kpis.throughput}</div>
              <div className="metric-label">Przepustowość (zadania/tydzień)</div>
            </div>
          </div>
          </div>
        )}

        {/* Issue Types Breakdown */}
        {issueTypesData.length > 0 && !isCardHidden('issueTypes') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('issueTypes')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <h3><i className="fas fa-wrench"></i> Podział według typów zadań</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueTypesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Detailed Breakdown */}
        {!isCardHidden('breakdown') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('breakdown')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <h3><i className="fas fa-clipboard-list"></i> Szczegółowy podział</h3>
          
          <h4 style={{ color: COLORS.newProduct, marginTop: '1.5rem' }}>
            Nowy Produkt ({Object.values(kpis.newProductTypes).reduce((a, b) => a + b, 0)} zadań)
          </h4>
          <ul className="issue-types-list">
            {Object.entries(kpis.newProductTypes).map(([type, count]) => (
              <li key={type}>
                <span>{type}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>

          <h4 style={{ color: COLORS.maintenance, marginTop: '1.5rem' }}>
            Utrzymanie ({Object.values(kpis.maintenanceTypes).reduce((a, b) => a + b, 0)} zadań)
          </h4>
          <ul className="issue-types-list">
            {Object.entries(kpis.maintenanceTypes).map(([type, count]) => (
              <li key={type}>
                <span>{type}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
          </div>
        )}
      </div>

      {/* Target Analysis */}
      {!isCardHidden('target') && (
        <div className="kpi-card" style={{ marginTop: '32px', position: 'relative' }}>
          <AnimatedTooltip content="Ukryj kafelek" position="right">
            <button
              className="hide-button"
              onClick={() => hideCard('target')}
            >
              ✕
            </button>
          </AnimatedTooltip>
          <h3><i className="fas fa-bullseye"></i> Analiza względem celu 30/70</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value" style={{ 
              color: Math.abs(kpis.distribution.maintenance - 30) <= 5 ? '#4CAF50' : '#ff6b6b' 
            }}>
              {kpis.distribution.maintenance.toFixed(1)}%
            </div>
            <div className="metric-label">Utrzymanie (cel: 30%)</div>
          </div>
          <div className="metric-item">
            <div className="metric-value" style={{ 
              color: Math.abs(kpis.distribution.newProduct - 70) <= 5 ? '#4CAF50' : '#ff6b6b' 
            }}>
              {kpis.distribution.newProduct.toFixed(1)}%
            </div>
            <div className="metric-label">Nowy Produkt (cel: 70%)</div>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          {Math.abs(kpis.distribution.maintenance - 30) <= 5 && Math.abs(kpis.distribution.newProduct - 70) <= 5
            ? '✅ Zespół pracuje zgodnie z założonym celem 30/70'
            : '⚠️ Odchylenie od celu 30/70 - warto przeanalizować przyczyny'
          }
        </p>
        </div>
      )}

      {/* EDD Delivery Analysis */}
      {kpis.eddDeliveryMetrics.totalWithEDD > 0 && !isCardHidden('eddDelivery') && (
        <div className="kpi-card" style={{ marginTop: '32px', position: 'relative' }}>
          <AnimatedTooltip content="Ukryj kafelek" position="right">
            <button
              className="hide-button"
              onClick={() => hideCard('eddDelivery')}
            >
              ✕
            </button>
          </AnimatedTooltip>
          <h3><i className="fas fa-calendar-check"></i> Dotrzymanie terminów EDD Dev</h3>
          
          <div className="metrics-grid">
            <div className="metric-item">
              <div className="metric-value" style={{
                color: kpis.eddDeliveryMetrics.onTimePercentage >= 80 ? '#4CAF50' :
                      kpis.eddDeliveryMetrics.onTimePercentage >= 60 ? '#ff9800' : '#f44336'
              }}>
                {kpis.eddDeliveryMetrics.onTimePercentage.toFixed(1)}%
              </div>
              <div className="metric-label">Dowiezione na czas</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{kpis.eddDeliveryMetrics.totalWithEDD}</div>
              <div className="metric-label">Zadania z EDD</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{kpis.eddDeliveryMetrics.deliveredOnTime}</div>
              <div className="metric-label">Na czas</div>
            </div>
            <div className="metric-item">
              <div className="metric-value">{kpis.eddDeliveryMetrics.deliveredLate}</div>
              <div className="metric-label">Spóźnione</div>
            </div>
          </div>

          <div className="chart-container" style={{ marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                {
                  name: 'Bez zmian EDD',
                  onTime: kpis.eddDeliveryMetrics.changeImpactOnDelivery.noChanges.onTime,
                  late: kpis.eddDeliveryMetrics.changeImpactOnDelivery.noChanges.late,
                  percentage: kpis.eddDeliveryMetrics.changeImpactOnDelivery.noChanges.percentage
                },
                {
                  name: 'Ze zmianami EDD',
                  onTime: kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.onTime,
                  late: kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.late,
                  percentage: kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.percentage
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'percentage') {
                      return [`${value.toFixed(1)}%`, 'Procent na czas'];
                    }
                    return [value, name === 'onTime' ? 'Na czas' : 'Spóźnione'];
                  }}
                />
                <Legend />
                <Bar dataKey="onTime" fill="#4CAF50" name="Na czas" />
                <Bar dataKey="late" fill="#f44336" name="Spóźnione" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--win11-dark-text-primary)' }}>
              <i className="fas fa-info-circle"></i> Wpływ zmian EDD na dotrzymanie terminów
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--win11-dark-text-secondary)', marginBottom: '4px' }}>Bez zmian EDD:</div>
                <div style={{ color: '#4CAF50' }}>
                  {kpis.eddDeliveryMetrics.changeImpactOnDelivery.noChanges.percentage.toFixed(1)}% na czas
                  ({kpis.eddDeliveryMetrics.changeImpactOnDelivery.noChanges.onTime}/{kpis.eddDeliveryMetrics.changeImpactOnDelivery.noChanges.onTime + kpis.eddDeliveryMetrics.changeImpactOnDelivery.noChanges.late})
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--win11-dark-text-secondary)', marginBottom: '4px' }}>Ze zmianami EDD:</div>
                <div style={{ color: kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.percentage >= 50 ? '#ff9800' : '#f44336' }}>
                  {kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.percentage.toFixed(1)}% na czas
                  ({kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.onTime}/{kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.onTime + kpis.eddDeliveryMetrics.changeImpactOnDelivery.withChanges.late})
                </div>
              </div>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--win11-dark-text-tertiary)' }}>
              Średnia liczba zmian EDD: {kpis.eddDeliveryMetrics.averageEDDChanges.toFixed(1)}
            </div>
          </div>
        </div>
      )}

        {/* Team Tasks Table */}
        {!isCardHidden('inProgress') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('inProgress')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <TeamTasksTable teamName="Pixels" />
          </div>
        )}

        {/* Awaiting Prod Table */}
        {!isCardHidden('awaitingProd') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('awaitingProd')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <AwaitingProdTable teamName="Pixels" />
          </div>
        )}

        {/* To Take Table */}
        {!isCardHidden('toTake') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('toTake')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <ToTakeTable teamName="Pixels" />
          </div>
        )}

        {/* More Info Request Table */}
        {!isCardHidden('moreInfoRequest') && (
          <div className="kpi-card" style={{ position: 'relative' }}>
            <AnimatedTooltip content="Ukryj kafelek" position="right">
              <button
                className="hide-button"
                onClick={() => hideCard('moreInfoRequest')}
              >
                ✕
              </button>
            </AnimatedTooltip>
            <MoreInfoRequestTable teamName="Pixels" />
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;