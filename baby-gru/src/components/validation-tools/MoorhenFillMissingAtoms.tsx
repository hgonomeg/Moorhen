import { Col, Row, Card, Button } from 'react-bootstrap';
import { MoorhenValidationListWidgetBase } from "./MoorhenValidationListWidgetBase";
import { moorhen } from "../../types/moorhen";
import { libcootApi } from '../../types/libcoot';
import { useDispatch, useSelector } from 'react-redux';
import { triggerScoresUpdate } from '../../store/connectedMapsSlice';
import { useCallback } from 'react';
import { MoorhenResidueSteps } from '../misc/MoorhenResidueSteps';
import { setNotificationContent } from '../../store/generalStatesSlice';
import { cidToSpec, sleep } from '../../utils/MoorhenUtils';
import { setShowFillPartialResValidationModal } from '../../store/activeModalsSlice';

interface Props extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
}

export const MoorhenFillMissingAtoms = (props: Props) => {
    const dispatch = useDispatch()
    const enableRefineAfterMod = useSelector((state: moorhen.State) => state.miscAppSettings.enableRefineAfterMod)
    const molecules = useSelector((state: moorhen.State) => state.molecules)

    const fillPartialResidue = async (selectedMolecule: moorhen.Molecule, chainId: string, resNum: number, insCode: string) => {
        await props.commandCentre.current.cootCommand({
            returnType: "status",
            command: "fill_partial_residue",
            commandArgs: [selectedMolecule.molNo, chainId, resNum, insCode],
            changesMolecules: [selectedMolecule.molNo]
        }, true)

        if (enableRefineAfterMod) {
            await props.commandCentre.current.cootCommand({
                returnType: "status",
                command: 'refine_residues_using_atom_cid',
                commandArgs: [selectedMolecule.molNo, `//${chainId}/${resNum}`, 'TRIPLE', 4000],
                changesMolecules: [selectedMolecule.molNo]
            }, true)    
        }
        selectedMolecule.setAtomsDirty(true)
        await selectedMolecule.redraw()
        dispatch( triggerScoresUpdate(selectedMolecule.molNo) )
    }

    const handleAtomFill = (...args: [moorhen.Molecule, string, number, string]) => {
        if (args.every(arg => arg !== null)) {
            fillPartialResidue(...args)
        }
    }

    async function fetchCardData(selectedModel: number, selectedMap: number): Promise<libcootApi.ResidueSpecJS[]> {
        const inputData = {
            message: 'coot_command',
            command: 'residues_with_missing_atoms',
            returnType: 'residue_specs',
            commandArgs: [selectedModel]
        }

        let response = await props.commandCentre.current.cootCommand(inputData, false) as moorhen.WorkerResponse<libcootApi.ResidueSpecJS[]>
        let newResidueList = response.data.result.result
        return newResidueList
    }

    const handleFillAll = useCallback((selectedMolecule: moorhen.Molecule, residues: libcootApi.ResidueSpecJS[]) => {
        dispatch( setShowFillPartialResValidationModal(false) )
        if (selectedMolecule) {
            const handleStepFillAtoms = async (cid: string) => {
                const resSpec = cidToSpec(cid)
                await selectedMolecule.centreAndAlignViewOn(cid, true)
                await sleep(1000)
                await fillPartialResidue(selectedMolecule, resSpec.chain_id, resSpec.res_no, resSpec.ins_code)
            }

            const residueList = residues.map(residue => {
                return {
                    cid: `//${residue.chainId}/${residue.resNum}/`
                }
            })
        
            dispatch( setNotificationContent(
                <MoorhenResidueSteps 
                    timeCapsuleRef={props.timeCapsuleRef}
                    residueList={residueList}
                    sleepTime={1500}
                    onStep={handleStepFillAtoms}
                    onStart={async () => {
                        await selectedMolecule.fetchIfDirtyAndDraw('rotamer')
                    }}
                    onStop={() => {
                        selectedMolecule.clearBuffersOfStyle('rotamer')
                    }}
                />
            ))
        }
    }, [molecules])

    const getCards = useCallback((selectedModel: number, selectedMap: number, residueList: libcootApi.ResidueSpecJS[]) => {
        const selectedMolecule =  molecules.find(molecule => molecule.molNo === selectedModel)
        
        let cards = residueList.map(residue => {
            const label = `/${residue.modelNumber}/${residue.chainId}/${residue.resNum}${residue.insCode ? '.' + residue.insCode : ''}/`
            return <Card style={{marginTop: '0.5rem'}} key={label}>
                    <Card.Body style={{padding:'0.5rem'}}>
                        <Row style={{display:'flex', justifyContent:'between'}}>
                            <Col style={{alignItems:'center', justifyContent:'left', display:'flex'}}>
                                {label}
                            </Col>
                            <Col className='col-3' style={{margin: '0', padding:'0', justifyContent: 'right', display:'flex'}}>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => selectedMolecule.centreAndAlignViewOn(`//${residue.chainId}/${residue.resNum}-${residue.resNum}/`, true)}>
                                    View
                                </Button>
                                <Button style={{marginRight:'0.5rem'}} onClick={() => {
                                    handleAtomFill(selectedMolecule, residue.chainId, residue.resNum, residue.insCode)
                                }}>
                                    Fill
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
        })
        if (cards.length > 0) {
            const button = <Button style={{width: '100%'}} onClick={() => handleFillAll(selectedMolecule, residueList)} key='fill-all-button'>
                Fill all
            </Button>
            cards = [button, ...cards]
        }
        return cards
    }, [molecules])

    return <MoorhenValidationListWidgetBase 
                sideBarWidth={props.sideBarWidth}
                dropdownId={props.dropdownId}
                accordionDropdownId={props.accordionDropdownId}
                showSideBar={props.showSideBar}
                enableMapSelect={false}
                fetchData={fetchCardData}
                getCards={getCards}
            />
}
