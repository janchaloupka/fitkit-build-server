import { ProjectFpgaData } from '../../../model/project-data';
import { promises as fs } from "fs";

/**
 * Vytvořit XILINX ISE LSO soubor obsahující název knihovny
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně .lso přípony)
 * @param fpgaData Konfigurace FPGA části FITkit projektu
 */
export async function createLsoFile(path: string, fpgaData: ProjectFpgaData) {
    await fs.writeFile(path, fpgaData.library);
}
