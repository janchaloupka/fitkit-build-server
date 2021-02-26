import { config } from '../config';
import { Logger } from '../logger';
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
    private static readonly basePort: number = 5900;

    private readonly process: ChildProcessWithoutNullStreams;
    private readonly log: Logger;
    private _number?: number;
    private tokenFile?: string;

    /** Token pro připojení přes noVNC relaci */
    public readonly token: string;

    /** Číslo virtuální obrazovky */
    public get number(): number | undefined {
        return this._number;
    }

    /** HTTP port, na kterém je VNC stream dostupný */
    public get port(): number | undefined{
        if(this.number === undefined) return;

        return Display.basePort + this.number;
    }


    public constructor(logger?: Logger){
        super();
        this.log = new Logger("display", logger);

        this.token = randomBytes(48).toString("hex");
        this.log.info("Starting TigerVNC session... Token:", this.token);

        this.process = spawn(
            "Xtigervnc",
            [
                "-SecurityTypes", "None", "-displayfd", "3",
                "-NeverShared", "-localhost", "-once"],
            { stdio: ["pipe", "pipe", "pipe", "pipe"] }
        );

        this.process.stdio[3]?.addListener("data", d => this.getDisplayNumber(d));
        this.process.on("close", code => this.closeEvent(code));
        // TODO timeout pokud se za rozumnou dobu nezíská číslo obrazovky
    }

    /**
     * Podproces vnc serveru byl ukončen
     * @param code Návratový kód podprocesu
     */
    private async closeEvent(code: number){
        this.log.info(`Exited (${code})`);

        if(this.tokenFile){
            try{
                await fs.unlink(this.tokenFile);
            }catch(e){
                this.log.error("Failed to unlink token file:", e);
            }
        }

        this.emit("close", code);
    }

    /**
     * Přijmout číslo nově vytvořeného virtuálního displeje po spuštění
     * @param num Číslo displeje
     */
    private async getDisplayNumber(num: Buffer){
        let number = parseInt(num.toString().trim(), 10);
        if(number.toString() !== num.toString().trim()) return;
        this._number = number;

        if(this.port === undefined) return;

        let {stdout} = await promiseExecFile(
            "scripts/create-display-token.sh",
            [config.vnc.tokenFolder, this.token, this.port.toString()]
        );

        this.log.prefix = `Display :${this.number}`;
        this.log.info("VNC display initialized");
        this.tokenFile = stdout.trim();

        this.emit("ready", this.number);
    }

    /**
     * Ukončit podproces
     */
    public terminate(){
        if(this.process.killed) return;
        this.process.kill('SIGTERM');
    }
}
