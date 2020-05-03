import { ProjectData } from '../../model/ProjectData';
import { promises as fs } from "fs";
import { join } from "path";
import { EOL } from "os";

/**
 * Vytvořit seznam VHDL souborů pro syntézu nebo simulaci
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně .prj přípony)
 * @param project Konfigurace FITkit projektu
 * @param filePrefix Cesta všech zdrojových souborů
 * @param sim Vytvořit soubor pro simulaci
 */
export async function CreatePrj(path: string, project: ProjectData, filePrefix: string = "", sim: boolean = false) {
	let files: string[] = [];

	project.Fpga.Files.forEach(f => {
		if(!sim && f.SimOnly) return;
		files.push(`vhdl ${f.Library ?? project.Fpga.Library} "${join(filePrefix, f.Path)}"`);
	});

	await fs.writeFile(path, files.join(EOL) + EOL);
}
