import { ProjectData } from '../../model/ProjectData';
import { promises as fs } from "fs";

/**
 * Vytvořit XILINX ISE LSO soubor obsahující název knihvny
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně .lso přípony)
 * @param project Konfigurace FITkit projektu
 */
export async function CreateLso(path: string, project: ProjectData) {
	await fs.writeFile(path, project.Fpga.Library);
}
