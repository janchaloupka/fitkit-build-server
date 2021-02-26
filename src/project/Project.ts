import { Config } from '../config';
import { ProjectData } from './../model/ProjectData';
import { promises as fs } from "fs";
import { join } from "path";
import { CreateBuildFiles } from './BuildFiles';

/**
 * Správa lokální složky projektu
 */
export class Project{
	/** Mapování lokálních souborů k originálním cestám klienta */
	public MapToOriginalPath: {[hashed: string]: string} = {};

	private ProjConf: ProjectData;

	/** Cestka k lokální složce projektu */
	public Path?: string;

	public constructor(project: ProjectData){
		this.ProjConf = project;
	}

	/**
	 * Získat název soboru z cesty.
	 * Ceesta může být v UNIX nebo Windows formátu
	 */
	private CrossPlatformBasename(path: string): string{
		let splitPath = path.split(/[\\\/]/);
		if(splitPath.length <= 1) throw new Error("Unable to create file, invalid path");
		return splitPath.pop() ?? path;
	}

	/**
	 * Vytvořit dočasnou složku projektu včetně všech potřebných souborů
	 */
	public async CreateDirectory(): Promise<string>{
		if(this.Path) await this.Delete();

		const path = await fs.mkdtemp(join(Config.ProjectsFolder, "project-"));
		this.Path = path;

		for (const file of this.ProjConf.Fpga.Files) {
			const origPath = file.Path;
			file.Path = this.CrossPlatformBasename(origPath);

			// Test, zda se již soubor se stejným jménem v projektu nenachází
			// V tom případě přidat suffix
			let filePathTest = file.Path;
			const splitExt = file.Path.split(".", 2);
			for(let i = 1; Object.keys(this.MapToOriginalPath).includes(filePathTest);i++){
				filePathTest = splitExt[0] + "_" + i + (splitExt[1] ? "." + splitExt[1] : "");
			}

			file.Path = filePathTest;
			this.MapToOriginalPath[file.Path] = origPath;

			await fs.writeFile(join(path, file.Path), new Buffer(file.Content, "base64"));
		}

		for (const file of this.ProjConf.Mcu.Files) {
			const origPath = file.Path;
			file.Path = this.CrossPlatformBasename(origPath);
			this.MapToOriginalPath[file.Path] = origPath;

			await fs.writeFile(join(path, file.Path), new Buffer(file.Content, "base64"));
		}

		for (const file of this.ProjConf.Mcu.Headers) {
			const origPath = file.Path;
			file.Path = this.CrossPlatformBasename(origPath);
			this.MapToOriginalPath[file.Path] = origPath;

			await fs.writeFile(join(path, file.Path), new Buffer(file.Content, "base64"));
		}

		const ucf = this.ProjConf.Fpga.UcfFile;
		const origUcfPath = ucf.Path;
		ucf.Path = this.CrossPlatformBasename(origUcfPath);
		this.MapToOriginalPath[ucf.Path] = origUcfPath;
		await fs.writeFile(join(path, ucf.Path), new Buffer(ucf.Content, "base64"));

		const isimFile = this.ProjConf.Fpga.IsimFile;
		if(isimFile){
			const localIsimFile = join(path, "isim.tcl");
			this.MapToOriginalPath[localIsimFile] = isimFile.Path;
			await fs.writeFile(localIsimFile, new Buffer(isimFile.Content, "base64"));
		}

		CreateBuildFiles(this.Path, this.ProjConf);

		return path;
	}

	/**
	 * Odstranit dočasnou složku projektu
	 */
	public async Delete(){
		if(!this.Path) return;

		fs.rmdir(this.Path, {recursive: true});
	}
}
