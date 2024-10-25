export enum AnalyticType {
    PAGE_VIEW = 1,
    CLICK = 2,
    SCROLL = 3,
    FORM_SUBMISSION = 4,
    CUSTOM_EVENT = 5,
    ERROR = 6,
    CONVERSION = 7,
    PAGE_LOAD = 8,
    PAGE_UNLOAD = 9,
    SESSION_START = 10,
    EXTERNAL_LINK_CLICK = 11,
  }
  
  export interface DailyAggregationResult {
    totalVisits: string;
    uniqueVisitors: string;
    averagePageLoadTime: string;
    topBrowsers: string;
    topReferrers: string;
    topOperatingSystems: string;
    topLanguages: string;
    deviceTypes: string;
  }
  
  export interface ErrorCountRow {
    timeSlot: string;
    errorMessage: string;
    errorCount: string;
  }
  
  export interface AnalyticJob {
    type: string;
    query: string;
    params: object;
    processResult: (result: any, date: string) => any;
  }