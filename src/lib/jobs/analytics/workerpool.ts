import { Worker } from 'worker_threads';
import path from 'path';
import { AnalyticJob } from './types';

interface WorkerTask {
  job: AnalyticJob;
  date: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private workerStatus: Map<Worker, boolean> = new Map();
  private queue: WorkerTask[] = [];
  private activeWorkers = 0;
  
  constructor(workerCount: number) {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const workerPath = path.join(__dirname, 'worker.ts');

    for (let i = 0; i < workerCount; i++) {
      const worker = isDevelopment
        ? new Worker(workerPath, {
            execArgv: ['-r', 'ts-node/register']
          })
        : new Worker(workerPath);
        
      this.workers.push(worker);
      this.workerStatus.set(worker, false);
    }
  }

  async runTask(job: AnalyticJob, date: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const task = { job, date, resolve, reject };
      
      if (this.activeWorkers < this.workers.length) {
        this.runWorker(task);
      } else {
        this.queue.push(task);
      }
    });
  }

  private runWorker(task: WorkerTask) {
    const worker = this.workers.find(w => !this.workerStatus.get(w));
    if (!worker) return;

    this.workerStatus.set(worker, true);
    this.activeWorkers++;

    worker.once('message', (message) => {
      if (message.success) {
        task.resolve(message.result);
      } else {
        task.reject(new Error(message.error));
      }

      this.workerStatus.set(worker, false);
      this.activeWorkers--;

      if (this.queue.length > 0) {
        this.runWorker(this.queue.shift()!);
      }
    });

    // Only send serializable data
    worker.postMessage({
      job: {
        type: task.job.type,
        query: task.job.query,
        params: task.job.params
      },
      date: task.date
    });
  }

  terminate() {
    return Promise.all(this.workers.map(async (worker) => {
      this.workerStatus.delete(worker);
      return worker.terminate();
    }));
  }
}