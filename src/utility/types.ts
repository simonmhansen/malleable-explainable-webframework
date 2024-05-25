export interface ActiveChart {
    parentContainer: HTMLElement | null,
    parentId: string | null,
    parentuuid: string | null,
    uuid: string,
    chartOptions: ChartOption,
    chartMetadata: ChartMetadata
}

export interface ChartOption {
    title: string,
    showToolTip: Boolean,
    defaultNodeSize: Number,
    showAxis: Boolean,
    
    firstEdgesTitle: string,
    useFirstEdges: Boolean,
    showFirstEdges: Boolean,
    bundleFirstEdges: Boolean,
    colorFirstEdges: string,
    strokeWidthFirstEdges: Number,

    secondEdgesTitle: string,
    useSecondEdges: Boolean,
    showSecondEdges: Boolean,
    bundleSecondEdges: Boolean,
    colorSecondEdges: string,
    strokeWidthSecondEdges: Number,

    colorHighlightedEdges: string,
    strokeWidthHighlightedEdges: Number,
}

export interface ChartMetadata {
    originalPosition: {
        left: number,
        top: number
    },
    modelCode: string,

    data: {
        chart: any,
        dimensionality: number,
        colorMap: any,
        rawNodes: Array<any>,
        scatterPlotNodes: Array<any>,
        lockedInNodes: Array<any>,
        firstEdges: Array<any>,
        secondEdges: Array<any>,

    }
}

export const CHART_OPTIONS_DEFAULT_VALUE: ChartOption = {
    title: "Chart",
    showToolTip: true,
    defaultNodeSize: 4,
    showAxis: true,
    
    firstEdgesTitle: "",
    useFirstEdges: false,
    showFirstEdges: false,
    bundleFirstEdges: false,
    colorFirstEdges: "rgba(200,0,0,0.5)",
    strokeWidthFirstEdges: 0.5,

    secondEdgesTitle: "",
    useSecondEdges: false,
    showSecondEdges: false,
    bundleSecondEdges: false,
    colorSecondEdges: "rgba(0,0,200,0.5)",
    strokeWidthSecondEdges: 0.5,

    colorHighlightedEdges: "rgba(0,155,100,0.75)",
    strokeWidthHighlightedEdges: 3,
}

export const CHART_METADATA_DEFAULT_VALUE: ChartMetadata = {
    originalPosition: {
        left: 100,
        top: 100
    },
    modelCode: "",

    data: null
}