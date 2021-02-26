import { Queue } from './queue';
import { config } from './../config';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { Logger } from './../logger';
import { EventEmitter } from 'events';

export declare interface Job {
    on(event: "ready", listener: () => void): this;
    on(event: "begin", listener: (vncToken: string) => void): this;
    on(event: "end", listener: (exitCode: number) => void): this;
    on(event: "stdout", listener: (line: string) => void): this;
    on(event: "stderr", listener: (line: string) => void): this;
    on(event: "queue", listener: (pos: number) => void): this;
}

export class Job extends EventEmitter {
    private readonly log: Logger;
    private process?: ChildProcessWithoutNullStreams;
    private terminated = false;
    private started = false;
    private readonly userArgs: string[];

    public readonly name: string;
    public readonly platform: string;
    public readonly config;

    /** Je proces spuštěn */
    public get active() : boolean {
        return this.started && !this.terminated;
    }

    public constructor(name: string, platform: string, userArgs: string[], logger?: Logger){
        super();


        this.log = new Logger(`job ${name}`, logger);
        this.log.info(`New job created. Name: ${name}, platform: ${platform}`);

        this.name = name;
        this.platform = platform;
        this.userArgs = userArgs;

        const p = config.jobs[platform];
        if(!p) throw new Error(`Unknown platform (${platform})`);
        const jobConfig = p[name];
        if(!jobConfig) throw new Error(`Unknown job (${platform}, ${name})`);
        this.config = jobConfig;

        Queue.queueJob(this);
    }

    public ready() {

    }

    /**
     * Ukončit proces
     */
    public cancel(){
        this.terminated = true;

        // Odtranit ze seznamu aktivních sestavení a fronty, pokud ještě nebylo spuštěno
        Build.Active = Build.Active.filter(val => val !== this);
        Build.Queue = Build.Queue.filter(val => val !== this);
        Build.CheckQueue();
        this.emit("end", <BuildResult>{ExitStatus: -1});

        if(this.process?.killed) return;
        this.process?.kill();
    }
}
