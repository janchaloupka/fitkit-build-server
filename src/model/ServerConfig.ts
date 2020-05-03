import { Algorithm } from "jsonwebtoken";

export interface ServerConfig{
	/**
	 * TCP port, na kterém naslouchá WebSocket server pro přijímání požadavků
	 * od klientů
	 */
	Port: number;

	/**
	 * Cesta k souboru s veřejným klíčem autorizačního serveru
	 * pro validaci JWT tokenu
	 */
	AuthPublicKeyPath: string;

	/**
	 * Seznam povolených algoritmů pro validaci JWT tokenu
	 */
	AuthAllowedAlg: Algorithm[];

	/**
	 * Absolutní cesta ke složce, která obsahuje obecné soubory pro překlad
	 *
	 * @example "/opt/fitkit"
	 */
	BaseFolder: string;

	/**
	 * Absolutní cesta ke složce, kde budou dočasně uloženy nahrané
	 * projekty klientů.
	 *
	 * Server musí mít právo čtení a zápisu a musí tuto složku vlastnit.
	 * Po startu server tuto složku vytvoří pokud neexistuje, nebo vymaže
	 * stávájící obsah složky.
	 *
	 * @example "/tmp/fitkit-projects"
	 */
	ProjectsFolder: string;

	Build: {
		/**
		 * Maximální počet souběžných procesů sestavení.
		 *
		 * Pokud je počtu dosaženo a přijde požadavek na další sestavení,
		 * je přidán do fronty, a čeká na uvolnění místa
		 *
		 * Hodnotou -1 se nastaví neomezený počet souběžných procesů
		 */
		MaxActiveTasks: number;
	}

	Simulation: {
		/**
		 * Absolutní cesta ke složce, kde Websockify (noVNC) služba očekává
		 * tokeny pro vytvoření spojení a kde se tyto soubory budou vytvářet.
		 *
		 * Server musí mít právo zápisu do této složky.
		 * Po startu server tuto složku vytvoří pokud neexistuje, nebo vymaže
		 * stávájící obsah složky.
		 *
		 * @example "/tmp/vnc-tokens"
		 */
		TokenFolder: string;

		/**
		 * Webová adresa, která je odeslána klientovi po vytvoření sezení.
		 * K adrese je přidát vygenerovaný token
		 *
		 * @example "http://build.fitkit.cz:9010/"
		 */
		VncClientUrl: string;

		/**
		 * Maximální počet aktivních simulací.
		 *
		 * Pokud je počtu dosaženo a přijde požadavek na vytvoření dalšího
		 * sezení, je přidán do fronty, a čeká na uvolnění místa
		 *
		 * Hodnotou -1 se nastaví neomezený počet aktivních sezení
		 */
		MaxActiveSessions: number;

		/**
		 * Doba v sekundách kdy bude simulace ukončena, pokud uživatel neprovedl
		 * žádnou akci.
		 *
		 * Hodnotou 0 se tato funkce vypne
		 */
		SessionTimeout: number;
	}
}
