import * as colors from "colors/safe";

export class Logger {
	private Previous?: Logger;

	public Prefix: string = "";

	public constructor(prefix: string = "", prevLogger?: Logger) {
		this.Previous = prevLogger;
		this.Prefix = prefix;
	}

	public Info(...params: any[]) {
		if(this.Prefix) params.unshift(`[${this.Prefix}]`);

		if (this.Previous) this.Previous.Info(...params);
		else console.log(...params);
		//else console.log(`[${(new Date()).toISOString()}]`, ...params);
	}

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
