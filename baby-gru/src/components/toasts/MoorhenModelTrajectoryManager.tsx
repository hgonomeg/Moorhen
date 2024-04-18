import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MoorhenNotification } from '../misc/MoorhenNotification';
import { useDispatch, useSelector } from 'react-redux';
import { MoorhenMoleculeRepresentation } from "../../utils/MoorhenMoleculeRepresentation";
import { sleep } from "../../utils/MoorhenUtils";
import { hideMolecule, showMolecule } from "../../store/moleculesSlice";
import { moorhen } from '../../types/moorhen';
import { webGL } from '../../types/mgWebGL';
import { IconButton, LinearProgress, Slider } from "@mui/material";
import { Stack } from "react-bootstrap";
import { PauseCircleOutline, PlayCircleOutline, ReplayCircleFilledOutlined, StopCircleOutlined } from "@mui/icons-material";
import { setIsAnimatingTrajectory } from "../../store/generalStatesSlice";
import { setModelTrajectoryPopUpParams, setShowModelTrajectoryPopUp } from "../../store/activePopUpsSlice";

export const MoorhenModelTrajectoryManager = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()

    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)
    const moleculeMolNo = useSelector((state: moorhen.State) => state.activePopUps.modelTrajectoryPopUp.moleculeMolNo)
    const representationStyle = useSelector((state: moorhen.State) => state.activePopUps.modelTrajectoryPopUp.representationStyle) as moorhen.RepresentationStyles

    const isPlayingAnimationRef = useRef<boolean>(false)
    const representationRef = useRef<null | moorhen.MoleculeRepresentation>(null)
    const framesRef = useRef<null | moorhen.DisplayObject[][]>([])
    const iFrameRef = useRef<number>(0)
    
    const [busyComputingFrames, setBusyComputingFrames] = useState<boolean>(false)
    const [nFrames, setNFrames] = useState<number>(0)
    const [progress, setProgress] = useState<number>(0)
    const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0)
    const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false)

    const selectedMolecule = useMemo(() => molecules.find(molecule => molecule.molNo === moleculeMolNo), [moleculeMolNo])

    const computeFrames = async (molecule: moorhen.Molecule, representation: moorhen.MoleculeRepresentation) => {
        
        let frames: moorhen.DisplayObject[][] = []
        const multiModelMolecules = await molecule.splitMultiModels(false)

        const nSteps = multiModelMolecules.length
        const stepPercent = nSteps / 50
        const singleStepPercent = 1 / stepPercent

        for (let iMolecule of multiModelMolecules) {
            iMolecule.setAtomsDirty(true)
            await iMolecule.updateAtoms()
            representation.setParentMolecule(iMolecule)
            representation.setColourRules(molecule.defaultColourRules)
            await representation.applyColourRules()
            const meshObjects = await representation.getBufferObjects()
            frames.push(meshObjects)
            setProgress((prev) => prev + singleStepPercent)
        }

        return frames
    }

    const playAnimation = useCallback(async () => {
        if (isPlayingAnimation && iFrameRef.current === framesRef.current.length) {
            setCurrentFrameIndex(0)
            iFrameRef.current = 0
        } else if (isPlayingAnimation) {
            isPlayingAnimationRef.current = false
            setIsPlayingAnimation(false)
        } else {
            isPlayingAnimationRef.current = true
            setIsPlayingAnimation(true)
        }

        if (isPlayingAnimationRef.current) {
            const nSteps = framesRef.current.length
            const stepPercent = nSteps / 100
            const singleStepPercent = 1 / stepPercent
       
            while (iFrameRef.current < framesRef.current.length) {
                representationRef.current.deleteBuffers()
                await representationRef.current.buildBuffers(framesRef.current[iFrameRef.current])
                setCurrentFrameIndex((prev) => prev + singleStepPercent)
                await sleep(5)
                iFrameRef.current += 1
                if (!isPlayingAnimationRef.current) {
                    break
                }
            }
        }

    }, [isPlayingAnimation, selectedMolecule])

    useEffect(() => {
        const loadFrames = async () => {
            dispatch(setIsAnimatingTrajectory(true))
            representationRef.current = new MoorhenMoleculeRepresentation(representationStyle, '/*/*/*/*', props.commandCentre, props.glRef)
            setBusyComputingFrames(true)
            framesRef.current = await computeFrames(selectedMolecule, representationRef.current)
            setNFrames(framesRef.current.length)
            setBusyComputingFrames(false)
            dispatch(hideMolecule(selectedMolecule))
            await representationRef.current.buildBuffers(framesRef.current[0])    
        }
        loadFrames()
    }, [])

    return  <MoorhenNotification width={18} placeOnTop={false}>
        {busyComputingFrames ?
            <Stack gap={1} direction='vertical'>
            <span>Please wait...</span>
            <LinearProgress variant="determinate" value={progress}/>
        </Stack>
        : nFrames > 0 ?
        <Stack gap={1} direction='vertical'>
            <div style={{display: 'flex', justifyContent: 'center'}}>
            <IconButton onClick={playAnimation}>
                {iFrameRef.current === framesRef.current.length - 1 ? <ReplayCircleFilledOutlined/> : isPlayingAnimation ? <PauseCircleOutline/> : <PlayCircleOutline/>}
            </IconButton>
            <IconButton onClick={() => {
                isPlayingAnimationRef.current = false
                setIsPlayingAnimation(false)
                representationRef.current?.deleteBuffers()
                dispatch(showMolecule(selectedMolecule))
                dispatch(setIsAnimatingTrajectory(false))
                dispatch( setModelTrajectoryPopUpParams({
                    representationStyle: null,
                    moleculeMolNo: null,
                    show: true
                }))
            }}>
                <StopCircleOutlined/>
            </IconButton>
            </div>
            <Slider
                size="small"
                defaultValue={0}
                value={currentFrameIndex}
                onChange={(evt, newVal) => {
                    if (isPlayingAnimationRef.current && iFrameRef.current === framesRef.current.length) {
                        isPlayingAnimationRef.current = false
                        setIsPlayingAnimation(false)            
                    }
                    iFrameRef.current = Math.floor((newVal as number) * framesRef.current.length / 100)
                    representationRef.current.deleteBuffers()
                    if (iFrameRef.current < framesRef.current.length) {
                        representationRef.current.buildBuffers(framesRef.current[iFrameRef.current]).then(_ => setCurrentFrameIndex(newVal as number))
                    }
                }}
            />
        </Stack>
        :
        <span>Something went wrong...</span>
        }
    </MoorhenNotification>
}