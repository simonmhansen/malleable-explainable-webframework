<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { get_current_component } from "svelte/internal";
import Scatterplot from "./Scatterplot.svelte";
import ChartOptions from "./ChartOptions.svelte";
import { isEditorVisible, chartEditorIsAttachedTo, activeCharts, modelURIMap, parentChildPairs, initialiserPythonRun, createNewActiveChart, removeActiveChart, uuidChartMap } from "../utility/stores";
import type { ChartMetadata, ChartOption } from "../utility/types";
import { writable, type Writable } from "svelte/store";

export let parentContainer: HTMLDivElement;
export let parentId: string;
export let parentuuid: string;
export let uuid: string;
export let chartOptions: ChartOption;
export let chartMetadata: ChartMetadata;
export let restoredFromSaveFile: Boolean;

const THIS_COMPONENT = get_current_component();

let chart;
let secondEdges;
let firstEdges;
let nodes;
let dimensionality
let colorMap;
let scatterPlotComponent: Scatterplot;
let originalNodes;
let originalFirstEdges;
let originalSecondEdges;
let hasMounted: Boolean = false;
let lockedInNodesString: Writable<string> = writable("");

let plotWidth = 400;
let plotHeight = 400;
let sectionHeight;
let isChartOptionsVisible = false;

let initialiserPythonCode;
let modelCode: string;
let modelId: string;

let enableVisualisation = true;

let Monaco;
let editor: monaco.editor.IStandaloneCodeEditor;
let model: monaco.editor.ITextModel;
let viewCodeDiv: HTMLButtonElement;
let sectionEl: HTMLDivElement;

$: editorVisible = false;
$: editorAttachedToThis = false; 
isEditorVisible.subscribe((e) => editorVisible = e)
chartEditorIsAttachedTo.subscribe((e) =>  {
    editorAttachedToThis = (model?.id === e)
});

// Variables for prepended the utility code
let utilityCode: String;
let UTILITY_MODEL_ID = "$model2";

onMount(async () => {
    console.log(`Mounting: ${uuid}`)
    // Add us to the map of charts
    uuidChartMap.update(map => map.set(uuid, THIS_COMPONENT));

    // Fetch relevant data and python code
    const utilityCodeResponse = await fetch('python/utility.py');
    utilityCode = await utilityCodeResponse.text();  

    const initialiserPythonCodeResponse = await fetch('python/initialiser.py');
    initialiserPythonCode = await initialiserPythonCodeResponse.text();

    // If parent load standard model, else load dataset Model:
    if (parentuuid) {
        const standardModelCodeResponse = await fetch('python/standardModel.py');
        modelCode = await standardModelCodeResponse.text();
    }
    else {
        const datasetModelCodeResponse = await fetch('python/datasetModel.py');
        modelCode = await datasetModelCodeResponse.text();
        chartOptions.title = "Dataset"
    }

    if (restoredFromSaveFile) {
        restoreFromSaveFile();
    }

    // Setup the monaco text model for our python
    Monaco = await import('monaco-editor');
    let monacoEditors = Monaco.editor.getEditors()
    editor = monacoEditors[0];
    model = Monaco.editor.createModel(modelCode, 'python');
    modelId = model.id;
    

    // When document is changed get the new value
    model?.onDidChangeContent((e) => {
        modelCode = editor.getValue();
    })



    // If this has a parent then push it to the parent/child-pair store
    // This lets us draws lines from parent -> child to visualise their relationship
    if (parentuuid) {        
        parentChildPairs.update((arr) => {
            arr.push({childContainer: getDivElement(), parentContainer: parentContainer})
            return arr;
        })
    }


    console.log(`Finished Mounting ${uuid}`)
    hasMounted = true;
})

onDestroy(() => {
    // Remove all parent/child pairs which includes this chart
    parentChildPairs.update((pairs) => {
        let filtered = pairs.filter((pair, i ) => { 
            if (i == 0) { return true; }    
            let foundContainer = !((pair.childContainer === sectionEl) || (pair.parentContainer === sectionEl));
            return foundContainer
        })

        return filtered;

    });

    // Remove ourselves from the list of active charts and the respective map
    removeActiveChart(uuid)
    uuidChartMap.update(map => {
        map.delete(uuid);
        return map;
    })

    // Kill the Monaco Model as well - note this does not kill the Python chart object
    if (editorAttachedToThis) {
        isEditorVisible.update((e) => false);
    }
    model.dispose()

});

/**
 * Serves to restore properly from save file.
 */
function restoreFromSaveFile() {
    // Restore modelcode
    modelCode = chartMetadata.modelCode;

    // Restore datasets
    chart = chartMetadata.data.chart;
    dimensionality = chartMetadata.data.dimensionality;
    colorMap = chartMetadata.data.colorMap ? new Map(chartMetadata.data.colorMap) : null;

    nodes = chartMetadata.data.nodes;
    originalNodes = chartMetadata.data.nodes;

    firstEdges = chartMetadata.data.firstEdges;
    secondEdges = chartMetadata.data.secondEdges;

    lockedInNodesString.set(chartMetadata.data.lockedInNodes?.join(', '));

    // Restore parent
    if (parentuuid) {
        // So it creates the charts in order, but in parallel
        // so if we're very fast here, we can actually get an error
        let parent = $uuidChartMap.get(parentuuid);

        // If it has a parent, but no parentContainer, then fetch it from the parent
        if (parentContainer === null) {
            parentContainer = parent?.getDivElement(); // added ?. incase we're way faster than parent
            
            // Update activeCharts to reflect the new parentContainer
            $activeCharts.map(c => {
                if (c.uuid !== uuid) { return c };

                c.parentContainer = parentContainer;
            });
        }

        // Update parent's model id
        parentId = parent.getModelId();
    }

}

function destroySelf() {
    console.log("Destroy Button Clicked")
    THIS_COMPONENT.$destroy()
}

/**
 * Prepends and runs the Utility Code to add the Utility Library. Also runs the Python Initialiser if it hasn't been done.
 */
function prependAndRunUtilityCode() {
    const interpreter: any = pyscript.interpreter;

    if (!$initialiserPythonRun) {
        interpreter.interface.runPython(initialiserPythonCode);
        initialiserPythonRun.set(true);
    }

    utilityCode = Monaco?.editor.getModel($modelURIMap.get(UTILITY_MODEL_ID)).getValue()
    interpreter.interface.runPython(utilityCode);
}

/**
 * Runs the PyScript ocde and sets the variables used by the Scatterplot child component, effectively creating the view
 */
async function runPyScript() {
    // We can access pyscript.interpreter at any time, but not variables
    const interpreter: any = pyscript.interpreter;
    prependAndRunUtilityCode()

    nodes = null;
    secondEdges = null;
    firstEdges = null;

    interpreter.interface.runPython(modelCode);
    let pythonMain: any = interpreter.globals.get('main')
    chart = pythonMain(null, uuid, parentuuid, [])

    if (chart.shouldLoadDataset === true) {
        // Fetch the requested dataset
        let dataResponse = await fetch(chart.datasetPath);
        let dataset = await dataResponse.text();

        // Call the main function again, now with a dataset added
        chart = pythonMain(dataset, uuid, parentuuid, [])
    }

    dimensionality = chart.dimensionality

    chartOptions.firstEdgesTitle = chart.firstEdgesTitle;
    chartOptions.useFirstEdges = chart.useFirstEdges;

    chartOptions.secondEdgesTitle = chart.secondEdgesTitle;
    chartOptions.useSecondEdges = chart.useSecondEdges;

    if (dimensionality === 2) {
        nodes = Array.from(chart.nodesJson)
        nodes = nodes.map((node) => JSON.parse(node))

        secondEdges = JSON.parse(chart.secondEdgesJson)
        firstEdges = JSON.parse(chart.firstEdgesJson)

        // Documentation is a bit unclear if this creates memory leaks
        // But it is assumed to work out fine, as long as the Svelte
        // component is destroyed properly.
        colorMap = chart.colorMap.toJs();
        
    }

    // Clone Deep
    originalNodes = JSON.parse(JSON.stringify(nodes));
    originalFirstEdges = JSON.parse(JSON.stringify(firstEdges));
    originalSecondEdges = JSON.parse(JSON.stringify(secondEdges));

}


/**
 * Toggles whether the view is shown or not
 */
function resetEnableVisualisation() {
    enableVisualisation = !enableVisualisation;
    updateParentChildPairs()
}


/**
 * Shows the Monaco editor if it is attached to this Chart
 */
function viewMonacoModel() {
    chartEditorIsAttachedTo.update((e) => model?.id)

    if (!editorVisible && editor.getModel() === model) {
        isEditorVisible.update((visible) => true)
    }
    else if (editorVisible && editor.getModel() === model) {
        isEditorVisible.update((visible) => false)
    }
    else {
        editor.setModel(model);
        isEditorVisible.update((visible) => true)
    }

    moveMonacoEditor();
}

/**
 * Creates a new Child Chart with this as the parent
 */
function createChild() {
    createNewActiveChart(sectionEl, model?.id, uuid);
}


/* Dragability */
let moving = false;

// Reposition based on parent
let left: number;
let top: number;
let sectionWidth: number;

if (parentContainer) {
    let parentRect = parentContainer.getBoundingClientRect();
    let parentLeft = parseInt(parentContainer.style.left, 10)
    let parentTop = parseInt(parentContainer.style.top, 10)
    let parentWidth = parentRect.width

    left = parentLeft + parentWidth + 100;
    top = parentTop;
} 
else {
    left = chartMetadata.originalPosition.left;
    top = chartMetadata.originalPosition.top;
}

function onMouseDown() {
    moving = true;    
}

function onMouseMove(e: MouseEvent) {
    if (moving) {
        left += e.movementX;
        top += e.movementY;

        // Just update the first element in the store, which is a dummy value
        // to trigger re-rendering arrows from parent -> child
        updateParentChildPairs()

        moveMonacoEditor()
    }
}

function onMouseUp() {
    moving = false;

    updateParentChildPairs()
}

/**
 * Moves the Monaco Editor when this Chart moves if the editor is attached to this Chart.
 */
function moveMonacoEditor() {
    if (!editorAttachedToThis) { return; }

    let chartRect = sectionEl.getBoundingClientRect()

    // 24 is a bit of a magic number, not sure how this works out
    // We can change monaco to "postion: relative" and then add "height" to get something
    // a lot more precise, but it might break on zoom
    let editorDiv = editor.getContainerDomNode();
    let leftPosition = left + chartRect.width;
    let topPosition = top + 24; 

    editorDiv.style.left=`${leftPosition}px`;
    editorDiv.style.top=`${topPosition}px`;
}

function updateParentChildPairs() {
    $parentChildPairs[0] = !$parentChildPairs[0]
}

// Called from +page
/**
 * Returns the relevant save information about this Chart
 */
export function saveChart() {
    let saveChartMetaData: ChartMetadata = {
        originalPosition: {
            left: left,
            top: top
        },

        modelCode: modelCode,

        data: {
            chart: chart,
            dimensionality: dimensionality,
            colorMap: colorMap ? Array.from(colorMap.entries()) : null,
            nodes: originalNodes,
            scatterPlotNodes: scatterPlotComponent?.getNodes(),
            lockedInNodes: scatterPlotComponent?.getLockedInNodes(),
            firstEdges: originalFirstEdges ? originalFirstEdges : firstEdges,
            secondEdges: originalSecondEdges ? originalSecondEdges : secondEdges
        }
    }

    let chartData = {
        chartOptions: chartOptions,
        chartMetadata: saveChartMetaData,
        modelId: modelId,
        parentId: parentId,
        parentuuid: parentuuid,
        uuid: uuid
    }

    return chartData;
}

/**
 * Returns the HTMLDivElement of this Chart
 */
export function getDivElement(): HTMLDivElement {
    return sectionEl;
}

/**
 * Returns the modelId of this Chart
 */
export function getModelId() {
    return modelId;
}

</script>

<!-- Has a in-fade of delay 100 to make the "model?.id" not pop after rendering -->
<div style="left: 0px; top = 0px; position: absolute" class="absolute-chart-wrapper">
<div on:mousedown={onMouseDown} style="left: {left}px; top: {top}px; position: relative" class="draggable" bind:this={sectionEl} bind:clientHeight={sectionHeight} bind:clientWidth={sectionWidth}>
    
    <ChartOptions height={sectionHeight} {modelId} visible={isChartOptionsVisible} bind:chartOptions={chartOptions}/>
    <button class="close-button" style="left: {sectionWidth - 24}px; top: {4}px;" on:click={destroySelf}>X</button>
    <div class="main-chart-container">
        {#if (chartOptions)}
        <h1>{chartOptions.title}</h1>
        {#key chart}
        {#if (chart && enableVisualisation && hasMounted)}
            {#if (dimensionality === 2)}
                <Scatterplot
                    {nodes} {secondEdges} {firstEdges}
                    width={plotWidth} height={plotHeight}
                    {chartOptions} {moving} {colorMap} {lockedInNodesString}
                    bind:this={scatterPlotComponent}
                />
            {:else if dimensionality > 2}
                <p>Chart set up with dimensionality: {dimensionality}</p>
            {/if}
        {/if}
        {/key}
        {/if}
        <div class="buttons">
            <button on:click={resetEnableVisualisation}>Viewable: {enableVisualisation}</button>
            <button on:click={() => {isChartOptionsVisible = !isChartOptionsVisible}}>{isChartOptionsVisible ? "Hide Chart Options" : "Show Chart Options"}</button>
            <button on:click={runPyScript}>Run PyScript</button>
            <button on:click={createChild}>Create Child</button>
            <button on:click={viewMonacoModel} bind:this={viewCodeDiv}>View Code</button>
    
        </div>
    </div>
</div>
</div>
<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />


<style>
    .draggable {
        display: flex;
        pointer-events: all;
		user-select: none;
		cursor: move;
		border: solid 1px gray;
        width:fit-content;
        position: relative;
	}

    h1 {
        text-align: center;
        margin-top: 0px;
        margin-bottom: 5px;
    }

    .absolute-chart-wrapper {
        pointer-events: none;
    }

    .close-button {
        position: absolute;
        font-weight: 500;
        font-size: 12px;
        min-width: 20px;
        max-width: 20px;
        min-height: 20px;
        max-height: 20px;
        text-align: center;
        align-items: center;
        justify-content: center;
        background-color: rgb(255, 0, 0, 0.5);
        border-radius: 5px;
        border: 0;
        padding-left: 2px;
        padding-right: 2px;
        padding-top: 2px;
        padding-bottom: 2px;



    }
</style>