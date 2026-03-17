const DEFAULTS: Record<string, string> = {
  'timeline.showDevelopment': 'false',
  'timeline.showBugs': 'false',

  'dashboard-hidden-cards': JSON.stringify({
    distribution: true, metrics: true, issueTypes: true, breakdown: true,
    target: true, inProgress: false, awaitingProd: false, toTake: false,
    eddDelivery: true, moreInfoRequest: false,
  }),

  'devTasksSelectedDevId': '712020:e8c67458-e8be-4309-b11e-f51a194daebb',

  'toTakeShowFilters':      'false',
  'awaitingProdShowFilters': 'false',
  'allTasksShowFilters':    'true',

  'toTakeFilters':      JSON.stringify({ status: [], assignee: [], type: [], priority: [], searchText: '' }),
  'awaitingProdFilters': JSON.stringify({ status: [], assignee: [], type: [], priority: [], searchText: '' }),
  'allTasksFilters':    JSON.stringify({ status: ['In Progress','In Review','More Info Requested External','More Info Requested Internal','In Development'], assignee: [], type: [], priority: [], searchText: '' }),

  'toTakeSorting':      JSON.stringify({ key: 'status', direction: 'asc' }),
  'awaitingProdSorting': 'null',
  'allTasksSorting':    JSON.stringify({ key: 'status', direction: 'desc' }),

  'kpi-dashboard-sorting':  JSON.stringify({ key: 'status', direction: 'asc' }),
  'kpi-dashboard-filters':  JSON.stringify({ key: '', summary: '', status: ['In Development','In Progress','More Info Requested External','More Info Requested Internal'], type: [], priority: [], assignee: [], createdFrom: '', createdTo: '' }),
  'kpi-dashboard-column-widths': JSON.stringify({ number: 13.6, key: 36.9, summary: 174.4, status: 43.2, type: 33.1, priority: 9.8, assignee: 15.6, created: 32.4, eddStart: 31.6, etaDev: 36, eddDev: 39.8, days: 22.8 }),

  'kpi-dashboard-table-settings-in-progress': JSON.stringify({ id: 'in-progress', columns: [{ key: 'key', width: 120, visible: true, order: 0 },{ key: 'summary', width: 300, visible: true, order: 1 },{ key: 'assignee', width: 100, visible: true, order: 2 },{ key: 'status', width: 120, visible: true, order: 3 },{ key: 'priority', width: 50, visible: true, order: 4 },{ key: 'created', width: 80, visible: true, order: 5 },{ key: 'updated', width: 120, visible: true, order: 6 }], filters: { status: ['In Development','In Progress','In Review'], assignee: [], type: [], priority: [], searchText: '' }, sort: { column: 'eddDev', direction: 'desc' }, pageSize: 50, lastUpdated: Date.now() }),
  'kpi-dashboard-table-settings-awaiting-prod': JSON.stringify({ id: 'awaiting-prod', columns: [{ key: 'key', width: 120, visible: true, order: 0 },{ key: 'summary', width: 350, visible: true, order: 1 },{ key: 'assignee', width: 150, visible: true, order: 2 },{ key: 'resolved', width: 120, visible: true, order: 3 },{ key: 'priority', width: 100, visible: true, order: 4 }], filters: { status: [], assignee: [], type: [], priority: [], searchText: '' }, sort: { column: 'resolved', direction: 'desc' }, pageSize: 25, lastUpdated: Date.now() }),
  'kpi-dashboard-table-settings-to-take': JSON.stringify({ id: 'to-take', columns: [{ key: 'key', width: 120, visible: true, order: 0 },{ key: 'summary', width: 575, visible: true, order: 1 },{ key: 'priority', width: 100, visible: true, order: 2 },{ key: 'created', width: 120, visible: true, order: 3 },{ key: 'labels', width: 200, visible: true, order: 4 }], filters: { status: [], assignee: [], type: [], priority: [], searchText: '' }, sort: { column: 'priority', direction: 'asc' }, pageSize: 30, lastUpdated: Date.now() }),
};

export function initLocalStorageDefaults(): void {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, value);
    }
  }
}
