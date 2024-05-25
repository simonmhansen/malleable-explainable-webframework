<script lang="ts">
import { onMount, tick } from 'svelte';
import { scaleLinear } from "d3-scale";
import { extent } from "d3-array";
import Tooltip from "../components/Tooltip.svelte";
import Legend from "../components/Legend.svelte";
import { calculateEdgeBundling } from "../utility/edgebundling.js"
import { parentChildPairs } from '../utility/stores';
import { writable, derived } from "svelte/store"

export let colorMap;
export let nodes: Array;
export let secondEdges: Array;
export let firstEdges: Array;
export let chartOptions;
export let width = 400;
export let height = 400;
export let moving: boolean;
export let lockedInNodesString = writable("");
$: lockedInNodes = derived(lockedInNodesString, formatLockedInNodesString)
$: lockedInNodesHasError = false;


let hypotenuse = Math.sqrt(width * width + height * height);

$: secondEdgesBundlingComplete = false;
$: firstEdgesBundlingComplete = false;
$: secondEdgeBundlePaths = [];
$: firstEdgeBundlePaths = [];
let hasMounted = false;
let originalNodes;

const margin = {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
};

// Create our reactive sizes and scales
$: innerWidth = width - margin.left - margin.right;
$: innerHeight = innerWidth
$: xScale = scaleLinear()
    .domain(extent(nodes, (c) => c.drtX)) // input
    .range([0, innerWidth]); // output

$: yScale = scaleLinear()
    .domain(extent(nodes, (c) => c.drtY)) // input
    .range([innerHeight, 0]); // output

let hovered;
let hoveredCategory;


onMount(async () => {
    // Add x,y coordinates to nodes objects
    console.log("Mounting new Scatterplot")
    nodes = nodes.map(c => ({ 
        ...c, 
        x: xScale(c.drtX), 
        y: yScale(c.drtY), 
        highlighted: false,
        outgoingPrimaryEdges: [],
        outgoingSecondaryEdges: [],
        outgoingBundledPrimaryEdges: [],
        outgoingBundledSecondaryEdges: []
    }));
    console.log(nodes[0])
    originalNodes = nodes;

    // Add nodes as actual source and destination for edges instead of just indexes
    firstEdges = firstEdges.map(e => ({source: nodes[e.src], target: nodes[e.dst]}))
    secondEdges = secondEdges.map(e => ({source: nodes[e.src], target: nodes[e.dst]}))

    firstEdges.forEach((edge) => {
        nodes[edge.source.id].outgoingPrimaryEdges.push(edge)
    });

    secondEdges.forEach((edge) => {
        nodes[edge.source.id].outgoingSecondaryEdges.push(edge)
    });
    
    hasMounted = true;

    // Svelte is not happy with us assigning directly like this, but it works to assign the locked in nodes when restoring from save
    try {
        if ($lockedInNodesString.length > 0) {
           $lockedInNodes = formatLockedInNodesString();
        }
    } catch (e) {
        console.log("Caught lockedInNodes issues in onMount for Scatterplot")
    }    

    updateParentChildPairs()
    console.log("Finished mounting new Scatterplot") 
});

/**
 * Checks formatting of the locked-in nodes' string, and throw error if wrong. Generally converts the string into an array of ids.
 */
function formatLockedInNodesString() {
    let resultArray = [];
    try {
        if ($lockedInNodesString.length === 0) { return resultArray; }
        let initialArray = $lockedInNodesString.split(',').filter((e) => e !== "")
        let nodeArray = initialArray.map((numberString) => {
            let trimmedString = numberString.trim();
            let number = parseInt(trimmedString);

            if (isNaN(number)) {
                throw new Error(`Invalid number: ${trimmedString} in 'Locked-in nodes'`)
            }

            return number;
        })

        lockedInNodesHasError = false;
        resultArray = nodeArray;

    } catch (error) {
        lockedInNodesHasError = true;
    
    }
    
    nodes = nodes.map((node) => ({...node, highlighted: resultArray.includes(node.id)}));
    return resultArray;
    
}

/**
 * Does FDEB of the Second Edge Set
 */
async function computeSecondEdgeBundling() {
    // Has to run originalNodes for some reason, else D3 fails
    await calculateEdgeBundling(originalNodes, secondEdges, hypotenuse)
        .then(bundledPaths => {
            secondEdgeBundlePaths = bundledPaths; // the bundled edges
            secondEdgesBundlingComplete = true; // boolean for if we're done

            // Add each path to the source node
            bundledPaths.forEach((edge) => {
                nodes[edge.source.id].outgoingBundledSecondaryEdges.push(edge);
            });
        });
}

/**
 * Does FDEB of the First Edge Set
 */
async function computeFirstEdgeBundling() {
    // Has to run originalNodes for some reason, else D3 fails
    await calculateEdgeBundling(originalNodes, firstEdges, hypotenuse)
        .then(bundledPaths => {
            firstEdgeBundlePaths = bundledPaths; // the bundled edges
            firstEdgesBundlingComplete = true; // boolean for if we're done
            
            // Add each path to the source node
            bundledPaths.forEach((edge) => {
                nodes[edge.source.id].outgoingBundledPrimaryEdges.push(edge);
            });
        });
}

// Does the bundling of the second edge set when the ChartOptions are set
$: {
   if (!secondEdgesBundlingComplete && chartOptions?.showSecondEdges && hasMounted && chartOptions?.bundleSecondEdges) {
    computeSecondEdgeBundling()
   }
}

// Does the bundling of the first edge set when the ChartOptions are set
$: {
   if (!firstEdgesBundlingComplete && chartOptions?.showFirstEdges && hasMounted && chartOptions?.bundleFirstEdges) {
    computeFirstEdgeBundling()
   }
}

// We have to mention this somewhere, else Svelte does not check reactivity
// Even if it is NEVER run. This is caused by some Svelte compiler magic.
// Do not remove this unless you refer to $lockedInNodes any other place
$: if (false) {
    console.log($lockedInNodes)
}


function updateParentChildPairs() {
    $parentChildPairs[0] = !$parentChildPairs[0]
}


$: calculateNodeStroke = (node) => {
    if (node.highlighted) { return "black"; }
    return (hovered || hoveredCategory
                        ? hovered === node ||
                        hoveredCategory === node.category
                            ? "black"
                            : "transparent"
                        : "transparent");
};

$: calculateNodeOpacity = (node) => {
    if (node.highlighted) { return 1; }
    return (hovered || hoveredCategory
                        ? hovered === node ||
                        hoveredCategory === node.category
                            ? 0.5
                            : 0.25
                        : 0.5);
};

$: calculateEdgeColor = (node, edge, edgeType) => {
    if (node.highlighted || hovered === node) { return chartOptions.colorHighlightedEdges; }
    if (edgeType === "PRIMARY") { return chartOptions.colorFirstEdges; }
    if (edgeType === "SECONDARY") {return chartOptions.colorSecondEdges; }
};

$: calculateEdgeWidth = (node, edge, edgeType) => {
    if (node.highlighted || hovered === node) { return chartOptions.strokeWidthHighlightedEdges; }
    if (edgeType === "PRIMARY") { return chartOptions.strokeWidthFirstEdges; }
    if (edgeType === "SECONDARY") {return chartOptions.strokeWidthSecondEdges; }

};

/**
 * Returns the locked in nodes
 */
export function getLockedInNodes() {
    return $lockedInNodes;
}

/**
 * Returns the current nodes
 */
export function getNodes() {
    // Currently just return empty since we modify nodes a lot here
    return [];
}
</script>

{#if chartOptions && hasMounted}

<div class="chart-wrapper">
<div class="plot-container" bind:clientWidth={width}>
    <svg {width} {height}>
        
        <!-- Axis' -->
        {#if chartOptions.showAxis}
            <line
            x1={width / 2}
            x2={width / 2}
            y1={0}
            y2={height}
            stroke="hsla(212, 10%, 53%, 1)"
        />
            <line
                x1={0}
                x2={width}
                y1={height / 2}
                y2={height / 2}
                stroke="hsla(212, 10%, 53%, 1)"
            />          
        {/if}
        <g
            class="inner-chart"
            transform="translate({margin.left}, {margin.top})"
        >
            <!-- Create nodes -->
            {#each nodes as node, i}
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <circle
                    cx={xScale(node.drtX)}
                    cy={yScale(node.drtY)}
                    r={(chartOptions.defaultNodeSize ? chartOptions.defaultNodeSize : 1)}
                    fill={colorMap.get(node.category)}
                    stroke={calculateNodeStroke(node)}
                    opacity={calculateNodeOpacity(node)}
                    on:mouseover={(e) => {
                        // To avoid 'hovering' while moving
                        if (!moving) {
                            hovered = node;
                        }
                        
                    }}
                    on:focus={() => {
                        hovered = node;
                    }}
                    on:mouseleave={() => {
                        hovered = null;
                    }}
                    tabindex="0"
                />

            <!-------------------------------------------->
            <!---------------- DRAW EDGES ---------------->
            <!-------------------------------------------->
                <!-- Primary Edges -->
                {#if (chartOptions?.showFirstEdges &&chartOptions?.useFirstEdges && hasMounted)}
                    
                    <!-- Bundled Primary Edges -->
                    {#if (chartOptions?.bundleFirstEdges && firstEdgesBundlingComplete)}
                        {#each node.outgoingBundledPrimaryEdges as edge}
                            <path d={edge.path} stroke={calculateEdgeColor(node, edge, "PRIMARY")} stroke-width={calculateEdgeWidth(node, edge, "PRIMARY")} fill="none"/>
                        {/each}
                    
                    <!-- Unbundled Primary Edges -->
                    {:else if (!chartOptions?.bundleFirstEdges)}
                        {#each node.outgoingPrimaryEdges as edge}
                        <line x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} stroke={calculateEdgeColor(node, edge, "PRIMARY")} stroke-width={calculateEdgeWidth(node, edge, "PRIMARY")} fill="none"/>
                        {/each}  
                    {/if}
                {/if}

                <!-- Secondary Edges -->
                {#if (chartOptions?.showSecondEdges &&chartOptions?.useSecondEdges && hasMounted)}
    
                <!-- Bundled Secondary Edges -->
                {#if (chartOptions?.bundleSecondEdges && secondEdgesBundlingComplete)}
                    {#each node.outgoingBundledSecondaryEdges as edge}
                        <path d={edge.path} stroke={calculateEdgeColor(node, edge, "SECONDARY")} stroke-width={calculateEdgeWidth(node, edge, "SECONDARY")} fill="none"/>
                    {/each}
                
                <!-- Unbundled Secondary Edges -->
                {:else if (!chartOptions?.bundleSecondEdges)}
                    {#each node.outgoingSecondaryEdges as edge}
                        <line x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} stroke={calculateEdgeColor(node, edge, "SECONDARY")} stroke-width={calculateEdgeWidth(node, edge, "SECONDARY")} fill="none"/>
                    {/each}  
                {/if}
            {/if}

            {/each}                

        </g>            
    </svg>
{#if hovered && chartOptions.showToolTip && !moving}
    <Tooltip
        node={hovered}
        width={innerWidth}
        height={innerHeight}
        {xScale}
        {yScale}
        {colorMap}
        outerMargin={margin}
    />
{/if}
</div>
<div class="right-side">
<Legend {colorMap} {nodes} bind:hoveredCategory />
<div class="label-container">
    <p>Locked-in nodes: </p>
    <input type="text" class="text-field" id="text-input" bind:value={$lockedInNodesString}>
    {#if lockedInNodesHasError}
    <p class="error-message">Must be comma-separated id's</p>    
    {/if}

</div>
</div>
</div>
{/if}



<style>
    circle {
        /* transition: opacity 500ms ease; */
        cursor: pointer;
    }

    .chart-wrapper {
        display: flex;
        border: 1px solid rgba(0, 0, 0, 0.1);
    }

    path, line {
        pointer-events: none;
    }

    .right-side {
        margin-left: 10px;
        border-left: 1px solid rgba(0,0,0, 0.05);
    }

    p {
        margin-top: 0px;
        margin-bottom: 0px;
    }

    .label-container {
        margin-top: 15px;
    }

    .error-message {
        color: rgba(255, 50, 50, 0.85);
        font-size: 12px;
    }
</style>
