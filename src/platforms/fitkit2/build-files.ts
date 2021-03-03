import { ProjectData } from '../../model/project-data';
import { promises as fs } from "fs";
import { join } from "path";
import { createMakefile } from './build-files/makefile';
import { createLsoFile } from './build-files/lso';
import { createSimTcl } from './build-files/sim-tcl';
import { createXstFile } from './build-files/xst';
import { createVhdlConfig } from './build-files/vhdl-config';
import { createPrjFile } from './build-files/Prj';

/**
 * Vytvořit všechny potřebné soubory pro překlad projektu
 * @param path Absolutní cesta ke kořenové složce projektu
 * @param project Konfigurace FITkit projektu
 */
export async function createBuildFiles(path: string, project: ProjectData) {
    const buildFpga = join(path, "build", "fpga");

    await fs.mkdir(buildFpga, {recursive: true});
    await fs.mkdir(join(path, "build", "mcu"), {recursive: true});

    await createMakefile(join(path, "Makefile"), project);

    if(!project.fpga) return;

    await createLsoFile(join(buildFpga, "project.lso"), project.fpga);
    await createXstFile(join(buildFpga, "project.xst"), project.fpga);
    await createSimTcl(join(buildFpga, "project_sim.tcl"));

    if(project.fpga.usesArchitecture){
        const fpgaConfig = join("build", "fpga", "project_config.vhd");
        await createVhdlConfig(join(path, fpgaConfig), project.fpga);
        project.fpga.files.unshift({
            content: "",
            simOnly: false,
            path: fpgaConfig,
            binary: false
        });
    }

    await createPrjFile(join(buildFpga, "project.prj"), project.fpga);
    await createPrjFile(join(buildFpga, "project_isim.prj"), project.fpga, join("..", ".."), true);
}
