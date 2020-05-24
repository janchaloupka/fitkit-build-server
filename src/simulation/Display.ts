import { Config } from './../Config';
import { Logger } from './../Logger';
import { EventEmitter } from "events";
import { spawn, ChildProcessWithoutNullStreams, execFile } from "child_process";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { promises as fs } from "fs";

const promiseExecFile = promisify(execFile);

export declare interface Display{
	on(event: "ready", listener: (number: number) => void): this;
	on(event: "close", listener: (code: number) => void): this;
}

/**
 * Virtuální obrazovka x11serveru pro zobrazení grafických aplikací
 */
export class Display extends EventEmitter{
	/** Základní port VNC serveru */
	private static BasePort: number = 5900;

	private readonly Process: ChildProcessWithoutNullStreams;
	private readonly Log: Logger;
	private _Number?: number;
	private TokenFile?: string;

	/** Token pro připojení přes noVNC relaci */
	public readonly Token: string;

	/** Číslo virtuální obrazovky */
	public get Number(): number | undefined {
		return this._Number;
	}

	/** HTTP port, na kterém je VNC stream dostupný */
	public get Port(): number | undefined{
		if(this._Number === undefined) return;

		return Display.BasePort + this._Number;
	}


	public constructor(logger?: Logger, idleTimeout: number = 0){
		super();
		this.Log = new Logger("Display", logger);

		this.Token = randomBytes(48).toString("hex");
		this.Log.Info("Starting TigerVNC session... Token:", this.Token);

		this.Process = spawn(
			"Xtigervnc",
			[
				"-SecurityTypes", "None", "-displayfd", "3",
				"-NeverShared", "-localhost", "-once",
				//`-MaxIdleTime=${idleTimeout}`, `-IdleTimeout=${idleTimeout}`
			],
			{ stdio: ["pipe", "pipe", "pipe", "pipe"] }
		);

		this.Process.stdio[3]?.addListener("data", d => this.ReceiveDisplayNumber(d));
		this.Process.on("close", code => this.CloseEvent(code));
		// TODO timeout pokud se za rozumnou dobu nezíská číslo obrazovky
	}

	/**
	 * Podproces vnc serveru byl ukončen
	 * @param code Návratový kód podprocesu
	 */
	private async CloseEvent(code: number){
		this.Log.Info(`Exited (${code})`);

		if(this.TokenFile){
			try{
				await fs.unlink(this.TokenFile);
			}catch(e){
				this.Log.Error("Failed to unlink token file:", e);
			}
		}

		this.emit("close", code);
	}

	/**
	 * Přijmout číslo nově vytvořeného virtuálníhho displeje po spuštění
	 * @param num Číslo displeje
	 */
	private async ReceiveDisplayNumber(num: Buffer){
		let number = parseInt(num.toString().trim(), 10);
		if(number.toString() !== num.toString().trim()) return;
		this._Number = number;

		if(this.Port === undefined) return;

		let {stdout} = await promiseExecFile(
			"scripts/create-display-token.sh",
			[Config.Simulation.TokenFolder, this.Token, this.Port.toString()]
		);

		this.Log.Prefix = `Display :${this.Number}`;
		this.Log.Info("TigerVNC display initialized");
		this.TokenFile = stdout.trim();

		this.emit("ready", this.Number);
	}

	/**
	 * Ukončit podproces
	 */
	public Terminate(){
		if(this.Process.killed) return;
		this.Process.kill('SIGTERM');
	}
}
