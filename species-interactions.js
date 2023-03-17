// Get the input value from the URL parameter
var inputSpeciesName = decodeURIComponent(
  window.location.search.substring(1).split("=")[1]
);

// Get HTML Elements as variables
const output = document.getElementById("my-output");
const debug = document.getElementById("debug-text");

output.innerHTML = `<h3>   ${inputSpeciesName}</h3>`;

// Fetch JSON data from a URL
async function getDataJSON(url) {
  try {
    let data = await fetch(url);
    return await data.json();
  } catch (error) {
    console.log(error);
  }
}

// Fetch Distinct Species List For Country
async function fetchCountrySpeciesList() {
  const url = "https://lepidoptera.glitch.me/localspecies.json";
  const data = await getDataJSON(url);
  return data;
}

// Convert GloBi Response to Node/Edge JSON
async function convertJSON(json) {
  const nativeSpecies = await fetchCountrySpeciesList();
  const sourceDecoded = inputSpeciesName;
  const source = encodeURIComponent(inputSpeciesName);
  const nodes = [];
  const edges = [];
  const names = [];
  nodes.push({ data: { id: source, name: sourceDecoded } });
  names.push(source);
  for (const item of json.data) {
    if (item[0] && item[1]) {
      if (nativeSpecies.includes(item[1])) {
        const interaction = item[0];
        const targetDecoded = item[1];
        const target = encodeURIComponent(item[1]);
        names.push(target);
        nodes.push({ data: { id: target, name: targetDecoded } });
        edges.push({
          data: { source: source, target: target, interaction: interaction },
        });
      }
    }
  }
  const elements = { nodes, edges };
  return { elements: elements, names: names };
}

function removeDuplicates(json) {
  let uniqueData = [];
  let uniqueDataString = [];

  for (let i = 0; i < json.data.length; i++) {
    let dataString = JSON.stringify(json.data[i]);
    if (!uniqueDataString.includes(dataString)) {
      uniqueData.push(json.data[i]);
      uniqueDataString.push(dataString);
    }
  }
  return {
    columns: json.columns,
    data: uniqueData,
  };
}

async function fetchInteractionData(inputSpecies) {
  const url = `https://api.globalbioticinteractions.org/interaction?sourceTaxon=${inputSpecies}&interactionType=ecologicallyRelatedTo&fields=interaction_type,target_taxon_name`;
  const response = await fetch(url);
  const data = await response.json();
  let cleanedJSON = removeDuplicates(data);
  return cleanedJSON;
}

async function fetchNodeThumbnails(names) {
  const DEFAULT_THUMBNAIL_URL =
    "https://upload.wikimedia.org/wikipedia/commons/4/4c/Aylesbury_Duck_Drawing.jpg";
  const promises = names.map((name) => {
    const url = `https://api.globalbioticinteractions.org/imagesForName/${name}`;
    return fetch(url)
      .then((response) => response.json())
      .then((data) => data.thumbnailURL)
      .catch((error) => null); // handle any errors during fetch
  });
  const results = await Promise.allSettled(promises);
  const style = results
    .filter((result) => result.status === "fulfilled" && result.value !== null)
    .map((result, index) => ({
      selector: `'node[id = "${names[index]}"]'`,
      style: {
        "background-image": result.value || DEFAULT_THUMBNAIL_URL,
      },
    }));
  return { style };
}

function combineStyles(style1, style2) {
  const combinedStyle = {
    style: [...style1.style, ...style2.style],
  };
  return combinedStyle;
}

async function initializePortrait(input) {
  const interactionData = await fetchInteractionData(input);
  const interactionDataCy = await convertJSON(interactionData);
  
  const style1 = {
    style: [
      {
        selector: "node",
        style: {
          height: 80,
          width: 80,
          "background-fit": "cover",
          "border-color": "#000",
          "border-width": 3,
          "border-opacity": 0.5,
          label: `data(name)`,
          "text-valign": "center",
          "text-halign": "center",
        },
      },
      {
        selector: "edge",
        style: {
          "curve-style": "bezier",
          width: 9,
          label: `data(interaction)`,
          "target-arrow-shape": "triangle",
          "edge-text-rotation": "autorotate",
          "font-size": 8,
        },
      },
      {
        selector: 'edge[interaction = "eatenBy"]',
        style: {
          "line-color": "#b30000",
          "target-arrow-color": "#b30000",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "killedBy"]',
        style: {
          "line-color": "#b30000",
          "target-arrow-color": "#b30000",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "preyedUponBy"]',
        style: {
          "line-color": "#b30000",
          "target-arrow-color": "#b30000",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "hasPathogen"]',
        style: {
          "line-color": "#7c1158",
          "target-arrow-color": "#7c1158",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "hasParasite"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "parasiteOf"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "hasEctoparasite"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "endoparasiteOf"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "hasEndoparasite"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "hostOf"]',
        style: {
          "line-color": "#0d88e6",
          "target-arrow-color": "#0d88e6",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "hasHost"]',
        style: {
          "line-color": "#0d88e6",
          "target-arrow-color": "#0d88e6",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "adjacentTo"]',
        style: {
          "line-color": "#00b7c7",
          "target-arrow-color": "#00b7c7",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "interactsWith"]',
        style: {
          "line-color": "#86b6ba",
          "target-arrow-color": "#86b6ba",
        },
      },
      {
        selector: 'edge[interaction = "eats"]',
        style: {
          "line-color": "#5ad45a",
          "target-arrow-color": "#5ad45a",
        },
      },
      {
        selector: 'edge[interaction = "preysOn"]',
        style: {
          "line-color": "#5ad45a",
          "target-arrow-color": "#5ad45a",
        },
      },
      {
        selector: 'edge[interaction = "mutualistOf"]',
        style: {
          "line-color": "#8be04e",
          "target-arrow-color": "#8be04e",
        },
      },
      {
        selector: 'edge[interaction = "visitedBy"]',
        style: {
          "line-color": "#dc0ab4",
          "target-arrow-color": "#dc0ab4",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "flowersVisitedBy"]',
        style: {
          "line-color": "#dc0ab4",
          "target-arrow-color": "#dc0ab4",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "visitsFlowersOf"]',
        style: {
          "line-color": "#dc0ab4",
          "target-arrow-color": "#dc0ab4",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "visits"]',
        style: {
          "line-color": "#dc0ab4",
          "target-arrow-color": "#dc0ab4",
          color: "white",
        },
      },
      {
        selector: 'edge[interaction = "pollinates"]',
        style: {
          "line-color": "#e6d800",
          "target-arrow-color": "#e6d800",
        },
      },
      {
        selector: 'edge[interaction = "pollinatedBy"]',
        style: {
          "line-color": "#e6d800",
          "target-arrow-color": "#e6d800",
        },
      },
    ],
  };

  // W.I.P Thumbnails
  //const style2 = await fetchNodeThumbnails(interactionDataCy.names);
  //const combinedStyles = combineStyles(style1, style2);

  var cy = cytoscape({
    container: document.getElementById("cy"),
    boxSelectionEnabled: false,
    autounselectify: true,
    style: style1.style,
    elements: interactionDataCy.elements,
    layout: {
      name: "concentric",
    },
  });

  cy.on("tap", "node", async function (e) {
    const node = e.target;
    const nodeId = node.id();

    // Open a new Portrait for Tapped Node
    const portraitURL = "species-interactions.html?input=" + nodeId;
    window.open(portraitURL, "_blank");

    /*
    //Open an Info Page for Tapped Node
    const apiUrl = `https://api.globalbioticinteractions.org/findExternalUrlForTaxon/${nodeId}`;
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        const url = data.url;
      //debug.innerHTML = `<p>Debug: ${apiUrl}</p>`;
      window.open(url, '_blank');
      })
    */
  });
}

initializePortrait(inputSpeciesName);
