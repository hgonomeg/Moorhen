import { useCallback, useRef } from "react"
import { MoorhenMoleculeSelect } from "../select/MoorhenMoleculeSelect"
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { useDispatch, useSelector } from 'react-redux';
import { triggerScoresUpdate } from "../../store/connectedMapsSlice";

export const MoorhenMergeMoleculesMenuItem = (props: {
    fromMolNo?: null | number; 
    popoverPlacement?: 'left' | 'right'
    setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
    menuItemText?: string;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const toRef = useRef<null | HTMLSelectElement>(null)
    const fromRef = useRef<null | HTMLSelectElement>(null)

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const panelContent = <>
        {props.fromMolNo === null ? <MoorhenMoleculeSelect molecules={molecules} label="From molecule" allowAny={false} ref={fromRef} /> : null}
        <MoorhenMoleculeSelect molecules={molecules} label="Into molecule" allowAny={false} ref={toRef} />
    </>

    const onCompleted = useCallback(async () => {
        const toMolecule = molecules.find(molecule => molecule.molNo === parseInt(toRef.current.value))
        const fromMolNo: number = props.fromMolNo !== null ? props.fromMolNo : parseInt(fromRef.current.value)
        const otherMolecules = molecules.filter(molecule => (molecule.molNo === fromMolNo) && (molecule.molNo !== toMolecule.molNo))
        if (otherMolecules.length <= 0) {
            console.log('No valid molecules selected, skipping merge...')
            return
        }
        await toMolecule.mergeMolecules(otherMolecules, true)
        props.setPopoverIsShown(false)
        dispatch( triggerScoresUpdate(toMolecule.molNo) )
    }, [toRef.current, fromRef.current, molecules, props.fromMolNo, props.glRef])

    return <MoorhenBaseMenuItem
        id='merge-molecules-menu-item'
        popoverPlacement={props.popoverPlacement}
        popoverContent={panelContent}
        menuItemText={props.menuItemText}
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
}

MoorhenMergeMoleculesMenuItem.defaultProps = {
    popoverPlacement: "right",
    menuItemText: 'Merge molecules...',
    fromMolNo: null
}

