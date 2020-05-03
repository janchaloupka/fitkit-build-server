import { ProjectData } from '../../model/ProjectData';
import { promises as fs } from "fs";

/**
 * Vytvořit základní konfiguraci VHDL projektu
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně _config.vhd přípony)
 * @param project Konfigurace FITkit projektu
 */
export async function CreateVhdlConfig(path: string, project: ProjectData) {
	await fs.writeFile(path, `-- fpga_config.vhd: user constants
use work.clkgen_cfg.all;

package fpga_cfg is
	constant DCM_FREQUENCY : dcm_freq := DCM_${project.Fpga.DcmFrequency};
end fpga_cfg;

package body fpga_cfg is
end fpga_cfg;
`);
}
