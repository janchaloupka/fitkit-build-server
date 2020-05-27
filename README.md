# FITkit build server
Program pro správu připojení a požadavků na vzdálené sestavení a simulaci FITkit projektů.

## Požadavky
 * Node.js, npm ([Stránky projektu](https://nodejs.org/))
 * Správně nakonfigurovaný překladový server

## Instalace
 1. Naklonujte repozitář do cílové složky na serveru (například `/opt/build-server`) a přesuňte se do něj
 2. Stáhněte a nainstalujte závislosti příkazem `npm install`
 3. Spusťte sestavení ze zdrojových souborů příkazem `npm compile` (musí být v `PATH` dostupný Node.js a NPM)
 4. Vytvořte konfigurační soubor (například zkopírováním ukázkového - `cp config.example.jsonc config.jsonc`)
 5. Konfigurační soubor upravte. Důležité je uvést cestu k veřejnému klíči pro ověření JWT tokenů.
 6. Server můžete spustit souborem `./build-server` (musí být spustitelný)
	* Je doporučeno vytvořit systémovou službu pro lepší kontrolu nad spuštěným programem na pozadí
