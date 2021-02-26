import { config } from '../config';
import { Logger } from '../logger';
import { Connection } from './connection';
import { server as WebSocketServer, IServerConfig, request } from "websocket";
import * as http from "http";
import * as jwt from "jsonwebtoken";
import { promises as fs } from "fs";

/**
 * WebSocket server, který spravuje požadavky na připojení
 */
export class Server{
    private ws: WebSocketServer;
    private httpServer: http.Server;
    private log: Logger;

    private authPublicKeyCache: string = "";

    /**
     * Získat veřejný klíč JWT tokenu
     */
    public async getAuthPublicKey(): Promise<string> {
        if(this.authPublicKeyCache !== "") return this.authPublicKeyCache;

        const key = await fs.readFile(config.auth.publicKeyPath, {encoding: "utf8"});
        this.authPublicKeyCache = key;

        return key;
    }

    public constructor(port: number, logger?: Logger, config?: IServerConfig){
        this.log = new Logger("server", logger);

        this.httpServer = http.createServer((req, res) => this.handleHttpRequest(req, res));

        this.ws = new WebSocketServer({
            httpServer: this.httpServer,
            disableNagleAlgorithm: false,
            ...config
        });

        this.httpServer.on("error", (e) => {this.log.error(e.toString());});
        this.httpServer.listen(port, () => this.log.info(`Listening on port ${port}`));
        this.ws.on("request", req => this.handleWsRequest(req));
    }

    /**
     * Zpracovat klasický HTTP požadavek
     * @param request HTTP hlavička požadavku
     * @param response Odpověď serveru
     */
    private handleHttpRequest(request: http.IncomingMessage, response: http.ServerResponse){
        response.writeHead(404);
        response.end();
    }

    /**
     * Zpracuje nový příchozí požadavek včetně autentizace
     *
     * @param request Nový WebSocket požadavek
     */
    private async handleWsRequest(request: request){
        this.log.info(`New connection from ${request.remoteAddress}`);

        let auth = request.httpRequest.headers.authorization;

        if(!auth || auth.split(" ").length < 2){
            this.log.info("Request header does not contain Bearer authorization token, rejecting");
            request.reject(401, "no bearer authorization token provided");
            return;
        }

        let autharr = auth.split(" ");
        autharr.shift();
        auth = autharr.join(" ");

        let data: string | {sub?: string};
        try{
            data = jwt.verify(auth, await this.getAuthPublicKey(), {algorithms: config.auth.allowedAlg});
        }catch(e){
            this.log.info("Auth token verification failed.", e.toString());
            request.reject(401, "jwt verification failed");
            return;
        }

        if(typeof data === "string" || typeof data.sub !== "string"){
            this.log.info("Auth token verified, but contains invalid data (expected .sub). Data: ", data);
            request.reject(401, "token unknown format");
            return;
        }

        this.log.info("Auth token verified successfully, data:", data);

        try{
            new Connection(request.accept(undefined, request.origin), data.sub, this.log);
        }catch(e){
            this.log.error(`Encountered error while serving client ${data.sub}`);
            this.log.error(e);
        }
    }
}
