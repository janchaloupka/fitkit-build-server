import { ProjectData } from '../../../model/project-data';
import { promises as fs } from "fs";
import { join, basename } from "path";

/**
 * Vytvořit Makefile pro překlad projektu
 * @param path Absolutní cesta k nově vytvořenému Makefile
 * @param project Konfigurace FITkit projektu
 */
export async function createMakefile(path: string, project: ProjectData) {
    let chip = ["", "", ""];
    let fpgaFiles: string = "";

    if(project.fpga){
        chip = project.fpga.chip.split("-");

        if(chip.length < 3)
            throw new Error(`Invalid format of chip specification (got ${project.fpga.chip}). Specification requires three strings separated by "-" e.g. "xc3s50-4-pq208"`);

        project.fpga.files.forEach(f => {
            if(f.simOnly) return;
            fpgaFiles += `HDLFILES ${fpgaFiles.length > 0 ? "+" : ""}= ${f.path}\n`;
        });
    }

    let mcuFiles = "";
    let objFilesV1 = "";
    let objFilesV2 = "";
    if(project.mcu) project.mcu.files.forEach(f => {
        const objV1 = join("build", "mcu", basename(f.path, ".c") + "_f1xx.o");
        const objV2 = join("build", "mcu", basename(f.path, ".c") + "_f2xx.o");
        objFilesV1 += " " + objV1;
        objFilesV2 += " " + objV2;
        mcuFiles += `${objV1}: ${f.path}\n\t$(comp_tpl_f1xx)\n\n${objV2}: ${f.path}\n\t$(comp_tpl_f2xx)\n\n`;
    });

    // TODO config.BaseFolder - neboli předělat /opt/fitkit aby to nebyl takový magic string
    await fs.writeFile(path, `BASE = /opt/fitkit
OUTPUTPREFIX = project
${project.mcu?.useMathLib ? "LIBRARIES = -lm" : ""}
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
FPGAUCF = ${project.fpga?.ucfFile.path}
${fpgaFiles}
build/project.bin: build/fpga/project.par.ncd build/fpga/project.pcf

include $(BASE)/base/Makefile.inc
`);

}
