import cron from 'node-cron';
import { getDB } from '../../../lib/db';
import { Analytic, RawAnalytic, JobStatus, JobLock } from '../../../lib/entities';
import moment from 'moment';
import { QueryRunner } from 'typeorm';
import os from 'os';
import { analyticJobs } from './jobs';
import { AnalyticJob, DailyAggregationResult } from './types';
import { WorkerPool } from './workerpool';

const workerPool = new WorkerPool(Math.min(4, os.cpus().length - 1));

const getDateRange = (date: moment.Moment) => ({
  start: date.clone().startOf('day'),
  end: date.clone().add(1, 'day').startOf('day')
});

const cleanupExpiredLocks = async (): Promise<void> => {
    const db = await getDB();
    const queryRunner = db.createQueryRunner();
  
    await queryRunner.connect();
    await queryRunner.startTransaction();

    await queryRunner.manager.createQueryBuilder()
        .delete()
        .from(JobLock)
        .execute();
};

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
    return false;
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
    const result = await workerPool.runTask(job, date.toISOString());
    const newAnalytic = new Analytic();
    newAnalytic.type = result.type;
    newAnalytic.data = result.data;
    await queryRunner.manager.save(Analytic, newAnalytic);
    await queryRunner.manager.update(JobStatus, { type: job.type }, { lastProcessedDate: result.date });
    console.log(`${job.type} completed for ${date.format('YYYY-MM-DD')}`);
  });
};

const aggregateDailyAnalytics = async (date: moment.Moment) => {
    console.log("AGRGATE");
  await runWithLock('DAILY_AGGREGATION', 60 * 60 * 1000, async (queryRunner) => {
    const { start, end } = getDateRange(date);

    const aggregationQuery = `
        WITH base_metrics AS (
    SELECT
        COUNT(*) as totalVisits,
        COUNT(DISTINCT ipAddress) as uniqueVisitors,
        COUNT(DISTINCT sessionId) as uniqueSessions,
        AVG(CAST(json_extract(data, '$.pageLoadTime') AS FLOAT)) as averagePageLoadTime
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    GROUP BY 1=1  -- Adding a constant GROUP BY to make SQLite happy with aggregates
),
browser_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.browserName'), 'Unknown') as browserName,
        COUNT(*) as count
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.browserName')
),
browser_json AS (
    SELECT json_group_object(browserName, count) as topBrowsers
    FROM browser_metrics
),
os_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.osName'), 'Unknown') as osName,
        COUNT(*) as count
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.osName')
),
os_json AS (
    SELECT json_group_object(osName, count) as topOperatingSystems
    FROM os_metrics
),
device_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.deviceType'), 'Unknown') as deviceType,
        COUNT(*) as count
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.deviceType')
),
device_json AS (
    SELECT json_group_object(deviceType, count) as deviceTypes
    FROM device_metrics
),
referrer_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.referrer'), 'Direct') as referrer,
        COUNT(*) as count
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.referrer')
),
referrer_json AS (
    SELECT json_group_object(referrer, count) as topReferrers
    FROM referrer_metrics
),
language_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.language'), 'Unknown') as language,
        COUNT(*) as count
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.language')
),
language_json AS (
    SELECT json_group_object(language, count) as topLanguages
    FROM language_metrics
),
page_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.path'), '/') as path,
        COUNT(*) as pageViews,
        COUNT(DISTINCT sessionId) as uniquePageViews,
        AVG(CAST(json_extract(data, '$.pageLoadTime') AS FLOAT)) as avgLoadTime,
        AVG(CAST(json_extract(data, '$.timeOnPage') AS FLOAT)) as avgTimeOnPage
    FROM raw_analytic
    WHERE type = 1  -- PAGE_VIEW
    AND createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.path')
),
page_json AS (
    SELECT json_group_array(
        json_object(
            'path', path,
            'pageViews', pageViews,
            'uniquePageViews', uniquePageViews,
            'avgLoadTime', avgLoadTime,
            'avgTimeOnPage', avgTimeOnPage
        )
    ) as topPages
    FROM page_metrics
),
event_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.eventType'), 'Unknown') as eventType,
        COUNT(*) as eventCount,
        COUNT(DISTINCT sessionId) as uniqueUsers
    FROM raw_analytic
    WHERE type = 5  -- CUSTOM_EVENT
    AND createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.eventType')
),
event_json AS (
    SELECT json_group_array(
        json_object(
            'type', eventType,
            'eventCount', eventCount,
            'uniqueUsers', uniqueUsers
        )
    ) as eventBreakdown
    FROM event_metrics
),
form_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.formId'), 'Unknown') as formId,
        COUNT(*) as submissions,
        COUNT(DISTINCT sessionId) as uniqueSubmissions
    FROM raw_analytic
    WHERE type = 4  -- FORM_SUBMISSION
    AND createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.formId')
),
form_json AS (
    SELECT json_group_array(
        json_object(
            'formId', formId,
            'submissions', submissions,
            'uniqueSubmissions', uniqueSubmissions
        )
    ) as formStats
    FROM form_metrics
),
error_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.errorType'), 'Unknown') as errorType,
        json_extract(data, '$.errorMessage') as errorMessage,
        COUNT(*) as errorCount
    FROM raw_analytic
    WHERE type = 6  -- ERROR
    AND createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.errorType'), json_extract(data, '$.errorMessage')
),
error_json AS (
    SELECT json_group_array(
        json_object(
            'errorType', errorType,
            'errorMessage', errorMessage,
            'count', errorCount
        )
    ) as topErrors
    FROM error_metrics
),
conversion_metrics AS (
    SELECT 
        COALESCE(json_extract(data, '$.conversionType'), 'Unknown') as conversionType,
        COUNT(*) as conversionCount,
        COUNT(DISTINCT sessionId) as uniqueConversions
    FROM raw_analytic
    WHERE type = 7  -- CONVERSION
    AND createdAt >= :start
    AND createdAt < :end
    GROUP BY json_extract(data, '$.conversionType')
),
conversion_json AS (
    SELECT json_group_array(
        json_object(
            'conversionType', conversionType,
            'conversionCount', conversionCount,
            'uniqueConversions', uniqueConversions
        )
    ) as conversionStats
    FROM conversion_metrics
),
click_metrics AS (
    SELECT COUNT(*) as totalClicks
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    AND type = 2  -- CLICK
    GROUP BY 1=1  -- Adding a constant GROUP BY for SQLite
),
scroll_metrics AS (
    SELECT 
        COUNT(*) as totalScrolls,
        AVG(CAST(json_extract(data, '$.scrollDepth') AS FLOAT)) as averageScrollDepth
    FROM raw_analytic
    WHERE createdAt >= :start
    AND createdAt < :end
    AND type = 3  -- SCROLL
    GROUP BY 1=1  -- Adding a constant GROUP BY for SQLite
)

SELECT 
    base_metrics.*,
    browser_json.topBrowsers,
    os_json.topOperatingSystems,
    device_json.deviceTypes,
    referrer_json.topReferrers,
    language_json.topLanguages,
    page_json.topPages,
    event_json.eventBreakdown,
    form_json.formStats,
    error_json.topErrors,
    conversion_json.conversionStats,
    COALESCE(click_metrics.totalClicks, 0) as totalClicks,
    COALESCE(scroll_metrics.totalScrolls, 0) as totalScrolls,
    scroll_metrics.averageScrollDepth
FROM base_metrics
CROSS JOIN browser_json
CROSS JOIN os_json
CROSS JOIN device_json
CROSS JOIN referrer_json
CROSS JOIN language_json
CROSS JOIN page_json
CROSS JOIN event_json
CROSS JOIN form_json
CROSS JOIN error_json
CROSS JOIN conversion_json
LEFT JOIN click_metrics
LEFT JOIN scroll_metrics;
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
const jobType = typeof job === 'function' ? 'DAILY_AGGREGATION' : job.type;

const db = await getDB();
const jobStatus = await db.manager.findOne(JobStatus, { where: { type: jobType } });
const lastProcessedDate = jobStatus ? moment(jobStatus.lastProcessedDate) : moment().subtract(30, 'days');
const today = moment().startOf('day');
const currentDate = lastProcessedDate.clone().add(1, 'day');

while (currentDate.isSameOrBefore(today)) {
    // Get specific date being processed
    const dateToProcess = currentDate.clone();
    
    // Run with lock for this specific date
    await runWithLock(
    `CATCH_UP_${jobType}_${dateToProcess.format('YYYY-MM-DD')}`, 
    4 * 60 * 60 * 1000, 
    async (queryRunner) => {
        if (typeof job === 'function') {
            await job(dateToProcess);
        } else {
            const result = await workerPool.runTask(job, dateToProcess.toISOString());
            
            const newAnalytic = new Analytic();
            newAnalytic.type = result.type;
            newAnalytic.data = result.data;
            
            await queryRunner.manager.save(Analytic, newAnalytic);
            await queryRunner.manager.update(JobStatus, { type: job.type }, { lastProcessedDate: result.date });
            
            console.log(`Catch up ${job.type} completed for ${dateToProcess.format('YYYY-MM-DD')}`);
            }
        }
    );
    currentDate.add(1, 'day');
    }
};

const runRealTimeAnalytics = async () => {
  const now = moment();
  const fiveMinutesAgo = now.clone().subtract(5, 'minutes');

  const tasks = analyticJobs
    .filter(job => ['CURRENT_ACTIVE_USERS', 'AVERAGE_LOADING_TIMES', 'ERROR_COUNT'].includes(job.type))
    .map(job => runAnalyticJob(job, fiveMinutesAgo));

  await Promise.all(tasks);
};

const scheduleAnalyticJobs = (jobs: AnalyticJob[]) => {
  jobs.forEach((job: AnalyticJob, index: number) => {
    const jobsPerHour = 11;
    const hour = Math.floor(index / jobsPerHour);
    const baseMinute = (index % jobsPerHour) * 5 + 5;
    const scheduledHour = hour % 24;
    
    cron.schedule(`${baseMinute} ${scheduledHour} * * *`, async () => {
      await processMissingDays(job);
      await runAnalyticJob(job, moment().subtract(1, 'day'));
    });
    
    console.log(`Scheduled job ${job.type} to run at ${scheduledHour}:${baseMinute.toString().padStart(2, '0')}`);
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
  await cleanupExpiredLocks();
  await runCatchUpOnStart();
  setupJobs();
};

process.on('SIGTERM', async () => {
  await workerPool.terminate();
  process.exit(0);
});