import { ProjectFpgaData } from '../../../model/project-data';
import { promises as fs } from "fs";
import { join } from "path";
import { EOL } from "os";

/**
 * Vytvořit seznam VHDL souborů pro syntézu nebo simulaci
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně .prj přípony)
 * @param fpgaData Konfigurace FPGa části FITkit projektu
 * @param filePrefix Cesta všech zdrojových souborů
 * @param sim Vytvořit soubor pro simulaci
 */
export async function createPrjFile(path: string, fpgaData: ProjectFpgaData, filePrefix: string = "", sim: boolean = false) {
    let files: string[] = [];

    fpgaData.files.forEach(f => {
        if(!sim && f.simOnly) return;
        files.push(`vhdl ${f.library ?? fpgaData.library} "${join(filePrefix, f.path)}"`);
    });

    await fs.writeFile(path, files.join(EOL) + EOL);
}
