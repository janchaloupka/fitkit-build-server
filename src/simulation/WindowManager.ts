import { Logger } from './../Logger';
import { EventEmitter } from "events";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";

export declare interface WindowManager{
	on(event: "close", listener: (code: number) => void): this;
}

/**
 * Proces správce oken pro zobrazení okna simulace
 */
export class WindowManager extends EventEmitter{
	private readonly Process: ChildProcessWithoutNullStreams;
	private readonly Log: Logger;

	public constructor(display: number, logger?: Logger){
		super();

		this.Log = new Logger("WinMngr", logger);

		this.Process = spawn("firejail",
			[
				'--shell=none', '--private', '--private-bin=ratpoison',
				'--private-dev', '--private-etc=" "', '--private-opt=" "',
				'--private-tmp', 'ratpoison'
			],
			{
				env: {DISPLAY: `:${display}`},
				shell: true
			}
		);

		this.Process.on("close", code => this.CloseEvent(code));
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
