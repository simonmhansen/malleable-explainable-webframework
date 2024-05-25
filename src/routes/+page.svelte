<script lang="ts">
import { onMount, tick } from 'svelte';
import ChartContainer from '../components/ChartContainer.svelte';
import PythonContainer from '../components/PythonContainer.svelte';
import { isEditorVisible, initialiserPythonRun, activeCharts, parentChildPairs, chartEditorIsAttachedTo, createNewActiveChart, uuidChartMap } from '../utility/stores';
import { drawLineBetweenDivs } from '../utility/drawLineBetweenDivs';
import { derived, writable } from 'svelte/store';

isEditorVisible.subscribe((e) => editorVisible = e)
$: editorVisible = false;

let initialiserPythonCode: String;
let isParentChildPairsVisibile = true;
let directoryHandleMap: Map<string, FileSystemDirectoryHandle> = new Map();


const PYTHON_SAVEFILE_DIRECTORY_NAME = "/savefiles/"
const PYTHON_ENVIRONMENT_SAVEFILE_NAME = "pythonenv"
let saveFolderName = "savefile1"

let pythonContainerComponent: PythonContainer;

// Compute the lines between parent and child containers
let parentChildLines = derived(parentChildPairs, ($parentChildPairs) => {
  return $parentChildPairs.map((pair, i) => {
    // Avoid reconstructing array every time we 'tick' when dragging an element
    if (i == 0) { return pair }

    return drawLineBetweenDivs(pair.parentContainer, pair.childContainer)
  });
});


onMount(async () => {
  const initialiserPythonCodeResponse = await fetch('python/initialiser.py');
  initialiserPythonCode = await initialiserPythonCodeResponse.text();

});



/**
 * Creates a new Chart
 */
function addVisualisation() {
  // We have to redo entire array to trigger Svelte dynamic updates
  createNewActiveChart();
}

/**
 * Toggles if the Monaco Editor is visible
 */
function toggleisEditorVisible() {
  isEditorVisible.update((isVisible) => !isVisible);
}

/**
 * Opens a directory picker for the user, and mounts said directory to the Python environment if not already done.
 */
async function getDirectoryHandler() {
  let dirHandle = await showDirectoryPicker();

  if ((await dirHandle.queryPermission({ mode: "readwrite" })) !== "granted") {
    if (
      (await dirHandle.requestPermission({ mode: "readwrite" })) !== "granted"
    ) {
      throw Error("Unable to read and write directory");
    }
  }

  const interpreter: any = pyscript.interpreter;

  if (!$initialiserPythonRun) {
      interpreter.interface.runPython(initialiserPythonCode);
      initialiserPythonRun.set(true);
  }

  saveFolderName = dirHandle.name
  let nativefs;
  
  // Check if we already have the directory handle to avoid mounting twice
  if (directoryHandleMap.has(saveFolderName)) {
    nativefs = directoryHandleMap.get(saveFolderName);
  }
  else {
    nativefs = await interpreter.interface.mountNativeFS(`${PYTHON_SAVEFILE_DIRECTORY_NAME}${saveFolderName}`, dirHandle)
    directoryHandleMap.set(saveFolderName, nativefs);
  } 

  return nativefs;
}

/**
 * Saves the Python Environment in the picked folder as a file named "pythonenv"
 */
async function savePythonEnvironment() {
  let nativefs = await getDirectoryHandler();

  const interpreter: any = pyscript.interpreter;
  interpreter.interface.runPython(`
  import os
  import dill
  files = os.listdir('${PYTHON_SAVEFILE_DIRECTORY_NAME}')
  
  try:
    del js
  except:
    pass

  with open('${PYTHON_SAVEFILE_DIRECTORY_NAME}${saveFolderName}/${PYTHON_ENVIRONMENT_SAVEFILE_NAME}', 'wb') as f:
    dill.dump_session(f)
  `)

  await nativefs.syncfs();
}

/**
 * Saves the current Chart Setup in /savefile.json.
 * Only support one save setup at the moment
 */
async function saveChartSetup() {
  let dataForChartsInSetup = [];
  $uuidChartMap.forEach((chart, uuid, map) => dataForChartsInSetup.push(chart.saveChart()));

  let setupJson = {
    title: "Setup Title",
    charts: dataForChartsInSetup
  }

  // This will in later versions be changed to allow for more save files
  const response = await fetch("/api/setup-handling", {
   method: "POST",
   body: JSON.stringify(setupJson)
 });

  console.log(await response.text());
}

/**
 * Saves the entire setup including charts and the Python environment.
 */
async function saveSetup() {
  console.log("Save setup");  

  await savePythonEnvironment()
  await saveChartSetup()
}

/**
 * Clears the current charts and models in monaco.
 */
async function clearSetup() {
  // Reset current setup
  activeCharts.set([]);
  // isEditorVisible.set(false);
  chartEditorIsAttachedTo.set("$model0");


  // Kill PythonContainer here and reinstantiate it
  pythonContainerComponent.$destroy();

  // Clear monaco editors and models so there's only one active
  let Monaco = await import('monaco-editor');
  let monacoEditors = Monaco.editor.getEditors();
  monacoEditors?.forEach((editor) => {
    editor.dispose();
  });


  // Remount python container
  pythonContainerComponent = new PythonContainer({target: document.body});
}

/**
 * Restores the Python Environment from the "pythonenv" file in the selected folder.
 */
async function restorePythonEnvironment() {
  let nativefs = await getDirectoryHandler();

  // Apparently dill is broken on this version of pyodide, since pyodide uses an old cython version
  // So we have to copy the file and load from the copy,
  // since pickle kills the file after its done loading from it
  let saveFilePath = `${PYTHON_SAVEFILE_DIRECTORY_NAME}${saveFolderName}/${PYTHON_ENVIRONMENT_SAVEFILE_NAME}`
  let temporaryPicklePath = `${PYTHON_SAVEFILE_DIRECTORY_NAME}${saveFolderName}/tmp-picklefile`
  let protectedPath = `${PYTHON_SAVEFILE_DIRECTORY_NAME}${saveFolderName}/protected/${PYTHON_ENVIRONMENT_SAVEFILE_NAME}`
  const interpreter: any = pyscript.interpreter;
  interpreter.interface.runPython(`
  import os
  import dill
  import shutil

  shutil.copy2('${saveFilePath}', '${temporaryPicklePath}')

  with open('${temporaryPicklePath}', 'rb') as f:
    dill.load_session(f)
    
  `)
  await nativefs.syncfs();
}

/**
 * Restores the Chart setup saved in /savefile.json. 
 */
async function restoreChartSetup() {
  // Load
  const response = await fetch("/api/setup-handling", {
    method: "GET"
  });

  let data = await response.json();

  // Create a chart for each of the charts in the .charts attribute
  let charts = data.charts;
  charts.forEach(chart => {
    createNewActiveChart(null, chart?.parentId, chart?.parentuuid, chart?.uuid, chart?.chartOptions, chart?.chartMetadata, true);
  });

  // Model should be attached to the utility model now
}

/**
 * Clears the current setup and then restores the Python Environment and Chart Setup from savefiles.
 */
async function loadSetup() {
  await clearSetup()
  await restorePythonEnvironment()
  await restoreChartSetup();
}

</script>
<div class="buttons">  
  <button on:click={addVisualisation}>Add Chart</button>
  <button on:click={toggleisEditorVisible}>{editorVisible ? "Hide Editor" : "Reveal Editor"}</button>
  <button on:click={(e) => isParentChildPairsVisibile = !isParentChildPairsVisibile}>{isParentChildPairsVisibile ? "Hide Parent-Child connections" : "Show Parent-Child connections"}</button>
  <button on:click={(e) => saveSetup()}>Save setup</button>
  <button on:click={(e) => loadSetup()}>Load setup</button>
</div>


<div class="app">
 <PythonContainer bind:this={pythonContainerComponent}/>
 {#if isParentChildPairsVisibile }
 {#each $parentChildLines as pair, i}
   {#if i > 0}
   
      <div style="
        padding: 0px; margin: 0px; height: 1px; background-color: black;  
        line-height: 1px; position: absolute; left: {pair.cx}px; top: {pair.cy}px;
        width: {pair.length}px;  transform:rotate({pair.angle}deg);"
      />
  {/if}
  {/each}
  {/if}
 

 {#each $activeCharts as visualisation}
  <svelte:component this={ChartContainer} { ...visualisation} />   
{/each}
</div>

<style>
</style>


