import { useCallback, useRef } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";

export const MoorhenMoveMoleculeHere = (props: {
    molecules: moorhen.Molecule[];
    popoverPlacement?: 'left' | 'right'
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const moleculeSelectRef = useRef<null | HTMLSelectElement>(null)

    const panelContent = <>
        <MoorhenMoleculeSelect {...props} allowAny={false} ref={moleculeSelectRef} />
    </>

    const onCompleted = useCallback(async () => {
        if (moleculeSelectRef.current.value === null) {
            return
        }
        const selectedMolecule = props.molecules.find(molecule => molecule.molNo === parseInt(moleculeSelectRef.current.value))
        if (selectedMolecule) {
            await selectedMolecule.moveMoleculeHere(...props.glRef.current.origin.map(coord => -coord) as [number, number, number])
            const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: {
                origin: props.glRef.current.origin, modifiedMolecule: selectedMolecule.molNo 
            } })
            document.dispatchEvent(scoresUpdateEvent)
        }
    }, [props.molecules])

    return <MoorhenBaseMenuItem
        id='merge-molecules-menu-item'
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        menuItemText="Move molecule here..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenMoveMoleculeHere.defaultProps = {
    popoverPlacement: "right",
}

