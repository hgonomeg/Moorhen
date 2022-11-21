import { Fragment, useEffect, useRef, useState } from "react"
import { Col, Row, Form } from 'react-bootstrap';
import { Chart, registerables } from 'chart.js';
import { BabyGruMapSelect } from './BabyGruMapSelect'
import { BabyGruMoleculeSelect } from './BabyGruMoleculeSelect'

Chart.register(...registerables);

const plugin = {
    id: 'custom_bar_borders',
    afterDatasetsDraw: (chart, args, options) => {
        const {ctx} = chart;
        ctx.save();
        ctx.lineWidth = 3;
        for(let datasetIndex=0; datasetIndex<chart._metasets.length; datasetIndex++){
          for(let dataPoint=0; dataPoint<chart._metasets[datasetIndex].data.length; dataPoint++){
            ctx.beginPath();
            if(chart._metasets[datasetIndex].data[dataPoint]['$context'].raw < 0){
              ctx.rect(chart._metasets[datasetIndex].data[dataPoint].x-chart._metasets[datasetIndex].data[dataPoint].width/2, chart._metasets[datasetIndex].data[dataPoint].y, chart._metasets[datasetIndex].data[dataPoint].width, chart._metasets[datasetIndex].data[dataPoint].height*-1);
            } else {
              ctx.rect(chart._metasets[datasetIndex].data[dataPoint].x-chart._metasets[datasetIndex].data[dataPoint].width/2, chart._metasets[datasetIndex].data[dataPoint].y, chart._metasets[datasetIndex].data[dataPoint].width, chart._metasets[datasetIndex].data[dataPoint].height);

            }
            ctx.stroke();
          }
        }
      ctx.restore();
    },
}


export const BabyGruDifferenceMapPeaks = (props) => {
    const chartCardRef = useRef();
    const chartBoxRef = useRef();
    const containerRef = useRef();
    const containerBodyRef = useRef();
    const canvasRef = useRef();
    const mapSelectRef = useRef();
    const moleculeSelectRef = useRef();
    const chartRef = useRef(null);
    const [plotData, setPlotData] = useState(null)
    const [selectedModel, setSelectedModel] = useState(null)
    const [selectedMap, setSelectedMap] = useState(null)
    const [cachedAtoms, setCachedAtoms] = useState(null)
    const [selectedRmsd, setSelectedRmsd] = useState(4.5)
    
    const isValidRmsd = (value) => {
        if(value < 2.5 || value > 7.0) {
            return false
        } 
        return true
    }

    const getDifferenceMaps = () => {
        let differenceMaps = []
        
        if (props.maps) {
            props.maps.forEach(map => {
                if(map.isDifference){
                    differenceMaps.push(map)
                }
            })
        }

        return differenceMaps

    }

    const colourPalette = (value) => {
        let gfrac = ( 1 / value)
        if (value > 0) {
            return 'rgb(0, ' + parseInt(155 + (100 * gfrac)) + ', 0)'
        } else {
            return 'rgb(' + parseInt(155 - (100 * gfrac)) + ', 0, 0)'
        }

    }

    const handleModelChange = (evt) => {
        console.log(`Selected model ${evt.target.value}`)
        setSelectedModel(evt.target.value)
    }

    const handleMapChange = (evt) => {
        console.log(`Selected map ${evt.target.value}`)
        setSelectedMap(evt.target.value)
    }

    const handleRmsdChange = (evt) => {
        if (isValidRmsd(evt.target.value)){
            console.log(`Selected RMSD ${evt.target.value}`)
            setSelectedRmsd(evt.target.value)
        } else {
            console.log('Invalid RMSD selected...')
            setSelectedRmsd(null)
        }
    }

    const handleClick = (evt) => {
        if (chartRef.current === null){
            return
        }

        const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
        
        if (points.length === 0){
            return;
        }
        
        const peakIndex = points[0].index
        props.glRef.current.setOrigin([-plotData[peakIndex].coordX, -plotData[peakIndex].coordY, -plotData[peakIndex].coordZ])
    }

    const setTooltipTitle = (args) => {
        if (!chartRef.current){
            return;
        }
        
        const peakIndex = args[0].dataIndex
        return [
            `Position (${plotData[peakIndex].coordX.toFixed(2)}, ${plotData[peakIndex].coordY.toFixed(2)}, ${plotData[peakIndex].coordZ.toFixed(2)})`,
            `Height ${plotData[peakIndex].featureValue.toFixed(2)}`
        ]
    }

    useEffect(() => {
        if (props.molecules.length === 0) {
            setSelectedModel(null)
        } else if (selectedModel === null) {
            setSelectedModel(props.molecules[0].molNo)
        } else if (!props.molecules.map(molecule => molecule.molNo).includes(selectedModel)) {
            setSelectedModel(props.molecules[0].molNo)
        }

    }, [props.molecules.length])

    useEffect(() => {
        const differenceMaps = getDifferenceMaps()

        if (props.maps.length === 0 || differenceMaps.length === 0) {
            setSelectedMap(null)
        } else if (selectedMap === null) {
            setSelectedMap(differenceMaps[0].molNo)
        } else if (!differenceMaps.map(map => map.molNo).includes(selectedMap)) {
            setSelectedMap(differenceMaps[0].molNo)
        }

    }, [props.maps.length])
   
    useEffect(() => {
        if (selectedModel !== null) {
            let selectedMoleculeIndex = props.molecules.findIndex(molecule => molecule.molNo == selectedModel);
            if (selectedMoleculeIndex != -1 && props.molecules[selectedMoleculeIndex]){
                setCachedAtoms(props.molecules[selectedMoleculeIndex].cachedAtoms)
            }
        }
    })
    
    useEffect(() => {
        async function fetchData(inputData) {
            let response = await props.commandCentre.current.cootCommand(inputData)
            let newPlotData = response.data.result.result
            setPlotData(newPlotData)
        }

        if (selectedModel === null || selectedMap === null || selectedRmsd === null) {
            setPlotData(null)
            return
        }
        
        const inputData = {
            message:'coot_command',
            command: "difference_map_peaks", 
            returnType:'interesting_places_data',
            commandArgs:[selectedMap, selectedModel, selectedRmsd], 
            displayName:'Difference Peaks'
        }
    
        fetchData(inputData)   

    }, [selectedMap, selectedModel, cachedAtoms, selectedRmsd])

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy()
        }

        if (selectedMap === null || selectedModel === null || selectedRmsd === null || plotData === null || !props.toolAccordionBodyHeight || !props.showSideBar) {
            return;
        }
       
        let labels = plotData.map((peak, idx) => idx % 10 === 0 ? idx : '')
       
        const barWidth = props.sideBarWidth / 40
        const tooltipFontSize = 12
        const axisLabelsFontSize = props.toolAccordionBodyHeight / 60
        
        const containerBody = document.getElementById('myContainerBody')
        containerBody.style.width = (labels.length*barWidth)+ "px";
        let ctx = document.getElementById("myChart").getContext("2d")
        
        let scales = {
            x: {
                stacked: false,
                beginAtZero: true,
                display: true,
                ticks: {color: props.darkMode ? 'white' : 'black',
                        font:{size:barWidth, family:'Helvetica'},
                        maxRotation: 0, 
                        minRotation: 0,
                        autoSkip: false,                                
                },
                grid: {
                  display:false,
                  borderWidth: 1,
                  borderColor: 'black'
                },
            },
            y: {
                display: true,
                ticks: {display:false},
                beginAtZero: true,
                title: {
                    display: true,
                    font:{size:axisLabelsFontSize, family:'Helvetica', weight:800},
                    text: 'Difference Map Peaks',
                    color: props.darkMode ? 'white' : 'black'
                },
                grid: {
                    display:false,
                    borderWidth: 0
                }    
            }
        }

        let datasets = [{
            label: 'Difference Map Peaks',
            data: plotData.map(peak => peak.featureValue),
            backgroundColor: plotData.map(peak => colourPalette(peak.featureValue)),
            borderWidth: 0,
            clip: false,
        }]

        chartRef.current = new Chart(ctx, {
            plugins: [plugin],
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets,
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#ddd',
                        borderColor: 'black',
                        borderWidth: 1,
                        displayColors: false,
                        titleColor: 'black',
                        bodyColor: 'black',
                        footerColor: 'black',
                        callbacks: {
                            title: setTooltipTitle,
                        },
                        titleFont: {
                            size: tooltipFontSize,
                            family:'Helvetica'
                        },
                        bodyFont: {
                            size: 0,
                            family:'Helvetica'
                        },
                        footerFont: {
                            family:'Helvetica'
                        }
                    }
                },
                onClick: handleClick,
                responsive: true,
                maintainAspectRatio: false,
                barThickness: 'flex',
                scales: scales
            }            
        });

    }, [plotData, props.darkMode, props.toolAccordionBodyHeight, props.sideBarWidth, props.showSideBar])

    return <Fragment>
                <Form style={{ padding:'0', margin: '0' }}>
                    <Form.Group>
                        <Row style={{ padding:'0', margin: '0' }}>
                            <Col>
                                <BabyGruMoleculeSelect width="" onChange={handleModelChange} molecules={props.molecules} ref={moleculeSelectRef}/>
                            </Col>
                            <Col>
                                <BabyGruMapSelect onlyDifferenceMaps={true} width="" onChange={handleMapChange} maps={props.maps} ref={mapSelectRef}/>
                            </Col>
                            <Col>
                                <Form.Group style={{ margin: '0.5rem', height: '4rem' }}>
                                    <Form.Label>RMSD</Form.Label>
                                    <Form.Control 
                                        style={{borderColor: isValidRmsd(selectedRmsd) ? 'grey': 'red'}} 
                                        size='sm'
                                        type="number" 
                                        step={0.1} min={2.5} max={7} defaultValue={4.5} 
                                        onChange={handleRmsdChange} 
                                        onKeyDown={(evt) => evt.which == 13 ? evt.preventDefault() : null}/>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form.Group>
                </Form>
                <div ref={chartCardRef} className="validation-plot-div" >
                    <div ref={chartBoxRef} style={{height: '100%'}} className="chartBox" id="myChartBox">
                        <div ref={containerRef} className="validation-plot-container" style={{height: '100%', overflowX:'scroll'}}>
                            <div ref={containerBodyRef} style={{height: '100%'}} className="containerBody" id="myContainerBody">
                                <canvas ref={canvasRef} id="myChart"></canvas>
                            </div>
                        </div>
                    </div>
                <canvas id="myChartAxis"></canvas>
                </div>               
            </Fragment>

}