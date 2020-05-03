import { Config } from './../Config';
import { Isim } from './Isim';
import { WindowManager } from './WindowManager';
import { Display } from './Display';
import { EventEmitter } from "events";
import * as readline from "readline";
import { Logger } from '../Logger';

export declare interface Simulation{
	on(event: "queue", listener: (pos: number) => void): this;
	on(event: "close", listener: () => void): this;
	on(event: "ready", listener: (token: string) => void): this;
	on(event: "isimout", listener: (line: string) => void): this;
	on(event: "isimerr", listener: (line: string) => void): this;
}

export class Simulation extends EventEmitter{
	public static Active: Simulation[] = [];
	public static Queue: Simulation[] = [];

	private Display?: Display;
	private WindowManager?: WindowManager;
	private Isim?: Isim;
	private readonly Log: Logger;
	private Terminated = false;

	public readonly ProjectPath: string;
	public get Token(): string | undefined {
		return this.Display?.Token;
	}
	public get Running() : boolean {
		return !!Simulation.Active.find(b => b === this);
	}

	public constructor(projectPath: string, logger?: Logger){
		super();

		this.Log = new Logger("Simulation", logger);
		this.ProjectPath = projectPath;

		Simulation.Queue.push(this);
	}

	public static CheckQueue(){
		const limit = Config.Simulation.MaxActiveSessions;
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

		this.Display = new Display(this.Log, Config.Simulation.SessionTimeout);
		this.Display.on("close", () => this.ProcessClosed());
		this.Display.on("ready", num => this.DisplayReady(num));
	}

	private ProcessClosed(){
		if(!this.Terminated) this.Terminate();
	}

	private DisplayReady(display: number){
		this.WindowManager = new WindowManager(display, this.Log);
		this.WindowManager.on("close", () => this.ProcessClosed());

		this.Isim = new Isim(display, this.ProjectPath, this.Log);
		this.Isim.on("close", () => this.ProcessClosed());

		const out = readline.createInterface(this.Isim.stdout);
		out.on("line", line => this.emit("isimout", line));

		const err = readline.createInterface(this.Isim.stderr);
		err.on("line", line => this.emit("isimerr", line));

		this.emit("ready", this.Token);
	}

	public Terminate(){
		this.Terminated = true;

		this.Isim?.Terminate();
		this.WindowManager?.Terminate();
		this.Display?.Terminate();

		// Odtranit ze seznamu aktivních simulací a fronty, pokud ještě nebyla spuštena
		Simulation.Active = Simulation.Active.filter(val => val !== this);
		Simulation.Queue = Simulation.Queue.filter(val => val !== this);
		Simulation.CheckQueue();

		this.emit("close");
	}
}
