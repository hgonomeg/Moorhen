import { useRef, useState } from "react";
import { Form, Row } from "react-bootstrap";
import { readTextFile } from "../../utils/MoorhenUtils";
import { MoorhenBaseMenuItem } from "./MoorhenBaseMenuItem";
import { MoorhenScriptModal } from "../modal/MoorhenScriptModal";
import { moorhen } from "../../types/moorhen";
import { webGL } from "../../types/mgWebGL";
import { ToolkitStore } from "@reduxjs/toolkit/dist/configureStore";

export const MoorhenLoadScriptMenuItem = (props: {
     setPopoverIsShown: React.Dispatch<React.SetStateAction<boolean>>;
     glRef: React.RefObject<webGL.MGWebGL>;
     store: ToolkitStore;
     commandCentre: React.RefObject<moorhen.CommandCentre>;
}) => {
    
    const filesRef = useRef<null | HTMLInputElement>(null)
    const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false)
    const [code, setCode] = useState<string>('No code loaded')

    const panelContent = <Row>
        <Form.Group style={{ width: '30rem', margin: '0.5rem', padding: '0rem' }} controlId="uploadScript" className="mb-3">
            <Form.Label>Load and execute script</Form.Label>
            <Form.Control ref={filesRef} type="file" multiple={false} accept=".js" />
        </Form.Group>
    </Row>

    const onCompleted = async () => {
        for (const file of filesRef.current.files) {
            const text = await readTextFile(file) as string
            setShowCodeEditor(true)
            setCode(text)
        }
    }

    return <><MoorhenBaseMenuItem
        key='execute-script-menu-item'
        id='execute-on-ligand-menu-item'
        popoverContent={panelContent}
        menuItemText="Load and execute script..."
        onCompleted={onCompleted}
        setPopoverIsShown={props.setPopoverIsShown}
    />
        <MoorhenScriptModal code={code} show={showCodeEditor} setShow={setShowCodeEditor} {...props}/>
    </>

}
