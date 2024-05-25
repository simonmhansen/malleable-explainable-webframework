def main(datasetJson, chartUUID, parentUUID, args):
    """ Should always return a Chart. 
    Else the Svelte and the children will have trouble accessing data.
    """
    chart = Chart(chartUUID, parentUUID)

    # Now run your code here



    return chart