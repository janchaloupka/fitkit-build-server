import { promises as fs } from "fs";
import { join } from "path";

/**
 * Vytvořit ISIM TCL konfigurační soubor
 * @param path Absolutní cesta k nově vytvořenému souboru (včetně _sim.tcl přípony)
 */
export async function createSimTcl(path: string) {

    // TODO config.BaseFolder - neboli předělat /opt/fitkit aby to nebyl takový magic string
    await fs.writeFile(path, `set TESTBENCH_SCRIPT "../../isim.tcl"
set ISIM_PRJ "project_isim.prj"
set ISIM_SIMULATOR "project_isim"
set ISIM_SCRIPT "project_isim.tcl"
source "${join("/opt/fitkit", "base", "xilinxisim.tcl")}"
`);
}
