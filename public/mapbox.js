// Initialize Mapbox Map
mapboxgl.accessToken =
  "pk.eyJ1IjoiYXRzbWl0aGFyYyIsImEiOiJjbGJ5eGx0MXEwOXh2M3BtejBvNmUzM3VpIn0.6cxXNEwIUQeui42i9lbHEg";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [12.6074, 55.6921],
  zoom: 14,
  antialias: true,
});

// Define Global Map Elements (i.e.  Sources, Layers, Symbols)
// GBIF Source - All Occurences with Coordinates
const occurencesSource = {
  type: "vector",
  tiles: ["https:api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}.mvt?"],
  minzoom: 5,
  maxzoom: 22,
};

// GBIF Source - All ICUN (EU) Redlisted Species Occurences
const icunThreatSource = {
  type: "vector",
  url: "mapbox://atsmitharc.clffbm21d3c712bl8p9oqezoq-4t6ud",
};

// AWS/DataForSyningen Source - DEM/DTM Digital Elevation Map (Terrain)
const augmentedDemSource = {
  type: "raster-dem",
  tiles: [
    "https://lepidoptera-dem.s3.eu-north-1.amazonaws.com/DTM1761772/{z}/{x}/{y}.png",
  ],
  tileSize: 512,
  minzoom: 17,
  maxzoom: 17,
  encoding: "terrarium",
};

// GBIF Layer - All Species Occurences show as small green dots
const occurencesLayer = {
  id: "occurence",
  type: "circle",
  source: "maps-occurences",
  "source-layer": "occurrence",
  paint: {
    "circle-radius": 1.5,
    "circle-color": "#679602",
  },
  layout: {
    visibility: "visible",
  },
};

// GBIF Layer - ICUN Redlist Occurences show as bigger red dots
const icunThreatLayer = {
  id: "icunThreat",
  type: "circle",
  source: "maps-icunThreat",
  "source-layer": "ICUN_CPH_01",
  paint: {
    "circle-radius": 3,
    "circle-color": "#FF0000",
  },
  layout: {
    visibility: "visible",
  },
};

// Mapbox Layer - 3D Buildings show as ghosted extrusions
const buildingsLayer = {
  id: "3d-buildings-layer",
  source: "composite",
  "source-layer": "building",
  filter: ["==", "extrude", "true"],
  type: "fill-extrusion",
  minzoom: 15,
  paint: {
    "fill-extrusion-color": "#aaa",
    "fill-extrusion-height": [
      "interpolate",
      ["linear"],
      ["zoom"],
      15,
      0,
      15.05,
      ["get", "height"],
    ],
    "fill-extrusion-base": [
      "interpolate",
      ["linear"],
      ["zoom"],
      15,
      0,
      15.05,
      ["get", "min_height"],
    ],
    "fill-extrusion-opacity": 0.6,
  },
};

// Mapbox Layer - Add shading effect to map based on DEM Terrain
const hillshadeLayer = {
  id: "hillshading",
  source: "augmented-dem",
  type: "hillshade",
};

// Symbols/Icons displayed for different species occurences based on kingdoms
const mapSymbols = [
  {
    name: "Fungi",
    layerName: "poi-Fungi",
    url: "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F344_color.png?v=1673530588031",
  },
  {
    name: "Plantae",
    layerName: "poi-Plantae",
    url: "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F33F_color.png?v=1673530596322",
  },
  {
    name: "Animalia",
    layerName: "poi-Animalia",
    url: "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F9AB_color.png?v=1673530602195",
  },
  {
    name: "Chromista",
    layerName: "poi-Chromista",
    url: "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/E011_color.png?v=1673631942440",
  },
  {
    name: "Bacteria",
    layerName: "poi-Bacteria",
    url: "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F9EB_color.png?v=1673700315309",
  },
  {
    name: "Incertae Sedis",
    layerName: "poi-Incertae Sedis",
    url: "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/2753_color.png?v=1673537140302",
  },
];

// Assign Document Elements to variables
const ffilter = document.getElementById("feature-filter");
const flisting = document.getElementById("feature-listing");
const filterGroup = document.getElementById("filter-group");
const functionGroup = document.getElementById("function-group");
const debug = document.getElementById("debug-text");
const styleMenu = document.getElementById("style-menu");
const styleMenuInputs = styleMenu.getElementsByTagName("input");

// Persistant Variables
var lastPOIClicked = "";
let airports = [];
const lastPolygon = {};
const occurenceData = {};
const eeData = {};
const draw = newMapboxDraw();

// Reset the map style if user clicks a new style in the style menu
for (const input of styleMenuInputs) {
  input.onclick = (layer) => {
    $(".lds-grid").show();
    const layerId = layer.target.id;
    map.setStyle("mapbox://styles/mapbox/" + layerId);
    $(".lds-grid").hide();
  };
}

// Create an empty Species Occurence Mapbox Popup
const popupOffsets = { bottom: [0, -10] };
const popup = new mapboxgl.Popup({
  offset: popupOffsets,
  closeButton: false,
  anchor: "bottom",
  className: "mapboxgl-popup",
  maxWidth: "none",
});

// Returns a Species Occurence Mapbox Popup for a given species occurence map GeoJSON feature. Also centers the map over the new popup.
function poiPopup(f) {
  const input = f.properties.name;
  const taxonkey = f.properties.key;
  const encodedInput = encodeURIComponent(input);
  const encodedTaxonKey = encodeURIComponent(taxonkey);
  const interactionURL = "species-interactions.html?name=" + encodedInput;
  const portraitURL = "species-portrait.html?key=" + encodedTaxonKey;
  // Center the map on popup
  map.flyTo({ center: f.geometry.coordinates });
  popup
    .setLngLat(f.geometry.coordinates)
    .setHTML(
      `
        <div class="grid-container">
    <div class="grid-child-left">
        <a href="https://www.gbif.org/occurrence/${f.properties.key}" target="_blank" rel="noopener noreferrer"><img
                src="${f.properties.image}"></a>
    </div>
    <div class="grid-child-right">
        <h1>
            <a href="https://www.gbif.org/occurrence/${f.properties.key}" target="_blank" rel="noopener noreferrer">
                ${f.properties.name}
            </a>
        </h1>
        <p>
            <a href="https://www.gbif.org/occurrence/${f.properties.key}" target="_blank" rel="noopener noreferrer">
                ${f.properties.abbrev}
            </a>
        </p>
        <p>
            <a href="https://en.wikipedia.org/wiki/IUCN_Red_List" target="_blank" rel="noopener noreferrer">
                Threat Level: ${f.properties.iucnRedListCategory}
            </a>
        </p>
        <p>
        <div class="interaction-button">
            <a href="${interactionURL}" target="_blank" rel="noopener noreferrer">
                Interactions
        </div>
        <div class="portrait-button">
            <a href="${portraitURL}" target="_blank" rel="noopener noreferrer">
                Portrait
        </div>
        </a>
        </p>
    </div>
</div>
`
    )
    .addTo(map);
}

// Initialize Occurence Filter List
function renderListings(features) {
  const empty = document.createElement("p");
  // Clear any existing feature listings
  flisting.innerHTML = "";
  if (features.length) {
    for (const feature of features) {
      const itemLink = document.createElement("a");
      const label = `${feature.properties.name} [${feature.properties.iucnRedListCategory}]`;
      itemLink.target = "_blank";
      itemLink.textContent = label;
      itemLink.addEventListener("mouseenter", () => {
        // Highlight corresponding feature on the map
        popup.setLngLat(feature.geometry.coordinates).setText(label).addTo(map);
      });
      itemLink.addEventListener("click", () => {
        poiPopup(feature);
      });
      flisting.appendChild(itemLink);
    }
    // Show the filter input
    ffilter.parentNode.style.display = "block";
  } else if (features.length === 0 && ffilter.value !== "") {
    empty.textContent = "No results found";
    flisting.appendChild(empty);
  } else {
    // Remove features filter
    if (map.getLayer("airport")) {
      map.setFilter("airport", ["has", "abbrev"]);
    }
  }
}

// Fetch GloBi Species Interaction Data for a list of species (and filter only native results)
async function fetchMultiInteractionData(sourceSpeciesNames) {
  const nativeSpecies = await fetchNationalSpeciesList();
  let uniqueSourceSpecies = [...new Set(sourceSpeciesNames)];
  const nodes = [];
  const edges = [];
  const elements = { nodes, edges };
  // Add all source species to nodes in JSON format
  for (let i = 0; i < uniqueSourceSpecies.length; i++) {
    let source = uniqueSourceSpecies[i];
    let sourceDecoded = decodeURIComponent(source);
    elements.nodes.push({
      data: { id: source, name: sourceDecoded, level: 0 },
    });
  }
  // Gets all targets and interaction types for each source species
  const promises = uniqueSourceSpecies.map((source) => {
    const url = `https://api.globalbioticinteractions.org/interaction?sourceTaxon=${source}&interactionType=ecologicallyRelatedTo&fields=interaction_type,target_taxon_name`;
    return fetch(url)
      .then((response) => response.json())
      .then((data) => data.data)
      .catch((error) => null);
  });
  const results = await Promise.allSettled(promises);
  // Only return fulfilled and non-null results and map them to Cytoscape node/edge JSON format
  const pushResults = await results
    .filter((result) => result.status === "fulfilled" && result.value !== null)
    .map(function (result, index) {
      for (let j = 0; j < result.value.length; j++) {
        if (nativeSpecies.includes(result.value[j][1])) {
          elements.nodes.push({
            data: {
              id: encodeURIComponent(result.value[j][1]),
              name: result.value[j][1],
              level: 1,
            },
          });
          elements.edges.push({
            data: {
              source: uniqueSourceSpecies[index],
              target: encodeURIComponent(result.value[j][1]),
              interaction: result.value[j][0],
            },
          });
        }
      }
      return true;
    });
  return elements;
}

// Get URI encoded species names for all map features in a collection
function getSpeciesArray(mapFeatureCollection) {
  const names = [];
  mapFeatureCollection.forEach((obj) => {
    const name = obj.properties.name;
    names.push(encodeURIComponent(name));
  });
  return names;
}

// Find all unique Taxon IDs in an occurence feature collection
function getUniqueTaxonKeys(json) {
  const taxonKeys = json.features.map((feature) => feature.properties.taxonKey);
  return [...new Set(taxonKeys)];
}

// Fetch narrative data from Github Repo
async function fetchEpw(filename) {
  const url = `https://atsmitharc.github.io/data/${filename}`;
  try {
    let data = await fetch(url);
    return await data.json();
  } catch (error) {
    console.log(error);
  }
}

// Write data to a .json format and download to the browser
function writeJson(exportObj, exportName) {
  var dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".gbi");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

// Download data
async function downloadGBI(occurences, region, eePixelData) {
  const speciesPortraits = [];
  const uniqueTaxons = getUniqueTaxonKeys(occurences);
  let i = 0;
  const length = uniqueTaxons.length;
  const upperLimit = 100;
  if (length < upperLimit) {
    for (const taxon of uniqueTaxons) {
      debug.innerHTML = `<p>Compiling Species Portraits ${i} of ${length} [${taxon}]... </p>`;
      const sp = await buildSpeciesPortrait(taxon);
      speciesPortraits.push(sp);
      i = i + 1;
    }
    const interactors = createSetAndReplace(speciesPortraits);
    debug.innerHTML = `<p>Compiling Climate Data... </p>`;
    const climate = await fetchEpw("DNK_Copenhagen.061800_IWEC_EPW.json");
    const gbi = {
      region,
      occurences,
      speciesPortraits,
      interactors,
      climate,
      eePixelData,
    };
    debug.innerHTML = ``;
    writeJson(gbi, `${map.getCenter()}`);
  } else if (length >= upperLimit) {
    debug.innerHTML = `<p> Error: Too many Species Selected[${length}]. Limit = 100</p>`;
  }
}

// Add Data Sources and Layers to Mapbox Map
function addBaseSourcesAndLayers() {
  map.addSource("maps-occurences", occurencesSource);
  map.addSource("maps-icunThreat", icunThreatSource);
  map.addSource("augmented-dem", augmentedDemSource);
  map.setTerrain({ source: "augmented-dem", exaggeration: 1.5 });
  map.addLayer(occurencesLayer);
  map.addLayer(icunThreatLayer);
  map.addLayer(buildingsLayer);
  map.addLayer(hillshadeLayer, "land-structure-polygon");
}

function newMapboxDraw() {
  // Initialize Mapbox GL Draw Module and add drawing control to map
  let modes = MapboxDraw.modes;
  modes = MapboxDrawWaypoint.enable(modes);
  return new MapboxDraw({
    modes,
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true,
    },
  });
}

map.on("load", () => {
  map.boxZoom.disable();
  map.addControl(draw);
});

// A collection of functions to execute when the Mapbox map first loads/initializes
map.on("style.load", () => {
  addBaseSourcesAndLayers();
  // Load all map symbols and establish cursor/click bahavoir for them
  for (const symbol of mapSymbols) {
    map.loadImage(symbol.url, (error, image) => {
      if (error) throw error;
      if (!map.hasImage(symbol.name)) map.addImage(symbol.name, image);
    });
    map.on("mousemove", symbol.layerName, (e) => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("touchend", symbol.layerName, (e) => {
      const feature = e.features[0];
      poiPopup(feature);
    });
    map.on("click", symbol.layerName, (e) => {
      const feature = e.features[0];
      poiPopup(feature);
    });
    map.on("mouseleave", symbol.layerName, (e) => {
      map.getCanvas().style.cursor = "";
    });
  }
  if (occurenceData.data) {
    addAdditionalSourcesAndLayers(occurenceData.data);
  }
  $(".lds-grid").hide();

  // Update Occurence Search when polygon draw.create/delete/update events occur
  map.on("draw.create", updateSearch);
  map.on("draw.delete", updateSearch);
  map.on("draw.update", updateSearch);

  // Reset features filter as the map starts moving
  map.on("movestart", () => {
    if (map.getLayer("airport")) {
      map.setFilter("airport", ["has", "abbrev"]);
    }
  });

  // Update visible features when map stops moving
  map.on("moveend", () => {
    if (map.getLayer("airport")) {
      const features = map.queryRenderedFeatures({ layers: ["airport"] });
      if (features) {
        const uniqueFeatures = getUniqueFeatures(features, "key");
        renderListings(uniqueFeatures);
        ffilter.value = "";
        airports = uniqueFeatures;
      }
    }
  });

  // Remove loaded popups if map is touched outside the popup
  map.on("touchend", (e) => {
    popup.remove();
  });

  // Filter visible features that match the input "filter" value and populate sidebar with results
  ffilter.addEventListener("keyup", (e) => {
    const value = normalize(e.target.value);
    const filtered = [];
    for (const feature of airports) {
      const name = normalize(feature.properties.name);
      const code = normalize(feature.properties.abbrev);
      if (name.includes(value) || code.includes(value)) {
        filtered.push(feature);
      }
    }
    renderListings(filtered);
    // Set the filter to populate features into the layer.
    if (filtered.length) {
      map.setFilter("airport", [
        "match",
        ["get", "abbrev"],
        filtered.map((feature) => {
          return feature.properties.abbrev;
        }),
        true,
        false,
      ]);
    }
  });

  // Call this function on initialization to load empty state
  renderListings([]);

  // Map on style.load Functions
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

  // Return an Image for a feature, and if its missing return
  function getFeatureImage(r) {
    if (r.media[0] != undefined) {
      return r.media[0].identifier;
    } else {
      return "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/No_Image_Available.jpg?v=1674680432208";
    }
  }

  // Add additional sources and layers to the map
  function addAdditionalSourcesAndLayers(gbifGeoJSON) {
    addExistingSourcesAndLayers(gbifGeoJSON);
    for (const feature of gbifGeoJSON.features) {
      const symbol = feature.properties.kingdom;
      const layerID = `poi-${symbol}`;
      // Add a Mapbox Layer for each species kingdom if it hasn't been added already.
      if (map.getLayer(layerID) == undefined) {
        map.addLayer({
          id: layerID,
          type: "symbol",
          source: "airports",
          layout: {
            "icon-image": `${symbol}`,
            "icon-allow-overlap": true,
            "icon-size": 0.05,
          },
          filter: ["==", "kingdom", symbol],
        });
        if (!document.getElementById(layerID)) {
          // Add checkbox and label elements to DOM for the layer.
          const input = document.createElement("input");
          input.type = "checkbox";
          input.id = layerID;
          input.checked = true;
          filterGroup.appendChild(input);
          const label = document.createElement("label");
          label.setAttribute("for", layerID);
          label.textContent = symbol;
          filterGroup.appendChild(label);
          // When the checkbox changes, update the visibility of the layer.
          input.addEventListener("change", (e) => {
            map.setLayoutProperty(
              layerID,
              "visibility",
              e.target.checked ? "visible" : "none"
            );
          });
        }
      }
    }
    if (eeData.pixels) {
      if (map.getSource("pixels") == undefined) {   
      const pixelsFc = { type: "FeatureCollection",features: eeData.pixels };
        map.addSource("pixels", {
          type: "geojson",
          data: pixelsFc,
        });
      } else {
        map.getSource("pixels").setData(eeData.pixels);
      }
      if (map.getLayer("NDVI") == undefined) {
        addMapboxLayers();
      }
    }
  }

  function addExistingSourcesAndLayers(gbifGeoJSON) {
    if (map.getSource("airports") == undefined) {
      map.addSource("airports", {
        type: "geojson",
        data: gbifGeoJSON,
      });
    } else {
      map.getSource("airports").setData(gbifGeoJSON);
    }
    if (map.getLayer("airport") == undefined) {
      map.addLayer({
        id: "airport",
        type: "circle",
        source: "airports",
        paint: {
          "circle-radius": 0,
          "circle-stroke-width": 0,
        },
      });
    }
  }

  // Normalize a string
  function normalize(string) {
    return string.trim().toLowerCase();
  }

  // Convert Array of GBIF JSON pages into single GeoJSON object (for pagination)
  function jsonArrayToGeoJSONFeatures(jsonArray) {
    var features = [];
    for (let i = 0; i < jsonArray.length; i++) {
      features[i] = jsonArray[i].results.map((result) => {
        var bestImageURL = getFeatureImage(result);
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [result.decimalLongitude, result.decimalLatitude],
          },
          properties: {
            taxonKey: result.taxonKey,
            key: result.key,
            kingdom: result.kingdom,
            name: result.species,
            abbrev: result.basisOfRecord,
            image: bestImageURL,
            iucnRedListCategory: result.iucnRedListCategory,
          },
        };
      });
    }
    return features.flat();
  }

  // Return the "count" property of GBIF JSON results (for pagination)
  async function renderCount(url) {
    let data = await getDataJSON(url);
    return data.count;
  }

  // Return an ordered list of page offsets (for pagination)
  function calcOffsets(integer) {
    let offsets = [];
    for (let i = 0; i < integer; i++) {
      offsets[i] = i * 300;
    }
    return offsets;
  }

  // Request occurence data within a (geoJSON) polygon
  async function pageRequest(geoJSON) {
    const wktPoly = geoJSONToWKTPolygon(geoJSON);
    const api = "https://api.gbif.org/v1/occurrence/search?geometry=";
    const params300 = "&limit=300";
    const params1 = "&limit=1";
    let url = api + wktPoly + params1;
    let count = await renderCount(url);
    let nPages = Math.ceil(count / 300);

    if (nPages >= 990) {
      throw new Error("Request too Large");
    }
    let offsets = calcOffsets(nPages);
    var jsonArray;
    const pagePromises = offsets.map((offset) =>
      fetch(`${api}${wktPoly}${params300}&offset=${offset}`)
    );
    await Promise.all(pagePromises)
      .then((results) => Promise.all(results.map((r) => r.json())))
      .then((results) => {
        jsonArray = results;
      });

    var geoJSONFeatures = jsonArrayToGeoJSONFeatures(jsonArray);

    return {
      type: "FeatureCollection",
      features: geoJSONFeatures,
    };
  }

  // Initialize Cytoscape (Graph/Network Visualizer)
  async function initCytoscapeOverlay() {
    // Fetch interaction data for all rendered species occurences on the map
    const renderedMapFeatures = map.queryRenderedFeatures({
      layers: ["poi-Animalia", "poi-Plantae"],
    });
    const inputSpeciesArray = getSpeciesArray(renderedMapFeatures);
    const interactionData = await fetchMultiInteractionData(inputSpeciesArray);
    const style = await getDataJSON(
      "https://lepidoptera.glitch.me/cytoscape-style.json"
    );
    // Set Nodes and Edges of network
    const elements = removeDuplicateNodesEdges(interactionData);
    var cy = cytoscape({
      container: document.getElementById("cy-overlay"),
      boxSelectionEnabled: false,
      autounselectify: true,
      style: style.style,
      elements: elements,
      layout: {
        name: "concentric",
        concentric: function (node) {
          return node.degree();
        },
      },
    });
    // Open new species interaction window when a network node is clicked
    cy.on("tap", "node", async function (e) {
      const node = e.target;
      const nodeId = node.id();
      const portraitURL = "species-interactions.html?input=" + nodeId;
      window.open(portraitURL, "_blank");
    });
  }

  // Update Polygon Search Results (invoked when a polygon is created, edited, or deleted)
  async function updateSearch(e) {
    if (e.type == "draw.delete") {
      map.removeSource("airports");
      map.eachLayer(function (layer) {
        map.removeLayer(layer);
      });
      draw.deleteAll();
      $(".lds-grid").hide();
    } else if (e.type == "draw.create" || e.type == "draw.update") {
      $(".lds-grid").show();
      let geoJSONpoly = draw.getAll();
      if (geoJSONpoly.features.length > 0) {
        const selfIntersections = findSelfIntersects(
          geoJSONpoly.features[0].geometry.coordinates[0]
        );
        if (selfIntersections) {
          $(".lds-grid").hide();
          draw.deleteAll();
          return;
        }
        const coordinatesPoly = geoJSONpoly.features[0].geometry.coordinates;
        fetchEarthEngineData(coordinatesPoly);
        const gbifGeoJSON = await pageRequest(geoJSONpoly);
        occurenceData.data = gbifGeoJSON;
        let lastPolygon = geoJSONpoly;
        //
        if (map.getSource("airports") == undefined) {
          map.addSource("airports", {
            type: "geojson",
            data: gbifGeoJSON,
          });
        } else {
          map.getSource("airports").setData(gbifGeoJSON);
        }
        if (map.getLayer("airport") == undefined) {
          map.addLayer({
            id: "airport",
            type: "circle",
            source: "airports",
            paint: {
              "circle-radius": 0,
              "circle-stroke-width": 0,
            },
          });
        }
        //
        draw.deleteAll();
        $(".lds-grid").hide();
        document.getElementById("title-filters").innerHTML = "Kingdom Filters";
        // Create Mapbox Layers and DOM elements to filter them for each species' kingdom
        addAdditionalSourcesAndLayers(gbifGeoJSON);
        // Add Button to View All Interactions Network
        if (!functionGroup.contains(document.getElementById("interactions"))) {
          document.getElementById("title-functions").innerHTML = "Functions";
          const interactions = document.createElement("input");
          interactions.type = "checkbox";
          interactions.id = "interactions";
          interactions.checked = false;
          functionGroup.appendChild(interactions);
          const interactionsLabel = document.createElement("label");
          interactionsLabel.setAttribute("for", "interactions");
          interactionsLabel.textContent = "Species Interactions";
          functionGroup.appendChild(interactionsLabel);
          interactions.addEventListener("change", (e) => {
            const cyOverlay = document.getElementById("cy-overlay");
            if (e.target.checked) {
              cyOverlay.style.display = "block";
            } else {
              cyOverlay.style.display = "none";
            }
            initCytoscapeOverlay();
          });
        }
      }
    }
  }
});
// Add Button to Download data as .gbi once all sources are loaded
map.on("sourcedata", function (e) {
  //If EE pixel data is loaded
  if (map.getSource("pixels") && map.isSourceLoaded("pixels")) {
    eeData.pixels = map.querySourceFeatures("pixels");
    // If features are loaded
    if (map.getSource("airports") && map.isSourceLoaded("airports")) {
      // Load download button to Document Function Group
      if (!functionGroup.contains(document.getElementById("map-download"))) {
        document.getElementById("title-layers").innerHTML =
          "Environment Layers";
        const download = document.createElement("input");
        download.type = "checkbox";
        download.id = "map-download";
        download.checked = false;
        functionGroup.appendChild(download);
        const downloadLabel = document.createElement("label");
        downloadLabel.setAttribute("for", "map-download");
        downloadLabel.textContent = `Download Data`;
        functionGroup.appendChild(downloadLabel);
        download.addEventListener("change", (e) => {
          downloadGBI(occurenceData.data, lastPolygon, eeData.pixels);
        });
      }
    }
  }
});
