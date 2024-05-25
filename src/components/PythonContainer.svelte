<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { isEditorVisible, modelURIMap } from '../utility/stores';


let Monaco;
let monacoDiv: HTMLDivElement;
let editor: monaco.editor.IStandaloneCodeEditor;
let utilityModel: monaco.editor.ITextModel;

isEditorVisible.subscribe((e) => editorVisible = e)
$: editorVisible = false;

$: dropdown = [];
$: selectedModelId = "";

let utilityCode = "utilityCode";

onMount(async () => {
    // @ts-ignore
    self.MonacoEnvironment = {
      getWorker: function (_moduleId: any) {
        return new editorWorker();
      }
    };

    const utilityCodeResponse = await fetch('python/utility.py');
    utilityCode = await utilityCodeResponse.text();

    // Setup the Monaco Editor
    Monaco = await import('monaco-editor');
    editor = Monaco.editor.create(monacoDiv, {
      value: "",  
      language: 'python',
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: true,
      wordWrap: 'bounded',
      fontSize: 16
    });

    Monaco.editor.onDidCreateModel((newModel) => {
      updateFromEditorModels()
    });


    editor.onDidChangeModel((e) => {
      // Check to avoid infinite loops:
      let newModelId = editor?.getModel().id;
      if (selectedModelId !== newModelId) {
        selectedModelId = newModelId;
      } 
    });

    // Setup Utility Model and then update dropdown and uri map
    utilityModel = Monaco.editor.createModel(utilityCode, 'python');
    editor.setModel(utilityModel)
    updateFromEditorModels()




    // Set up disposing
    Monaco.editor.onWillDisposeModel((disposedModel) => {
      // Check if active in the Monaco Editor
      if (disposedModel.isAttachedToEditor()) {
        editor.setModel(utilityModel);

        // Update the model uri map so we can't try to "get" an unexisting model
        let currentModels = Monaco.editor.getModels();
        modelURIMap.set(new Map(currentModels.map((model) => [model.id, model.uri])));

        // Update Dropdown
        updateFromEditorModels();
      }
    })

    return () => {
      editor.dispose();
    };
});

/**
 * Updates the Dropdown Menu and the Model URI Map
 */
function updateFromEditorModels() {
  let currentModels = Monaco?.editor.getModels();
    
  dropdown = currentModels.map((model) => {
    let text = model.id
    if (model.id === '$model2') {
      text = "Utility Library"
    }

    return {value: model.id, text: text}
  });
  modelURIMap.set(new Map(currentModels.map((model) => [model.id, model.uri])));

}

$: if (selectedModelId) {
  let currentModelId = editor?.getModel().id;

  // Make if-statement to avoid infinitely loops
  if (currentModelId !== selectedModelId) { 
    let uri = $modelURIMap.get(selectedModelId)
    let newModel = Monaco?.editor.getModel(uri)
  
    editor?.setModel(newModel);
  }

};

onDestroy(() => {
  console.log("PythonContainer Destroyed")
})

</script>




<div bind:this={monacoDiv} class="monaco_editor {editorVisible ? '' : 'hidden'} monaco-wrapper">
  <div class="monaco-title-box">
    <h2>Monaco Editor</h2>
    <select bind:value={selectedModelId}>
      {#each dropdown as option}
        <option value={option.value}>{option.text}</option>
      {/each}
    </select>
  
  </div>
</div>

<style>
  .monaco_editor {
    width: 80vh;
    height: 65vh;
  }

  .monaco-wrapper {
    border: 1px solid rgba(0, 0, 0, 0.10);
    box-shadow: 5px 10px 18px rgba(0,0,0, 0.1);
    position: absolute;
    z-index: 10;
    align-items: center;
  }

  .monaco-title-box {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.hidden) {
    opacity: 0;
    pointer-events: none;
  }

  h2 {
    /* text-align: center; */
    margin-top: 0px;
    margin-bottom: 4px;
    margin-left: 0px;
    margin-right: 20px;
  }
</style>