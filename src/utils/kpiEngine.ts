import { JiraIssue } from '../api/jiraClient';

export interface KPIDistribution {
  newProduct: number;
  maintenance: number;
}

export interface KPIMetrics {
  distribution: KPIDistribution;
  avgCycleTime: string;
  totalTasks: number;
  completedTasks: number;
  throughput: number; // tasks per week
  maintenanceTypes: Record<string, number>;
  newProductTypes: Record<string, number>;
  eddDeliveryMetrics: EDDDeliveryMetrics;
}

export interface EDDDeliveryMetrics {
  totalWithEDD: number;
  deliveredOnTime: number;
  deliveredLate: number;
  onTimePercentage: number;
  averageEDDChanges: number;
  issuesWithChanges: number;
  issuesWithoutChanges: number;
  changeImpactOnDelivery: {
    noChanges: { onTime: number; late: number; percentage: number };
    withChanges: { onTime: number; late: number; percentage: number };
  };
}

export interface EDDAnalysisData {
  issueKey: string;
  originalEDD: string | null;
  finalEDD: string | null;
  actualDelivery: string | null;
  eddChanges: number;
  deliveredOnTime: boolean;
  daysLate: number;
  issueType: string;
  category: 'maintenance' | 'newProduct';
}

export interface CycleTimeData {
  issueKey: string;
  cycleTime: number;
  issueType: string;
  category: 'maintenance' | 'newProduct';
}

// Configuration for issue type categorization
const MAINTENANCE_ISSUE_TYPES = [
  'Bug',
  'Support',
  'Incident',
  'Hotfix',
  'Technical Debt',
  'Maintenance'
];


export class KPIEngine {
  
  /**
   * Categorizes an issue as either maintenance or new product work
   */
  private categorizeIssue(issue: JiraIssue): 'maintenance' | 'newProduct' {
    const issueTypeName = issue.fields.issuetype.name;
    
    if (MAINTENANCE_ISSUE_TYPES.includes(issueTypeName)) {
      return 'maintenance';
    }
    
    return 'newProduct';
  }

  /**
   * Calculates cycle time for an issue in days
   */
  private calculateCycleTime(issue: JiraIssue): number | null {
    if (!issue.fields.resolutiondate) {
      return null;
    }

    const startDate = new Date(issue.fields.created);
    const endDate = new Date(issue.fields.resolutiondate);
    
    // Calculate difference in days
    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    return Math.round(daysDiff * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculates throughput (completed tasks per week)
   */
  private calculateThroughput(completedIssues: JiraIssue[]): number {
    if (completedIssues.length === 0) return 0;

    // Get the date range of completed issues
    const resolutionDates = completedIssues
      .filter(issue => issue.fields.resolutiondate)
      .map(issue => new Date(issue.fields.resolutiondate!))
      .sort((a, b) => a.getTime() - b.getTime());

    if (resolutionDates.length === 0) return 0;

    const firstResolution = resolutionDates[0];
    const lastResolution = resolutionDates[resolutionDates.length - 1];
    
    // Calculate weeks between first and last resolution
    const timeDiff = lastResolution.getTime() - firstResolution.getTime();
    const weeksDiff = timeDiff / (1000 * 60 * 60 * 24 * 7);
    
    // Avoid division by zero, minimum 1 week
    const weeks = Math.max(weeksDiff, 1);
    
    return Math.round((completedIssues.length / weeks) * 100) / 100;
  }

  /**
   * Groups issues by type within each category
   */
  private groupIssuesByType(issues: JiraIssue[]): {
    maintenanceTypes: Record<string, number>;
    newProductTypes: Record<string, number>;
  } {
    const maintenanceTypes: Record<string, number> = {};
    const newProductTypes: Record<string, number> = {};

    issues.forEach(issue => {
      const issueType = issue.fields.issuetype.name;
      const category = this.categorizeIssue(issue);

      if (category === 'maintenance') {
        maintenanceTypes[issueType] = (maintenanceTypes[issueType] || 0) + 1;
      } else {
        newProductTypes[issueType] = (newProductTypes[issueType] || 0) + 1;
      }
    });

    return { maintenanceTypes, newProductTypes };
  }

  /**
   * Extracts EDD Dev date from issue fields
   */
  private getEDDDevDate(issue: JiraIssue): string | null {
    const fields = issue.fields as any;
    
    // Try different possible field names for EDD Dev date
    // Based on analysis, customfield_13587 appears to be the EDD field for Pixels team
    const possibleEDDFields = [
      'customfield_13587', // EDD field for Pixels team (found in logs)
      'customfield_14219',  // Common custom field for EDD (used by other teams)
      'customfield_10003', // EDD Dev from interface
      'customfield_10002', // ETA Dev from interface
      'EDD Dev',
      'Expected Development Delivery Date',
      'Development Due Date',
      'Dev Due Date',
      'duedate'  // Standard due date field
    ];
    
    for (const fieldName of possibleEDDFields) {
      const fieldValue = fields[fieldName];
      if (fieldValue) {
        console.log(`[KPIEngine] Found EDD field ${fieldName} for ${issue.key} with value:`, fieldValue);
        // Handle different field value formats
        if (typeof fieldValue === 'string') {
          return fieldValue;
        }
        if (typeof fieldValue === 'object' && fieldValue.value) {
          return fieldValue.value;
        }
        if (typeof fieldValue === 'object' && fieldValue.name) {
          return fieldValue.name;
        }
      }
    }
    
    return null;
  }

  /**
   * Estimates number of EDD changes based on issue history (simplified approach)
   * In real implementation, this would analyze issue history/changelog
   */
  private estimateEDDChanges(issue: JiraIssue): number {
    // This is a simplified estimation based on issue characteristics
    // In a real implementation, you would fetch issue changelog/history
    
    const issueAge = this.calculateCycleTime(issue) || 0;
    
    // Estimate changes based on issue complexity and age
    let estimatedChanges = 0;
    
    // Longer issues tend to have more EDD changes
    if (issueAge > 30) estimatedChanges += 1;
    if (issueAge > 60) estimatedChanges += 1;
    if (issueAge > 90) estimatedChanges += 1;
    
    // Certain issue types tend to have more changes
    const issueType = issue.fields.issuetype.name.toLowerCase();
    if (issueType.includes('epic') || issueType.includes('feature')) {
      estimatedChanges += 1;
    }
    
    // Issues with certain statuses might indicate changes
    const status = issue.fields.status.name.toLowerCase();
    if (status.includes('blocked') || status.includes('hold') || status.includes('more info')) {
      estimatedChanges += 1;
    }
    
    return estimatedChanges;
  }

  /**
   * Calculates EDD delivery metrics
   */
  calculateEDDDeliveryMetrics(completedIssues: JiraIssue[]): EDDDeliveryMetrics {
    console.log('[KPIEngine] Analyzing EDD delivery metrics for', completedIssues.length, 'completed issues');
    
    // Debug: Log available fields for first few issues
    if (completedIssues.length > 0) {
      console.log('[KPIEngine] Sample issue fields:', Object.keys(completedIssues[0].fields));
      console.log('[KPIEngine] Sample issue custom fields:',
        Object.keys(completedIssues[0].fields).filter(key => key.startsWith('customfield_')));
    }
    
    const issuesWithEDD = completedIssues.filter(issue => {
      const eddDate = this.getEDDDevDate(issue);
      if (eddDate) {
        console.log('[KPIEngine] Found EDD date for', issue.key, ':', eddDate);
      }
      return eddDate !== null;
    });
    
    console.log('[KPIEngine] Found', issuesWithEDD.length, 'issues with EDD out of', completedIssues.length, 'total');
    
    if (issuesWithEDD.length === 0) {
      return {
        totalWithEDD: 0,
        deliveredOnTime: 0,
        deliveredLate: 0,
        onTimePercentage: 0,
        averageEDDChanges: 0,
        issuesWithChanges: 0,
        issuesWithoutChanges: 0,
        changeImpactOnDelivery: {
          noChanges: { onTime: 0, late: 0, percentage: 0 },
          withChanges: { onTime: 0, late: 0, percentage: 0 }
        }
      };
    }

    let deliveredOnTime = 0;
    let deliveredLate = 0;
    let totalEDDChanges = 0;
    let issuesWithChanges = 0;
    let issuesWithoutChanges = 0;
    
    // Track impact of changes on delivery
    let noChangesOnTime = 0;
    let noChangesLate = 0;
    let withChangesOnTime = 0;
    let withChangesLate = 0;

    issuesWithEDD.forEach(issue => {
      const eddDate = this.getEDDDevDate(issue);
      const resolutionDate = issue.fields.resolutiondate;
      const estimatedChanges = this.estimateEDDChanges(issue);
      
      totalEDDChanges += estimatedChanges;
      
      if (estimatedChanges > 0) {
        issuesWithChanges++;
      } else {
        issuesWithoutChanges++;
      }

      if (eddDate && resolutionDate) {
        const edd = new Date(eddDate);
        const resolution = new Date(resolutionDate);
        
        const isOnTime = resolution <= edd;
        
        if (isOnTime) {
          deliveredOnTime++;
          if (estimatedChanges > 0) {
            withChangesOnTime++;
          } else {
            noChangesOnTime++;
          }
        } else {
          deliveredLate++;
          if (estimatedChanges > 0) {
            withChangesLate++;
          } else {
            noChangesLate++;
          }
        }
      }
    });

    const onTimePercentage = issuesWithEDD.length > 0
      ? Math.round((deliveredOnTime / issuesWithEDD.length) * 100 * 100) / 100
      : 0;

    const averageEDDChanges = issuesWithEDD.length > 0
      ? Math.round((totalEDDChanges / issuesWithEDD.length) * 100) / 100
      : 0;

    // Calculate percentages for change impact
    const noChangesTotal = noChangesOnTime + noChangesLate;
    const withChangesTotal = withChangesOnTime + withChangesLate;
    
    const noChangesPercentage = noChangesTotal > 0
      ? Math.round((noChangesOnTime / noChangesTotal) * 100 * 100) / 100
      : 0;
      
    const withChangesPercentage = withChangesTotal > 0
      ? Math.round((withChangesOnTime / withChangesTotal) * 100 * 100) / 100
      : 0;

    return {
      totalWithEDD: issuesWithEDD.length,
      deliveredOnTime,
      deliveredLate,
      onTimePercentage,
      averageEDDChanges,
      issuesWithChanges,
      issuesWithoutChanges,
      changeImpactOnDelivery: {
        noChanges: {
          onTime: noChangesOnTime,
          late: noChangesLate,
          percentage: noChangesPercentage
        },
        withChanges: {
          onTime: withChangesOnTime,
          late: withChangesLate,
          percentage: withChangesPercentage
        }
      }
    };
  }

  /**
   * Get detailed EDD analysis data
   */
  getEDDAnalysisDetails(completedIssues: JiraIssue[]): EDDAnalysisData[] {
    return completedIssues
      .map(issue => {
        const eddDate = this.getEDDDevDate(issue);
        if (!eddDate) return null;

        const resolutionDate = issue.fields.resolutiondate;
        if (!resolutionDate) return null;

        const edd = new Date(eddDate);
        const resolution = new Date(resolutionDate);
        const deliveredOnTime = resolution <= edd;
        
        const timeDiff = resolution.getTime() - edd.getTime();
        const daysLate = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

        return {
          issueKey: issue.key,
          originalEDD: eddDate,
          finalEDD: eddDate, // In real implementation, this would be the final EDD after changes
          actualDelivery: resolutionDate,
          eddChanges: this.estimateEDDChanges(issue),
          deliveredOnTime,
          daysLate,
          issueType: issue.fields.issuetype.name,
          category: this.categorizeIssue(issue)
        } as EDDAnalysisData;
      })
      .filter((data): data is EDDAnalysisData => data !== null);
  }

  /**
   * Main method to calculate all KPIs from Jira issues
   */
  calculateKPIs(allIssues: JiraIssue[], completedIssues: JiraIssue[]): KPIMetrics {
    const total = allIssues.length;
    const completed = completedIssues.length;

    if (total === 0) {
      return {
        distribution: { newProduct: 0, maintenance: 0 },
        avgCycleTime: '0',
        totalTasks: 0,
        completedTasks: 0,
        throughput: 0,
        maintenanceTypes: {},
        newProductTypes: {},
        eddDeliveryMetrics: {
          totalWithEDD: 0,
          deliveredOnTime: 0,
          deliveredLate: 0,
          onTimePercentage: 0,
          averageEDDChanges: 0,
          issuesWithChanges: 0,
          issuesWithoutChanges: 0,
          changeImpactOnDelivery: {
            noChanges: { onTime: 0, late: 0, percentage: 0 },
            withChanges: { onTime: 0, late: 0, percentage: 0 }
          }
        }
      };
    }

    // Categorize all issues
    const maintenanceIssues = allIssues.filter(issue => 
      this.categorizeIssue(issue) === 'maintenance'
    );
    const newProductIssues = allIssues.filter(issue => 
      this.categorizeIssue(issue) === 'newProduct'
    );

    // Calculate distribution percentages
    const distribution: KPIDistribution = {
      maintenance: Math.round((maintenanceIssues.length / total) * 100 * 100) / 100,
      newProduct: Math.round((newProductIssues.length / total) * 100 * 100) / 100
    };

    // Calculate cycle times for completed issues
    const cycleTimes = completedIssues
      .map(issue => this.calculateCycleTime(issue))
      .filter((time): time is number => time !== null);

    const avgCycleTime = cycleTimes.length > 0
      ? (cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length).toFixed(1)
      : '0';

    // Calculate throughput
    const throughput = this.calculateThroughput(completedIssues);

    // Group issues by type
    const { maintenanceTypes, newProductTypes } = this.groupIssuesByType(allIssues);

    // Calculate EDD delivery metrics
    const eddDeliveryMetrics = this.calculateEDDDeliveryMetrics(completedIssues);

    return {
      distribution,
      avgCycleTime,
      totalTasks: total,
      completedTasks: completed,
      throughput,
      maintenanceTypes,
      newProductTypes,
      eddDeliveryMetrics
    };
  }

  /**
   * Get detailed cycle time data for analysis
   */
  getCycleTimeDetails(completedIssues: JiraIssue[]): CycleTimeData[] {
    return completedIssues
      .map(issue => {
        const cycleTime = this.calculateCycleTime(issue);
        if (cycleTime === null) return null;

        return {
          issueKey: issue.key,
          cycleTime,
          issueType: issue.fields.issuetype.name,
          category: this.categorizeIssue(issue)
        };
      })
      .filter((data): data is CycleTimeData => data !== null);
  }

  /**
   * Calculate KPIs for a specific time period
   */
  calculateKPIsForPeriod(
    allIssues: JiraIssue[], 
    completedIssues: JiraIssue[], 
    startDate: Date, 
    endDate: Date
  ): KPIMetrics {
    const filteredAllIssues = allIssues.filter(issue => {
      const createdDate = new Date(issue.fields.created);
      return createdDate >= startDate && createdDate <= endDate;
    });

    const filteredCompletedIssues = completedIssues.filter(issue => {
      if (!issue.fields.resolutiondate) return false;
      const resolvedDate = new Date(issue.fields.resolutiondate);
      return resolvedDate >= startDate && resolvedDate <= endDate;
    });

    return this.calculateKPIs(filteredAllIssues, filteredCompletedIssues);
  }
}

// Export singleton instance
export const kpiEngine = new KPIEngine();

// Export utility functions
export const calculateKPIs = (allIssues: JiraIssue[], completedIssues: JiraIssue[]): KPIMetrics => {
  return kpiEngine.calculateKPIs(allIssues, completedIssues);
};

export const getCycleTimeDetails = (completedIssues: JiraIssue[]): CycleTimeData[] => {
  return kpiEngine.getCycleTimeDetails(completedIssues);
};

export const getEDDAnalysisDetails = (completedIssues: JiraIssue[]): EDDAnalysisData[] => {
  return kpiEngine.getEDDAnalysisDetails(completedIssues);
};