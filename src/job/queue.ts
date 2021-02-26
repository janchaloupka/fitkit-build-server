import { config } from './../config';
import { Job } from "./job";

export class Queue {
    private static queuedJobs: Job[] = [];
    private static activeJobs: Job[] = [];

    public static queueJob(job: Job) {
        this.queuedJobs.push(job);

        job.on("end", _ => this.removeActiveJob(job));
        this.updateQueue();
    }

    private static removeActiveJob(job: Job) {
        this.activeJobs.filter(j => j !== job);
        this.updateQueue();
    }

    private static updateQueue(){
        for (let i = 0; i < this.queuedJobs.length; i++) {
            if(this.activeJobs.length >= config.queue.maxJobs) break;

            const job = this.queuedJobs[i];
            if(job.config.queuePool){
                const activeLen = this.activeJobs.map(
                    e => e.config.queuePool === job.config.queuePool).length;
                const max = config.queue.pools[job.config.queuePool];

                if(max !== undefined && activeLen >= max) continue;
            }

            this.activeJobs.push(job);
            this.queuedJobs.splice(i, 1);
            i--;
            job.ready();
        }

        for (let i = 0; i < this.queuedJobs.length; i++) {
            this.queuedJobs[i].emit("queue", i + 1);
        }
    }
}
