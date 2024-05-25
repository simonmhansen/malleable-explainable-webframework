import { writable, type Writable } from "svelte/store";

import { CHART_METADATA_DEFAULT_VALUE, CHART_OPTIONS_DEFAULT_VALUE, type ActiveChart, type ChartMetadata, type ChartOption } from "./types";

export const isEditorVisible = writable(false);

export const chartEditorIsAttachedTo = writable("$model0");

export const activeCharts: Writable<ActiveChart[]> = writable([]);

export const modelURIMap = writable(new Map())

export const parentChildPairs = writable([false, ])

export const initialiserPythonRun = writable(false);

export const uuidChartMap = writable(new Map());

/**
 * Creates a new active Chart and adds it to the visual environment.
 * @param parentContainer 
 * @param parentId 
 * @param parentuuid 
 * @param uuid 
 * @param chartOptions 
 * @param chartMetadata 
 * @param restoredFromSaveFile 
 */
export function createNewActiveChart(parentContainer?: HTMLElement, parentId?: String, parentuuid?: String, uuid?: String, chartOptions?: ChartOption, chartMetadata?: ChartMetadata, restoredFromSaveFile?: Boolean) {
    console.log("Creating New Active Chart")
    console.log(parentContainer, parentId, parentuuid, uuid, chartMetadata, restoredFromSaveFile)
    activeCharts.update(arr => [...arr, {
        parentContainer: parentContainer ? parentContainer : null, 
        parentId: parentId ? parentId : null,
        parentuuid: parentuuid ? parentuuid : null, 
        uuid: uuid ? uuid : crypto.randomUUID(),
        chartOptions: chartOptions ? chartOptions : CHART_OPTIONS_DEFAULT_VALUE,
        chartMetadata: chartMetadata ? chartMetadata : CHART_METADATA_DEFAULT_VALUE,
        restoredFromSaveFile: restoredFromSaveFile ? restoredFromSaveFile : false
    }]);
}

/**
 * Removes a given Chart from the setup.
 * @param uuid uuid of the Chart to be removed
 */
export function removeActiveChart(uuid: String) {
    activeCharts.update(arr => arr.filter(c => c?.uuid !== uuid));
}