<script>
    export let colorMap;
    export let hoveredCategory;
    export let nodes;

    let categories = nodes
        .map((e) => e.category)
        .filter((value, index, self) => self.indexOf(value) === index)
</script>

<div class='legend'>
    {#each categories as category}
        <p
            on:mouseover={() => {hoveredCategory = category}}
            on:focus={() => {hoveredCategory = category}}
            on:mouseleave={() => {hoveredCategory = null}}
            class:unhovered={hoveredCategory && (hoveredCategory !== category)}
        >
            <span style="background-color: {colorMap.get(category)}"/>
            {category}
        </p>
    {/each}
</div>

<style>
    .legend {
        display: flex;
        flex-direction: column;
        margin-top: 3px;
    }

    span {
        display: inline-block;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.25);
        min-width: 9px;
        max-width: 9px;
        min-height: 9px;
        max-height: 9px;
    }

    p {
        font-size: 10px;
        display: flex;
        align-items: center;
        /* transition: opacity 300ms ease; */
        column-gap: 2px;
        margin-top: 0px;
        margin-bottom: 0px;
        margin-left: 5px;
    }

    .unhovered {
        opacity: 0.3;
    }
</style>