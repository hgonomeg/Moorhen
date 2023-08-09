import { Form, InputGroup } from "react-bootstrap";
import { useRef, useState } from "react";
import { MenuItem } from "@mui/material";
import { cidToSpec } from "../../utils/MoorhenUtils";
import { MoorhenNavBarExtendedControlsInterface } from "./MoorhenNavBar";
import { MoorhenMoleculeRepresentation } from "../../utils/MoorhenMoleculeRepresentation";

var TRIAL_COUNT = 0

const doTest = async (props: any) => {
    TRIAL_COUNT += 1
    console.log(`########################################## ${TRIAL_COUNT}`)
    const molecule = props.molecules.find(molecule => molecule.molNo === 0)
    const chosenAtom = cidToSpec('/1/A/14/C')
    try {
        const result = await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'flipPeptide_cid',
            commandArgs: [molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}/${chosenAtom.atom_name}`, ''],
            changesMolecules: [molecule.molNo]
        }, true)

        console.log(result.data.timeMainThreadToWorker)
        console.log(result.data.timelibcootAPI)
        console.log(result.data.timeconvertingWASMJS)
        console.log(result)
        console.log(`Message from worker back to main thread took ${Date.now() - result.data.messageSendTime} ms (flipPeptide_cid) - (${result.data.messageId.slice(0, 5)})`)
                    
        const test = await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'refine_residues_using_atom_cid',
            commandArgs: [ molecule.molNo, `//${chosenAtom.chain_id}/${chosenAtom.res_no}`, 'TRIPLE', 4000],
            changesMolecules: [molecule.molNo]
        }, true)
                    
        console.log(test.data.timeMainThreadToWorker)
        console.log(test.data.timelibcootAPI)
        console.log(test.data.timeconvertingWASMJS)
        console.log(test)
        console.log(`Message from worker back to main thread took ${Date.now() - test.data.messageSendTime} ms (refine_residues_using_atom_cid) - (${test.data.messageId.slice(0, 5)})`)

        molecule.setAtomsDirty(true)
        await molecule.redraw()
        const scoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: { origin: props.glRef.current.origin, modifiedMolecule: molecule.molNo } })
        document.dispatchEvent(scoresUpdateEvent)
        
        if (TRIAL_COUNT <= 99) {
            setTimeout(() => doTest(props), 8000)
        }
    } catch (err) {
            console.log('Encountered', err)
    }
}

const doColourTest = async (props: any) => {
    const molecule = props.molecules.find(molecule => molecule.molNo === 0)
    if (typeof molecule !== 'undefined') {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: 'shim_do_colour_test',
            commandArgs: [molecule.molNo],
        }, true)

        const representation = new MoorhenMoleculeRepresentation('CBs', '//A/1-10/', props.commandCentre, props.glRef)
        representation.setParentMolecule(molecule)
        const objects = await representation.getBufferObjects()
        representation.buildBuffers(objects)
    
    }
}

export const MoorhenDevMenu = (props: MoorhenNavBarExtendedControlsInterface) => {
    const [popoverIsShown, setPopoverIsShown] = useState(false)
    const customCid = useRef<string>('')
    const moleculeSelectRef = useRef<HTMLSelectElement>()
    const menuItemProps = {setPopoverIsShown, customCid, moleculeSelectRef, ...props}

    return <>
                    <MenuItem onClick={() => doTest(menuItemProps)}>
                        Do a timing test...
                    </MenuItem>
                    <MenuItem onClick={() => doColourTest(menuItemProps)}>
                        Do colouring test
                    </MenuItem>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.doShadow}
                            onChange={() => { props.setDoShadow(!props.doShadow) }}
                            label="Shadows"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.doOutline}
                            onChange={() => { props.setDoOutline(!props.doOutline) }}
                            label="Outlines"/>
                    </InputGroup>
                    <InputGroup style={{ padding:'0.5rem', width: '25rem'}}>
                        <Form.Check 
                            type="switch"
                            checked={props.doSpinTest}
                            onChange={() => { props.setDoSpinTest(!props.doSpinTest) }}
                            label="Spin test"/>
                    </InputGroup>
        </>
    }
