import { ServerConfig } from './model/ServerConfig';
import * as os from "os";

/**
 * Aktivní konfigurace serveru
 */
export let Config: ServerConfig = {
	Port: 9000,
	AuthPublicKeyPath: "./jwt.key.pub",
	AuthAllowedAlg: ["RS256", "RS384", "RS512"],
	BaseFolder: "/opt/fitkit",
	ProjectsFolder: "/home/build-server/",
	Build: {
		MaxActiveTasks: -1
	},
	Simulation: {
		MaxActiveSessions: -1,
		SessionTimeout: 0,
		TokenFolder: "/tmp/vnc-tokens",
		VncClientUrl: `http://${os.hostname()}:9010/`
	}
};
