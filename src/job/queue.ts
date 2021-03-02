import { MessageServerStats } from './../model/server-message';
import { config } from './../config';
import { Job } from "./job";

/** Délka v ms po kterou jsou data v mezipaměti validní */
const CACHE_DELTA_MS = 1000 * 30; //30s

export class Queue {
    /** Fronta všech čekajících úloh nezávisle na typu */
    private static queuedJobs: Job[] = [];
    /** Seznam aktivních úloh */
    private static activeJobs: Job[] = [];

    /**
     * Přidá úlohu do fronty. Pokud je k dispozici kapacita, je ihned spuštěna
     * @param job Úloha, která se má přidat do fronty
     */
    public static queueJob(job: Job) {
        this.queuedJobs.push(job);

        job.on("end", _ => this.removeJob(job));
        this.updateQueue();
    }

    /**
     * Odstraní skončenou úlohu ze seznamu úloh (jak aktivních tak čekajících).
     * Úloha by v tuhle chvíli již měla být ukončená
     *
     * @param job Úloha, která se má odstranit
     */
    private static removeJob(job: Job) {
        this.queuedJobs = this.queuedJobs.filter(j => j !== job);
        this.activeJobs = this.activeJobs.filter(j => j !== job);
        this.updateQueue();
    }

    /**
     * Aktualizovat čekající úlohy.
     * Spustí čekající úlohy ve frontě, pokud je volno
     */
    private static updateQueue(){
        let changed = false;

        for (let i = 0; i < this.queuedJobs.length; i++) {
            if(config.queue.maxJobs > 0 && this.activeJobs.length >= config.queue.maxJobs) break;

            const job = this.queuedJobs[i];
            if(job.config.queuePool){
                const activeLen = this.activeJobs.filter(
                    e => e.config.queuePool === job.config.queuePool).length;
                const max = config.queue.pools[job.config.queuePool];

                if(max !== undefined && activeLen >= max) continue;
            }

            changed = true;
            this.activeJobs.push(job);
            this.queuedJobs.splice(i, 1);
            i--;
            job.ready();
        }

        if(!changed) return;

        for (let i = 0; i < this.queuedJobs.length; i++) {
            this.queuedJobs[i].emit("queue", i + 1, this.queuedJobs.length);
        }
    }

    private static cachedStats?: MessageServerStats = undefined;
    private static cachedStatsTime: number = Date.now();

    /**
     * Získat statistiky o počtu běžících a čekajících úloh
     */
    public static getStats(): MessageServerStats{
        // Kontrola jestli se mají použít data v mezipaměti
        if(this.cachedStatsTime + CACHE_DELTA_MS > Date.now() && this.cachedStats){
            return this.cachedStats;
        }

        const stats: MessageServerStats = {type: 'server_stats', queue: {}};
        const queue = stats.queue;

        // Přidat spuštěné úlohy do seznamu
        for (const job of this.activeJobs) {
            if(!queue[job.platform]) queue[job.platform] = {};
            const platform = queue[job.platform];

            if(!platform[job.name]){
                platform[job.name] = {
                    displayName: job.config.displayName,
                    running: 0,
                    queue: 0
                };
            }

            platform[job.name].running++;
        }

        // Přidat čekající úlohy do seznamu
        for (const job of this.queuedJobs) {
            if(!queue[job.platform]) queue[job.platform] = {};
            const platform = queue[job.platform];

            if(!platform[job.name]){
                platform[job.name] = {
                    displayName: job.config.displayName,
                    running: 0,
                    queue: 0
                };
            }

            platform[job.name].queue++;
        }

        this.cachedStats = stats;
        this.cachedStatsTime = Date.now();
        return stats;
    }
}
