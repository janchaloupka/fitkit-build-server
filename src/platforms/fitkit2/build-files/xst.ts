import { ProjectFpgaData } from '../../../model/project-data';
import { promises as fs } from "fs";

/**
 * Vytvořit skript XILINX ISE syntézy
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně .xst přípony)
 * @param fpgaData Konfigurace FPGA části FITkit projektu
 */
export async function createXstFile(path: string, fpgaData: ProjectFpgaData) {
    const opt = fpgaData.optimization.split(":");

    if(opt.length !== 2)
        throw new Error(`Optimization value must be in format TARGET:LEVEL, e.g. speed:1 (got: ${fpgaData.optimization})`);

    await fs.writeFile(path, `set -tmpdir build/fpga -xsthdpdir build/fpga
run -ifn build/fpga/project.prj -ifmt mixed -opt_mode ${opt[0]} -opt_level ${opt[1]} -ofn build/fpga/project.ngc -ofmt NGC -lso build/fpga/project.lso -p ${fpgaData.chip} -top ${fpgaData.topLevelEntity} -rtlview yes
`);
}
