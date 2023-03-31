// Normalize a string
function normalize(string) {
  return string.trim().toLowerCase();
}

// Fetch JSON data from a URL
async function getDataJSON(url) {
  try {
    let data = await fetch(url);
    return await data.json();
  } catch (error) {
    console.log(error);
  }
}

// Creates a unique set out of Globi interaction data
function convertJsonToSet(json) {
  let result = { data: {} };
  for (let i = 0; i < json.data.length; i++) {
    const key = json.data[i][0];
    const value = json.data[i][1];
    if (result.data[key] === undefined) {
      result.data[key] = [value];
    } else {
      result.data[key].push(value);
    }
  }
  return result;
}

// Remove duplicate features from a collection of features
function getUniqueFeatures(features, comparatorProperty) {
  const uniqueIds = new Set();
  const uniqueFeatures = [];
  for (const feature of features) {
    const id = feature.properties[comparatorProperty];
    if (!uniqueIds.has(id)) {
      uniqueIds.add(id);
      uniqueFeatures.push(feature);
    }
  }
  return uniqueFeatures;
}

// Remove duplicate JSON objects
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

// Remove duplicate nodes and Edged from Cytoscpe elements formatted JSON
function removeDuplicateNodesEdges(json) {
  const uniqueNodes = new Map();
  const uniqueEdges = new Set();
  const nodes = json.nodes.filter((node) => {
    const id = node.data.id;
    if (uniqueNodes.has(id) || id.includes("BOLD") || id.includes("http")) {
      return false;
    }
    uniqueNodes.set(id, true);
    return true;
  });
  const edges = json.edges.filter((edge) => {
    const source = edge.data.source;
    const target = edge.data.target;
    const key = `${source}:${target}`;
    if (
      uniqueEdges.has(key) ||
      source.includes("BOLD") ||
      source.includes("http") ||
      target.includes("BOLD") ||
      target.includes("http")
    ) {
      return false;
    }
    uniqueEdges.add(key);
    return true;
  });
  return { nodes, edges };
}

// Fetch a Species Checklist for a country (hardcoded to Denmark)
async function fetchCountrySpeciesList() {
  const url = "https://lepidoptera.glitch.me/localspecies.json";
  const data = await getDataJSON(url);
  return data;
}

// Fetch thumbnails given an array of species names and format results into Cytoscape Stylesheet
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

// Convert GloBi Response to Node/Edge JSON
async function convertJSON(json, species) {
  const nativeSpecies = await fetchCountrySpeciesList();
  const source = encodeURIComponent(species);
  const nodes = [];
  const edges = [];
  const names = [];
  nodes.push({ data: { id: source, name: species } });
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
      } //if native species
    }
  }
  const elements = { nodes, edges };
  return { elements: elements, names: names };
}

// Fetches and cleans interaction data response from GloBi for a given species 
async function fetchInteractionData(species) {
  const speciesURI = encodeURIComponent(species);
  const url = `https://api.globalbioticinteractions.org/interaction?sourceTaxon=${speciesURI}&interactionType=ecologicallyRelatedTo&fields=interaction_type,target_taxon_name`;
  const response = await fetch(url);
  const data = await response.json();
  let cleanedJSON = removeDuplicates(data);
  return cleanedJSON;
}

// Initializes a Cytoscape directed graph into the given container with all GloBi interactions for the given species
async function initInteractionsCy(species, containerID) {
  const interactionData = await fetchInteractionData(species);
  const interactionDataCy = await convertJSON(interactionData, species);
  const style = await getDataJSON(
    "https://lepidoptera.glitch.me/cytoscape-style.json"
  );
  var cy = cytoscape({
    container: document.getElementById(containerID),
    boxSelectionEnabled: false,
    autounselectify: true,
    style: style.style,
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
    return interactionData;
  });
}

// Fetch assessment for species on DK Redlist
async function fetchRodlist(speciesName) {
  const response = await fetch(
    `https://api.redlist.au.dk/public/v1/assessments?speciesName=${encodeURIComponent(speciesName)}`,
    {
      headers: {
        accept: "application/json",
      },
      method: "GET",
    }
  );
  const json = await response.json();
  console.log(json);
  return json;
}

function findName(json) {
  for (let i = 0; i < json.results.length; i++) {
    if (json.results[i].language === "eng") {
      return json.results[i].vernacularName;
    }
  }
  for (let i = 0; i < json.results.length; i++) {
    if (json.results[i].language === "") {
      return json.results[i].vernacularName;
    }
  }
  return "noVernacularName";
}

// Appends text to a DOM element by ID. Red "No Data" if text is empty or null 
function appendText(domID, text) {
  if (text.length === 0 || text === null || Object.keys(text).length === 0) {
   const s = document.createElement('span');
   s.style.color = 'red';
   s.textContent = 'No Data';
   document.getElementById(domID).appendChild(s);  
  } else {
   document.getElementById(domID).appendChild(document.createTextNode(text));  
  }
}

// Appends "Yes" or "No" to a DOM element by ID when given a bool 
function appendBoolText(domID, bool) {
  var text = (bool == true) ? 'Yes' :'No';
  document
    .getElementById(domID)
    .appendChild(document.createTextNode(text));
}

