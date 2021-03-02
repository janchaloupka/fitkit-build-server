import { config } from '../config';
import { ProjectData } from './../model/project-data';
import { promises as fs } from "fs";
import { join } from "path";

/**
 * Správa lokální složky projektu
 */
export class ProjectFiles{
    /** Mapování lokálních souborů k originálním cestám klienta */
    public mapToOriginalPath: {[hashed: string]: string} = {};

    private config: ProjectData;

    /** Cesta k lokální složce projektu */
    public path?: string;

    public constructor(config: ProjectData){
        this.config = config;
    }

    /**
     * Získat název souboru z cesty.
     * Cesta může být v UNIX nebo Windows formátu
     */
    private crossPlatformBasename(path: string): string{
        let splitPath = path.split(/[\\\/]/);
        if(splitPath.length <= 1) throw new Error("Unable to create file, invalid path");
        return splitPath.pop() ?? path;
    }

    /**
     * Vytvořit dočasnou složku projektu včetně všech potřebných souborů
     */
    public async createDirectory(): Promise<string>{
        if(this.path) await this.delete();

        this.path = await fs.mkdtemp(join(config.projectsFolder, "project-"));

        await this.createFpgaFiles();

        await this.createMcuFiles();

        return this.path;
    }

    private async createFpgaFiles(){
        if(!this.config.fpga || !this.path) return;
        const path = this.path;

        for (const file of this.config.fpga?.files) {
            const origPath = file.path;
            file.path = this.crossPlatformBasename(origPath);

            // Test, zda se již soubor se stejným jménem v projektu nenachází
            // V tom případě přidat suffix
            let filePathTest = file.path;
            const splitExt = file.path.split(".", 2);
            for(let i = 1; Object.keys(this.mapToOriginalPath).includes(filePathTest);i++){
                filePathTest = splitExt[0] + "_" + i + (splitExt[1] ? "." + splitExt[1] : "");
            }

            file.path = filePathTest;
            this.mapToOriginalPath[file.path] = origPath;

            await fs.writeFile(join(path, file.path), new Buffer(file.content, "base64"));
        }

        const ucf = this.config.fpga.ucfFile;
        const origUcfPath = ucf.path;
        ucf.path = this.crossPlatformBasename(origUcfPath);
        this.mapToOriginalPath[ucf.path] = origUcfPath;
        await fs.writeFile(join(path, ucf.path), new Buffer(ucf.content, "base64"));

        const isimFile = this.config.fpga.isimFile;
        if(isimFile){
            const localIsimFile = join(path, "isim.tcl");
            this.mapToOriginalPath[localIsimFile] = isimFile.path;
            await fs.writeFile(localIsimFile, new Buffer(isimFile.content, "base64"));
        }
    }

    private async createMcuFiles(){
        if(!this.config.mcu || !this.path) return;
        const path = this.path;

        for (const file of this.config.mcu.files) {
            const origPath = file.path;
            file.path = this.crossPlatformBasename(origPath);
            this.mapToOriginalPath[file.path] = origPath;

            await fs.writeFile(join(path, file.path), new Buffer(file.content, "base64"));
        }

        for (const file of this.config.mcu.headers) {
            const origPath = file.path;
            file.path = this.crossPlatformBasename(origPath);
            this.mapToOriginalPath[file.path] = origPath;

            await fs.writeFile(join(path, file.path), new Buffer(file.content, "base64"));
        }
    }

    /**
     * Odstranit dočasnou složku projektu
     */
    public async delete(){
        if(!this.path) return;

        fs.rmdir(this.path, {recursive: true});
    }
}
