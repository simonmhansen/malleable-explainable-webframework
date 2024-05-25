# Web Framework for Malleable and Explainable Visualisation

This is a web framework run on the local machine, which aids in making explainable visualisations by creating a higly malleable visualisation environment. For more information see the [`project website`](https://vis-au.github.io/webframework/).

**Disclaimer**: 
This is a very early version. Therefore bugs, crashes and other issues are to be expected. Make sure to save the loadout often. The save-functionality is also in its early stages and the same savefile should not be loaded from twice.

## Setting up
The web framework uses [`Node.js`](https://nodejs.org/en) and [`Svelte`](https://svelte.dev/) so ensure to have these setup beforehand.

When first setting up run:

```bash
npm install .
```

The framework can then be run with:
```bash
npm run dev
```
and is accessible at `localhost:5173` from the browser. The framework has been tested on Google Chrome.


## Using the Framework
### Loading in a data set
Datasets should be placed in `/static/datasets/your-dataset-here.json`. Datasets must in JSON-format.

Charts can have children. The first Chart in every family is set up with template code to load the dataset into the Python environment. This is done with Pandas by default. You are free to change this however you want, but if using the default functionality then ensure the JSON is compatible with Pandas loading from it.

Children can access their parent's `chart`-object with `chart.parent`. Such as:
```python
nodes = chart.parent.nodes
```

Every Chart must initialise a `chart`-object in its Python code.

### Passing the data to the visual model
The Python code should always return a `chart`-object with at least the `nodesJson` attribute being set, with specific attributes. It is recommended to create a Pandas-table with the following layout:

| id  | drtX  | drtY | category  | name  |
|---|---|---|---|---|
|  Used for locking in nodes | x-coordinate  | y-coordinate  | Category for legend  | Name for tooltip  |

It is then recommended to run:
```python
chart.nodesJson = dataframe.to_json(orient="records", lines=True).splitlines()
```
This puts it in the correct format used by the visual model.

The following `chart` attributes are also important to keep in mind:
* `chart.dimensionality`: Set to 2 if you want to show a 2D-visual
* `chart.firstEdgesJson`: JSON of a set of edges between nodes. Should be of the format: 

    {src: source_node_id, dst: destination_node_id}
* `chart.secondEdgesJson`: Same as above
* `chart.useFirstEdges`: Set to true if using the first set of edges
* `chart.useSecondEdges`: Set to true if using the second set of edges
* `chart.firstEdgesTitle`: The title of the first set of edges in the visual model
* `chart.secondEdgesTitle`: The title of the second set of edges in the visual model
* `chart.colorMap`: A map of Category -> "#ffffff" hex-colours.

