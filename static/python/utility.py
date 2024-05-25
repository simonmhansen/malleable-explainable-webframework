import json as JSON
import pandas as pd
import numpy as np
import dill

class Chart:
    def __init__(self, chartUUID, parentUUID):
        self.UUID: str = chartUUID
        self.drt = None
        
        self.parentUUID: str = parentUUID
        self.parent: Chart = chartMap.get(parentUUID)

        # Only use these if this is to load a dataset from static files
        self.dataset = None
        self.datasetPath = ""
        self.shouldLoadDataset = False

        """
        In the final node JSON the following values for each node are important:
        name: Sets header in tooltip
        id: Used for all edges, for locked-in nodes, and in tooltip
        category: Used for legend categories and tooltip category
        """
        self.rawNodes: pd.DataFrame = None # nodes without metadata
        self.nodes: pd.DataFrame = None
        self.nodesJson = None

        # First Edge Set
        self.useFirstEdges = False # Lets edges be displayed and options in the optionspane
        self.firstEdgesTitle = ""  # Sets title in Chart Options-pane
        self.firstEdges = None # Embedding of first edges. Must be on form {source: id of source node, target: id of target node}
        self.firstEdgesJson = None
        self.firstEdgesProperties = {
            "visible": False,
            "strokeColor": "blue",
            "stroke-width": 0.10,
            "opacity": 0.50
        }

        # Secondary Edge Set
        self.useSecondEdges = False # Lets edges be displayed and options in the optionspane
        self.secondEdgesTitle = "" # Sets title in Chart Optionspane
        self.secondEdges = None # Embedding of first edges. Must be on form {source: id of source node, target: id of target node}
        self.secondEdgesJson = None
        self.secondEdgesProperties = {
            "visible": False,
            "strokeColor": "black",
            "stroke-width": 0.10,
            "opacity": 0.50
        }

        # Chart Meta-configuration
        self.title: str = "Chart"
        self.dimensionality: int = 0; # Scatterplot only plots if value is "2"
        self.extras: list = list() # a list of extra values, if needed
        self.colorMap: None # A dictionary used to map category -> color

        # Add self to chart map
        chartMap[self.UUID] = self


    def loadDataset(self, datasetJson):
        # Load in the dataset into a data frame from JSON
        dataframe: pd.DataFrame = pd.read_json(datasetJson)

        # Get the dimensionality from the data frame
        self.nodes = dataframe
        self.dimensionality = len(dataframe.columns)

def convertEdgesToJson(edges):
    edgeList = edges.tolist()
    edgeDict = [{"src": edge[0], "dst": edge[1]} for edge in edgeList]
    edgeJson = JSON.dumps(edgeDict, indent=4)
    return edgeJson