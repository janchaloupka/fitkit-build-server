import { ConfigFile } from './model/config-file';

/** Aktivní konfigurace serveru */
export let config: ConfigFile = {
    port: 9000,
    projectsFolder: "/tmp/fitkit-projects",
    vnc: {
        tokenFolder: "/tmp/vnc-tokens",
        clientUrl: "http://10.69.69.13:9010/"
    },
    auth: {
        publicKeyPath: "./jwt.key.pub",
        allowedAlg: []
    },
    queue: {
        maxJobs: -1,
        pools: []
    },
    containers: [],
    platforms: []
};
