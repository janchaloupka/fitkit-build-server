import * as colors from "colors/safe";

/**
 * Logovací třída pro hezčí vypisování dat do konzole
 *
 * Umožňuje vypsání z jaké části kódu zpráva přišla
 */
export class Logger {
	private Previous?: Logger;

	public Prefix: string = "";

	public constructor(prefix: string = "", prevLogger?: Logger) {
		this.Previous = prevLogger;
		this.Prefix = prefix;
	}

	/**
	 * Vypsat data do konzole (na standardní výstup)
	 * @param params Data k vypsání do konzole
	 */
	public Info(...params: any[]) {
		if(this.Prefix) params.unshift(`[${this.Prefix}]`);

		if (this.Previous) this.Previous.Info(...params);
		else console.log(...params);
		//else console.log(`[${(new Date()).toISOString()}]`, ...params);
	}

	/**
	 * Vypsat chybodou hlášku (na stadardní chybový výstup)
	 * @param params Data k vypsání do konzole
	 */
	public Error(...params: any[]) {
		if(this.Prefix) params.unshift(`[${this.Prefix}]`);

		if (this.Previous) this.Previous.Error(...params);
		else{
			params = params.map((val) => colors.red(val));
			//console.error(colors.red(`[${(new Date()).toISOString()}]`), ...params);
			console.error(colors.red(`[ERROR]`), ...params);
		}
	}
}
