import { Config } from './../Config';
import { Logger } from './../Logger';
import { Connection } from './Connection';
import { server as WebSocketServer, IServerConfig, request } from "websocket";
import * as http from "http";
import * as jwt from "jsonwebtoken";
import { promises as fs } from "fs";

export class Server{
	private Ws: WebSocketServer;
	private Http: http.Server;
	private Log: Logger;

	private AuthPublicKeyCache: string = "";

	public async GetAuthPublicKey(): Promise<string> {
		if(this.AuthPublicKeyCache !== "") return this.AuthPublicKeyCache;

		const key = await fs.readFile(Config.AuthPublicKeyPath, {encoding: "utf8"});
		this.AuthPublicKeyCache = key;

		return key;
	}


	public constructor(port: number, logger?: Logger, config?: IServerConfig){
		this.Log = new Logger("Server", logger);

		this.Http = http.createServer((req, res) => this.HandleHttpRequest(req, res));

		this.Ws = new WebSocketServer({
			httpServer: this.Http,
			disableNagleAlgorithm: false,
			...config
		});

		this.Http.on("error", (e) => {this.Log.Error(e.toString());});
		this.Http.listen(port, () => this.Log.Info(`Listening on port ${port}`));
		this.Ws.on("request", req => this.HandleWsRequest(req));
	}

	private HandleHttpRequest(request: http.IncomingMessage, response: http.ServerResponse){
		response.writeHead(404);
    	response.end();
	}

	/**
	 * Zpracuje nový příchozí požadavek včetně autentizace
	 *
	 * @param request Nový WebSocket požadavek
	 */
	private async HandleWsRequest(request: request){
		this.Log.Info(`New connection from ${request.remoteAddress}`);

		let auth = request.httpRequest.headers.authorization;

		if(!auth || auth.split(" ").length < 2){
			this.Log.Info("Request header does not contain Bearer authorization token, rejecting");
			request.reject(401, "no bearer authorization token provided");
			return;
		}

		let autharr = auth.split(" ");
		autharr.shift();
		auth = autharr.join(" ");

		let data: string | {sub?: string};
		try{
			data = jwt.verify(auth, await this.GetAuthPublicKey(), {algorithms: Config.AuthAllowedAlg});
		}catch(e){
			this.Log.Info("Auth token verification failed.", e.toString());
			request.reject(401, "jwt verification failed");
			return;
		}

		if(typeof data === "string" || typeof data.sub !== "string"){
			this.Log.Info("Auth token verified, but contains invalid data (expected .sub). Data: ", data);
			request.reject(401, "token unknown format");
			return;
		}

		this.Log.Info("Auth token verified succesfully, data:", data);

		new Connection(request.accept(undefined, request.origin), data.sub, this.Log);
	}
}
