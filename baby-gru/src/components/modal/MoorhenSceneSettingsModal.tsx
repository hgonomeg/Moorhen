import { useState, useEffect, useRef } from "react";
import { MoorhenDraggableModalBase } from "./MoorhenDraggableModalBase";
import { useDispatch, useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx, rgbToHex } from "../../utils/MoorhenUtils";
import { MoorhenSlider } from "../misc/MoorhenSlider";
import { MoorhenLightPosition } from "../webMG/MoorhenLightPosition";
import { Form, InputGroup, Stack } from "react-bootstrap";
import { setBackgroundColor, setClipCap, setDepthBlurDepth, setDepthBlurRadius, setResetClippingFogging, setUseOffScreenBuffers } from "../../moorhen";
import { HexColorInput, RgbColorPicker } from "react-colorful";
import { CirclePicker } from "react-color"
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { hexToRgb } from "@mui/material";

const BackgroundColorPanel = (props: {}) => {
    
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor)
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const dispatch = useDispatch()

    const [innerBackgroundColor, setInnerBackgroundColor] = useState<{ r: number; g: number; b: number; }>({
        r: 255 * backgroundColor[0],
        g: 255 * backgroundColor[1],
        b: 255 * backgroundColor[2],
    })

    useEffect(() => {
        try {
            if (JSON.stringify(backgroundColor) !== JSON.stringify([innerBackgroundColor.r / 255., innerBackgroundColor.g / 255., innerBackgroundColor.b / 255., backgroundColor[3]])) {
                dispatch(
                    setBackgroundColor([ innerBackgroundColor.r / 255., innerBackgroundColor.g / 255., innerBackgroundColor.b / 255., backgroundColor[3] ])
                )
            }
        } catch (err) {
            console.log(err)
        }    
    }, [innerBackgroundColor])

    const handleCircleClick = (color: { rgb: { r: number; g: number; b: number; a: number; } }) => {
        try {
            setInnerBackgroundColor(color.rgb)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    const handleColorChange = (color: { r: number; g: number; b: number; }) => {
        try {
            setInnerBackgroundColor(color)
        }
        catch (err) {
            console.log('err', err)
        }
    }

    return <Stack gap={1} direction="vertical" style={{display: 'flex', justifyContent: 'center', width: '100%', height: '100%', padding: '0.5rem', borderStyle: 'solid', borderRadius: '0.5rem', borderColor: 'grey', borderWidth: '1px'}}>
        <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex'}}>
            <RgbColorPicker color={innerBackgroundColor} onChange={handleColorChange} />
        </div>
        <div style={{padding: '0.5rem', margin: '0.15rem', justifyContent: 'center', display: 'flex', backgroundColor: '#e3e1e1', borderRadius: '8px'}}>
            <CirclePicker onChange={handleCircleClick} color={innerBackgroundColor} colors={['#000000', '#5c5c5c', '#8a8a8a', '#cccccc', '#ffffff']}/>
        </div>
        <div style={{padding: 0, margin: 0, justifyContent: 'center', display: 'flex' }}>
            <div className="moorhen-hex-input-decorator">#</div>
            <HexColorInput className='moorhen-hex-input'
                color={rgbToHex(innerBackgroundColor.r, innerBackgroundColor.g, innerBackgroundColor.b)}
                onChange={(hex) => {
                    const [r, g, b] = hexToRgb(hex).replace('rgb(', '').replace(')', '').split(', ').map(item => parseFloat(item))
                    handleColorChange({r, g, b})
            }}/>
        </div>
    </Stack>
}

const DepthBlurPanel = (props: {

}) => {

    const dispatch = useDispatch()
    const useOffScreenBuffers = useSelector((state: moorhen.State) => state.sceneSettings.useOffScreenBuffers)
    const depthBlurDepth = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurDepth)
    const depthBlurRadius = useSelector((state: moorhen.State) => state.sceneSettings.depthBlurRadius)
    
    return <div style={{width: '100%', height: '100%', padding: '0.5rem', borderStyle: 'solid', borderRadius: '0.5rem', borderColor: 'grey', borderWidth: '1px'}}>
            <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false} sliderTitle="Blur depth" initialValue={depthBlurDepth} externalValue={depthBlurDepth} setExternalValue={(val: number) => dispatch(setDepthBlurDepth(val))}/>
            <MoorhenSlider minVal={2} maxVal={16} logScale={false} sliderTitle="Blur radius" initialValue={depthBlurRadius} externalValue={depthBlurRadius} allowFloats={false} setExternalValue={(val: number) => dispatch(setDepthBlurRadius(val))}/>
            <InputGroup className='moorhen-input-group-check'>
                <Form.Check 
                    type="switch"
                    checked={useOffScreenBuffers}
                    onChange={() => { dispatch(
                        setUseOffScreenBuffers(!useOffScreenBuffers)
                    )}}
                    label="Do Depth Blur"/>
            </InputGroup>
    </div>
}

const ClipFogPanel = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const dispatch = useDispatch()
    const [zclipFront, setZclipFront] = useState<number>(props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3])
    const [zclipBack, setZclipBack] = useState<number>(props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset)
    const [zfogFront, setZfogFront] = useState<number>(props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start)
    const [zfogBack, setZfogBack] = useState<number>(props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset)
    const clipCap = useSelector((state: moorhen.State) => state.sceneSettings.clipCap)
    const resetClippingFogging = useSelector((state: moorhen.State) => state.sceneSettings.resetClippingFogging)

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.gl_clipPlane0 && props.glRef.current.gl_clipPlane1) {
            setZclipFront(props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3])
            setZclipBack(props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset)
            setZfogFront(props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start)
            setZfogBack(props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset)
        }
    }, [props.glRef.current.gl_clipPlane1[3], props.glRef.current.gl_clipPlane0[3], props.glRef.current.gl_fog_start, props.glRef.current.gl_fog_end])

    return <div style={{width: '100%', height: '100%', padding: '0.5rem', borderStyle: 'solid', borderRadius: '0.5rem', borderColor: 'grey', borderWidth: '1px'}}>
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front clip"
            initialValue={props.glRef.current.fogClipOffset + props.glRef.current.gl_clipPlane0[3]}
            externalValue={zclipFront}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_clipPlane0[3] = newValue - props.glRef.current.fogClipOffset
                props.glRef.current.drawScene()
                setZclipFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back clip"
            initialValue={props.glRef.current.gl_clipPlane1[3] - props.glRef.current.fogClipOffset}
            externalValue={zclipBack}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_clipPlane1[3] = props.glRef.current.fogClipOffset + newValue
                props.glRef.current.drawScene()
                setZclipBack(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Front zFog"
            initialValue={props.glRef.current.fogClipOffset - props.glRef.current.gl_fog_start}
            externalValue={zfogFront}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_fog_start = props.glRef.current.fogClipOffset - newValue
                props.glRef.current.drawScene()
                setZfogFront(newValue)
            }} />
        <MoorhenSlider minVal={0.1} maxVal={1000} logScale={true}
            sliderTitle="Back zFog"
            externalValue={zfogBack}
            initialValue={props.glRef.current.gl_fog_end - props.glRef.current.fogClipOffset}
            setExternalValue={(newValue: number) => {
                props.glRef.current.gl_fog_end = newValue + props.glRef.current.fogClipOffset
                props.glRef.current.drawScene()
                setZfogBack(newValue)
            }} />
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={resetClippingFogging}
                onChange={() => { dispatch(
                    setResetClippingFogging(!resetClippingFogging) 
                )}}
                label="Reset clipping and fogging on zoom" />
        </InputGroup>
        <InputGroup style={{ paddingLeft: '0.1rem', paddingBottom: '0.5rem' }}>
            <Form.Check
                type="switch"
                checked={clipCap}
                onChange={() => { dispatch(
                    setClipCap(!clipCap)
                )}}
                label="'Clip-cap' perfect spheres" />
        </InputGroup>
    </div>
}

const LightingPanel = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
}) => {

    const busyLighting = useRef<boolean>(false)
    const newLightPosition = useRef<[number, number, number]>()
    const isSetLightPosIsDirty = useRef<boolean>(false)
    const [diffuse, setDiffuse] = useState<[number, number, number, number]>(props.glRef.current.light_colours_diffuse)
    const [specular, setSpecular] = useState<[number, number, number, number]>(props.glRef.current.light_colours_specular)
    const [ambient, setAmbient] = useState<[number, number, number, number]>(props.glRef.current.light_colours_ambient)
    const [specularPower, setSpecularPower] = useState<number>(props.glRef.current.specularPower)
    const [position, setPosition] = useState<[number, number, number]>([props.glRef.current.light_positions[0], props.glRef.current.light_positions[1], props.glRef.current.light_positions[2]])

    const setLightingPositionIfDirty = () => {
        if (isSetLightPosIsDirty.current) {
            busyLighting.current = true
            isSetLightPosIsDirty.current = false
            props.glRef.current.setLightPosition(newLightPosition.current[0], -newLightPosition.current[1], newLightPosition.current[2])
            props.glRef.current.drawScene()
            busyLighting.current = false
            setLightingPositionIfDirty()
        }
    }

    useEffect(() => {
        if (props.glRef.current && props.glRef.current.light_colours_diffuse) {
            setDiffuse(props.glRef.current.light_colours_diffuse)
            setSpecular(props.glRef.current.light_colours_specular)
            setAmbient(props.glRef.current.light_colours_ambient)
            setSpecularPower(props.glRef.current.specularPower)
            setPosition([props.glRef.current.light_positions[0], props.glRef.current.light_positions[1], props.glRef.current.light_positions[2]])
        }
    }, [props.glRef.current.specularPower, props.glRef.current.light_positions, props.glRef.current.light_colours_diffuse, props.glRef.current.light_colours_specular, props.glRef.current.light_colours_ambient])

    return <div style={{width: '100%', height: '100%', padding: '0.5rem', borderStyle: 'solid', borderRadius: '0.5rem', borderColor: 'grey', borderWidth: '1px'}}>
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Diffuse"
            initialValue={props.glRef.current.light_colours_diffuse[0]}
            externalValue={props.glRef.current.light_colours_diffuse[0]}
            setExternalValue={(newValue: number) => {
                props.glRef.current.light_colours_diffuse = [newValue, newValue, newValue, 1.0]
                props.glRef.current.drawScene()
                setDiffuse([newValue, newValue, newValue, 1.0])
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Specular"
            initialValue={props.glRef.current.light_colours_specular[0]}
            externalValue={props.glRef.current.light_colours_specular[0]}
            setExternalValue={(newValue: number) => {
                props.glRef.current.light_colours_specular = [newValue, newValue, newValue, 1.0]
                props.glRef.current.drawScene()
                setSpecular([newValue, newValue, newValue, 1.0])
            }} />
        <MoorhenSlider minVal={0.0} maxVal={1.0} logScale={false}
            sliderTitle="Ambient"
            initialValue={props.glRef.current.light_colours_ambient[0]}
            externalValue={props.glRef.current.light_colours_ambient[0]}
            setExternalValue={(newValue: number) => {
                props.glRef.current.light_colours_ambient = [newValue, newValue, newValue, 1.0]
                props.glRef.current.drawScene()
                setAmbient([newValue, newValue, newValue, 1.0])
            }} />
        <MoorhenSlider minVal={1.0} maxVal={128.0} logScale={false}
            sliderTitle="Specular Power"
            initialValue={props.glRef.current.specularPower}
            externalValue={props.glRef.current.specularPower}
            setExternalValue={(newValue: number) => {
                props.glRef.current.specularPower = newValue
                props.glRef.current.drawScene()
                setSpecularPower(newValue)
            }} />
        <MoorhenLightPosition
            initialValue={props.glRef.current.light_positions}
            externalValue={props.glRef.current.light_positions}
            setExternalValue={(newValues: [number, number, number]) => {
                newLightPosition.current = newValues
                isSetLightPosIsDirty.current = true
                if (!busyLighting.current) {
                    setLightingPositionIfDirty()
                }
            }}
        />
    </div>
}

export const MoorhenSceneSettingsModal = (props: {
    glRef: React.RefObject<webGL.MGWebGL>;
    show: boolean;
    setShow: (show: boolean) => void;
}) => {

    const width = useSelector((state: moorhen.State) => state.sceneSettings.width)
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height)

    return <MoorhenDraggableModalBase
                modalId="scene-settings-modal"
                left={width / 5}
                top={height / 6}
                headerTitle="Scene settings"
                defaultHeight={convertViewtoPx(40, height)}
                defaultWidth={convertViewtoPx(40, width)}
                minHeight={convertViewtoPx(40, height)}
                minWidth={convertRemToPx(40)}
                maxHeight={convertViewtoPx(65, height)}
                maxWidth={convertRemToPx(60)}
                body={
                    <Stack gap={2} direction="horizontal" style={{display: 'flex', alignItems: 'start'}}>
                        <Stack gap={2} direction="vertical">
                            <ClipFogPanel glRef={props.glRef}/>
                            <BackgroundColorPanel/>
                        </Stack>
                        <Stack gap={1} direction="vertical">
                            <LightingPanel glRef={props.glRef}/>
                            {props.glRef.current.isWebGL2() && <DepthBlurPanel/>}
                        </Stack>
                    </Stack>
                }
                footer={null}
                {...props}
                />
}