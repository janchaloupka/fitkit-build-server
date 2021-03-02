import { ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from "events";
import * as readline from "readline";
import { Logger } from '../logger';
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";

/**
 * Proces sestavení FITkit projektu
 */
export class Build extends EventEmitter{
    /** Aktivní spuštěné procesy */
    public static Active: Build[] = [];

    /** Čekající procesy ve frontě */
    public static Queue: Build[] = [];

    private Process?: ChildProcessWithoutNullStreams;
    private readonly Log: Logger;
    private Terminated = false;

    /** Cesta k dočasné složce projektu */
    public readonly ProjectPath: string;

    /** Je proces spuštěn */
    public get Running() : boolean {
        return !!Build.Active.find(b => b === this);
    }

    public constructor(projectPath: string, logger?: Logger){
        super();

        this.Log = new Logger("Build", logger);
        this.Log.info("New build request. Path:", projectPath);
        this.ProjectPath = projectPath;

        Build.Queue.push(this);
    }

    /**
     * Spustit proces
     */
    protected Start(){
        // Odstranit z fronty a přidat na seznam aktivních simulací
        Build.Queue = Build.Queue.filter(val => val !== this);
        Build.Active.push(this);

        this.Log.info("Starting build task");
        this.emit("ready");

        this.Process = spawn("make",
            {
                shell: true,
                cwd: this.ProjectPath
            }
        );

        this.Process.on("close", code => this.CloseEvent(code));

        let out = readline.createInterface(this.Process.stdout);
        out.on("line", line => this.emit("stdout", line));

        let err = readline.createInterface(this.Process.stderr);
        err.on("line", line => this.emit("stderr", line));
    }

    /**
     * Spuštěný podproces skončil
     * @param code Návratový kód procesu
     */
    private async CloseEvent(code: number){
        const result = {
            ExitStatus: code
        };

        if(code === 0){
            try{
                const fpga = await fs.readFile(join(this.ProjectPath, "build", "project.bin"));
                //result.FpgaBinary = fpga.toString("base64");
            }catch(e){ this.Log.error("Failed to read fpga binary file", e.toString()); }

            try{
                const mcuV1 = await fs.readFile(join(this.ProjectPath, "build", "project_f1xx.hex"));
                //result.McuV1Binary = mcuV1.toString("base64");
            }catch(e){ this.Log.error("Failed to read mcuV1 binary file", e.toString()); }

            try{
                const mcuV2 = await fs.readFile(join(this.ProjectPath, "build", "project_f2xx.hex"));
                //result.McuV2Binary = mcuV2.toString("base64");
            }catch(e){ this.Log.error("Failed to read mcuV2 binary file", e.toString()); }
        }

        this.Log.info("Build finished. Exit code:", code);
        this.emit("close", result);
        this.removeAllListeners("close");
    }
}
