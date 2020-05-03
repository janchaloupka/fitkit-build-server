import { ProjectData } from '../../model/ProjectData';
import { promises as fs } from "fs";

/**
 * Vytvořit skript XILINX ISE syntézy
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně .xst přípony)
 * @param project Konfigurace FITkit projektu
 */
export async function CreateXst(path: string, project: ProjectData) {
	const opt = project.Fpga.Optimization.split(":");

	if(opt.length !== 2)
		throw new Error(`Optimization value must be in format TARGET:LEVEL, e.g. speed:1 (got: ${project.Fpga.Optimization})`);

	await fs.writeFile(path, `set -tmpdir build/fpga -xsthdpdir build/fpga
run -ifn build/fpga/project.prj -ifmt mixed -opt_mode ${opt[0]} -opt_level ${opt[1]} -ofn build/fpga/project.ngc -ofmt NGC -lso build/fpga/project.lso -p ${project.Fpga.Chip} -top ${project.Fpga.TopLevelEntity} -rtlview yes
`);
}
