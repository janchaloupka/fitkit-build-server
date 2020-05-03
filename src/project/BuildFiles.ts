import { ProjectData } from '../model/ProjectData';
import { promises as fs } from "fs";
import { join } from "path";
import { CreateMakefile } from './buildfiles/Makefile';
import { CreateLso } from './buildfiles/Lso';
import { CreateSimTcl } from './buildfiles/SimTcl';
import { CreateXst } from './buildfiles/Xst';
import { CreateVhdlConfig } from './buildfiles/VhdlConfig';
import { CreatePrj } from './buildfiles/Prj';

/**
 * Vytvořit všechny potřebné soubory pro překlad projektu
 * @param path Absolutní cesta ke kořenové složce projektu
 * @param project Konfigurace FITkit projektu
 */
export async function CreateBuildFiles(path: string, project: ProjectData) {
	const buildFpga = join(path, "build", "fpga");

	await fs.mkdir(buildFpga, {recursive: true});
	await fs.mkdir(join(path, "build", "mcu"), {recursive: true});

	await CreateMakefile(join(path, "Makefile"), project);
	await CreateLso(join(buildFpga, "project.lso"), project);
	await CreateXst(join(buildFpga, "project.xst"), project);
	await CreateSimTcl(join(buildFpga, "project_sim.tcl"));

	if(project.Fpga.UseArchitecture){
		const fpgaConfig = join("build", "fpga", "project_config.vhd");
		await CreateVhdlConfig(join(path, fpgaConfig), project);
		project.Fpga.Files.unshift({
			Content: "",
			SimOnly: false,
			Path: fpgaConfig
		});
	}

	await CreatePrj(join(buildFpga, "project.prj"), project);
	await CreatePrj(join(buildFpga, "project_isim.prj"), project, join("..", ".."), true);
}
