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

function removeInvalidStrings(obj) {
  for (let i = 0; i < obj.data.length; i++) {
    if (
      obj.data[i][1] === "no name" ||
      obj.data[i][1] === "cultivated" ||
      obj.data[i][1].length > 50 ||
      obj.data[i][1].startsWith("BOLD") ||
      obj.data[i][1].startsWith("UCSC") ||
      obj.data[i][1].startsWith("EMEC") ||
      obj.data[i][1].startsWith("TTU") ||
      obj.data[i][1].startsWith("UTAH") ||
      obj.data[i][1].startsWith("http")
    ) {
      obj.data = obj.data.filter((_, index) => index !== i);
      i--;
    }
  }
  return obj;
}

// Remove duplicate JSON objects
function cleanInteractionData(json) {
  let uniqueData = [];
  let uniqueDataString = [];

  for (let i = 0; i < json.data.length; i++) {
    let dataString = JSON.stringify(json.data[i]);
    if (!uniqueDataString.includes(dataString)) {
      uniqueData.push(json.data[i]);
      uniqueDataString.push(dataString);
    }
  }
  const cleanedData = { columns: json.columns, data: uniqueData };
  const filteredData = removeInvalidStrings(cleanedData);
  return filteredData;
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
async function fetchNationalSpeciesList() {
  const url = "https://lepidoptera.glitch.me/localspecies.json";
  const data = await getDataJSON(url);
  return data;
}

/* W.I.P
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
*/

// Convert GloBi Response to Node/Edge JSON
async function convertJSON(json, species) {
  const nativeSpecies = await fetchNationalSpeciesList();
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
  let cleanedJSON = cleanInteractionData(data);
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
    /* W.I.P
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
    `https://api.redlist.au.dk/public/v1/assessments?speciesName=${encodeURIComponent(
      speciesName
    )}`,
    {
      headers: {
        accept: "application/json",
      },
      method: "GET",
    }
  );
  const json = await response.json();
  if (json.data.length < 1) {
    json.data.push("no Data");
  }
  return json;
}

// Searches GBIF 'Species/Names' JSON for the english vernacular name
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

// Returns Github hosted narrative.json file for a given taxonKey
async function fetchGithubPage(taxonKey) {
  const url = `https://atsmitharc.github.io/data/${taxonKey}.json`;
  try {
    let data = await fetch(url);
    return await data.json();
  } catch (error) {
    console.log(error);
  }
}

// Removes empty/null key/value pairs from a JS object
const removeEmpty = (obj) => {
  Object.entries(obj).forEach(
    ([key, val]) =>
      (val && typeof val === "object" && removeEmpty(val)) ||
      ((val === null || val === "") && delete obj[key])
  );
  return obj;
};

// Removes empty arrays from a JS object
function removeEmptyArrays(obj) {
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => !Array.isArray(item) || item.length > 0)
      .map(removeEmptyArrays);
  } else if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj)
      .filter(([key, value]) => !Array.isArray(value) || value.length > 0)
      .reduce(
        (acc, [key, value]) => ({ ...acc, [key]: removeEmptyArrays(value) }),
        {}
      );
  }
  return obj;
}

// Removes empty objects from a JS object
function removeEmptyObjects(obj) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] && typeof obj[key] === "object") {
      removeEmptyObjects(obj[key]);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    } else if (obj[key] === null || obj[key] === undefined || obj[key] === "") {
      delete obj[key];
    }
  });
  return obj;
}

// Remove emtpy data from National Redlist JSON 
function cleanRodlist(json) {
  const a = removeEmpty(json);
  const b = removeEmptyArrays(a);
  const c = removeEmptyObjects(b);
  return c;
}

// Remove un-needed fields from national redlist data to reduce .gbi size 
function truncateRodlist(r) {
  if (r.speciesInformation) {
    delete r.speciesInformation.arterDKId;
    delete r.speciesInformation.scientificNameAuthorship;
    delete r.speciesInformation.speciesGroup;
    delete r.speciesInformation.family;
    delete r.speciesInformation.taxonId;
    delete r.speciesInformation.order;
  }
}

// Remove un-needed fields from GBIF species data to reduce .gbi size 
function truncateSpecies(s) {
  delete s.nubKey;
  delete s.nameKey;
  delete s.taxonID;
  delete s.sourceTaxonKey;
  delete s.kingdomKey;
  delete s.phylumKey;
  delete s.classKey;
  delete s.orderKey;
  delete s.familyKey;
  delete s.genusKey;
  delete s.speciesKey;
  delete s.datasetKey;
  delete s.constituentKey;
  delete s.parent;
  delete s.parentKey;
  delete s.scientificName;
  delete s.authorship;
  delete s.nameType;
  delete s.rank;
  delete s.origin;
  delete s.taxonomicStatus;
  delete s.nomenclaturalStatus;
  delete s.remarks;
  delete s.publishedIn;
  delete s.numDescendants;
  delete s.lastCrawled;
  delete s.lastInterpreted;
  delete s.issues;
  delete s.synonym;
  delete s.origin;
}

async function fetchSpeciesGBIF(taxonKey) {
  const api = `https://api.gbif.org/v1/species/${taxonKey}`;
  return await getDataJSON(api);
}

async function fetchSpeciesNamesGBIF(taxonKey) {
  const api = `https://api.gbif.org/v1/species/${taxonKey}/vernacularNames`;
  return await getDataJSON(api);
}

async function fetchSpeciesSynonymsGBIF(taxonKey) {
  const api = `https://api.gbif.org/v1/species/${taxonKey}/synonyms`;
  return await getDataJSON(api);
}

// Construct a species portrait from a given GBIF species taxonKey
async function buildSpeciesPortrait(taxonKey) {
  console.time("fetchSpeciesGBIF");
  const species = await fetchSpeciesGBIF(taxonKey);
  console.timeEnd("fetchSpeciesGBIF");
  truncateSpecies(species);
  console.time("fetchInteractionData");
  const interactionData = await fetchInteractionData(species.species);
  console.timeEnd("fetchInteractionData");
  const interactionSet = convertJsonToSet(interactionData);
  console.time("fetchSpeciesNamesGBIF");
  const names = await fetchSpeciesNamesGBIF(taxonKey);
  console.timeEnd("fetchSpeciesNamesGBIF");
  const engName = findName(names);
  console.time("fetchRodlist");
  var rodlist = await fetchRodlist(species.species);
  console.timeEnd("fetchRodlist");
  if (rodlist.data[0] === "no Data") {
    //If national Redlist uses cannonical name instead of species name
    rodlist = await fetchRodlist(species.canonicalName);
  }
  const rodlistClean = cleanRodlist(rodlist);
  truncateRodlist(rodlistClean);
  console.time("fetchGithubPage");
  const narrative = await fetchGithubPage(taxonKey);
  console.timeEnd("fetchGithubPage");
  const sp = {
    species: species,
    vernacularName: engName,
    nationalRedlist: rodlistClean.data[rodlist.data.length - 1],
    narrative: narrative,
    bioticInteractions: interactionSet,
  };
  return sp;
}

// Creates a set of all unique biotic interaction values from an array of Species portraits
// Replaces the initial JSOON
function createSetAndReplace(jsonArray) {
  const set = new Set();
  jsonArray.forEach((obj) => {
    const bioticInteractions = obj.bioticInteractions.data;
    Object.values(bioticInteractions).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((v) => set.add(v));
      } else {
        set.add(value);
      }
    });
  });
  const indexMap = new Map([...set].map((v, i) => [v, i]));
  jsonArray.forEach((obj) => {
    const bioticInteractions = obj.bioticInteractions.data;
    Object.entries(bioticInteractions).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        bioticInteractions[key] = value.map((v) => indexMap.get(v));
      } else {
        bioticInteractions[key] = indexMap.get(value);
      }
    });
  });
  return [...set];
}

// Convert a geoJSON polygon to a Well-Known-Text Polyogn
function geoJSONToWKTPolygon(geoJSON) {
  if (geoJSON.type !== "FeatureCollection") {
    throw new Error("Input must be a GeoJSON FeatureCollection");
  }
  // Extract the first Polygon from the GeoJSON features
  const polygon = geoJSON.features.find((feature) => {
    if (feature.type !== "Feature") {
      throw new Error("GeoJSON features must be Feature objects");
    }
    return feature.geometry.type === "Polygon";
  });
  if (!polygon) {
    throw new Error("No Polygon found in the GeoJSON features");
  }
  // Convert the Polygon coordinates to WKT format
  const wktPoints = polygon.geometry.coordinates[0]
    .map((point) => `${point[0]} ${point[1]}`)
    .join(",");
  // Return the WKT Polygon string
  return `POLYGON((${wktPoints}))`;
}

// Converts a GeoJSON to JTS (for testing self intersection)
function geoJSON2JTS(boundaries) {
  var coordinates = [];
  for (var i = 0; i < boundaries.length; i++) {
    coordinates.push(
      new jsts.geom.Coordinate(boundaries[i][1], boundaries[i][0])
    );
  }
  return coordinates;
}

// Tests a GeoJSON Polygon for self intersection
function findSelfIntersects(geoJsonPolygon) {
  var coordinates = geoJSON2JTS(geoJsonPolygon);
  var geometryFactory = new jsts.geom.GeometryFactory();
  var shell = geometryFactory.createLinearRing(coordinates);
  var jstsPolygon = geometryFactory.createPolygon(shell);
  var validator = new jsts.operation.IsSimpleOp(jstsPolygon);
  if (validator.isSimpleLinearGeometry(jstsPolygon)) {
    return;
  }
  var res = [];
  var graph = new jsts.geomgraph.GeometryGraph(0, jstsPolygon);
  var cat = new jsts.operation.valid.ConsistentAreaTester(graph);
  var r = cat.isNodeConsistentArea();
  if (!r) {
    var pt = cat.getInvalidPoint();
    res.push([pt.x, pt.y]);
  }
  return res;
}
