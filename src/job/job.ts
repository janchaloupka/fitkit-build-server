import { JobConfig } from './../model/config-file';
import { Display } from './display';
import { File } from './../model/project-data';
import { config } from './../config';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Logger } from './../logger';
import { EventEmitter } from 'events';
import * as readline from "readline";

export declare interface Job {
    on(event: "ready", listener: () => void): this;
    on(event: "begin", listener: (vncToken: string) => void): this;
    on(event: "end", listener: (exitCode?: number, files?: File[]) => void): this;
    on(event: "stdout", listener: (line: string) => void): this;
    on(event: "stderr", listener: (line: string) => void): this;
    on(event: "queue", listener: (pos: number, size: number) => void): this;
}

export class Job extends EventEmitter {
    private readonly log: Logger;
    private process?: ChildProcessWithoutNullStreams;
    private terminated = false;
    private started = false;
    private exited = false;
    private display?: Display;
    private readonly userArgs: string[];

    public readonly name: string;
    public readonly platform: string;
    public readonly config: JobConfig;

    public exitCode?: number = undefined;

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
        this.userArgs = userArgs; // TODO ošetřit

        const p = config.jobs[platform];
        if(!p) throw new Error(`Unknown platform (${platform})`);
        const jobConfig = p[name];

        if(!jobConfig) throw new Error(`Unknown job (${platform}, ${name})`);
        this.config = jobConfig;

        if(!config.containers[jobConfig.container])
            throw new Error(`Unknown container for job ${name} (${jobConfig.container})`);

        const expectedArgsLen = jobConfig.userArgs?.length ?? 0;
        if(expectedArgsLen !== userArgs.length){
            throw new Error(`Wrong number of arguments given (expected ${expectedArgsLen}, got ${userArgs.length})`);
        }
    }

    /**
     * Úloha je na řadě. Informujeme klienta, aby poslal požadované soubory
     */
    public ready() {
        this.emit("ready");
    }

    /**
     * Klient odeslal zdrojové soubory a je vše připraveno pro spuštění
     */
    public sourceFilesReady(projectPath: string){
        if(!this.config.useX11) this.begin(projectPath);

        // Vytvořit vnc sezení
        this.display = new Display(this.log);
        this.display.on("ready", _ => this.begin(projectPath));
        this.display.on("close", _ => this.terminate());
    }

    /**
     * Úloha byla spuštěna
     */
    private begin(projectPath: string){
        const container = config.containers[this.config.container];
        let args = [...container.sharedArgs, ...this.config.containerPostArgs];
        if(this.config.containerArgs) args = [...this.config.containerArgs, ...args];

        if(this.config.useX11){
            let x11num = this.display?.number;
            if(x11num === undefined){
                this.log.error("Failed to spawn main process, missing X11 display");
                this.terminate();
                return;
            }

            // Předáme informaci o přiděleném displeji
            args = ["-v", `/tmp/.X11-unix/X${x11num}:/tmp/.X11-unix/X0`, ...args, ...this.userArgs];
        }

        this.started = true;
        this.emit("begin", this.display?.token);
        this.process = spawn("docker",
            ["run", "-v", `${projectPath}:/project`, ...args]
        );

        this.process.on("exit", code => {
            this.exitCode = code ?? undefined;
            this.exited = true;
            this.terminate();
        });

        const out = readline.createInterface(this.process.stdout);
        out.on("line", line => this.emit("stdout", line));

        const err = readline.createInterface(this.process.stderr);
        err.on("line", line => this.emit("stderr", line));
    }

    /**
     * Ukončit proces
     */
    public terminate(){
        if(this.terminated) return;

        if(!this.exited && this.started){
            this.process?.kill();
            return;
        }

        this.terminated = true;
        this.display?.terminate();
        this.emit("end", this.exitCode); // TODO build files
    }
}
