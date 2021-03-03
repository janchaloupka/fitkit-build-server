import { ProjectFpgaData } from '../../../model/project-data';
import { promises as fs } from "fs";

/**
 * Vytvořit základní konfiguraci VHDL projektu
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně _config.vhd přípony)
 * @param fpgaData Konfigurace FPGa části FITkit projektu
 */
export async function createVhdlConfig(path: string, fpgaData: ProjectFpgaData) {
    await fs.writeFile(path, `-- fpga_config.vhd: user constants
use work.clkgen_cfg.all;

package fpga_cfg is
    constant DCM_FREQUENCY : dcm_freq := DCM_${fpgaData.dcmFrequency};
end fpga_cfg;

package body fpga_cfg is
end fpga_cfg;
`);
}
