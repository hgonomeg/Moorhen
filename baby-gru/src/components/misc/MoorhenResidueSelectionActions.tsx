import { IconButton, Popover, Tooltip } from "@mui/material"
import { cidToSpec, guid } from "../../utils/MoorhenUtils"
import { MoorhenNotification } from "./MoorhenNotification"
import { AllOutOutlined, CloseOutlined, CopyAllOutlined, CrisisAlertOutlined, DeleteOutlined, FormatColorFillOutlined } from "@mui/icons-material"
import { useDispatch, useSelector } from "react-redux"
import { moorhen } from "../../types/moorhen"
import { Button, Stack } from "react-bootstrap"
import { clearResidueSelection, setNotificationContent, setResidueSelection } from '../../store/generalStatesSlice';
import { useCallback, useEffect, useRef, useState } from "react"
import { addMolecule, removeMolecule } from "../../moorhen"
import { HexColorPicker, RgbColorPicker } from "react-colorful"

export const MoorhenResidueSelectionActions = (props) => {

    const notificationKeyRef = useRef<string>(guid())
    const notificationComponentRef = useRef()
    const changeColourAnchorRef = useRef()

    const [showColourPopover, setShowColourPopover] = useState<boolean>(false)
    const [selectionLabel, setSelectionLabel] = useState<null | string>(null)
    const [tooltipContents, setTooltipContents] = useState<null | string>(null)
    const [selectedColour, setSelectedColour] = useState<string>('#808080')

    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules)
    const isChangingRotamers = useSelector((state: moorhen.State) => state.generalStates.isChangingRotamers)
    const isRotatingAtoms = useSelector((state: moorhen.State) => state.generalStates.isRotatingAtoms)
    const isDraggingAtoms = useSelector((state: moorhen.State) => state.generalStates.isDraggingAtoms)
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection)

    const updateScores = (molecule: moorhen.Molecule) => {
        const scoresUpdateEvent: moorhen.ScoresUpdateEvent = new CustomEvent("scoresUpdate", { detail: {
            modifiedMolecule: molecule.molNo
        }})
        document.dispatchEvent(scoresUpdateEvent)
    }

    const clearSelection = useCallback(() => {
        dispatch( clearResidueSelection() )
        dispatch( setNotificationContent(null) )
        setSelectionLabel(null)
        molecules.forEach(molecule => molecule.clearBuffersOfStyle('residueSelection'))
    }, [molecules])

    const handleAtomClicked = useCallback(async (evt: moorhen.AtomClickedEvent) => {
        if (!evt.detail.isResidueSelection || evt.detail.buffer.id == null || isDraggingAtoms || isRotatingAtoms || isChangingRotamers) {
            return
        } 

        const selectedMolecule = molecules.find(molecule => molecule.buffersInclude(evt.detail.buffer))
        if (!selectedMolecule) {
            clearSelection()
            return
        }
        
        if (residueSelection.first === null || residueSelection.molecule === null || residueSelection.molecule.molNo !== selectedMolecule.molNo) {
            const resSpec = cidToSpec(evt.detail.atom.label)
            await selectedMolecule.drawResidueSelection(`/*/${resSpec.chain_id}/${resSpec.res_no}-${resSpec.res_no}/*`)
            dispatch(
                setResidueSelection({
                    molecule: selectedMolecule,
                    first: evt.detail.atom.label,
                    second: null,
                    cid: null,
                    isMultiCid: false
                })
            )
            setSelectionLabel(`/${resSpec.mol_no}/${resSpec.chain_id}/${resSpec.res_no}`)
            return
        }

        const startResSpec = cidToSpec(residueSelection.first)
        const stopResSpec = cidToSpec(evt.detail.atom.label)
        if (startResSpec.chain_id !== stopResSpec.chain_id) {
            clearSelection()
        } else {
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b})
            const cid = `/*/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}/*`
            await selectedMolecule.drawResidueSelection(cid)
            dispatch(
                setResidueSelection({
                    molecule: selectedMolecule,
                    first: residueSelection.first,
                    second: evt.detail.atom.label,
                    cid: cid,
                    isMultiCid: false
                })
            )
            setSelectionLabel(`/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]}`)
        }
    }, [clearSelection, residueSelection, isRotatingAtoms, isChangingRotamers, isDraggingAtoms])

    useEffect(() => {
        document.addEventListener('atomClicked', handleAtomClicked)
        return () => {
            document.removeEventListener('atomClicked', handleAtomClicked)
        }
    }, [handleAtomClicked])

    const handleSelectionCopy = useCallback(async () => {
        let cid: string
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join('||')
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid =`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
        }

        if (cid) {
            const newMolecule = await residueSelection.molecule.copyFragmentUsingCid(cid, true)
            dispatch( addMolecule(newMolecule) )
        }
        
        clearSelection()
    }, [residueSelection, clearSelection])

    const handleRefinement = useCallback(async () => {
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            await residueSelection.molecule.refineResiduesUsingAtomCid(residueSelection.cid.join('||'), 'LITERAL')
        } else if (residueSelection.molecule && residueSelection.cid) {
            const startResSpec = cidToSpec(residueSelection.first)
            const stopResSpec = cidToSpec(residueSelection.second)
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b})
            await residueSelection.molecule.refineResidueRange(startResSpec.chain_id, sortedResNums[0], sortedResNums[1], 5000, true)
            updateScores(residueSelection.molecule)
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            await residueSelection.molecule.refineResidueRange(startResSpec.chain_id, startResSpec.res_no, startResSpec.res_no, 5000, true)
            updateScores(residueSelection.molecule)
        }
        clearSelection()
    }, [clearSelection, residueSelection])

    const handleDelete = useCallback(async () => {
        let cid: string
        
        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            cid = residueSelection.cid.join('||')
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
        }

        if (cid) {
            const result = await residueSelection.molecule.deleteCid(cid, true)
            if (result.second < 1) {
                console.log('Empty molecule detected, deleting it now...')
                await residueSelection.molecule.delete()
                dispatch(removeMolecule(residueSelection.molecule))
            }
            updateScores(residueSelection.molecule)
        }

        clearSelection()
    }, [residueSelection, clearSelection])

    const handleExpandSelection = useCallback(async () => {
        let cid: string
        
        if (residueSelection.isMultiCid) {
            // pass
        } else if (residueSelection.molecule && residueSelection.cid) {
            cid = residueSelection.cid as string
            const startResSpec = cidToSpec(residueSelection.first)
            const stopResSpec = cidToSpec(residueSelection.second)
            const sortedResNums = [startResSpec.res_no, stopResSpec.res_no].sort(function(a, b){return a - b})
            setSelectionLabel(`/${startResSpec.mol_no}/${startResSpec.chain_id}/${sortedResNums[0]}-${sortedResNums[1]} +7Å`)
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            cid = `/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
            setSelectionLabel(`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no} +7Å`)
        }

        if (cid) {
            const result = await residueSelection.molecule.getNeighborResiduesCids(cid, 7)
            await residueSelection.molecule.drawResidueSelection(result.join('||'))
            dispatch(
                setResidueSelection({
                    molecule: residueSelection.molecule,
                    first: residueSelection.first,
                    second: residueSelection.second,
                    cid: result,
                    isMultiCid: true
                })
            )
        }
    }, [residueSelection, clearSelection])

    const handleColourChange = useCallback(async () => {
        let newColourRules: moorhen.ColourRule[] = []

        if (residueSelection.isMultiCid && Array.isArray(residueSelection.cid)) {
            residueSelection.cid.forEach(cid => newColourRules.push({
                args: [cid, selectedColour],
                isMultiColourRule: false,
                ruleType: 'cid',
                color: selectedColour,
                label: cid,
            }))
        } else if (residueSelection.molecule && residueSelection.cid) {
            newColourRules.push({
                args: [residueSelection.cid as string, selectedColour],
                isMultiColourRule: false,
                ruleType: 'cid',
                color: selectedColour,
                label: residueSelection.cid as string,
            })
        } else if (residueSelection.molecule && residueSelection.first) {
            const startResSpec = cidToSpec(residueSelection.first)
            const cid =`/${startResSpec.mol_no}/${startResSpec.chain_id}/${startResSpec.res_no}-${startResSpec.res_no}`
            newColourRules.push({
                args: [cid as string, selectedColour],
                isMultiColourRule: false,
                ruleType: 'cid',
                color: selectedColour,
                label: cid as string,
            })
        }

        newColourRules.forEach((newColourRule, idx) => {
            residueSelection.molecule.defaultColourRules.push(newColourRule)
            if (idx === newColourRules.length - 1) {
                residueSelection.molecule.redraw()
            }
        })

        setShowColourPopover(false)

    }, [residueSelection, clearSelection, selectedColour])

    return  selectionLabel ?
        <MoorhenNotification key={notificationKeyRef.current} width={19}>
            <Tooltip className="moorhen-tooltip" title={tooltipContents}>
            <Stack ref={notificationComponentRef} direction="vertical" gap={1}>
                <div>
                    <span>{selectionLabel}</span>
                </div>
                <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <IconButton onClick={handleRefinement} onMouseEnter={() => setTooltipContents('Refine')}>
                        <CrisisAlertOutlined/>
                    </IconButton>
                    <IconButton onClick={handleDelete} onMouseEnter={() => setTooltipContents('Delete')}>
                        <DeleteOutlined/>
                    </IconButton>
                    <IconButton onClick={handleSelectionCopy} onMouseEnter={() => setTooltipContents('Copy fragment')}>
                        <CopyAllOutlined/>
                    </IconButton>
                    <IconButton onClick={handleExpandSelection} onMouseEnter={() => setTooltipContents('Expand to neighbouring residues')}>
                        <AllOutOutlined/>
                    </IconButton>
                    <IconButton ref={changeColourAnchorRef} onClick={() => setShowColourPopover(true)} onMouseEnter={() => setTooltipContents('Change colour')}>
                        <FormatColorFillOutlined/>
                    </IconButton>
                    <IconButton onClick={clearSelection} onMouseEnter={() => setTooltipContents('Clear selection')}>
                        <CloseOutlined/>
                    </IconButton>
                </Stack>
            <Popover 
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                open={showColourPopover}
                anchorEl={changeColourAnchorRef.current}
                onClose={() => setShowColourPopover(false)}
                sx={{
                    '& .MuiPaper-root': {
                        overflowY: 'hidden', borderRadius: '8px'
                    }
                }}>
                <Stack gap={3} direction='horizontal'>
                    <div style={{width: '100%', textAlign: 'center'}}>
                        <HexColorPicker style={{padding: '0.05rem'}} color={selectedColour} onChange={(color) => setSelectedColour(color)}/>
                        <Button size="sm" variant="primary" style={{width: '80%', margin: '0.25rem'}} onClick={handleColourChange}>Apply</Button>
                    </div>
                </Stack>
            </Popover>
            </Stack>
            </Tooltip>
        </MoorhenNotification>
    : null
}