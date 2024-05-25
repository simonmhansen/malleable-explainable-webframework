<script lang="ts">
import type { ChartOption } from "../utility/types";

export let height: number = 200;
export let visible: boolean;
export let modelId: string;
export let chartOptions: ChartOption;

let width: number;

// id's are actually not compiled away by Svelte, they are shared globally
let showSecondEdgesCheckBox;
let showFirstEdgesCheckBox;

</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="chart-options-absolute-wrapper">
    <div class="chart-options-pane {visible ? '' : 'hidden'}" style="min-height: {height}px; max-height: {height}px; left: {-width}px;" 
        on:click={(e) => e.stopPropagation()}
        on:mousedown={(e) => e.stopPropagation()}
        bind:clientWidth={width}
    >
    {#if (chartOptions)}
        <p class="id-text">ID: {modelId}</p>
        <div class="title-container">
            <p>Title: </p>
            <input type="text" class="text-field" id="text-input" bind:value={chartOptions.title}>
        </div>
        <label> 
            <input type="checkbox" class="check-box" bind:checked={chartOptions.showToolTip} bind:this={showFirstEdgesCheckBox} />
            <p>Show tooltip on node hover</p>
        </label>
        <label> 
            <input type="checkbox" class="check-box" bind:checked={chartOptions.showAxis} bind:this={showFirstEdgesCheckBox} />
            <p>Show Axis'</p>
        </label>
        <div class="label-container">
            <p>Default node size: </p>
            <input type="text" class="text-field" id="text-input" bind:value={chartOptions.defaultNodeSize}>
        </div>

        <!-- PRIMARY EDGES -->
        {#if chartOptions.useFirstEdges}
            <h4>{chartOptions.firstEdgesTitle}</h4>
            <label> 
                <input type="checkbox" class="check-box" bind:checked={chartOptions.showFirstEdges} bind:this={showFirstEdgesCheckBox} />
                <p>Show edges</p>
            </label>
            <label> 
                <input type="checkbox" class="check-box" bind:checked={chartOptions.bundleFirstEdges} bind:this={showFirstEdgesCheckBox} />
                <p>Bundle edges</p>
            </label>
            <div class="label-container">
                <p>Edge-Color: </p>
                <input type="text" class="text-field" id="text-input" bind:value={chartOptions.colorFirstEdges}>
            </div>
            <div class="label-container">
                <p>Stroke-Width: </p>
                <input type="text" class="text-field" id="text-input" bind:value={chartOptions.strokeWidthFirstEdges}>
            </div>            
        {/if}

        <!-- SECONDARY EDGES -->
        {#if chartOptions.useSecondEdges}
            <h4>{chartOptions.secondEdgesTitle}</h4>
            <label>
                <input type="checkbox" class="check-box" bind:checked={chartOptions.showSecondEdges} bind:this={showSecondEdgesCheckBox}>
                <p>Show edges</p>
            </label>
            <label> 
                <input type="checkbox" class="check-box" bind:checked={chartOptions.bundleSecondEdges} bind:this={showSecondEdgesCheckBox} />
                <p>Bundle edges</p>
            </label>
            <div class="label-container">
                <p>Edge-Color: </p>
                <input type="text" class="text-field" id="text-input" bind:value={chartOptions.colorSecondEdges}>
            </div>
            <div class="label-container">
                <p>Stroke-Width: </p>
                <input type="text" class="text-field" id="text-input" bind:value={chartOptions.strokeWidthSecondEdges}>
            </div>            
        {/if}


        <!-- HIGH-LIGHTED EDGES -->
        <h4>Highlighted Edges</h4>
        <div class="label-container">
            <p>Edge-Color: </p>
            <input type="text" class="text-field" id="text-input" bind:value={chartOptions.colorHighlightedEdges}>
        </div>
        <div class="label-container">
            <p>Stroke-Width: </p>
            <input type="text" class="text-field" id="text-input" bind:value={chartOptions.strokeWidthHighlightedEdges}>
        </div>
    {/if}
    </div>
</div>


<style>
    .chart-options-absolute-wrapper {
        position: absolute;
        pointer-events: none;
    }

    .chart-options-pane {
        background-color: bisque;
        min-width: 200px;
        width: fit-content;
        position: relative;
        display: flex;
        flex-direction: column;
        pointer-events: all;
        cursor: default;
        overflow-y: auto;
    }

    .chart-options-pane label {
        display: flex;
        align-items: center;
        margin-top: 0px;
        margin-bottom: 0px;
        margin-left: 5px;
        margin-right: 5px;
    }

    .hidden {
        opacity: 0;
        pointer-events: none;
    }

    .id-text {
        text-align: center;
        color: rgba(0,0,0,0.5);
        margin-top: 1px;
        margin-bottom: 5px;
    }

    .check-box {
        margin-right: 4px;
    }

    p {
        margin: inherit;
    }

    h4 {
        margin-top: 10px;
        margin-bottom: 3px;
        text-align: center;
    }

    .text-field {
        justify-self: right;
    }

    .label-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .label-container p {
        margin-right: 20px;
    }

    .title-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .title-container p {
        margin-right: 20px;
        font-size: 18px;
        font-weight: 700;
    }
</style>
