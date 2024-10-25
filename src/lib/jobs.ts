import cron from 'node-cron';
import { getDB } from '../lib/db';
import { Analytic, RawAnalytic, JobStatus, JobLock } from '../lib/entities';
import moment from 'moment';
import { QueryRunner } from 'typeorm';

enum AnalyticType {
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

interface DailyAggregationResult {
  totalVisits: string;
  uniqueVisitors: string;
  averagePageLoadTime: string;
  topBrowsers: string;
  topReferrers: string;
  topOperatingSystems: string;
  topLanguages: string;
  deviceTypes: string;
}

interface ErrorCountRow {
  timeSlot: string;
  errorMessage: string;
  errorCount: string;
}

interface AnalyticJob {
  type: string;
  query: string;
  params: object;
  processResult: (result: any, date: string) => any;
}

const linearRegression = (timeSeries: any[], valueKey: string) => {
  const xValues = timeSeries.map((_, i) => i);
  const yValues = timeSeries.map(item => item[valueKey]);

  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
  const sumXX = xValues.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

const calculatePredictedValues = (timeSeries: any[], valueKey: string) => {
  if (timeSeries.length < 2) return [];

  const { slope, intercept } = linearRegression(timeSeries, valueKey);
  const lastDate = moment(timeSeries[timeSeries.length - 1].time);

  return Array.from({ length: 7 }, (_, i) => ({
    time: lastDate.clone().add(i + 1, 'days').toISOString(),
    [valueKey]: Math.max(0, Math.round(slope * (timeSeries.length + i) + intercept))
  }));
};

const getDateRange = (date: moment.Moment) => ({
  start: date.clone().startOf('day'),
  end: date.clone().add(1, 'day').startOf('day')
});

const acquireLock = async (queryRunner: QueryRunner, jobType: string, duration: number): Promise<boolean> => {
  const now = new Date();
  const lockExpiration = new Date(now.getTime() + duration);

  try {
    await queryRunner.manager.insert(JobLock, {
      jobType,
      lockedUntil: lockExpiration,
    });
    return true;
  } catch (error: any) {
    if (error.code === '23505') return false; // PostgreSQL unique violation error code
    throw error;
  }
};

const releaseLock = async (queryRunner: QueryRunner, jobType: string): Promise<void> => {
  await queryRunner.manager.delete(JobLock, { jobType });
};

const runWithLock = async (jobType: string, duration: number, job: (queryRunner: QueryRunner) => Promise<void>): Promise<void> => {
  const db = await getDB();
  const queryRunner = db.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    if (await acquireLock(queryRunner, jobType, duration)) {
      await job(queryRunner);
      await queryRunner.commitTransaction();
    } else {
      console.log(`Job ${jobType} is already running on another instance.`);
      await queryRunner.rollbackTransaction();
    }
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await releaseLock(queryRunner, jobType);
    await queryRunner.release();
  }
};

const runAnalyticJob = async (job: AnalyticJob, date: moment.Moment) => {
  await runWithLock(job.type, 30 * 60 * 1000, async (queryRunner) => {
    const { start, end } = getDateRange(date);

    const result = await queryRunner.manager.query(job.query, [{
      ...job.params,
      start: start.toDate(),
      end: end.toDate(),
    }]);

    const newAnalytic = new Analytic();
    newAnalytic.type = job.type;
    newAnalytic.data = job.processResult(result, date.format('YYYY-MM-DD'));

    await queryRunner.manager.save(Analytic, newAnalytic);
    await queryRunner.manager.update(JobStatus, { type: job.type }, { lastProcessedDate: end.toDate() });

    console.log(`${job.type} completed for ${date.format('YYYY-MM-DD')}`);
  });
};



const aggregateDailyAnalytics = async (date: moment.Moment) => {
  await runWithLock('DAILY_AGGREGATION', 60 * 60 * 1000, async (queryRunner) => {
    const { start, end } = getDateRange(date);

    const aggregationQuery = `
  SELECT
    -- Basic visitor stats
    COUNT(*) as totalVisits,
    COUNT(DISTINCT ipAddress) as uniqueVisitors,
    COUNT(DISTINCT sessionId) as uniqueSessions,
    AVG(CAST(json_extract(data, '$.pageLoadTime') AS FLOAT)) as averagePageLoadTime,
    
    -- Browser, OS, Device stats
    json_group_object(browserName, browserCount) as topBrowsers,
    json_group_object(osName, osCount) as topOperatingSystems,
    json_group_object(deviceType, deviceTypeCount) as deviceTypes,
    
    -- Traffic source stats
    json_group_object(referrer, referrerCount) as topReferrers,
    json_group_object(language, languageCount) as topLanguages,
    
    -- Page performance stats
    (
        SELECT json_group_array(
            json_object(
                'path', path,
                'pageViews', pageViews,
                'uniquePageViews', uniquePageViews,
                'avgLoadTime', avgLoadTime,
                'avgTimeOnPage', avgTimeOnPage
            )
        )
        FROM page_stats
    ) as topPages,
    
    -- Event stats
    (
        SELECT json_group_array(
            json_object(
                'type', type,
                'eventCount', eventCount,
                'uniqueUsers', uniqueUsers
            )
        )
        FROM event_stats
    ) as eventBreakdown,
    
    -- Form stats
    (
        SELECT json_group_array(
            json_object(
                'formId', formId,
                'submissions', submissions,
                'uniqueSubmissions', uniqueSubmissions
            )
        )
        FROM form_stats
    ) as formStats,
    
    -- Error stats
    (
        SELECT json_group_array(
            json_object(
                'errorType', errorType,
                'errorMessage', errorMessage,
                'count', errorCount
            )
        )
        FROM error_stats
    ) as topErrors,
    
    -- Conversion stats
    (
        SELECT json_group_array(
            json_object(
                'conversionType', conversionType,
                'conversionCount', conversionCount,
                'uniqueConversions', uniqueConversions
            )
        )
        FROM conversion_stats
    ) as conversionStats,
    
    -- Engagement metrics
    (
        SELECT COUNT(*)
        FROM raw_analytic
        WHERE 
            createdAt >= :start 
            AND createdAt < :end
            AND type = 2  -- CLICK
    ) as totalClicks,
    
    (
        SELECT COUNT(*)
        FROM raw_analytic
        WHERE 
            createdAt >= :start 
            AND createdAt < :end
            AND type = 3  -- SCROLL
    ) as totalScrolls,
    
    (
        SELECT AVG(CAST(json_extract(data, '$.scrollDepth') AS FLOAT))
        FROM raw_analytic
        WHERE 
            createdAt >= :start 
            AND createdAt < :end
            AND type = 3  -- SCROLL
    ) as averageScrollDepth

FROM raw_analytic
CROSS JOIN browser_stats
CROSS JOIN referrer_stats
CROSS JOIN os_stats
CROSS JOIN language_stats
CROSS JOIN device_stats
WHERE 
    createdAt >= :start 
    AND createdAt < :end;
    `;

    const result = await queryRunner.manager.query(
      aggregationQuery, 
      [{
        start: start.toDate(),
        end: end.toDate()
      }]
    ) as DailyAggregationResult[];

    if (result.length === 0) {
      console.log(`No data found for ${date.format('YYYY-MM-DD')}`);
      return;
    }

    const aggregatedData: any = result[0];

    const newAnalytic = new Analytic();
    newAnalytic.type = 'DAILY_AGGREGATION';
    newAnalytic.data = {
      date: date.format('YYYY-MM-DD'),
      totalVisits: parseInt(aggregatedData.totalVisits),
      uniqueVisitors: parseInt(aggregatedData.uniqueVisitors),
      averagePageLoadTime: parseFloat(aggregatedData.averagePageLoadTime),
      topBrowsers: JSON.parse(aggregatedData.topBrowsers),
      topReferrers: JSON.parse(aggregatedData.topReferrers),
      topOperatingSystems: JSON.parse(aggregatedData.topOperatingSystems),
      topLanguages: JSON.parse(aggregatedData.topLanguages),
      deviceTypes: JSON.parse(aggregatedData.deviceTypes),
    };

    await queryRunner.manager.save(Analytic, newAnalytic);
    await queryRunner.manager.update(JobStatus, { type: 'DAILY_AGGREGATION' }, { lastProcessedDate: end.toDate() });

    console.log(`Daily analytics aggregation completed for ${date.format('YYYY-MM-DD')}`);
  });
};

const deleteOldRawData = async () => {
  await runWithLock('DELETE_OLD_RAW_DATA', 2 * 60 * 60 * 1000, async (queryRunner) => {
    const twoMonthsAgo = moment().subtract(2, 'months').startOf('day');

    const deleteResult = await queryRunner.manager.createQueryBuilder()
      .delete()
      .from(RawAnalytic)
      .where("createdAt < :date", { date: twoMonthsAgo.toDate() })
      .execute();

    console.log(`Deleted ${deleteResult.affected} old raw analytic records.`);

    await queryRunner.manager.update(JobStatus, { type: 'DELETE_OLD_RAW_DATA' }, { lastProcessedDate: new Date() });
});
};

const processMissingDays = async (job: AnalyticJob | typeof aggregateDailyAnalytics) => {
  await runWithLock(`CATCH_UP_${typeof job === 'function' ? 'DAILY_AGGREGATION' : job.type}`, 4 * 60 * 60 * 1000, async (queryRunner) => {
    const jobType = typeof job === 'function' ? 'DAILY_AGGREGATION' : job.type;
    const jobStatus = await queryRunner.manager.findOne(JobStatus, { where: { type: jobType } });
    const lastProcessedDate = jobStatus ? moment(jobStatus.lastProcessedDate) : moment().subtract(30, 'days');
    const today = moment().startOf('day');

    const currentDate = lastProcessedDate.clone().add(1, 'day');

    while (currentDate.isSameOrBefore(today)) {
      if (typeof job === 'function') {
        await job(currentDate);
      } else {
        await runAnalyticJob(job, currentDate);
      }
      currentDate.add(1, 'day');
    }
  });
};

const runRealTimeAnalytics = async () => {
  const now = moment();
  const fiveMinutesAgo = now.clone().subtract(5, 'minutes');

  for (const job of analyticJobs) {
    if (['CURRENT_ACTIVE_USERS', 'AVERAGE_LOADING_TIMES', 'ERROR_COUNT'].includes(job.type)) {
      await runAnalyticJob(job, fiveMinutesAgo);
    }
  }
};

const scheduleAnalyticJobs = (jobs: AnalyticJob[]) => {
  // Distribute jobs across hours to handle any number of jobs
  jobs.forEach((job: AnalyticJob, index: number) => {
    // Calculate hour and minute to avoid exceeding 59 minutes
    const jobsPerHour = 11; // (59-5)/5 = 10.8, so 11 jobs max per hour
    const hour = Math.floor(index / jobsPerHour);
    const baseMinute = (index % jobsPerHour) * 5 + 5;
    
    // Format hour to ensure it stays within 0-23
    const scheduledHour = hour % 24;
    
    // Schedule job with calculated time
    cron.schedule(`${baseMinute} ${scheduledHour} * * *`, async () => {
      await processMissingDays(job);
      await runAnalyticJob(job, moment().subtract(1, 'day'));
    });
    
    console.log(`Scheduled job ${index} to run at ${scheduledHour}:${baseMinute.toString().padStart(2, '0')}`);
  });
};

const setupJobs = () => {
  scheduleAnalyticJobs(analyticJobs);

  cron.schedule('0 1 * * *', async () => {
    await processMissingDays(aggregateDailyAnalytics);
    await aggregateDailyAnalytics(moment().subtract(1, 'day'));
  });

  cron.schedule('0 2 1 * *', deleteOldRawData);
  cron.schedule('*/5 * * * *', runRealTimeAnalytics);
};

const runCatchUpOnStart = async () => {
  for (const job of analyticJobs) {
    await processMissingDays(job);
  }

  await processMissingDays(aggregateDailyAnalytics);

  const db = await getDB();
  const jobStatusRepo = db.getRepository(JobStatus);
  const deleteJobStatus = await jobStatusRepo.findOne({ where: { type: 'DELETE_OLD_RAW_DATA' } });
  
  if (!deleteJobStatus || moment(deleteJobStatus.lastProcessedDate).isBefore(moment().startOf('month'))) {
    console.log('Running catch-up deletion of old raw data...');
    await deleteOldRawData();
  }
};

export const initializeAnalytics = async () => {
  await runCatchUpOnStart();
  setupJobs();
};