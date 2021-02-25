import { Algorithm } from "jsonwebtoken";

/** Konfigurace serveru */
export interface Config {
    /**
     * TCP port, na kterém naslouchá WebSocket server pro přijímání požadavků
     * od klientů
     */
    port: number;

    /**
     * Absolutní cesta ke složce, kde budou dočasně uloženy nahrané
     * projekty klientů
     *
     * @example "/tmp/fitkit-projects"
     */
    projectsFolder: string;

    /** Konfigurace přenášení GUI */
    vnc: {
        /**
         * Absolutní cesta ke složce, kde Websockify (noVNC) služba očekává
         * tokeny pro vytvoření spojení a kde se tyto soubory budou vytvářet
         *
         * @example "/tmp/vnc-tokens"
         */
        tokenFolder: string;

        /**
         * Webová adresa, na které jsou dostupné noVNC sezení
         *
         * @example "http://build.fitkit.cz:9010/"
         */
        clientUrl: string;
    }

    /** Konfigurace autorizace klientů */
    auth: {
        /**
         * Cesta k souboru s veřejným klíčem autorizačního serveru
         * pro validaci JWT tokenu
         */
        publicKeyPath: string;

        /**
         * Seznam povolených algoritmů pro validaci JWT tokenu
         */
        allowedAlg: Algorithm[];
    }

    /** Definice dostupných kontejnerů pro běh úloh */
    containers: {
        /** Název obrazu ze kterého se kontejner spouští */
        image: string;

        /** Argumenty kontejneru společné pro všechny úlohy */
        sharedArgs: string[];
    }[]

    /** Nastavení fronty úloh */
    queue: {
        /**
         * Maximální počet souběžných procesů na serveru celkem.
         */
        maxJobs: number;

        /** Definice zanořených front pro specifické úlohy */
        pools: {
            /** Název podfronty */
            name: string;

            /** Limit aktivních úloh v této podfrontě */
            maxJobs: number;
        }[]
    }

    /** Definice dostupných platforem a úloh */
    platforms: {
        /** Název platformy */
        name: "fitkit2";

        /** Dostupné úlohy dané platformy */
        jobs: {
            /** Název úlohy */
            name: string;

            /** Zobrazovaný název úlohy pro uživatele */
            displayName: string;

            /** Popis argumentů pro spuštění úlohy (délka pole = počet argumentů) */
            userArgs?: string[];

            /** Typ projektu pro danou úlohu */
            projectType: "fitkit2";

            /** Typy zdrojových souborů, které jsou potřebné pro spuštění */
            requiredFiles: ("mcu"|"fpga"|"fpga_sim")[];

            /** Úloha pracuje s grafickým výstupem (výchozí = false) */
            useX11?: boolean;

            /** Úloha patří do podfronty */
            queuePool?: string;

            /** Kontejner použitý pro spuštění úlohy */
            container: string;

            /** Argumenty spuštění samotného kontejneru */
            containerArgs?: string[];

            /** Argumenty spuštěné aplikace uvnitř kontejneru */
            containerPostArgs: string[];
        }[]
    }[]
}
