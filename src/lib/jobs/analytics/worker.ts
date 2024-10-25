import { parentPort } from 'worker_threads';
import { getDB } from '../../../lib/db';
import moment from 'moment';
import { analyticJobs } from './jobs';

const processResult = (type: string) => {
  const job = analyticJobs.find(job => job.type === type);
  if (!job) return () => {};
  return job.processResult;
};

const getDateRange = (date: moment.Moment) => ({
  start: date.clone().startOf('day'),
  end: date.clone().add(1, 'day').startOf('day')
});

if (!parentPort) {
    console.error('This module must be run as a worker thread');
    process.exit(1);
}

if (parentPort) {
  parentPort.on('message', async ({ job, date }) => {
    try {
      const db = await getDB();
      const { start, end } = getDateRange(moment(date));

      const result = await db.query(job.query, [{
        ...job.params,
        start: start.toDate(),
        end: end.toDate(),
      }]);

      const processed = processResult(job.type)(result, moment(date).format('YYYY-MM-DD'));

      parentPort?.postMessage({
        success: true,
        result: {
          type: job.type,
          data: processed,
          date: end.toDate()
        }
      });
    } catch (error: any) {
      parentPort?.postMessage({
        success: false,
        error: error.message
      });
    }
  });
}