import cron from 'node-cron';
import { getDB } from '../db';
import { Analytic, RawAnalytic, JobStatus, JobLock } from '../entities';
import moment from 'moment';
import { AnalyticType } from '../utils-client';

interface AnalyticJob {
  type: string;
  query: string;
  params: object;
  processResult: (result: any, date: string) => any;
}

const getDateRange = (date: moment.Moment) => {
  const start = date.clone().startOf('day');
  const end = date.clone().add(1, 'day').startOf('day');
  return { start, end };
};

const acquireLock = async (jobType: string, duration: number): Promise<boolean> => {
  const db = await getDB();
  const jobLockRepo = db.getRepository(JobLock);

  const now = new Date();
  const lockExpiration = new Date(now.getTime() + duration);

  try {
    await jobLockRepo.insert({
      jobType,
      lockedUntil: lockExpiration,
    });
    return true;
  } catch (error) {
    // If insert fails due to unique constraint, the lock is already held
    if (error.code === '23505') { // PostgreSQL unique violation error code
      return false;
    }
    throw error;
  }
};

const releaseLock = async (jobType: string): Promise<void> => {
  const db = await getDB();
  const jobLockRepo = db.getRepository(JobLock);
  await jobLockRepo.delete({ jobType });
};

const runWithLock = async (jobType: string, duration: number, job: () => Promise<void>): Promise<void> => {
  if (await acquireLock(jobType, duration)) {
    try {
      await job();
    } finally {
      await releaseLock(jobType);
    }
  } else {
    console.log(`Job ${jobType} is already running on another instance.`);
  }
};

const runAnalyticJob = async (job: AnalyticJob, date: moment.Moment) => {
  await runWithLock(job.type, 30 * 60 * 1000, async () => {
    const db = await getDB();
    const rawAnalyticRepo = db.getRepository(RawAnalytic);
    const analyticRepo = db.getRepository(Analytic);
    const jobStatusRepo = db.getRepository(JobStatus);
    const { start, end } = getDateRange(date);

    const result = await rawAnalyticRepo.query(job.query, {
      ...job.params,
      start: start.toDate(),
      end: end.toDate(),
    });

    const newAnalytic = new Analytic();
    newAnalytic.type = job.type;
    newAnalytic.data = job.processResult(result, date.format('YYYY-MM-DD'));

    await analyticRepo.save(newAnalytic);

    // Update job status
    await jobStatusRepo.update({ type: job.type }, { lastProcessedDate: end.toDate() }, { upsert: true });

    console.log(`${job.type} completed for ${date.format('YYYY-MM-DD')}`);
  });
};

const analyticJobs: AnalyticJob[] = [
  {
    type: 'DAILY_UNIQUE_VISITORS',
    query: `
      SELECT COUNT(DISTINCT ipAddress) as count
      FROM raw_analytic
      WHERE createdAt >= :start AND createdAt < :end
    `,
    params: {},
    processResult: (result, date) => ({
      date,
      count: result[0].count,
    }),
  },
  {
    type: 'DAILY_CONVERSIONS',
    query: `
      SELECT COUNT(*) as count
      FROM raw_analytic
      WHERE type = :type AND createdAt >= :start AND createdAt < :end
    `,
    params: { type: AnalyticType.CONVERSION },
    processResult: (result, date) => ({
      date,
      count: result[0].count,
    }),
  },
  {
    type: 'CURRENT_ACTIVE_USERS',
    query: `
      SELECT 
        DATE_TRUNC('minute', createdAt) as timeSlot,
        COUNT(DISTINCT sessionId) as activeUsers,
        JSON_OBJECT_AGG(
          country,
          JSON_BUILD_OBJECT(
            'count', COUNT(DISTINCT sessionId),
            'devices', JSON_OBJECT_AGG(
              data->>'deviceType',
              COUNT(DISTINCT sessionId)
            )
          )
        ) as countryData
      FROM raw_analytic
      CROSS JOIN LATERAL (
        SELECT country 
        FROM ip2location 
        WHERE ip_from <= CAST(split_part(ipAddress, '.', 1) AS BIGINT) * 16777216 +
                         CAST(split_part(ipAddress, '.', 2) AS BIGINT) * 65536 +
                         CAST(split_part(ipAddress, '.', 3) AS BIGINT) * 256 +
                         CAST(split_part(ipAddress, '.', 4) AS BIGINT)
          AND ip_to >= CAST(split_part(ipAddress, '.', 1) AS BIGINT) * 16777216 +
                        CAST(split_part(ipAddress, '.', 2) AS BIGINT) * 65536 +
                        CAST(split_part(ipAddress, '.', 3) AS BIGINT) * 256 +
                        CAST(split_part(ipAddress, '.', 4) AS BIGINT)
        LIMIT 1
      ) ip_lookup
      WHERE 
        type = :type 
        AND createdAt >= :start 
        AND createdAt < :end
      GROUP BY timeSlot
      ORDER BY timeSlot
    `,
    params: { type: AnalyticType.PAGE_VIEW },
    processResult: (result, date) => ({
      date,
      timeSeries: result.map(row => ({
        time: row.timeSlot,
        activeUsers: parseInt(row.activeUsers),
        countryData: JSON.parse(row.countryData)
      }))
    }),
  },
  {
    type: 'AVERAGE_LOADING_TIMES',
    query: `
      SELECT 
        DATE_TRUNC('hour', createdAt) as timeSlot,
        AVG(CAST(data->>'pageLoadTime' AS FLOAT)) as avgLoadTime
      FROM raw_analytic
      WHERE 
        type = :type 
        AND createdAt >= :start 
        AND createdAt < :end
      GROUP BY timeSlot
      ORDER BY timeSlot
    `,
    params: { type: AnalyticType.PAGE_LOAD },
    processResult: (result, date) => ({
      date,
      timeSeries: result.map(row => ({
        time: row.timeSlot,
        avgLoadTime: parseFloat(row.avgLoadTime)
      }))
    }),
  },
  {
    type: 'ERROR_COUNT',
    query: `
      SELECT 
        DATE_TRUNC('hour', createdAt) as timeSlot,
        data->>'errorMessage' as errorMessage,
        COUNT(*) as errorCount
      FROM raw_analytic
      WHERE 
        type = :type 
        AND createdAt >= :start 
        AND createdAt < :end
      GROUP BY timeSlot, errorMessage
      ORDER BY timeSlot, errorCount DESC
    `,
    params: { type: AnalyticType.ERROR },
    processResult: (result, date) => ({
      date,
      timeSeries: result.reduce((acc, row) => {
        const timeSlot = row.timeSlot;
        if (!acc[timeSlot]) {
          acc[timeSlot] = {
            time: timeSlot,
            totalErrors: 0,
            errorGroups: []
          };
        }
        acc[timeSlot].totalErrors += parseInt(row.errorCount);
        acc[timeSlot].errorGroups.push({
          message: row.errorMessage,
          count: parseInt(row.errorCount)
        });
        return acc;
      }, {}),
    }),
  },
  {
    type: 'AVERAGE_SESSION_DURATION',
    query: `
      WITH session_times AS (
        SELECT 
          sessionId,
          MIN(createdAt) as start_time,
          MAX(createdAt) as end_time
        FROM raw_analytic
        WHERE 
          sessionId IS NOT NULL
          AND createdAt >= :start 
          AND createdAt < :end
        GROUP BY sessionId
      )
      SELECT 
        DATE_TRUNC('hour', start_time) as timeSlot,
        AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avgDuration
      FROM session_times
      GROUP BY timeSlot
      ORDER BY timeSlot
    `,
    params: {},
    processResult: (result, date) => ({
      date,
      timeSeries: result.map(row => ({
        time: row.timeSlot,
        avgDuration: parseFloat(row.avgDuration)
      }))
    }),
  }
];

const aggregateDailyAnalytics = async (date: moment.Moment) => {
  await runWithLock('DAILY_AGGREGATION', 60 * 60 * 1000, async () => {
    const db = await getDB();
    const rawAnalyticRepo = db.getRepository(RawAnalytic);
    const analyticRepo = db.getRepository(Analytic);
    const jobStatusRepo = db.getRepository(JobStatus);
    const { start, end } = getDateRange(date);

    const aggregationQuery = `
      SELECT
        COUNT(*) as totalVisits,
        COUNT(DISTINCT ipAddress) as uniqueVisitors,
        AVG(pageLoadTime) as averagePageLoadTime,
        JSON_OBJECT_AGG(browserName, browserCount) as topBrowsers,
        JSON_OBJECT_AGG(referrer, referrerCount) as topReferrers,
        JSON_OBJECT_AGG(osName, osCount) as topOperatingSystems,
        JSON_OBJECT_AGG(language, languageCount) as topLanguages,
        JSON_OBJECT_AGG(deviceType, deviceTypeCount) as deviceTypes
      FROM raw_analytic
      LEFT JOIN (
        SELECT browserName, COUNT(*) as browserCount
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY browserName
        ORDER BY browserCount DESC
        LIMIT 5
      ) browsers ON raw_analytic.browserName = browsers.browserName
      LEFT JOIN (
        SELECT COALESCE(referrer, 'Direct') as referrer, COUNT(*) as referrerCount
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY referrer
        ORDER BY referrerCount DESC
        LIMIT 5
      ) referrers ON COALESCE(raw_analytic.referrer, 'Direct') = referrers.referrer
      -- Add similar subqueries for osName, language, and deviceType
      WHERE createdAt >= :start AND createdAt < :end
    `;

    const result = await rawAnalyticRepo.query(aggregationQuery, {
      start: start.toDate(),
      end: end.toDate(),
    });

    const newAnalytic = new Analytic();
    newAnalytic.type = 'DAILY_AGGREGATION';
    newAnalytic.data = {
      date: date.format('YYYY-MM-DD'),
      ...result[0],
      topBrowsers: JSON.parse(result[0].topBrowsers),
      topReferrers: JSON.parse(result[0].topReferrers),
      topOperatingSystems: JSON.parse(result[0].topOperatingSystems),
      topLanguages: JSON.parse(result[0].topLanguages),
      deviceTypes: JSON.parse(result[0].deviceTypes),
    };

    await analyticRepo.save(newAnalytic);

    // Update job status
    await jobStatusRepo.update({ type: 'DAILY_AGGREGATION' }, { lastProcessedDate: end.toDate() }, { upsert: true });

    console.log(`Daily analytics aggregation completed for ${date.format('YYYY-MM-DD')}`);
  });
};

const deleteOldRawData = async () => {
  await runWithLock('DELETE_OLD_RAW_DATA', 2 * 60 * 60 * 1000, async () => {
    const db = await getDB();
    const rawAnalyticRepo = db.getRepository(RawAnalytic);
    const jobStatusRepo = db.getRepository(JobStatus);

    // Get the date 2 months ago
    const twoMonthsAgo = moment().subtract(2, 'months').startOf('day');

    // Delete old raw data
    const deleteResult = await rawAnalyticRepo.createQueryBuilder()
      .delete()
      .where("createdAt < :date", { date: twoMonthsAgo.toDate() })
      .execute();

    console.log(`Deleted ${deleteResult.affected} old raw analytic records.`);

    // Update job status
    await jobStatusRepo.update(
      { type: 'DELETE_OLD_RAW_DATA' },
      { lastProcessedDate: new Date() },
      { upsert: true }
    );
  });
};

const processMissingDays = async (job: AnalyticJob | typeof aggregateDailyAnalytics) => {
  await runWithLock(`CATCH_UP_${job.type}`, 4 * 60 * 60 * 1000, async () => {
    const db = await getDB();
    const jobStatusRepo = db.getRepository(JobStatus);

    const jobStatus = await jobStatusRepo.findOne({ where: { type: job.type } });
    const lastProcessedDate = jobStatus ? moment(jobStatus.lastProcessedDate) : moment().subtract(30, 'days');
    const today = moment().startOf('day');

    let currentDate = lastProcessedDate.clone().add(1, 'day');

    while (currentDate.isSameOrBefore(today)) {
      if (job === aggregateDailyAnalytics) {
        await aggregateDailyAnalytics(currentDate);
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

const setupJobs = () => {
  analyticJobs.forEach((job, index) => {
    cron.schedule(`${5 + index * 5} 0 * * *`, async () => {
      await processMissingDays(job);
      await runAnalyticJob(job, moment().subtract(1, 'day'));
    });
  });

  cron.schedule('0 1 * * *', async () => {
    await processMissingDays(aggregateDailyAnalytics);
    await aggregateDailyAnalytics(moment().subtract(1, 'day'));
  });

  cron.schedule('0 2 1 * *', async () => {
    console.log('Starting deletion of old raw data...');
    await deleteOldRawData();
    console.log('Finished deletion of old raw data.');
  });

  cron.schedule('*/5 * * * *', async () => {
    await runRealTimeAnalytics();
  });
};

// Run catch-up on server start
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