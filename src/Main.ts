import { ConfigFile } from './model/config-file';
import { config } from "./config";
import { Logger } from './logger';
import { Server } from './connection/server';
import { promises as fs} from "fs";
import { assertType } from "typescript-is";
import * as yaml from "js-yaml";
const log = new Logger();

/** Načíst konfigurační soubor */
const loadConfig = async () => {
    log.info("Parsing config");
    const configFileRaw = await fs.readFile("config.yml", "utf8");
    let configFile = assertType<ConfigFile>(yaml.load(configFileRaw));

    config.auth = configFile.auth;
    config.containers = configFile.containers;
    config.platforms = configFile.platforms;
    config.port = configFile.port;
    config.projectsFolder = configFile.projectsFolder;
    config.queue = configFile.queue;
    config.vnc = configFile.vnc;
};


// Spuštění serveru
(async () => {
    log.info("Starting build server");

    try{
        await loadConfig();
    }catch(e){
        log.error("Failed to parse config file", e);
        process.exit(1);
    }

    try{
        log.info("Remove existing projects directory");
        await fs.rmdir(config.projectsFolder, {recursive: true});
    }catch(e){}

    try{
        log.info("Remove existing noVNC tokens");
        await fs.rmdir(config.vnc.tokenFolder, {recursive: true});
    }catch(e){}

    try{
        log.info("Create new projects directory");
        await fs.mkdir(config.projectsFolder, {recursive: true});
    }catch(e){
        log.error("Error while creating projects directory", e);
        throw e;
    }

    try{
        new Server(config.port);
    }catch(e){
        log.error("Application encountered critical error and will be terminated");
        log.error(e);
    }
})();
