import { ServerConfig } from './model/ServerConfig';
import { Config } from './Config';
import { Logger } from './Logger';
import { Server } from './connection/Server';
import { promises as fs} from "fs";
import { parse as jsoncParse, ParseError } from "jsonc-parser";
import { assertType } from "typescript-is";

const Log = new Logger();

const parseConfig = async () => {
	Log.Info("Parsing config");
	const configFile = await fs.readFile("config.jsonc", "utf8");
	let errors: ParseError[] = [];
	let config = jsoncParse(configFile, errors);

	if(errors.length > 0){
		Log.Error(errors);
		throw new Error("Failed to parse config file");
	}

	Config.Port = config.Port ?? Config.Port;
	Config.AuthPublicKeyPath = config.AuthPublicKey ?? Config.AuthPublicKeyPath;
	Config.AuthAllowedAlg = config.AuthAllowedAlg ?? Config.AuthAllowedAlg;
	Config.BaseFolder = config.BaseFolder ?? Config.BaseFolder;
	Config.ProjectsFolder = config.ProjectsFolder ?? Config.ProjectsFolder;

	if(config?.Build){
		Config.Build.MaxActiveTasks = config.Build.MaxActiveTasks ?? Config.Build.MaxActiveTasks;
	}

	if(config?.Simulation){
		Config.Simulation.MaxActiveSessions = config.Simulation.MaxActiveSessions ?? Config.Simulation.MaxActiveSessions;
		Config.Simulation.SessionTimeout = config.Simulation.SessionTimeout ?? Config.Simulation.SessionTimeout;
		Config.Simulation.TokenFolder = config.Simulation.TokenFolder ?? Config.Simulation.TokenFolder;
		Config.Simulation.VncClientUrl = config.Simulation.VncClientUrl ?? Config.Simulation.VncClientUrl;
	}

	assertType<ServerConfig>(Config);
};


// Spuštení programu
(async () => {
	Log.Info("Starting build server");

	try{
		await parseConfig();
	}catch(e){
		Log.Error("Failed to parse config file", e);
		process.exit(1);
	}

	/*try{
		Log.Info("Create new temp projects directory");
		fs.mkdir(Config.ProjectsFolder, {recursive: true});

	}catch(e){
		Log.Error("Error while creating projects directory", e);
	}*/

	try{
		Log.Info("Current config:", Config);
		new Server(Config.Port);
	}catch(e){
		Log.Error("Application encountered critical error and will be terminated");
		Log.Error(e);
	}
})();
