// Credit goes to https://gist.github.com/sjengle/2e58e83685f6d854aa40c7bc546aeb24
import { scaleLinear } from "d3-scale";
import { line, curveBundle } from "d3";
import { forceSimulation, forceManyBody, forceLink } from 'd3-force';



/**
 * Turns a single edge into several segments that can be used for simple edge bundling.
 * @param {} nodes all nodes including control nodes
 * @param {} links all individual segments (source to target) 
 * @param {} hypotenuse all segments combined into single path for drawing
 * @returns 
 */
function generateSegments(nodes, links, hypotenuse) {
    let bundle = {nodes: [], links: [], paths: []};

    // Make existing nodes fixed
    bundle.nodes = nodes.map(function(d, i) {
        d.fx = d.x;
        d.fy = d.y;
        return d;
    });

    // Used to split edges into 1-20 segments based on how long they are compared to the hypotenuse of the SVG
    let segmentScale = scaleLinear()
        .domain([0, hypotenuse])
        .range([1, 20])


    links.forEach(function(d, i) {
        // calculate the distance between the source and target
        let length = distance(d.source, d.target);

        // calculate total number of inner nodes for this link
        // -> d3 scaleLinear from [0, hypotenuse (of svg container)] -> [1,10] which we then round down
        let total = Math.round(segmentScale(length));

        // create scales from source to target
        let edgeXscale = scaleLinear()
            .domain([0, total + 1]) // source, inner nodes, target
            .range([d.source.x, d.target.x]);

        let edgeYscale = scaleLinear()
            .domain([0, total + 1])
            .range([d.source.y, d.target.y]);


        // initialize source node
        let source = d.source;
        let target = null;

        // add all points to local path
        let local = [source];

        for (let j = 1; j <= total; j++) {
        // calculate target node
        target = {
            x: edgeXscale(j),
            y: edgeYscale(j)
        };

        local.push(target);
        bundle.nodes.push(target);

        bundle.links.push({
            source: source,
            target: target
        });

        source = target;
        }

        local.push(d.target);

        // add last link to target node
        bundle.links.push({
            source: target,
            target: d.target
        });

        bundle.paths.push(local);
    });

    return bundle;
}

/**
 * Calculates the distance between two nodes by: sqrt( (x2 - x1)^2 + (y2 - y1)^2 )
 * @param {} source 
 * @param {} target 
 * @returns 
 */

function distance(source, target) {
  const dx2 = Math.pow(target.x - source.x, 2);
  const dy2 = Math.pow(target.y - source.y, 2);

  return Math.sqrt(dx2 + dy2);
}

/**
 * Does Force-Directed Edge Bundling on the given data
 * @param {} nodes 
 * @param {} links 
 * @param {} hypotenuse 
 * @returns 
 */
export async function calculateEdgeBundling(nodes, links, hypotenuse) {
    return new Promise((resolve, reject) => {
        let segmentBundle = generateSegments(nodes, links, hypotenuse)

        let bundledEdges = []

        let lineGenerator = line()
            .curve(curveBundle)
            .x(d => d.x)
            .y(d => d.y);

        // Set up the force simulation
        let layout = forceSimulation()
            .alphaDecay(0.2)
            .force("charge", forceManyBody()
                .strength(5)  // 12,9,0.7 is too weak
                .distanceMax(8)  //100 -> everything goes to center, 50 -> clusters
            )
            .force("link", forceLink()
                .strength(0.7) // breaks at 100 - screen is filled at 8 - screen starts getting filled at 6.5, 5.0 and 0.7 look the same...
                .distance(0)
            )
            .on("tick", function(d) {
                // For each link in the bundle, generate its SVG path and store it
                bundledEdges = []
                segmentBundle.paths.forEach(path => {
                    let pathData = lineGenerator(path);
                    // Each path consists of [source, ... middle segments..., target] so return first / last elements + path
                    let bundledEdge = {source: path[0], target: path[path.length - 1], path: pathData}
                    bundledEdges.push(bundledEdge);
                });
            })
            .on("end", function(d) {
                console.log("layout complete");
                resolve(bundledEdges)
            });
        
        // Initialize the layout with nodes and links
        layout.nodes(segmentBundle.nodes).force("link").links(segmentBundle.links);
    });
}
