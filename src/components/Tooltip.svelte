<script lang="ts">
export let node;
export let width: Number;
export let height: Number;
export let xScale;
export let yScale;
export let colorMap;
export let outerMargin;

let tooltipWidth: Number;
let tooltipHeight: Number;

$: x = xScale(node.drtX);
$: y = yScale(node.drtY);

const xNudge = 20;
const yNudge = 0;

$: isOutsideChartX = tooltipWidth + x + xNudge > width
$: xPosition = isOutsideChartX ? 
        x - xNudge + outerMargin.left - tooltipWidth
    :   x + xNudge + outerMargin.left

$: isOutsideChartY = tooltipHeight + y + yNudge > height
$: yPosition = isOutsideChartY ? 
        y - yNudge + outerMargin.top - tooltipHeight
    :   y + yNudge + outerMargin.top
</script>

<div class="tooltip"
    bind:clientWidth={tooltipWidth}
    bind:clientHeight={tooltipHeight}
    style="left: {xPosition}px; top: {yPosition}px;"
>
    <h1>{node.name}</h1>
    <div class="info">
        <span class="category" style="background: {colorMap.get(node.category)}">{node.category}</span>
        <span class="area">{node.id}</span>
    </div>
</div>

<style>
    .tooltip {
        position: absolute;
        background: white;
        box-shadow: 2px 3px 8px rgba(0,0,0, 0.15);
        padding: 4px 6px;
        border-radius: 3px;
        pointer-events: none;
    }


    .info {
        display: flex;
        justify-content: space-between;
        column-gap: 8px;
        align-items: center;
    }

    .category {
        font-size: 12px;
        padding-left: 2px;
        padding-right: 2px;
    }

    .area {
        font-size: 10px;
        padding: 3px;
        border-radius: 3px;
        text-transform: uppercase;
    }

    h1 {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 0px;
        margin-top: 0px;
    }
</style>