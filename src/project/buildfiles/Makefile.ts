import { Config } from '../../config';
import { ProjectData } from '../../model/ProjectData';
import { promises as fs } from "fs";
import { join, basename } from "path";

// TODO mathlib

/**
 * Vytvořit Makefile pro překlad projektu
 * @param path Absolutní cesta k nově vytvořenému Makefile
 * @param project Konfigurace FITkit projektu
 */
export async function CreateMakefile(path: string, project: ProjectData) {
	let chip = project.Fpga.Chip.split("-");

	if(chip.length < 3)
		throw new Error(`Invalid format of chip specification (got ${project.Fpga.Chip}). Specification requires three strings separated by "-" e.g. "xc3s50-4-pq208"`);

	let fpgaFiles: string = "";
	project.Fpga.Files.forEach(f => {
		if(f.SimOnly) return;
		fpgaFiles += `HDLFILES ${fpgaFiles.length > 0 ? "+" : ""}= ${f.Path}\n`;
	});

	let mcuFiles = "";
	let objFilesV1 = "";
	let objFilesV2 = "";
	project.Mcu.Files.forEach(f => {
		const objV1 = join("build", "mcu", basename(f.Path, ".c") + "_f1xx.o");
		const objV2 = join("build", "mcu", basename(f.Path, ".c") + "_f2xx.o");
		objFilesV1 += " " + objV1;
		objFilesV2 += " " + objV2;
		mcuFiles += `${objV1}: ${f.Path}\n\t$(comp_tpl_f1xx)\n\n${objV2}: ${f.Path}\n\t$(comp_tpl_f2xx)\n\n`;
	});

	await fs.writeFile(path, `BASE = ${Config.BaseFolder}
OUTPUTPREFIX = project
${project.Mcu.UseMathLib ? "LIBRARIES = -lm" : ""}
FPGACHIP = ${chip[0]}
FPGASPEEDGRADE = ${chip[1]}
FPGAPACKAGE = ${chip[2]}

all: build/project_f1xx.hex build/project_f2xx.hex build/project.bin

# MCU ##########################################################################
HEXFILE_F1XX = build/project_f1xx.hex
HEXFILE_F2XX = build/project_f2xx.hex

${mcuFiles}
OBJFILES_F1XX =${objFilesV1}
OBJFILES_F2XX =${objFilesV2}

# FPGA #########################################################################
BINFILE = build/project.bin
FPGAUCF = ${project.Fpga.UcfFile.Path}
${fpgaFiles}
build/project.bin: build/fpga/project.par.ncd build/fpga/project.pcf

include $(BASE)/base/Makefile.inc
`);

}
