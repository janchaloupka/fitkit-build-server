import { Logger } from './../Logger';
import { EventEmitter } from "events";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Readable } from "stream";
import * as os from "os";

export declare interface Isim{
	on(event: "close", listener: (code: number) => void): this;
}

/**
 * Proces programu ISIM (spuštěného pomocí "make isim")
 */
export class Isim extends EventEmitter{
	private readonly Process: ChildProcessWithoutNullStreams;
	private readonly Log: Logger;

	public readonly stdout: Readable;
	public readonly stderr: Readable;

	public constructor(display: number, projectPath: string, logger?: Logger){
		super();

		this.Log = new Logger("ISIM", logger);

		this.Process = spawn("firejail",
			[
				'--quiet', `--private="${projectPath}"`,
				/*'--private-bin=make,gcc,ld,as,sh',*/ '--private-dev', '--private-etc=shells',
				'--blacklist=/opt/build-server', '--blacklist=/opt/websockify-web',
				'--private-tmp', 'make isim'
			],
			{
				env: { DISPLAY: `:${display}`, PATH: process.env.PATH },
				shell: true,
				cwd: os.homedir()
			}
		);

		this.Process.on("close", code => this.CloseEvent(code));
		this.stdout = this.Process.stdout;
		this.stderr = this.Process.stderr;
	}

	private CloseEvent(code :number){
		this.Log.Info(`Exited (${code})`);
		this.emit("close", code);
	}

	public Terminate(){
		if(this.Process.killed) return;
		this.Process.kill();
	}
}
