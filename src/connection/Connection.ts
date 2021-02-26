import { config } from '../config';
import { assertType } from 'typescript-is';
import { ClientMessage } from '../model/client-message';
import { ServerMessage } from '../model/server-message';
import { connection, IMessage } from "websocket";
import { Simulation } from "../simulation/Simulation";
import { Logger } from "../logger";
import { Build } from '../build/build';
import { Project } from '../project/Project';
import { ProjectData } from "../model/project-data";

/**
 * Reprezentuje jedno aktivní spojení klienta se serverem
 */
export class Connection{
    /** Všechna aktivní spojení */
    public static active: Connection[] = [];

    /** Čisté WebSocket spojení */
    private readonly wsConnection: connection;

    private readonly log: Logger;

    // Spuštěné podprocesy
    private simulation?: Simulation;
    private build?: Build;
    private Project?: Project;

    public constructor(connection: connection, user: string, logger?: Logger){
        this.log = new Logger(`${user} ${connection.remoteAddress}`, logger);
        this.wsConnection = connection;

        connection.on("message", data => this.handleMessage(data));
        connection.on("close", code => this.closed(code));
        connection.on("error", err => this.log.error(err.toString()));

        Connection.active.push(this);
        this.log.info("Connection accepted!",`Connected clients: ${Connection.active.length}`);
    }

    /**
     * Odeslat zprávu klientovi. Pokud spojení není aktivní, nedojde k žádné akci
     * @param message Zpráva, která bude odeslána klientovi
     */
    public send(message: ServerMessage){
        if(!this.wsConnection.connected) return;

        this.wsConnection.sendUTF(JSON.stringify(message));
    }

    /**
     * Zpracovat přijetou zprávu od klienta
     * @param data Čistá WebSocket data
     */
    private async handleMessage(data: IMessage){
        try{
            const msg: ClientMessage = JSON.parse(data.utf8Data?? "{}");
            assertType<ClientMessage>(msg);

            switch (msg.type) {
                case "get_server_stats":

                    break;
                case "get_supported_jobs":

                    break;
                case "new_job":

                    break;
                case "job_data":

                    break;
                case "cancel_job":

                    break;
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

    /**
     * Spojení s klientem bylo ukončeno
     * @param code Chybový návratový kód
     */
    private closed(code: number){
        // Odstranit klienta z pole aktivních klientů
        Connection.active = Connection.active.filter(val => val !== this);

        // Zachytit mezistav, kdy se vytvořily soubory, ale nebyla spuštěna žádná úloha
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

        this.log.info(`Connection closed (${code})`);
    }

}
