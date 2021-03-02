import { Job } from './../job/job';
import { Queue } from './../job/queue';
import { config } from '../config';
import { assertType } from 'typescript-is';
import { ClientMessage } from '../model/client-message';
import { ServerMessage } from '../model/server-message';
import { connection, IMessage } from "websocket";
import { Logger } from "../logger";
import { ProjectFiles } from '../job/projectFiles';
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
    private job?: Job;
    private projectFiles?: ProjectFiles;

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
            const msg = assertType<ClientMessage>(JSON.parse(data.utf8Data?? "{}"));

            switch (msg.type) {
                case "get_server_stats":
                    this.send(Queue.getStats());
                    break;
                case "get_supported_jobs":
                    // TODO
                    break;
                case "new_job":
                    this.queueJob(msg.name, msg.platform, msg.userArgs);
                    break;
                case "job_data":
                    await this.setupProjectFiles(msg.data);
                    break;
                case "cancel_job":
                    this.job?.terminate();
                    break;
            }
        }catch(e){
            this.log.error("Error while processing client message", e);
            if(e) this.send({type: "error", data: e.toString()});
        }
    }

    /**
     * Vytvořit dočasný adresář se soubory projektu
     * @param projConf Konfigurace a zdrojové soubory projektu
     */
    private async setupProjectFiles(projConf: ProjectData){
        const project = new ProjectFiles(projConf);
        this.projectFiles = project;

        await project.createDirectory();
        if(!project.path){
            throw new Error("Cannot get project path");
        }

        this.job?.sourceFilesReady(project.path);
    }

    /**
     * Vytvořit a zařadit simulaci projektu do fronty
     */
    private queueJob(name: string, platform: string, args: string[]){
        if(this.job) throw new Error("Another job is already running");

        const job = new Job(name, platform, args, this.log);

        job.on("ready", () => {
            this.send({type: "job_ready", requiredFiles: job.config.requiredFiles});
        });

        job.on("stdout", line => this.send({type: "job_stdout", data: line}));

        job.on("stderr", line => this.send({type: "job_stderr", data: line}));

        job.on("begin", token => this.send({
            type: "job_begin",
            fileMapping: this.projectFiles?.mapToOriginalPath ?? {},
            vncUrl: `${config.vnc.clientUrl}?token=${token}`
        }));

        job.on("queue", (pos, size) => this.send({
            type: "job_queue_status",
            pos: pos,
            size: size
        }));

        job.on("end", (exitCode, files) => {
            this.send({
                type: "job_end",
                exitCode: exitCode,
                files: files
            });

            this.cleanJob();
        });

        this.job = job;
        Queue.queueJob(job);
    }

    private async cleanJob(){
        if(!this.job) return;

        this.job = undefined;
        await this.projectFiles?.delete();
    }

    /**
     * Spojení s klientem bylo ukončeno
     * @param code Chybový návratový kód
     */
    private closed(code: number){
        // Odstranit klienta z pole aktivních klientů
        Connection.active = Connection.active.filter(val => val !== this);

        this.job?.terminate();

        this.log.info(`Connection closed (${code})`);
    }

}
