import { MoorhenMap } from "../../tsDist/src/utils/MoorhenMap"
import { readDataFile } from "../../tsDist/src/utils/MoorhenUtils";
import { MockMoorhenCommandCentre } from "../helpers/mockMoorhenCommandCentre"
import { MockWebGL } from "../helpers/mockWebGL"
import fetch from 'node-fetch';

jest.setTimeout(40000)

const fs = require('fs')
const path = require('path')
const createCootModule = require('../../public/baby-gru/wasm/moorhen')
let cootModule;

const mockMonomerLibraryPath = "https://raw.githubusercontent.com/MRC-LMB-ComputationalStructuralBiology/monomers/master/"

global.fetch = (url) => {
    if (url.includes(mockMonomerLibraryPath)) {
        return fetch(url)
    } else if (url.includes('https:/files.rcsb.org/download/')) {
        return fetch(url)
    } else {
        return Promise.resolve({
            ok: true,
            text: async () => {
                const fileContents = fs.readFileSync(url, { encoding: 'utf8', flag: 'r' })
                return fileContents
            },
            blob: async () => {
                return {
                    arrayBuffer: async () => {
                        const fileContents = fs.readFileSync(url)
                        const buff = fileContents.buffer
                        return buff
                    }    
                }
            }
        })
    }
}

beforeAll(() => {   
    return createCootModule({
        print(t) { () => console.log(["output", t]) },
        printErr(t) { () => console.log(["output", t]); }
    }).then(moduleCreated => {
        cootModule = moduleCreated
        setupFunctions.copyTestDataToFauxFS()
        global.window = {
            CCP4Module: cootModule,
        }
        return Promise.resolve()
    })
})
describe("Testing MoorhenMap", () => {

    test("Test loadToCootFromMtzURL", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        expect(map.molNo).toBe(0)
        const isValid = molecules_container.is_valid_map_molecule(map.molNo)
        expect(isValid).toBeTruthy()
    })

    test("Test loadToCootFromMtzURL --isDifference", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false, calcStructFact: false })
        expect(map.molNo).toBe(0)
        expect(map.isDifference).toBeTruthy()
        const isValid = molecules_container.is_valid_map_molecule(map.molNo)
        expect(isValid).toBeTruthy()
    })

    test("Test delete", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        expect(map.molNo).toBe(0)
        await map.delete()
        const isValid = molecules_container.is_valid_map_molecule(map.molNo)
        expect(isValid).toBeFalsy()
    })

    test("Test fetchIsDifferenceMap 1", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "DELFWT", PHI: "PHDELWT", isDifference: true, useWeight: false, calcStructFact: false })
        expect(map.molNo).toBe(0)
        const isDifference = await map.fetchIsDifferenceMap()
        expect(isDifference).toBeTruthy()
    })

    test("Test fetchIsDifferenceMap 2", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        expect(map.molNo).toBe(0)
        const isDifference = await map.fetchIsDifferenceMap()
        expect(isDifference).toBeFalsy()
    })

    test("Test getSuggestedSettings", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)

        const f_1 = jest.spyOn(map, 'getSuggestedSettings')
        const f_2 = jest.spyOn(map, 'fetchMapRmsd')
        const f_3 = jest.spyOn(map, 'fetchMapCentre')
        const f_4 = jest.spyOn(map, 'setDefaultColour')
        const f_5 = jest.spyOn(map, 'fetchSuggestedLevel')
        const f_6 = jest.spyOn(map, 'estimateMapWeight')
        
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        
        expect(map.molNo).toBe(0)
        expect(f_1).toHaveBeenCalledTimes(1)
        expect(f_2).toHaveBeenCalledTimes(1)
        expect(f_3).toHaveBeenCalledTimes(1)
        expect(f_4).toHaveBeenCalledTimes(1)
        expect(f_5).toHaveBeenCalledTimes(1)
        expect(f_6).toHaveBeenCalledTimes(1)
                
        expect(map.mapRmsd).toBeCloseTo(0.35, 1)
        expect(map.mapCentre[0]).toBeCloseTo(1.09, 1)
        expect(map.mapCentre[1]).toBeCloseTo(-0.17, 1)
        expect(map.mapCentre[2]).toBeCloseTo(2.94, 1)
        expect(map.suggestedContourLevel).toBeCloseTo(0.56, 1)
        expect(map.suggestedMapWeight).toBeCloseTo(42.24, 1)
        expect(map.rgba.mapColour.r).toBeCloseTo(0.30, 1)
        expect(map.rgba.mapColour.g).toBeCloseTo(0.30, 1)
        expect(map.rgba.mapColour.b).toBeCloseTo(0.69, 1)
        // No suggested radius for MX maps
        expect(map.suggestedRadius).toBe(null)
    })

    test("Test fetchMapRmsd", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        const rmsd = await map.fetchMapRmsd()
        expect(rmsd).toBeCloseTo(0.35, 1)
    })

    test("Test getMapWeight", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        const mapWeight = await map.getMapWeight()
        expect(mapWeight).toBe(50)
    })

    test("Test setMapWeight", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        const mapWeight_1 = map.suggestedMapWeight
        await map.setMapWeight()
        const mapWeight_2 = await map.getMapWeight()
        expect(mapWeight_2).toBeCloseTo(mapWeight_1, 1)
    })

    test("Test setActive", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        const f_1 = jest.spyOn(map, 'setMapWeight')
        await map.setActive()
        expect(f_1).toHaveBeenCalledTimes(1)
    })

    test("Test getHistogram", async () => {
        const molecules_container = new cootModule.molecules_container_js(false)
        const fileUrl = path.join(__dirname, '..', 'test_data', '5a3h_sigmaa.mtz')
        const glRef = {
            current: new MockWebGL()
        }
        const commandCentre = {
            current: new MockMoorhenCommandCentre(molecules_container, cootModule)
        }
        const map = new MoorhenMap(commandCentre, glRef)
        await map.loadToCootFromMtzURL(fileUrl, 'map-test', { F: "FWT", PHI: "PHWT", isDifference: false, useWeight: false, calcStructFact: false })
        const histogramData = await map.getHistogram()
        expect(histogramData.base).toBeCloseTo(-1.01, 1)
        expect(histogramData.bin_width).toBeCloseTo(0.023, 2)
        expect(histogramData.counts).toHaveLength(200)
    })

})

const testDataFiles = ['5fjj.pdb', '5a3h.pdb', '5a3h.mmcif', '5a3h_no_ligand.pdb', 'LZA.cif', 'nitrobenzene.cif', 'benzene.cif', '5a3h_sigmaa.mtz', 'rnasa-1.8-all_refmac1.mtz', 'tm-A.pdb']

const setupFunctions = {
    removeTestDataFromFauxFS: () => {
        testDataFiles.forEach(fileName => {
            cootModule.FS_unlink(fileName)
        })
    },
    copyTestDataToFauxFS: () => {
        testDataFiles.forEach(fileName => {
            let dirName
            if (fileName === 'rnasa-1.8-all_refmac1.mtz') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'data')
            } else if (fileName === 'tm-A.pdb') {
                dirName = path.join(__dirname, '..', '..', '..', 'checkout', 'coot-1.0', 'api')
            } else {
                dirName = path.join(__dirname, '..', 'test_data')
            }
            const coordData = fs.readFileSync(path.join(dirName, fileName), { encoding: fileName.includes('mtz') ? null : 'utf8', flag: 'r' })
            cootModule.FS_createDataFile(".", fileName, coordData, true, true);
        })
        cootModule.FS.mkdir("COOT_BACKUP");
    }
}
