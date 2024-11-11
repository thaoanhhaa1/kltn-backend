import { CronJob } from 'cron';

const createCronJobs = (cronTime: string, onTick: () => void) => {
    const job = new CronJob(cronTime, onTick, null, false, 'Asia/Ho_Chi_Minh');

    return job;
};

export default createCronJobs;
