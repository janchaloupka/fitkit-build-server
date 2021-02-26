/**
 * Logovací třída pro hezčí vypisování dat do konzole
 *
 * Umožňuje vypsání z jaké části kódu zpráva přišla
 */
export class Logger {
    private previous?: Logger;

    public prefix: string = "";

    public constructor(prefix: string = "", prevLogger?: Logger) {
        this.previous = prevLogger;
        this.prefix = prefix;
    }

    /**
     * Vypsat data do konzole (na standardní výstup)
     * @param params Data k vypsání do konzole
     */
    public info(...params: any[]) {
        if(this.prefix) params.unshift(`[${this.prefix}]`);

        if (this.previous) this.previous.info(...params);
        else console.log(...params);
    }

    /**
     * Vypsat chybovou hlášku (na stadardní chybový výstup)
     * @param params Data k vypsání do konzole
     */
    public error(...params: any[]) {
        if(this.prefix) params.unshift(`[${this.prefix}]`);

        if (this.previous) this.previous.error(...params);
        else console.error(`[ERROR]`, ...params);
    }
}
