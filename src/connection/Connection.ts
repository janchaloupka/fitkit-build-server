import { Config } from './../Config';
import { assertType } from 'typescript-is';
import { ClientMessage } from './../model/ClientMessage';
import { ServerMessage } from '../model/ServerMessage';
import { connection, IMessage } from "websocket";
import { Simulation } from "../simulation/Simulation";
import { Logger } from "../Logger";
import { Build } from '../build/Build';
import { Project } from '../project/Project';
import { ProjectData } from "../model/ProjectData";

/**
 * Reprezentuje jedno aktivní spojení klienta se serverem
 */
export class Connection{
	/** Všechna aktivní spojení */
	public static Active: Connection[] = [];

	/** Čisté WebSocket spojení */
	private readonly Connection: connection;

	private readonly Log: Logger;

	// Spuštené podprocesy
	private Simulation?: Simulation;
	private Build?: Build;
	private Project?: Project;

	public constructor(connection: connection, user: string, logger?: Logger){
		this.Log = new Logger(`${user} ${connection.remoteAddress}`, logger);
		this.Connection = connection;

		connection.on("message", data => this.Message(data));
		connection.on("close", code => this.Closed(code));
		connection.on("error", err => this.Log.Error(err.toString()));

		Connection.Active.push(this);
		this.Log.Info("Connection accepted!",`Connected clients: ${Connection.Active.length}`);
	}

	/**
	 * Odeslat zprávu klientovi. Pokud spojení není aktivní, nedojde k žádné akci
	 * @param message Zpráva, která bude odeslána klientovi
	 */
	public Send(message: ServerMessage){
		if(!this.Connection.connected) return;

		this.Connection.sendUTF(JSON.stringify(message));
	}

	/**
	 * Zpracovat přijetou zprávu od klienta
	 * @param data Čistá WebSocket data
	 */
	private async Message(data: IMessage){
		try{
			const msg: ClientMessage = JSON.parse(data.utf8Data?? "{}");
			assertType<ClientMessage>(msg);

			switch (msg.type) {
				case "build-begin":
					try{
						await this.SetupProject(msg.data);
						this.StartBuild();
					}catch(e){
						this.Send({type: "error", data: e.toString()});
						this.Log.Error("Error while setting up build task", e);
					}
					break;
				case "isim-begin":
					try{
						await this.SetupProject(msg.data);
						this.StartSimulation();
					}catch(e){
						this.Send({type: "error", data: e.toString()});
						this.Log.Error("Error while setting up simulation", e);
					}
					break;
				case "build-end":
					this.Build?.Terminate();
					this.Build = undefined;
					break;
				case "isim-end":
					this.Simulation?.Terminate();
					this.Simulation = undefined;
					break;
			}
		}catch(e){
			this.Log.Error("Error while processing client message", e);
		}
	}

	/**
	 * Vytvořit dočasný adresář se soubory projektu
	 * @param projConf Konfigurace a zdrojové soubory projektu
	 */
	private async SetupProject(projConf: ProjectData){
		if(this.Project) throw new Error("Another action is already running");

		const project = new Project(projConf);
		this.Project = project;

		await project.CreateDirectory();
		this.Send({
			type: "project-mapping",
			data: this.Project.MapToOriginalPath
		});
	}

	/**
	 * Vytvořit a zařadit překlad projektu do fronty
	 */
	private StartBuild(){
		if(!this.Project?.Path) throw new Error("Cannot find project path");
		if(this.Build) throw new Error("Another build is already running");

		const build = new Build(this.Project.Path, this.Log);
		this.Build = build;

		build.on("ready", () => this.Send({type: "build-begin"}));
		build.on("stdout", line => this.Send({type: "build-stdout", data: line}));
		build.on("stderr", line => this.Send({type: "build-stderr", data: line}));
		build.on("queue", pos => this.Send({
			type: "build-queue",
			data: {
				pos: pos,
				size: Build.Queue.length
			}
		}));

		build.on("close", res => {
			this.Send({type: "build-end", data: res});
			// Vyčistit atributy po ukončení úlohy
			this.Project?.Delete();
			this.Project = undefined;
			this.Build = undefined;
		});

		Build.CheckQueue();
	}

	/**
	 * Vytvořit a zařadit simulaci projektu do fronty
	 */
	private StartSimulation(){
		if(!this.Project?.Path) throw new Error("Cannot find project path");
		if(this.Build) throw new Error("Another simulation is already running");

		const sim = new Simulation(this.Project.Path, this.Log);
		this.Simulation = sim;

		sim.on("isimout", line => this.Send({type: "isim-stdout", data: line}));
		sim.on("isimerr", line => this.Send({type: "isim-stderr", data: line}));

		sim.on("ready", token => this.Send({
			type: "isim-begin",
			data: `${Config.Simulation.VncClientUrl}?token=${token}`
		}));

		sim.on("queue", pos => this.Send({
			type: "isim-queue",
			data: {
				pos: pos,
				size: Simulation.Queue.length
			}
		}));

		sim.on("close", () => {
			this.Send({type: "isim-end"});
			// Vyčistit atributy po ukončení úlohy
			this.Project?.Delete();
			this.Project = undefined;
			this.Simulation = undefined;
		});

		Simulation.CheckQueue();
	}

	private Closed(code: number){
		// Odstranit klienta z pole aktivních klientů
		Connection.Active = Connection.Active.filter(val => val !== this);

		// Zachytit mezistav, kdy se vytvořili soubory, ale nebyla spuštena žádná úloha
		try{
			if(!this.Build && !this.Simulation){
				this.Project?.Delete();
				this.Project = undefined;
			}
		}catch(e){
			this.Log.Error("Error while removing project files", e);
		}

		this.Build?.Terminate();
		this.Build = undefined;

		this.Simulation?.Terminate();
		this.Simulation = undefined;

		// Soubory projektu se odstraní jakmile dojde k ukončení aktuální úlohy

		this.Log.Info(`Connection closed (${code})`);
	}

}
