import { useEffect, useState, useRef, useReducer, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Card, Row, Col, Stack, Button, Spinner } from "react-bootstrap";
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { convertRemToPx, convertViewtoPx, getCentreAtom, representationLabelMapping } from '../../utils/MoorhenUtils';
import { isDarkBackground } from '../../WebGLgComponents/mgWebGL'
import { MoorhenSequenceList } from "../list/MoorhenSequenceList";
import { MoorhenMoleculeCardButtonBar } from "../button-bar/MoorhenMoleculeCardButtonBar"
import { MoorhenLigandList } from "../list/MoorhenLigandList"
import { Chip, FormGroup } from "@mui/material";
import { getNameLabel } from "./cardUtils"
import { AddOutlined, DeleteOutlined, FormatColorFillOutlined, SettingsOutlined, EditOutlined, ExpandMoreOutlined } from '@mui/icons-material';
import { MoorhenAddCustomRepresentationCard } from "./MoorhenAddCustomRepresentationCard"
import { MoorhenMoleculeRepresentationSettingsCard } from "./MoorhenMoleculeRepresentationSettingsCard"
import { MoorhenModifyColourRulesCard } from './MoorhenModifyColourRulesCard';
import { useSelector, useDispatch } from 'react-redux';
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { addMolecule, removeCustomRepresentation, showMolecule } from '../../store/moleculesSlice';
import { triggerUpdate } from '../../store/moleculeMapUpdateSlice';
import { MoorhenHeaderInfoCard } from './MoorhenHeaderInfoCard';
import { MoorhenCarbohydrateList } from "../list/MoorhenCarbohydrateList";
import { MoorhenColourRule } from '../../utils/MoorhenColourRule';

const allRepresentations = [ 'CBs', 'adaptativeBonds', 'CAs', 'CRs', 'ligands', 'gaussian', 'MolecularSurface', 'DishyBases', 'VdwSpheres', 'rama', 'rotamer', 'CDs', 'allHBonds','glycoBlocks', 'restraints' ]

interface MoorhenMoleculeCardPropsInterface extends moorhen.CollectedProps {
    dropdownId: number;
    accordionDropdownId: number;
    setAccordionDropdownId: React.Dispatch<React.SetStateAction<number>>;
    sideBarWidth: number;
    showSideBar: boolean;
    busy: boolean;
    key: number;
    index: number;
    molecule: moorhen.Molecule;
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
}

const initialShowState: {[key: string]: boolean} = {}
const showStateReducer = (oldMap: {[key: string]: boolean}, change: { key: string; state: boolean; }) => {
    const newMap = { ...oldMap }
    newMap[change.key] = change.state
    return newMap
}

export type clickedResidueType = {
    modelIndex: number;
    molName: string;
    chain: string;
    seqNum: number;
}

export const MoorhenMoleculeCard = forwardRef<any, MoorhenMoleculeCardPropsInterface>((props, cardRef) => {
    const dispatch = useDispatch()
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const defaultExpandDisplayCards = useSelector((state: moorhen.State) => state.miscAppSettings.defaultExpandDisplayCards)
    const drawMissingLoops = useSelector((state: moorhen.State) => state.sceneSettings.drawMissingLoops)
    const userPreferencesMounted = useSelector((state: moorhen.State) => state.generalStates.userPreferencesMounted)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)
    const isVisible = useSelector((state: moorhen.State) => state.molecules.visibleMolecules.includes(props.molecule.molNo))
    const customRepresentationsString = useSelector((state: moorhen.State) => {
        return JSON.stringify(
            state.molecules.customRepresentations.filter(item => item.parentMolecule?.molNo === props.molecule.molNo).map(item => item.uniqueId)
        )
    })

    const addColourRulesAnchorDivRef = useRef<HTMLDivElement | null>(null)
    const busyRedrawing = useRef<boolean>(false)
    const isDirty = useRef<boolean>(false)
    const innerDrawMissingLoopsRef = useRef<boolean>(null)
    
    const [busyLoadingSequences, setBusyLoadingSequences] = useState<boolean>(false)
    const [busyLoadingLigands, setBusyLoadingLigands] = useState<boolean>(false)
    const [busyLoadingCarbohydrates, setBusyLoadingCarbohydrates] = useState<boolean>(false)
    const [showHeaderInfo, setShowHeaderInfo] = useState<boolean>(false)
    const [showColourRulesModal, setShowColourRulesModal] = useState<boolean>(false)
    const [showCreateCustomRepresentation, setShowCreateCustomRepresentation] = useState<boolean>(false)
    const [showCreateRepresentationSettingsModal, setShowCreateRepresentationSettingsModal] = useState<boolean>(false)
    const [showState, changeShowState] = useReducer(showStateReducer, initialShowState)
    const [selectedResidues, setSelectedResidues] = useState<[number, number] | null>(null);
    const [clickedResidue, setClickedResidue] = useState<clickedResidueType | null>(null);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(!defaultExpandDisplayCards);
    const [bondWidth, setBondWidth] = useState<number>(props.molecule.defaultBondOptions.width)
    const [atomRadiusBondRatio, setAtomRadiusBondRatio] = useState<number>(props.molecule.defaultBondOptions.atomRadiusBondRatio)
    const [bondSmoothness, setBondSmoothness] = useState<number>(props.molecule.defaultBondOptions.smoothness === 1 ? 1 : props.molecule.defaultBondOptions.smoothness === 2 ? 50 : 100)
    const [surfaceSigma, setSurfaceSigma] = useState<number>(4.4)
    const [surfaceLevel, setSurfaceLevel] = useState<number>(4.0)
    const [surfaceRadius, setSurfaceRadius] = useState<number>(5.0)
    const [surfaceGridScale, setSurfaceGridScale] = useState<number>(0.7)
    const [surfaceBFactor, setSurfaceBFactor] = useState<number>(100)
    const [symmetryRadius, setSymmetryRadius] = useState<number>(25.0)

    const customRepresentationList: moorhen.MoleculeRepresentation[] = useMemo(() => {
        return JSON.parse(customRepresentationsString).map(representationId => {
            return props.molecule.representations.find(item => item.uniqueId === representationId)
        })
    }, [customRepresentationsString])

    useImperativeHandle(cardRef, () => ({
        forceIsCollapsed: (value: boolean) => { 
            setIsCollapsed(value)
         }
    }), 
    [setIsCollapsed])

    const bondSettingsProps = {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness
    }

    const symmetrySettingsProps = {
        symmetryRadius, setSymmetryRadius
    }

    const gaussianSettingsProps = {
        surfaceSigma, setSurfaceSigma, surfaceLevel, setSurfaceLevel, surfaceBFactor,
        setSurfaceBFactor, surfaceRadius, setSurfaceRadius, surfaceGridScale, setSurfaceGridScale
    }

    const redrawMolIfDirty = async (representationIds: string[]) => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            for (let id of representationIds) {
                await props.molecule.redrawRepresentation(id)
            }
            busyRedrawing.current = false
            redrawMolIfDirty(representationIds)
        }
    }
    
    const redrawOriginRepresentations = useCallback(async () => {
        if (isDirty.current) {
            busyRedrawing.current = true
            isDirty.current = false
            if (props.molecule.adaptativeBondsEnabled) {
                const [molecule, residueCid] = await getCentreAtom(molecules, props.commandCentre, props.glRef)
                if (molecule.molNo === props.molecule.molNo) {
                    await props.molecule.redrawAdaptativeBonds(residueCid, 10)
                }    
            }
            await props.molecule.drawSymmetry()
            busyRedrawing.current = false
            redrawOriginRepresentations()
        }
    }, [molecules, props.molecule])

    const handleOriginUpdate = useCallback(() => {
        isDirty.current = true
        if (!busyRedrawing.current && isVisible) {
            redrawOriginRepresentations()
        }

    }, [redrawOriginRepresentations, isVisible])

    useEffect(() => {
        if (!userPreferencesMounted || drawMissingLoops === null) {
            return
        } else if (innerDrawMissingLoopsRef.current === null) {
            innerDrawMissingLoopsRef.current = drawMissingLoops
            return
        } else if (innerDrawMissingLoopsRef.current !== drawMissingLoops) {
            innerDrawMissingLoopsRef.current = drawMissingLoops
            const representations = props.molecule.representations.filter(representation => representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))
            if (isVisible && representations.length > 0) {
                isDirty.current = true
                if (!busyRedrawing.current) {
                    redrawMolIfDirty(representations.map(representation => representation.uniqueId))
                }
            }
        }
    }, [drawMissingLoops])

    useEffect(() => {
        if (backgroundColor === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && ['CBs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0) {
            const newBackgroundIsDark = isDarkBackground(...backgroundColor)
            if (props.molecule.isDarkBackground !== newBackgroundIsDark) {
                props.molecule.isDarkBackground = newBackgroundIsDark
                isDirty.current = true
                if (!busyRedrawing.current) {
                    redrawMolIfDirty(representations.map(representation => representation.uniqueId))
                }
            }
        }

    }, [backgroundColor, showState]);

    useEffect(() => {
        if (bondSmoothness === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultBondOptions && representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0 && props.molecule.defaultBondOptions.smoothness !== bondSmoothness) {
            props.molecule.defaultBondOptions.smoothness = bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.defaultBondOptions.smoothness = bondSmoothness === 1 ? 1 : bondSmoothness === 50 ? 2 : 3
        }

    }, [bondSmoothness]);

    useEffect(() => {
        if (bondWidth === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultBondOptions && representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0 && props.molecule.defaultBondOptions.width !== bondWidth) {
            props.molecule.defaultBondOptions.width = bondWidth
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.defaultBondOptions.width = bondWidth
        }

    }, [bondWidth]);

    useEffect(() => {
        if (atomRadiusBondRatio === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.useDefaultBondOptions && representation.visible && ['CBs', 'CAs', 'ligands'].includes(representation.style))

        if (isVisible && representations.length > 0 && props.molecule.defaultBondOptions.atomRadiusBondRatio !== atomRadiusBondRatio) {
            props.molecule.defaultBondOptions.atomRadiusBondRatio = atomRadiusBondRatio
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.defaultBondOptions.atomRadiusBondRatio = atomRadiusBondRatio
        }

    }, [atomRadiusBondRatio]);


    useEffect(() => {
        if (symmetryRadius === null) {
            return
        }
        props.molecule.setSymmetryRadius(symmetryRadius)
    }, [symmetryRadius]);

    useEffect(() => {
        if (surfaceSigma === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.sigma !== surfaceSigma) {
            props.molecule.gaussianSurfaceSettings.sigma = surfaceSigma
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.sigma = surfaceSigma
        }

    }, [surfaceSigma]);

    useEffect(() => {
        if (surfaceLevel === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.countourLevel !== surfaceLevel) {
            props.molecule.gaussianSurfaceSettings.countourLevel = surfaceLevel
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.countourLevel = surfaceLevel
        }

    }, [surfaceLevel]);

    useEffect(() => {
        if (surfaceRadius === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.boxRadius !== surfaceRadius) {
            props.molecule.gaussianSurfaceSettings.boxRadius = surfaceRadius
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.boxRadius = surfaceRadius
        }

    }, [surfaceRadius]);

    useEffect(() => {
        if (surfaceGridScale === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.gridScale !== surfaceGridScale) {
            props.molecule.gaussianSurfaceSettings.gridScale = surfaceGridScale
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.gridScale = surfaceGridScale
        }

    }, [surfaceGridScale]);

    useEffect(() => {
        if (surfaceBFactor === null) {
            return
        }

        const representations = props.molecule.representations.filter(representation => representation.visible && representation.style === 'gaussian')

        if (isVisible && representations.length > 0 && props.molecule.gaussianSurfaceSettings.bFactor !== surfaceBFactor) {
            props.molecule.gaussianSurfaceSettings.bFactor = surfaceBFactor
            isDirty.current = true
            if (!busyRedrawing.current) {
                redrawMolIfDirty(representations.map(representation => representation.uniqueId))
            }
        } else {
            props.molecule.gaussianSurfaceSettings.bFactor = surfaceBFactor
        }

    }, [surfaceBFactor]);

    useEffect(() => {
        dispatch( showMolecule(props.molecule) )
        props.molecule.representations
            .filter(item => { return !item.isCustom && item.style !== 'hover' })
            .forEach(item => {
                const displayObjects = item.buffers
                changeShowState({
                    key: item.style, state: displayObjects.length > 0 && displayObjects[0].visible
                })
            })
    }, []);
    
    useEffect(() => {
        if (isVisible) {
            props.molecule.representations.forEach(item => showState[item.style] ? item.show() : null)
        } else {
            props.molecule.representations.forEach(item => showState[item.style] ? item.hide() : null)
        }
    }, [isVisible])

    useEffect(() => {
        if (!clickedResidue) {
            return
        }

        props.molecule.centreOn(`/*/${clickedResidue.chain}/${clickedResidue.seqNum}-${clickedResidue.seqNum}/*`)

    }, [clickedResidue])

    useEffect(() => {
        document.addEventListener("originUpdate", handleOriginUpdate);
        return () => {
            document.removeEventListener("originUpdate", handleOriginUpdate);
        };

    }, [handleOriginUpdate])
 
    const handleDownload = async () => {
        await props.molecule.downloadAtoms()
        props.setCurrentDropdownMolNo(-1)
    }

    const handleCopyFragment = () => {
        async function createNewFragmentMolecule() {
            const cid =  `//${clickedResidue.chain}/${selectedResidues[0]}-${selectedResidues[1]}/*`
            const newMolecule = await props.molecule.copyFragmentUsingCid(cid, true)
            dispatch( addMolecule(newMolecule) )
        }

        // TODO: Test that residue start and residue end are valid (i.e. not missing from the structure)
        if (clickedResidue && selectedResidues) {
            createNewFragmentMolecule()
        }
        props.setCurrentDropdownMolNo(-1)
    }

    const handleUndo = async () => {
        await props.molecule.undo()
        props.setCurrentDropdownMolNo(-1)
        dispatch( triggerUpdate(props.molecule.molNo) )
    }

    const handleRedo = async () => {
        await props.molecule.redo()
        props.setCurrentDropdownMolNo(-1)
        dispatch( triggerUpdate(props.molecule.molNo) )
    }

    const handleCentering = () => {
        props.molecule.centreOn()
        props.setCurrentDropdownMolNo(-1)
    }

    const handleShowInfo = () => {
        setShowHeaderInfo(true)
    }

    const handleProps = { handleCentering, handleCopyFragment, handleDownload, handleRedo, handleUndo, handleShowInfo }

    return <><Card ref={cardRef} className="px-0" style={{ marginBottom: '0.5rem', padding: '0' }} key={props.molecule.molNo}>
        <Card.Header style={{ padding: '0.1rem' }}>
            <Stack gap={2} direction='horizontal'>
                <Col className='align-items-center' style={{ display: 'flex', justifyContent: 'left', color: isDark ? 'white' : 'black'}}>
                    {getNameLabel(props.molecule)}
                </Col>
                <Col style={{ display: 'flex', justifyContent: 'right' }}>
                    <MoorhenMoleculeCardButtonBar
                        molecule={props.molecule}
                        glRef={props.glRef}
                        sideBarWidth={props.sideBarWidth}
                        isCollapsed={isCollapsed}
                        setIsCollapsed={setIsCollapsed}
                        clickedResidue={clickedResidue}
                        selectedResidues={selectedResidues}
                        currentDropdownMolNo={props.currentDropdownMolNo}
                        setCurrentDropdownMolNo={props.setCurrentDropdownMolNo}
                        {...handleProps}
                    />
                </Col>
            </Stack>
        </Card.Header>
        <Card.Body style={{ display: isCollapsed ? 'none' : '', padding: '0.25rem', justifyContent:'center' }}>
            <Stack gap={2} direction='vertical'>
                <Row style={{display: 'flex'}}>
                    <Col style={{ display: 'flex' }}>
                        <div ref={addColourRulesAnchorDivRef} style={{ margin: '1px', paddingTop: '0.25rem', paddingBottom: '0.25rem',  border: '1px solid', borderRadius:'0.33rem', borderColor: "#CCC" }}>
                            <FormGroup style={{ margin: "0px", padding: "0px", display: 'flex', justifyContent: 'center'}} row>
                                {allRepresentations.map(key => 
                                    <RepresentationCheckbox
                                        key={key}
                                        repKey={key}
                                        glRef={props.glRef}
                                        changeShowState={changeShowState}
                                        molecule={props.molecule}
                                        isVisible={isVisible}
                                        showState={showState}
                                />)}
                            </FormGroup>
                            <hr style={{ marginTop: '0.5rem', marginBottom: "0.5rem", marginLeft: '0.5rem', marginRight: '0.5rem' }}></hr>
                            {props.molecule.representations.some(representation => representation.isCustom) ?
                                <FormGroup style={{ margin: "0px", padding: "0px" }} row>
                                    {customRepresentationList.filter(representation => representation !== undefined).map(representation => {
                                        return <CustomRepresentationChip
                                                    key={representation.uniqueId}
                                                    urlPrefix={props.urlPrefix}
                                                    glRef={props.glRef}
                                                    addColourRulesAnchorDivRef={addColourRulesAnchorDivRef}
                                                    molecule={props.molecule}
                                                    representation={representation}/>
                                    })}
                                </FormGroup>
                            :
                                <span>No custom representations</span>
                            }
                        </div>
                    </Col>
                    <Col md='auto' style={{paddingLeft: 0, justifyContent: 'center', display: 'flex'}} >
                        <Stack gap={1} direction='vertical'>
                        <Button style={{height: '100%'}} variant='light' onClick={() => setShowColourRulesModal((prev) => { return !prev })}>
                            <FormatColorFillOutlined/>
                        </Button>
                        <Button style={{height: '100%'}} variant='light' onClick={() => setShowCreateRepresentationSettingsModal((prev) => { return !prev })}>
                            <SettingsOutlined/>
                        </Button>
                        <Button style={{ height: '100%' }} variant='light' onClick={() => setShowCreateCustomRepresentation((prev) => {return !prev})}>
                            <AddOutlined/>
                        </Button>
                        </Stack>
                    </Col>
                    <MoorhenHeaderInfoCard anchorEl={addColourRulesAnchorDivRef} molecule={props.molecule} show={showHeaderInfo} setShow={setShowHeaderInfo}/>
                    <MoorhenMoleculeRepresentationSettingsCard symmetrySettingsProps={symmetrySettingsProps} gaussianSettingsProps={gaussianSettingsProps} bondSettingsProps={bondSettingsProps} glRef={props.glRef} urlPrefix={props.urlPrefix} molecule={props.molecule} anchorEl={addColourRulesAnchorDivRef} show={showCreateRepresentationSettingsModal} setShow={setShowCreateRepresentationSettingsModal}/>
                    <MoorhenModifyColourRulesCard anchorEl={addColourRulesAnchorDivRef} urlPrefix={props.urlPrefix} glRef={props.glRef} commandCentre={props.commandCentre} molecule={props.molecule} showColourRulesToast={showColourRulesModal} setShowColourRulesToast={setShowColourRulesModal}/>
                    <MoorhenAddCustomRepresentationCard glRef={props.glRef} urlPrefix={props.urlPrefix} molecule={props.molecule} anchorEl={addColourRulesAnchorDivRef} show={showCreateCustomRepresentation} setShow={setShowCreateCustomRepresentation}/>
                </Row>
            <div>
                <Accordion className="moorhen-accordion"  disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                        <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={busyLoadingSequences ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                            Sequences
                        </AccordionSummary>
                        <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                            <MoorhenSequenceList
                                setBusy={setBusyLoadingSequences}
                                molecule={props.molecule}
                                glRef={props.glRef}
                                clickedResidue={clickedResidue}
                                setClickedResidue={setClickedResidue}
                                selectedResidues={selectedResidues}
                                setSelectedResidues={setSelectedResidues}
                            />
                        </AccordionDetails>
                </Accordion>
                <Accordion className="moorhen-accordion" disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                    <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={busyLoadingLigands ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                        Ligands
                    </AccordionSummary>
                    <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                        <MoorhenLigandList setBusy={setBusyLoadingLigands} commandCentre={props.commandCentre} molecule={props.molecule} glRef={props.glRef} height={convertViewtoPx(40, height)}/>
                    </AccordionDetails>
                </Accordion>
                {props.molecule.hasGlycans && 
                <Accordion className="moorhen-accordion" disableGutters={true} elevation={0} TransitionProps={{ unmountOnExit: true }}>
                    <AccordionSummary style={{backgroundColor: isDark ? '#adb5bd' : '#ecf0f1'}} expandIcon={busyLoadingCarbohydrates ? <Spinner animation='border'/> : <ExpandMoreOutlined />} >
                        Carbohydrates
                    </AccordionSummary>
                    <AccordionDetails style={{padding: '0.2rem', backgroundColor: isDark ? '#ced5d6' : 'white'}}>
                        <MoorhenCarbohydrateList setBusy={setBusyLoadingCarbohydrates} commandCentre={props.commandCentre} molecule={props.molecule} glRef={props.glRef} height={convertViewtoPx(40, height)}/>
                    </AccordionDetails>
                </Accordion>            
                }
            </div>
            </Stack>
        </Card.Body>
    </Card >
    </>
})

const getChipStyle = (colourRules: moorhen.ColourRule[], repIsVisible: boolean, isDark: boolean, width?: string) => {
    const chipStyle = {
        marginLeft: '0.2rem',
        marginBottom: '0.2rem',
    }

    if (width) { 
        chipStyle['width'] = width 
    }

    if (isDark) {
        chipStyle['color'] = 'white'
    }

    let [r, g, b, _a]: number[] = [214, 214, 214, 1]
    if (colourRules?.length > 0) {
        if (colourRules[0].isMultiColourRule) {
            const alphaHex = repIsVisible ? '99' : '33'
            chipStyle['background'] = `linear-gradient( to right, #264CFF${alphaHex}, #3FA0FF${alphaHex}, #72D8FF${alphaHex}, #AAF7FF${alphaHex}, #E0FFFF${alphaHex}, #FFFFBF${alphaHex}, #FFE099${alphaHex}, #FFAD72${alphaHex}, #F76D5E${alphaHex}, #D82632${alphaHex}, #A50021${alphaHex} )`
        } else {
            [r, g, b, _a] = MoorhenColourRule.parseHexToRgba(colourRules[0].color)
            chipStyle['backgroundColor'] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`
        }        
    } else {
        chipStyle['backgroundColor'] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`
    }

    chipStyle['borderColor'] = `rgb(${r}, ${g}, ${b})`
    
    return chipStyle
}

const RepresentationCheckbox = (props: {
    showState: { [key: string]: boolean };
    repKey: string;
    isVisible: boolean;
    changeShowState: (arg0: { key: string; state: boolean; }) => void;
    molecule: moorhen.Molecule;
    glRef: React.RefObject<webGL.MGWebGL>; 
}) => {

    const [repState, setRepState] = useState<boolean>(false)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const chipStyle = getChipStyle(props.molecule.defaultColourRules, repState, isDark, `${convertRemToPx(9)}px`)
    const disabled: boolean = (
        !props.isVisible 
        || (props.repKey === 'ligands' && props.molecule.ligands.length === 0) 
        || (props.repKey === 'DishyBases' && !props.molecule.hasDNA) 
        || (props.repKey === 'glycoBlocks' && !props.molecule.hasGlycans)
        || (props.repKey === 'restraints' && props.molecule.restraints.length === 0)
        || (['rama', 'rotamer'].includes(props.repKey) && props.molecule.sequences.every(sequence => [3, 4, 5].includes(sequence.type)))
    )
    
    if (disabled) {
        chipStyle['opacity'] = '0.3'
    }

    useEffect(() => {
        setRepState(props.showState[props.repKey] || false)
    }, [props.showState])

    const handleClick = useCallback(() => {
        if (!disabled) {
            if (props.repKey === 'adaptativeBonds') {
                props.molecule.setDrawAdaptativeBonds(!repState)
            } else if (repState) {
                props.molecule.hide(props.repKey)
            } else {
                props.molecule.show(props.repKey)
            }
            props.changeShowState({ key: props.repKey, state: !repState })
        }
    }, [repState, disabled, props])

    return <Chip
                style={chipStyle}
                variant={"outlined"}
                label={`${representationLabelMapping[props.repKey]}`}
                onClick={handleClick}
            />
}

const CustomRepresentationChip = (props: {
    urlPrefix: string;
    addColourRulesAnchorDivRef: React.RefObject<HTMLDivElement>;
    glRef: React.RefObject<webGL.MGWebGL>;
    molecule: moorhen.Molecule;
    representation: moorhen.MoleculeRepresentation; 
}) => {
    
    const { representation, molecule } = props

    const [representationIsVisible, setRepresentationIsVisible] = useState<boolean>(true)
    const [showEditRepresentation, setShowEditRepresentation] = useState<boolean>(false)
    
    const dispatch = useDispatch()
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const isVisible = useSelector((state: moorhen.State) => state.molecules.visibleMolecules.some(molNo => molNo === molecule.molNo))

    const chipStyle = getChipStyle(representation.colourRules, representationIsVisible && isVisible, isDark)
    if (!isVisible) chipStyle['opacity'] = '0.3'

    useEffect(() => {
        if (!isVisible) {
            representation.hide()
        } else if (representationIsVisible) {
            representation.show()
        }
    }, [isVisible])
    
    useEffect(() => {
        representationIsVisible ? representation.show() : representation.hide()
    }, [representationIsVisible])

    const handleVisibility = useCallback(() => {
        if (isVisible) {
            setRepresentationIsVisible(!representationIsVisible)
        }
    }, [isVisible, representationIsVisible])

    const handleDelete = useCallback(() => {
        molecule.removeRepresentation(representation.uniqueId)
        dispatch( removeCustomRepresentation(representation) )
    }, [molecule, representation])

    return <Chip
        style={chipStyle}
        variant={"outlined"}
        label={`${representationLabelMapping[representation.style]} ${representation.cid.length > 21 ? `${representation.cid.slice(0,20)} ...` : representation.cid}`}
        deleteIcon={
            <div>
                <EditOutlined style={{color: isDark ? 'white' : '#696969'}} onClick={() => setShowEditRepresentation(true)}/>
                <DeleteOutlined style={{color: isDark ? 'white' : '#696969'}} onClick={handleDelete}/>
                <MoorhenAddCustomRepresentationCard
                    mode='edit'
                    representationId={props.representation.uniqueId}
                    glRef={props.glRef}
                    urlPrefix={props.urlPrefix}
                    molecule={props.molecule}
                    anchorEl={props.addColourRulesAnchorDivRef}
                    initialRepresentationStyleValue={props.representation.style}
                    initialRuleType='cid'
                    initialApplyColourToNonCarbonAtoms={(!props.representation.useDefaultColourRules && props.representation.colourRules?.length !== 0) ? props.representation.colourRules[0].applyColourToNonCarbonAtoms : false}
                    initialColour={(!props.representation.useDefaultColourRules && !props.representation.colourRules[0]?.isMultiColourRule) ? props.representation.colourRules[0].color : '#47d65f'}
                    initialAtomRadiusBondRatio={props.representation.bondOptions?.atomRadiusBondRatio}
                    initialBondWidth={props.representation.bondOptions?.width}
                    initialUseDefaultBondSettings={props.representation.useDefaultBondOptions}
                    initialUseDefaultColoursValue={props.representation.useDefaultColourRules}
                    initialCid={props.representation.cid}
                    show={showEditRepresentation}
                    setShow={setShowEditRepresentation}/>
            </div>
        }
        onClick={handleVisibility}
        onDelete={() => {}}
    />
}
