def main(datasetJson, chartUUID, parentUUID, args):
    """ Should always return a Chart. 
    Else the Svelte and the children will have trouble accessing data.
    """
    chart = Chart(chartUUID, parentUUID)
    
    # This makes Svelte load in the dataset at the path, and then use that as "datasetJson"
    # and call this code again.
    chart.datasetPath = "datasets/your-dataset.json"

    chart.shouldLoadDataset = True

    if (datasetJson):
        chart.loadDataset(datasetJson)

    return chart