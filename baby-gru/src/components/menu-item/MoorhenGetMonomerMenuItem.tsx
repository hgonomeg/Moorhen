import { useRef } from "react";
import { Form } from "react-bootstrap";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect";
import { MoorhenMolecule, MoorhenMoleculeInterface } from "../../utils/MoorhenMolecule";
import { MoorhenCommandCentreInterface } from "../../utils/MoorhenCommandCentre"
import { MolChange } from "../MoorhenApp";

export const MoorhenGetMonomerMenuItem = (props: {
    glRef: React.RefObject<mgWebGLType>
    popoverPlacement?: 'left' | 'right'
    molecules: MoorhenMoleculeInterface[];
    defaultBondSmoothness: number;
    changeMolecules: (arg0: MolChange<MoorhenMoleculeInterface>) => void;
    commandCentre: React.RefObject<MoorhenCommandCentreInterface>;
    monomerLibraryPath: string;
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
}) => {

    const tlcRef = useRef<HTMLInputElement>()
    const selectRef = useRef<HTMLSelectElement | null>(null)

    const panelContent = <>
        <Form.Group style={{ width: '20rem', margin: '0.5rem' }} controlId="MoorhenGetMonomerMenuItem" className="mb-3">
            <Form.Label>Monomer identifier</Form.Label>
            <Form.Control ref={tlcRef} type="text" />
        </Form.Group>
        <MoorhenMoleculeSelect {...props} allowAny={true} ref={selectRef} />
    </>


    const onCompleted = async () => {
        const fromMolNo = parseInt(selectRef.current.value)
        const newTlc = tlcRef.current.value.toUpperCase()
        const newMolecule = new MoorhenMolecule(props.commandCentre, props.monomerLibraryPath)

        const getMonomer = () => {
            return props.commandCentre.current.cootCommand({
                returnType: 'status',
                command: 'get_monomer_and_position_at',
                commandArgs: [newTlc, fromMolNo,
                    ...props.glRef.current.origin.map(coord => -coord)
                ]
            }, true)
        }

        let result = await getMonomer()
        
        if (result.data.result.result === -1) {
            await newMolecule.loadMissingMonomer(newTlc, fromMolNo)
            result = await getMonomer()
        } 
        
        if (result.data.result.status === "Completed" && result.data.result.result !== -1) {
            newMolecule.molNo = result.data.result.result
            newMolecule.name = newTlc
            newMolecule.setBackgroundColour(props.glRef.current.background_colour)
            newMolecule.cootBondsOptions.smoothness = props.defaultBondSmoothness
            const fromMolecule = props.molecules.find(molecule => molecule.molNo === fromMolNo)
            if (typeof fromMolecule !== 'undefined') {
                const ligandDict = fromMolecule.getDict(newTlc)
                await newMolecule.addDict(ligandDict)    
            }
            await newMolecule.fetchIfDirtyAndDraw('CBs', props.glRef)
            props.changeMolecules({ action: "Add", item: newMolecule })
        } else {
            console.log('Error getting monomer... Missing dictionary?')
            props.commandCentre.current.extendConsoleMessage('Error getting monomer... Missing dictionary?')
        }
    }

    return <MoorhenBaseMenuItem
        id='get-monomer-menu-item'
        popoverContent={panelContent}
        menuItemText="Get monomer..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
        popoverPlacement={props.popoverPlacement}
    />
}

MoorhenGetMonomerMenuItem.defaultProps = { popoverPlacement: "right" }