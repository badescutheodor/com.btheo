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

const analyticJobs: AnalyticJob[] = [
  {
    type: 'DAILY_UNIQUE_VISITORS',
    query: `
      SELECT COUNT(DISTINCT ipAddress) as count
      FROM raw_analytic
      WHERE createdAt >= :start AND createdAt < :end
    `,
    params: {},
    processResult: (result, date) => {
      const timeSeries = result.map((row: any) => ({
        time: row.timeSlot,
        count: parseInt(row.count)
      }));
      return {
        date,
        count: timeSeries[timeSeries.length - 1].count,
        timeSeries,
        predictedValues: calculatePredictedValues(timeSeries, 'count')
      };
    },
  },
  {
    type: 'DAILY_CONVERSIONS',
    query: `
      SELECT COUNT(*) as count
      FROM raw_analytic
      WHERE type = :type AND createdAt >= :start AND createdAt < :end
    `,
    params: { type: AnalyticType.CONVERSION },
    processResult: (result, date) => {
      const timeSeries = result.map((row: any) => ({
        time: row.timeSlot,
        count: parseInt(row.count)
      }));
      return {
        date,
        count: timeSeries[timeSeries.length - 1].count,
        timeSeries,
        predictedValues: calculatePredictedValues(timeSeries, 'count')
      };
    },
  },
  {
    type: 'CURRENT_ACTIVE_USERS',
    query: `
      WITH time_slots AS (
        SELECT 
          datetime(createdAt, 'start of minute') as timeSlot
        FROM raw_analytic
        WHERE 
          type = ? 
          AND createdAt >= ? 
          AND createdAt < ?
        GROUP BY datetime(createdAt, 'start of minute')
      ),
      session_counts AS (
        SELECT 
          datetime(createdAt, 'start of minute') as timeSlot,
          COUNT(DISTINCT sessionId) as activeUsers,
          GROUP_CONCAT(DISTINCT json_object(
            'country', country,
            'count', COUNT(DISTINCT sessionId),
            'devices', json_object(json_extract(data, '$.deviceType'), COUNT(DISTINCT sessionId))
          )) as countryData
        FROM raw_analytic
        LEFT JOIN ip2location ON 
          (CAST(substr(ipAddress, 1, instr(ipAddress, '.')-1) AS INTEGER) * 16777216 +
           CAST(substr(substr(ipAddress, instr(ipAddress, '.')+1), 1, instr(substr(ipAddress, instr(ipAddress, '.')+1), '.')-1) AS INTEGER) * 65536 +
           CAST(substr(substr(ipAddress, instr(ipAddress, '.', instr(ipAddress, '.')+1)+1), 1, instr(substr(ipAddress, instr(ipAddress, '.', instr(ipAddress, '.')+1)+1), '.')-1) AS INTEGER) * 256 +
           CAST(substr(ipAddress, instr(ipAddress, '.', instr(ipAddress, '.', instr(ipAddress, '.')+1)+1)+1) AS INTEGER)) 
          BETWEEN ipFrom AND ipTo
        WHERE 
          type = ? 
          AND createdAt >= ? 
          AND createdAt < ?
        GROUP BY datetime(createdAt, 'start of minute'), country
      )
      SELECT 
        time_slots.timeSlot,
        COALESCE(session_counts.activeUsers, 0) as activeUsers,
        COALESCE(session_counts.countryData, '[]') as countryData
      FROM time_slots
      LEFT JOIN session_counts ON time_slots.timeSlot = session_counts.timeSlot
      ORDER BY time_slots.timeSlot
    `,
    params: { type: AnalyticType.PAGE_VIEW },
    processResult: (result, date) => {
      const timeSeries = result.map((row: any) => ({
        time: row.timeSlot,
        activeUsers: row.activeUsers,
        countryData: JSON.parse(`[${row.countryData}]`)
      }));
      return {
        date,
        timeSeries,
        predictedValues: calculatePredictedValues(timeSeries, 'activeUsers')
      };
    },
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
    processResult: (result, date) => {
      const timeSeries = result.map((row: any) => ({
        time: row.timeSlot,
        avgLoadTime: parseFloat(row.avgLoadTime)
      }));
      return {
        date,
        timeSeries,
        predictedValues: calculatePredictedValues(timeSeries, 'avgLoadTime')
      };
    },
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
    processResult: (result, date) => {
      const timeSeries = result.reduce((acc: Record<string, any>, row: ErrorCountRow) => {
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
      }, {});
      const timeSeriesArray = Object.values(timeSeries);
      return {
        date,
        timeSeries: timeSeriesArray,
        predictedValues: calculatePredictedValues(timeSeriesArray, 'totalErrors')
      };
    },
  },
  {
    type: 'BOUNCE_RATE',
    query: `
      WITH session_data AS (
        SELECT 
          sessionId,
          COUNT(*) as pageviews,
          MAX(CASE WHEN type = :conversionType THEN 1 ELSE 0 END) as has_conversion
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY sessionId
      )
      SELECT 
        COUNT(CASE WHEN pageviews = 1 AND has_conversion = 0 THEN 1 END) * 100.0 / COUNT(*) as bounce_rate
      FROM session_data
    `,
    params: { conversionType: AnalyticType.CONVERSION },
    processResult: (result, date) => ({
      date,
      bounceRate: parseFloat(result[0].bounce_rate).toFixed(2)
    }),
  },
  {
    type: 'USER_RETENTION',
    query: `
      WITH user_sessions AS (
        SELECT 
          ipAddress,
          MIN(DATE(createdAt)) as first_visit,
          MAX(DATE(createdAt)) as last_visit
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY ipAddress
      )
      SELECT 
        DATEDIFF(last_visit, first_visit) as days_since_first_visit,
        COUNT(*) as user_count
      FROM user_sessions
      GROUP BY days_since_first_visit
      ORDER BY days_since_first_visit
    `,
    params: {},
    processResult: (result, date) => ({
      date,
      retentionData: result.map((row: any) => ({
        daysSinceFirstVisit: row.days_since_first_visit,
        userCount: parseInt(row.user_count)
      }))
    }),
  },
  {
    type: 'CONVERSION_FUNNEL',
    query: `
      WITH funnel_steps AS (
        SELECT
          sessionId,
          MAX(CASE WHEN type = :pageViewType THEN 1 ELSE 0 END) as reached_step1,
          MAX(CASE WHEN type = :formSubmissionType THEN 1 ELSE 0 END) as reached_step2,
          MAX(CASE WHEN type = :conversionType THEN 1 ELSE 0 END) as reached_step3
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY sessionId
      )
      SELECT
        SUM(reached_step1) as step1_count,
        SUM(reached_step2) as step2_count,
        SUM(reached_step3) as step3_count
      FROM funnel_steps
    `,
    params: { 
      pageViewType: AnalyticType.PAGE_VIEW,
      formSubmissionType: AnalyticType.FORM_SUBMISSION,
      conversionType: AnalyticType.CONVERSION
    },
    processResult: (result, date) => ({
      date,
      funnelSteps: [
        { name: 'Page View', count: parseInt(result[0].step1_count) },
        { name: 'Form Submission', count: parseInt(result[0].step2_count) },
        { name: 'Conversion', count: parseInt(result[0].step3_count) }
      ]
    }),
  },
  {
    type: 'PAGE_PERFORMANCE',
    query: `
      SELECT 
        data->>'pathname' as pathname,
        AVG(CAST(data->>'pageLoadTime' AS FLOAT)) as avg_load_time,
        COUNT(*) as view_count
      FROM raw_analytic
      WHERE 
        type = :pageLoadType 
        AND createdAt >= :start 
        AND createdAt < :end
      GROUP BY data->>'pathname'
      ORDER BY view_count DESC
      LIMIT 10
    `,
    params: { pageLoadType: AnalyticType.PAGE_LOAD },
    processResult: (result, date) => ({
      date,
      pagePerformance: result.map((row: any) => ({
        pathname: row.pathname,
        avgLoadTime: parseFloat(row.avg_load_time).toFixed(2),
        viewCount: parseInt(row.view_count)
      }))
    }),
  },
  {
    type: 'USER_FLOW',
    query: `
      WITH ordered_pages AS (
        SELECT 
          sessionId,
          data->>'pathname' as pathname,
          ROW_NUMBER() OVER (PARTITION BY sessionId ORDER BY createdAt) as page_order
        FROM raw_analytic
        WHERE 
          type = :pageViewType
          AND createdAt >= :start 
          AND createdAt < :end
      )
      SELECT 
        p1.pathname as from_page,
        p2.pathname as to_page,
        COUNT(*) as transition_count
      FROM ordered_pages p1
      JOIN ordered_pages p2 ON p1.sessionId = p2.sessionId AND p1.page_order = p2.page_order - 1
      GROUP BY p1.pathname, p2.pathname
      ORDER BY transition_count DESC
      LIMIT 20
    `,
    params: { pageViewType: AnalyticType.PAGE_VIEW },
    processResult: (result, date) => ({
      date,
      userFlows: result.map((row: any) => ({
        fromPage: row.from_page,
        toPage: row.to_page,
        transitionCount: parseInt(row.transition_count)
      }))
    }),
  },
  {
    type: 'CHANNEL_PERFORMANCE',
    query: `
      SELECT 
        data->>'channel' as channel,
        COUNT(DISTINCT sessionId) as sessions,
        COUNT(DISTINCT ipAddress) as unique_visitors,
        COUNT(*) as total_events,
        SUM(CASE WHEN type = :conversionType THEN 1 ELSE 0 END) as conversions
      FROM raw_analytic
      WHERE createdAt >= :start AND createdAt < :end
      GROUP BY data->>'channel'
      ORDER BY sessions DESC
    `,
    params: { conversionType: AnalyticType.CONVERSION },
    processResult: (result, date) => ({
      date,
      channelPerformance: result.map((row: any) => ({
        channel: row.channel,
        sessions: parseInt(row.sessions),
        uniqueVisitors: parseInt(row.unique_visitors),
        totalEvents: parseInt(row.total_events),
        conversions: parseInt(row.conversions),
        conversionRate: (parseInt(row.conversions) / parseInt(row.sessions) * 100).toFixed(2)
      }))
    }),
  },
  {
    type: 'CHANNEL_ATTRIBUTION',
    query: `
      WITH first_touch AS (
        SELECT 
          sessionId,
          FIRST_VALUE(data->>'channel') OVER (PARTITION BY sessionId ORDER BY createdAt) as first_channel
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
      ),
      last_touch AS (
        SELECT 
          sessionId,
          LAST_VALUE(data->>'channel') OVER (PARTITION BY sessionId ORDER BY createdAt ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_channel
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
      ),
      conversions AS (
        SELECT DISTINCT sessionId
        FROM raw_analytic
        WHERE type = :conversionType AND createdAt >= :start AND createdAt < :end
      )
      SELECT 
        COALESCE(ft.first_channel, lt.last_channel) as channel,
        COUNT(DISTINCT CASE WHEN ft.first_channel IS NOT NULL THEN c.sessionId END) as first_touch_conversions,
        COUNT(DISTINCT CASE WHEN lt.last_channel IS NOT NULL THEN c.sessionId END) as last_touch_conversions
      FROM conversions c
      LEFT JOIN first_touch ft ON c.sessionId = ft.sessionId
      LEFT JOIN last_touch lt ON c.sessionId = lt.sessionId
      GROUP BY COALESCE(ft.first_channel, lt.last_channel)
    `,
    params: { conversionType: AnalyticType.CONVERSION },
    processResult: (result, date) => ({
      date,
      channelAttribution: result.map((row: any) => ({
        channel: row.channel,
        firstTouchConversions: parseInt(row.first_touch_conversions),
        lastTouchConversions: parseInt(row.last_touch_conversions)
      }))
    }),
  },
  {
    type: 'UTM_CAMPAIGN_PERFORMANCE',
    query: `
      SELECT 
        data->>'utm_source' as utm_source,
        data->>'utm_medium' as utm_medium,
        data->>'utm_campaign' as utm_campaign,
        COUNT(DISTINCT sessionId) as sessions,
        COUNT(DISTINCT ipAddress) as unique_visitors,
        SUM(CASE WHEN type = :conversionType THEN 1 ELSE 0 END) as conversions
      FROM raw_analytic
      WHERE 
        createdAt >= :start AND createdAt < :end
        AND data->>'utm_source' IS NOT NULL
      GROUP BY data->>'utm_source', data->>'utm_medium', data->>'utm_campaign'
      ORDER BY sessions DESC
    `,
    params: { conversionType: AnalyticType.CONVERSION },
    processResult: (result, date) => ({
      date,
      utmCampaignPerformance: result.map((row: any) => ({
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        sessions: parseInt(row.sessions),
        uniqueVisitors: parseInt(row.unique_visitors),
        conversions: parseInt(row.conversions),
        conversionRate: (parseInt(row.conversions) / parseInt(row.sessions) * 100).toFixed(2)
      }))
    }),
  },
  {
    type: 'CHANNEL_ENGAGEMENT',
    query: `
      SELECT 
        data->>'channel' as channel,
        AVG(EXTRACT(EPOCH FROM (MAX(createdAt) - MIN(createdAt)))) as avg_session_duration,
        AVG(page_views) as avg_page_views
      FROM (
        SELECT 
          sessionId,
          data->>'channel' as channel,
          COUNT(*) as page_views
        FROM raw_analytic
        WHERE 
          type = :pageViewType
          AND createdAt >= :start AND createdAt < :end
        GROUP BY sessionId, data->>'channel'
      ) session_data
      JOIN raw_analytic USING (sessionId)
      GROUP BY data->>'channel'
    `,
    params: { pageViewType: AnalyticType.PAGE_VIEW },
    processResult: (result, date) => ({
      date,
      channelEngagement: result.map((row: any) => ({
        channel: row.channel,
        avgSessionDuration: parseFloat(row.avg_session_duration).toFixed(2),
        avgPageViews: parseFloat(row.avg_page_views).toFixed(2)
      }))
    }),
  },
  {
    type: 'NEW_VS_RETURNING_BY_CHANNEL',
    query: `
      WITH user_visits AS (
        SELECT 
          ipAddress,
          data->>'channel' as channel,
          MIN(createdAt) as first_visit
        FROM raw_analytic
        GROUP BY ipAddress, data->>'channel'
      )
      SELECT 
        channel,
        SUM(CASE WHEN first_visit >= :start THEN 1 ELSE 0 END) as new_visitors,
        SUM(CASE WHEN first_visit < :start THEN 1 ELSE 0 END) as returning_visitors
      FROM user_visits
      WHERE first_visit < :end
      GROUP BY channel
    `,
    params: {},
    processResult: (result, date) => ({
      date,
      newVsReturning: result.map((row: any) => ({
        channel: row.channel,
        newVisitors: parseInt(row.new_visitors),
        returningVisitors: parseInt(row.returning_visitors)
      }))
    }),
  },
  {
    type: 'DEVICE_CROSS_USAGE',
    query: `
      WITH user_devices AS (
        SELECT 
          ipAddress,
          data->>'deviceType' as device_type
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY ipAddress, data->>'deviceType'
      )
      SELECT 
        STRING_AGG(device_type, ', ' ORDER BY device_type) as device_combination,
        COUNT(DISTINCT ipAddress) as user_count
      FROM user_devices
      GROUP BY ipAddress
      HAVING COUNT(DISTINCT device_type) > 1
      GROUP BY device_combination
      ORDER BY user_count DESC
    `,
    params: {},
    processResult: (result, date) => ({
      date,
      deviceCrossUsage: result.map((row: any) => ({
        deviceCombination: row.device_combination,
        userCount: parseInt(row.user_count)
      }))
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
      timeSeries: result.map((row: any) => ({
        time: row.timeSlot,
        avgDuration: parseFloat(row.avgDuration)
      }))
    }),
  }
];

const aggregateDailyAnalytics = async (date: moment.Moment) => {
  await runWithLock('DAILY_AGGREGATION', 60 * 60 * 1000, async (queryRunner) => {
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

    let currentDate = lastProcessedDate.clone().add(1, 'day');

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