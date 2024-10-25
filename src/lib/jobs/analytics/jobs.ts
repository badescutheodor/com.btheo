import { AnalyticJob, AnalyticType, ErrorCountRow } from './types';
import moment from 'moment';

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

export const analyticJobs: AnalyticJob[] = [
    {
      type: 'DAILY_UNIQUE_VISITORS',
      query: `
        SELECT 
          datetime(strftime('%Y-%m-%d %H:00:00', createdAt)) as timeSlot,
          COUNT(DISTINCT ipAddress) as count
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY timeSlot
        ORDER BY timeSlot
      `,
      params: {},
      processResult: (result, date) => {
        const timeSeries = result.map((row: any) => ({
          time: row.timeSlot,
          count: parseInt(row.count)
        }));
        return {
          date,
          count: timeSeries.length ? timeSeries[timeSeries.length - 1].count : 0,
          timeSeries,
          predictedValues: calculatePredictedValues(timeSeries, 'count')
        };
      },
    },
    {
      type: 'DAILY_CONVERSIONS',
      query: `
        SELECT 
          datetime(strftime('%Y-%m-%d %H:00:00', createdAt)) as timeSlot,
          COUNT(*) as count
        FROM raw_analytic
        WHERE 
          type = :type 
          AND createdAt >= :start 
          AND createdAt < :end
        GROUP BY timeSlot
        ORDER BY timeSlot
      `,
      params: { type: AnalyticType.CONVERSION },
      processResult: (result, date) => {
        const timeSeries = result.map((row: any) => ({
          time: row.timeSlot,
          count: parseInt(row.count)
        }));
        return {
          date,
          count: timeSeries.length ? timeSeries[timeSeries.length - 1].count : 0,
          timeSeries,
          predictedValues: calculatePredictedValues(timeSeries, 'count')
        };
      },
    },
    {
      type: 'CURRENT_ACTIVE_USERS',
      query: `
        WITH split_ip AS (
      SELECT
          datetime(strftime('%Y-%m-%d %H:%M:00', createdAt)) as timeSlot,
          sessionId,
          data,
          ipAddress
      FROM raw_analytic
      WHERE
          type = :type
          AND createdAt >= :start
          AND createdAt < :end
  ),
  
  device_counts AS (
      SELECT
          timeSlot,
          COALESCE(ip2location.countryName, 'Unknown') as country,
          json_extract(ic.data, '$.deviceType') as deviceType,
          COUNT(DISTINCT ic.sessionId) as device_count
      FROM split_ip ic
      LEFT JOIN ip2location ON (
          CAST(ic.ipAddress AS INTEGER) >= CAST(ip2location.ipFrom AS INTEGER)
          AND CAST(ic.ipAddress AS INTEGER) <= CAST(ip2location.ipTo AS INTEGER)
      )
      GROUP BY
          timeSlot,
          country,
          json_extract(ic.data, '$.deviceType')
  ),
  
  country_stats AS (
      SELECT
          timeSlot,
          country,
          SUM(device_count) as country_total,
          json_group_array(
              json_object(
                  'deviceType', deviceType,
                  'count', device_count
              )
          ) as devices
      FROM device_counts
      GROUP BY timeSlot, country
  ),
  
  final_counts AS (
      SELECT
          timeSlot,
          SUM(country_total) as activeUsers,
          json_group_array(
              json_object(
                  'country', country,
                  'count', country_total,
                  'devices', devices
              )
          ) as countryData
      FROM country_stats
      GROUP BY timeSlot
  ),
  
  all_minutes AS (
      WITH RECURSIVE minutes(dt) AS (
          SELECT datetime(:start, 'start of minute')
          UNION ALL
          SELECT datetime(dt, '+1 minute')
          FROM minutes
          WHERE dt < datetime(:end, '-1 minute')
      )
      SELECT dt as timeSlot FROM minutes
  )
  
  SELECT
      all_minutes.timeSlot,
      COALESCE(final_counts.activeUsers, 0) as activeUsers,
      COALESCE(final_counts.countryData, '[]') as countryData
  FROM all_minutes
  LEFT JOIN final_counts ON all_minutes.timeSlot = final_counts.timeSlot
  ORDER BY all_minutes.timeSlot;
  
  -- Recommended indexes for performance
  CREATE INDEX IF NOT EXISTS idx_raw_analytic_created_at ON raw_analytic(createdAt);
  CREATE INDEX IF NOT EXISTS idx_raw_analytic_type ON raw_analytic(type);
  CREATE INDEX IF NOT EXISTS idx_ip2location_ip_range ON ip2location(ipFrom, ipTo);
      `,
      params: { type: AnalyticType.PAGE_VIEW },
      processResult: (result, date) => {
        const timeSeries = result.map((row: any) => ({
          time: row.timeSlot,
          activeUsers: parseInt(row.activeUsers),
          countryData: JSON.parse(row.countryData)
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
          datetime(strftime('%Y-%m-%d %H:00:00', createdAt)) as timeSlot,
          AVG(CAST(json_extract(data, '$.pageLoadTime') AS FLOAT)) as avgLoadTime
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
          datetime(strftime('%Y-%m-%d %H:00:00', createdAt)) as timeSlot,
          json_extract(data, '$.errorMessage') as errorMessage,
          COUNT(*) as errorCount
        FROM raw_analytic
        WHERE 
          type = :type 
          AND createdAt >= :start 
          AND createdAt < :end
        GROUP BY timeSlot, json_extract(data, '$.errorMessage')
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
            date(MIN(createdAt)) as first_visit,
            date(MAX(createdAt)) as last_visit
          FROM raw_analytic
          WHERE createdAt >= :start AND createdAt < :end
          GROUP BY ipAddress
        )
        SELECT 
          CAST(
            (julianday(last_visit) - julianday(first_visit)) AS INTEGER
          ) as days_since_first_visit,
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
          json_extract(data, '$.pathname') as pathname,
          AVG(CAST(json_extract(data, '$.pageLoadTime') AS FLOAT)) as avg_load_time,
          COUNT(*) as view_count
        FROM raw_analytic
        WHERE 
          type = :pageLoadType 
          AND createdAt >= :start 
          AND createdAt < :end
        GROUP BY json_extract(data, '$.pathname')
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
            json_extract(data, '$.pathname') as pathname,
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
          json_extract(data, '$.channel') as channel,
          COUNT(DISTINCT sessionId) as sessions,
          COUNT(DISTINCT ipAddress) as unique_visitors,
          COUNT(*) as total_events,
          SUM(CASE WHEN type = :conversionType THEN 1 ELSE 0 END) as conversions
        FROM raw_analytic
        WHERE createdAt >= :start AND createdAt < :end
        GROUP BY json_extract(data, '$.channel')
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
            json_extract(data, '$.channel') as channel,
            ROW_NUMBER() OVER (PARTITION BY sessionId ORDER BY createdAt) as rn
          FROM raw_analytic
          WHERE createdAt >= :start AND createdAt < :end
        ),
        last_touch AS (
          SELECT 
            sessionId,
            json_extract(data, '$.channel') as channel,
            ROW_NUMBER() OVER (PARTITION BY sessionId ORDER BY createdAt DESC) as rn
          FROM raw_analytic
          WHERE createdAt >= :start AND createdAt < :end
        ),
        conversions AS (
          SELECT DISTINCT sessionId
          FROM raw_analytic
          WHERE type = :conversionType AND createdAt >= :start AND createdAt < :end
        )
        SELECT 
          COALESCE(ft.channel, lt.channel) as channel,
          COUNT(DISTINCT CASE WHEN ft.channel IS NOT NULL THEN c.sessionId END) as first_touch_conversions,
          COUNT(DISTINCT CASE WHEN lt.channel IS NOT NULL THEN c.sessionId END) as last_touch_conversions
        FROM conversions c
        LEFT JOIN first_touch ft ON c.sessionId = ft.sessionId AND ft.rn = 1
        LEFT JOIN last_touch lt ON c.sessionId = lt.sessionId AND lt.rn = 1
        GROUP BY COALESCE(ft.channel, lt.channel)
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
          json_extract(data, '$.utm_source') as utm_source,
          json_extract(data, '$.utm_medium') as utm_medium,
          json_extract(data, '$.utm_campaign') as utm_campaign,
          COUNT(DISTINCT sessionId) as sessions,
          COUNT(DISTINCT ipAddress) as unique_visitors,
          SUM(CASE WHEN type = :conversionType THEN 1 ELSE 0 END) as conversions
        FROM raw_analytic
        WHERE 
          createdAt >= :start AND createdAt < :end
          AND json_extract(data, '$.utm_source') IS NOT NULL
        GROUP BY json_extract(data, '$.utm_source'), json_extract(data, '$.utm_medium'), json_extract(data, '$.utm_campaign')
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
        WITH session_pages AS (
          SELECT 
            sessionId,
            json_extract(data, '$.channel') as channel,
            COUNT(*) as page_views
          FROM raw_analytic
          WHERE 
            type = :pageViewType
            AND createdAt >= :start AND createdAt < :end
          GROUP BY sessionId, json_extract(data, '$.channel')
        ),
        session_durations AS (
          SELECT 
            sessionId,
            json_extract(data, '$.channel') as channel,
            (julianday(MAX(createdAt)) - julianday(MIN(createdAt))) * 86400 as session_duration
          FROM raw_analytic
          WHERE createdAt >= :start AND createdAt < :end
          GROUP BY sessionId, json_extract(data, '$.channel')
        )
        SELECT 
          sp.channel,
          AVG(sd.session_duration) as avg_session_duration,
          AVG(sp.page_views) as avg_page_views
        FROM session_pages sp
        JOIN session_durations sd ON sp.sessionId = sd.sessionId AND sp.channel = sd.channel
        GROUP BY sp.channel
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
            json_extract(data, '$.channel') as channel,
            MIN(createdAt) as first_visit
          FROM raw_analytic
          GROUP BY ipAddress, json_extract(data, '$.channel')
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
            json_extract(data, '$.deviceType') as device_type,
            COUNT(*) as usage_count
          FROM raw_analytic
          WHERE createdAt >= :start AND createdAt < :end
          GROUP BY ipAddress, json_extract(data, '$.deviceType')
        ),
        device_combinations AS (
          SELECT 
            ipAddress,
            GROUP_CONCAT(device_type, ', ') as device_combination
          FROM user_devices
          GROUP BY ipAddress
          HAVING COUNT(DISTINCT device_type) > 1
        )
        SELECT 
          device_combination,
          COUNT(*) as user_count
        FROM device_combinations
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
          datetime(strftime('%Y-%m-%d %H:00:00', start_time)) as timeSlot,
          AVG((julianday(end_time) - julianday(start_time)) * 86400) as avgDuration
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