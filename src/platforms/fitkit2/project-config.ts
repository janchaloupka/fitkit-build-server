import { File } from './../../model/project-data.d';
import { config } from '../../config';
import { ProjectData } from './../../model/project-data';
import { promises as fs } from "fs";
import { join } from "path";
import { createBuildFiles } from './build-files';

/**
 * Získat název souboru z cesty.
 * Cesta může být v UNIX nebo Windows formátu
 */
const crossPlatformBasename = (path: string): string => {
    let splitPath = path.split(/[\\\/]/);
    if(splitPath.length <= 1) throw new Error("Unable to create file, invalid path");
    return splitPath.pop() ?? path;
};

const writeProjectFile = async (path: string, file: File) => {
    const buffer = new Buffer(file.content, file.binary ? "base64" : "utf8");
    await fs.writeFile(path, buffer);
};

/**
 * Správa lokální složky projektu
 */
export class ProjectConfig{
    /** Mapování lokálních souborů k originálním cestám klienta */
    public mapToOriginalPath: {[hashed: string]: string} = {};

    private projConf: ProjectData;

    /** Cesta k lokální složce projektu */
    public path?: string;

    public constructor(project: ProjectData){
        this.projConf = project;
    }

    /**
     * Vytvořit dočasnou složku projektu včetně všech potřebných souborů
     */
    public async createDirectory(): Promise<string>{
        if(this.path) await this.delete();

        const path = await fs.mkdtemp(join(config.projectsFolder, "project-"));
        this.path = path;

        // FPGA soubory
        if(this.projConf.fpga){
            for (const file of this.projConf.fpga.files) {
                const origPath = file.path;
                file.path = crossPlatformBasename(origPath);

                // Test, zda se již soubor se stejným jménem v projektu nenachází
                // V tom případě přidat suffix
                let filePathTest = file.path;
                const splitExt = file.path.split(".", 2);
                for(let i = 1; Object.keys(this.mapToOriginalPath).includes(filePathTest);i++){
                    filePathTest = splitExt[0] + "_" + i + (splitExt[1] ? "." + splitExt[1] : "");
                }

                file.path = filePathTest;
                this.mapToOriginalPath[file.path] = origPath;

                await writeProjectFile(join(path, file.path), file);
            }

            const ucf = this.projConf.fpga.ucfFile;
            const origUcfPath = ucf.path;
            ucf.path = crossPlatformBasename(origUcfPath);
            this.mapToOriginalPath[ucf.path] = origUcfPath;
            await writeProjectFile(join(path, ucf.path), ucf);

            const isimFile = this.projConf.fpga?.isimFile;
            if(isimFile){
                const localIsimFile = join(path, "isim.tcl");
                this.mapToOriginalPath[localIsimFile] = isimFile.path;
                await writeProjectFile(localIsimFile, isimFile);
            }
        }

        // MCU soubory
        if(this.projConf.mcu){
            for (const file of this.projConf.mcu.files) {
                const origPath = file.path;
                file.path = crossPlatformBasename(origPath);
                this.mapToOriginalPath[file.path] = origPath;

                await writeProjectFile(join(path, file.path), file);
            }

            for (const file of this.projConf.mcu.headers) {
                const origPath = file.path;
                file.path = crossPlatformBasename(origPath);
                this.mapToOriginalPath[file.path] = origPath;

                await writeProjectFile(join(path, file.path), file);
            }
        }

        await createBuildFiles(this.path, this.projConf);

        return path;
    }

    /**
     * Odstranit dočasnou složku projektu
     */
    public async delete(){
        if(!this.path) return;

        await fs.rmdir(this.path, {recursive: true});
    }
}
