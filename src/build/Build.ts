import { ChildProcessWithoutNullStreams } from 'child_process';
import { BuildResult } from './../model/BuildResult';
import { EventEmitter } from "events";
import * as readline from "readline";
import { Logger } from '../Logger';
import { spawn } from "child_process";
import { promises as fs } from "fs";
import { join } from "path";
import { Config } from '../Config';

export declare interface Build{
	on(event: "queue", listener: (pos: number) => void): this;
	on(event: "close", listener: (result: BuildResult) => void): this;
	on(event: "ready", listener: () => void): this;
	on(event: "stdout", listener: (line: string) => void): this;
	on(event: "stderr", listener: (line: string) => void): this;
}

/**
 * Proces sestavení FITkit projektu
 */
export class Build extends EventEmitter{
	public static Active: Build[] = [];
	public static Queue: Build[] = [];

	private Process?: ChildProcessWithoutNullStreams;
	private readonly Log: Logger;
	private Terminated = false;

	public readonly ProjectPath: string;
	public get Running() : boolean {
		return !!Build.Active.find(b => b === this);
	}

	public constructor(projectPath: string, logger?: Logger){
		super();

		this.Log = new Logger("Build", logger);
		this.Log.Info("New build request. Path:", projectPath);
		this.ProjectPath = projectPath;

		Build.Queue.push(this);
	}

	public static CheckQueue(){
		const limit = Config.Build.MaxActiveTasks;
		while(limit === -1 || this.Active.length <= limit){
			const first = this.Queue.shift();
			if(!first) break;

			this.Active.push(first);
			first.Start();
		}

		for (let i = 0; i < this.Queue.length; i++) {
			this.Queue[i].emit("queue", i + 1);
		}
	}

	protected Start(){
		// Odstranit z fronty a přidat na seznam aktivních simulací
		Build.Queue = Build.Queue.filter(val => val !== this);
		Build.Active.push(this);

		this.Log.Info("Starting build task");
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

	private async CloseEvent(code: number){
		const result: BuildResult = {
			ExitStatus: code
		};

		if(code === 0){
			try{
				const fpga = await fs.readFile(join(this.ProjectPath, "build", "project.bin"));
				result.FpgaBinary = fpga.toString("base64");
			}catch(e){ this.Log.Error("Failed to read fpga binary file", e.toString()); }

			try{
				const mcuV1 = await fs.readFile(join(this.ProjectPath, "build", "project_f1xx.hex"));
				result.McuV1Binary = mcuV1.toString("base64");
			}catch(e){ this.Log.Error("Failed to read mcuV1 binary file", e.toString()); }

			try{
				const mcuV2 = await fs.readFile(join(this.ProjectPath, "build", "project_f2xx.hex"));
				result.McuV2Binary = mcuV2.toString("base64");
			}catch(e){ this.Log.Error("Failed to read mcuV2 binary file", e.toString()); }
		}

		this.Log.Info("Build finished. Exit code:", code);
		this.emit("close", result);
		this.removeAllListeners("close");
		if(!this.Terminated) this.Terminate();
	}

	public Terminate(){
		this.Terminated = true;

		// Odtranit ze seznamu aktivních sestavení a fronty, pokud ještě nebylo spuštěno
		Build.Active = Build.Active.filter(val => val !== this);
		Build.Queue = Build.Queue.filter(val => val !== this);
		Build.CheckQueue();
		this.emit("close", <BuildResult>{ExitStatus: -1});

		if(this.Process?.killed) return;
		this.Process?.kill();
	}
}
