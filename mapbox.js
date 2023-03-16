mapboxgl.accessToken =
  "pk.eyJ1IjoiYXRzbWl0aGFyYyIsImEiOiJjbGJ5eGx0MXEwOXh2M3BtejBvNmUzM3VpIn0.6cxXNEwIUQeui42i9lbHEg";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: [12.568, 55.6761],
  zoom: 14,
  antialias: true,
});

// 3D Model - parameters to ensure the model is georeferenced correctly on the map
const modelOrigin = [12.568, 55.6761];
const modelAltitude = 0;
const modelRotate = [Math.PI / 2, 0, 0];
const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
  modelOrigin,
  modelAltitude
);

// transformation parameters to position, rotate and scale the 3D model onto the map
const modelTransform = {
  translateX: modelAsMercatorCoordinate.x,
  translateY: modelAsMercatorCoordinate.y,
  translateZ: modelAsMercatorCoordinate.z,
  rotateX: modelRotate[0],
  rotateY: modelRotate[1],
  rotateZ: modelRotate[2],
  scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
};

const THREE = window.THREE;

// configuration of the custom layer for a 3D model per the CustomLayerInterface
const customLayer = {
  id: "3d-model",
  type: "custom",
  renderingMode: "3d",
  onAdd: function (map, gl) {
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

    // create two three.js lights to illuminate the model
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(0, -70, 100).normalize();
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff);
    directionalLight2.position.set(0, 70, 100).normalize();
    this.scene.add(directionalLight2);

    // use the three.js GLTF loader to add the 3D model to the three.js scene
    const loader = new THREE.GLTFLoader();
    loader.load(
      "https://docs.mapbox.com/mapbox-gl-js/assets/34M_17/34M_17.gltf",
      (gltf) => {
        this.scene.add(gltf.scene);
      }
    );
    this.map = map;

    // use the Mapbox GL JS map canvas for three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });

    this.renderer.autoClear = false;
  },
  render: function (gl, matrix) {
    const rotationX = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(1, 0, 0),
      modelTransform.rotateX
    );
    const rotationY = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 1, 0),
      modelTransform.rotateY
    );
    const rotationZ = new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(0, 0, 1),
      modelTransform.rotateZ
    );

    const m = new THREE.Matrix4().fromArray(matrix);
    const l = new THREE.Matrix4()
      .makeTranslation(
        modelTransform.translateX,
        modelTransform.translateY,
        modelTransform.translateZ
      )
      .scale(
        new THREE.Vector3(
          modelTransform.scale,
          -modelTransform.scale,
          modelTransform.scale
        )
      )
      .multiply(rotationX)
      .multiply(rotationY)
      .multiply(rotationZ);

    this.camera.projectionMatrix = m.multiply(l);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
  },
};

let airports = [];

// Create default popup, but don't add it to the map.
const popupOffsets = {
  bottom: [0, -10],
};

const popup = new mapboxgl.Popup({
  offset: popupOffsets,
  closeButton: false,
  anchor: "bottom",
  className: "mapboxgl-popup",
  maxWidth: "none",
});

// Hide loader
$(".lds-grid").hide();

// Get HTML Elements as variables
const filterEl = document.getElementById("feature-filter");
const listingEl = document.getElementById("feature-listing");
const filterGroup = document.getElementById("filter-group");

// Persistant variables
var lastPOIClicked = "";

// Initialize Occurence Filter List
function renderListings(features) {
  const empty = document.createElement("p");
  // Clear any existing listings
  listingEl.innerHTML = "";
  if (features.length) {
    for (const feature of features) {
      const itemLink = document.createElement("a");
      const label = `${feature.properties.name} (${feature.properties.abbrev})`;
      itemLink.href = `https://www.gbif.org/occurrence/${feature.properties.key}`;
      itemLink.target = "_blank";
      itemLink.textContent = label;
      itemLink.addEventListener("mouseover", () => {
        // Highlight corresponding feature on the map
        popup.setLngLat(feature.geometry.coordinates).setText(label).addTo(map);
      });
      listingEl.appendChild(itemLink);
    }
    // Show the filter input
    filterEl.parentNode.style.display = "block";
  } else if (features.length === 0 && filterEl.value !== "") {
    empty.textContent = "No results found";
    listingEl.appendChild(empty);
  } else {
    // Remove features filter
    map.setFilter("airport", ["has", "abbrev"]);
  }
}

function normalize(string) {
  return string.trim().toLowerCase();
}

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

function removeDuplicateNodesEdges(json) {
  const uniqueNodes = new Map();
  const uniqueEdges = new Set();

  // Remove duplicate nodes
  const nodes = json.nodes.filter((node) => {
    const id = node.data.id;
    if (uniqueNodes.has(id) || id.includes('BOLD') || id.includes('http')) {
      return false;
    }
    uniqueNodes.set(id, true);
    return true;
  });

  // Remove duplicate edges
  const edges = json.edges.filter((edge) => {
    const source = edge.data.source;
    const target = edge.data.target;
    const key = `${source}:${target}`;
    if (uniqueEdges.has(key) || source.includes('BOLD') || source.includes('http') || target.includes('BOLD') || target.includes('http')) {
      return false;
    }
    uniqueEdges.add(key);
    return true;
  });
  return { nodes, edges };
}

async function fetchInteractionData(sourceSpeciesNames) {
  let uniqueSourceSpecies = [...new Set(sourceSpeciesNames)];
  const nodes = [];
  const edges = [];
  const elements = {nodes, edges};
  const debug = [];
  // Add all source species to nodes in JSON format? 
  for (let i = 0; i < uniqueSourceSpecies.length; i++) {
   let source = uniqueSourceSpecies[i];
   let sourceDecoded = decodeURIComponent(source);
   elements.nodes.push({ data: { id: source, name: sourceDecoded, level: 0 } });
  }
  // Gets all targets and interaction types for each source species 
  const promises = uniqueSourceSpecies.map(source => {
    const url = `https://api.globalbioticinteractions.org/interaction?sourceTaxon=${source}&interactionType=ecologicallyRelatedTo&fields=interaction_type,target_taxon_name`;
    return fetch(url)
      .then(response => response.json())
      .then(data => data.data)
      .catch(error => null); // handle any errors during fetch
  });
  const results = await Promise.allSettled(promises);
  const pushResults = await results
  .filter(result => result.status === 'fulfilled' && result.value !== null)
  .map(function(result, index) {
    debug.push(result.value);
    for (let j = 0; j < result.value.length; j++) {
     elements.nodes.push({ data: { id: encodeURIComponent(result.value[j][1]), name: result.value[j][1], level: 1 } });
     elements.edges.push({ data: { source: uniqueSourceSpecies[index], target: encodeURIComponent(result.value[j][1]), interaction: result.value[j][0] } });
    }
    return true;
    });
  return elements;
}

function getSpeciesArray(mapFeatureCollection) {
  const names = [];
  mapFeatureCollection.forEach(obj => {
    const name = obj.properties.name;
    names.push(encodeURIComponent(name));
  });
  return names;
}

map.on("load", () => {
  // Set Map Parameters
  map.boxZoom.disable();

  // Add Map Data Sources
  map.addSource("maps-occurences", {
    type: "vector",
    tiles: ["https:api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}.mvt?"],
  });

  map.addSource("maps-icunThreat", {
    type: "vector",
    tiles: [
      "https://api.gbif.org/v2/map/occurrence/adhoc/{z}/{x}/{y}.mvt?iucnRedListCategory=VU",
    ],
  });

  map.addSource("augmented-dem", {
    type: "raster-dem",
    tiles: [
      "https://lepidoptera-dem.s3.eu-north-1.amazonaws.com/DTM1761772/{z}/{x}/{y}.png",
    ],
    tileSize: 512,
    minzoom: 8,
    maxzoom: 18,
    encoding: "terrarium",
  });

  // Set 3D Terrain
  map.setTerrain({ source: "augmented-dem", exaggeration: 1.5 });

  // Assign Map Data Sources to Layers
  // GBIF - All Species Occurences as small circles
  map.addLayer({
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
  });

  // GBIF - Threatened Species Occurences as bigger circles
  map.addLayer({
    id: "icunThreat",
    type: "circle",
    source: "maps-icunThreat",
    "source-layer": "occurrence",
    paint: {
      "circle-radius": 5,
      "circle-color": "#FF0000",
    },
    layout: {
      visibility: "visible",
    },
  });

  // Mapbox - 3D Building extrusions ghosted
  map.addLayer({
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
  });

  map.addLayer(customLayer, "waterway-label");

  map.addLayer(
    {
      id: "hillshading",
      source: "augmented-dem",
      type: "hillshade",
    },
    // Insert below land-structure-polygon layer,
    // where hillshading sits in the Mapbox Streets style.
    "land-structure-polygon"
  );

  // Load Occurence Icon/Symbol Images from URL
  map.loadImage(
    "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F344_color.png?v=1673530588031",
    (error, image) => {
      if (error) throw error;
      if (!map.hasImage("Fungi")) map.addImage("Fungi", image);
    }
  );
  map.loadImage(
    "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F33F_color.png?v=1673530596322",
    (error, image) => {
      if (error) throw error;
      if (!map.hasImage("Plantae")) map.addImage("Plantae", image);
    }
  );
  map.loadImage(
    "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F9AB_color.png?v=1673530602195",
    (error, image) => {
      if (error) throw error;
      if (!map.hasImage("Animalia")) map.addImage("Animalia", image);
    }
  );
  map.loadImage(
    "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/E011_color.png?v=1673631942440",
    (error, image) => {
      if (error) throw error;
      if (!map.hasImage("Chromista")) map.addImage("Chromista", image);
    }
  );
  map.loadImage(
    "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/1F9EB_color.png?v=1673700315309",
    (error, image) => {
      if (error) throw error;
      if (!map.hasImage("Bacteria")) map.addImage("Bacteria", image);
    }
  );
  map.loadImage(
    "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/2753_color.png?v=1673537140302",
    (error, image) => {
      if (error) throw error;
      if (!map.hasImage("Incertae Sedis"))
        map.addImage("Incertae Sedis", image);
    }
  );

  // Set Mapbox.Draw (drawing) mode and parameters
  let modes = MapboxDraw.modes;
  modes = MapboxDrawWaypoint.enable(modes);
  const draw = new MapboxDraw({
    modes,
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true,
    },
  });

  // Update Occurence Search when draw.create/delete/update events occur
  var newLayers = [];
  map.addControl(draw);
  map.on("draw.create", updateSearch);
  map.on("draw.delete", updateSearch);
  map.on("draw.update", updateSearch);

  // Reset features filter as the map starts moving
  map.on("movestart", () => {
    map.setFilter("airport", ["has", "abbrev"]);
  });

  // Update visible features when map stops moving
  map.on("moveend", () => {
    const features = map.queryRenderedFeatures({ layers: ["airport"] });
    if (features) {
      const uniqueFeatures = getUniqueFeatures(features, "key");
      renderListings(uniqueFeatures);
      filterEl.value = "";
      airports = uniqueFeatures;
    }
  });

  // Change the cursor style whe mouse hovers over different POIs
  map.on("mousemove", "poi-Animalia", (e) => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mousemove", "poi-Plantae", (e) => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mousemove", "poi-Fungi", (e) => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mousemove", "poi-Bacteria", (e) => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mousemove", "poi-Chromista", (e) => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mousemove", "Incertae Sedis", (e) => {
    map.getCanvas().style.cursor = "pointer";
  });

  // Open Popup when each POI type touched (mobile)
  map.on("touchend", "poi-Plantae", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("touchend", "poi-Animalia", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("touchend", "poi-Fungi", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("touchend", "poi-Chromista", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("touchend", "poi-Incertae Sedis", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("touchend", "poi-Bacteria", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });

  // Open Popup when each POI type is clicked
  map.on("click", "poi-Plantae", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("click", "poi-Animalia", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("click", "poi-Fungi", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("click", "poi-Chromista", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("click", "poi-Incertae Sedis", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });
  map.on("click", "poi-Bacteria", (e) => {
    const feature = e.features[0];
    poiPopup(feature);
  });

  // Return to normal pointer when cursor leaves each POI
  map.on("mouseleave", "poi-Animalia", (e) => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseleave", "poi-Plantae", (e) => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseleave", "poi-Fungi", (e) => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseleave", "poi-Bacteria", (e) => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseleave", "poi-Chromista", (e) => {
    map.getCanvas().style.cursor = "";
  });
  map.on("mouseleave", "Incertae Sedis", (e) => {
    map.getCanvas().style.cursor = "";
  });

  // Filter visible features that match the input "filter" value and populate sidebar with results
  filterEl.addEventListener("keyup", (e) => {
    const value = normalize(e.target.value);
    const filtered = [];
    for (const feature of airports) {
      const name = normalize(feature.properties.name);
      const code = normalize(feature.properties.abbrev);
      if (name.includes(value) || code.includes(value)) {
        filtered.push(feature);
      }
    }
    // Populate the sidebar with filtered results
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

  // Call this function on initialization...passing an empty array to render an empty state
  renderListings([]);

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

  function getFeatureImage(r) {
    if (r.media[0] != undefined) {
      return r.media[0].identifier;
    } else {
      return "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/No_Image_Available.jpg?v=1674680432208";
    }
  }

  // Convert Array of GBIF JSON pages into flattened GeoJSON format
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

  // Fetch JSON data from a URL
  async function getDataJSON(url) {
    try {
      let data = await fetch(url);
      return await data.json();
    } catch (error) {
      console.log(error);
    }
  }

  // Return the "count" property of JSON data
  async function renderCount(url) {
    let data = await getDataJSON(url);
    return data.count;
  }

  // Return an ordered list of
  function calcOffsets(integer) {
    let offsets = [];
    for (let i = 0; i < integer; i++) {
      offsets[i] = i * 300;
    }
    return offsets;
  }

  async function resolveResponseArray(users) {
    const jsons = [];
    for (let i = 0; i < users.length; i++) {
      jsons[i] = await users[i].json();
    }
  }

  // Request occurence data within a geoJSON polygon
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

  function poiPopup(f) {
    var input = f.properties.name;
    var encodedInput = encodeURIComponent(input);
    var interactionURL = "species-interactions.html?input=" + encodedInput;

    map.flyTo({ center: f.geometry.coordinates });
    popup
      .setLngLat(f.geometry.coordinates)
      .setHTML(
        `
      <div class="grid-container">
       <div class="grid-child-left">
        <a href="https://www.gbif.org/occurrence/${f.properties.key}" target="_blank" rel="noopener noreferrer"><img src="${f.properties.image}"></a>
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
         <a href="https://www.gbif.org/occurrence/${f.properties.key}" target="_blank" rel="noopener noreferrer">
          ICUN Threat Level: ${f.properties.iucnRedListCategory}
         </a>
        </p>
        <p>
          <div class="interaction-button">
           <a href="${interactionURL}" target="_blank" rel="noopener noreferrer">
            Interactions
          </div>
          <div class="portrait-button">
           <a href="${interactionURL}" target="_blank" rel="noopener noreferrer">
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

  async function initCytoscapeOverlay() {
    
    const renderedMapFeatures = map.queryRenderedFeatures(
      {layers: [
        'poi-Animalia', 
        'poi-Plantae'
      ]});
    
    const inputSpeciesArray = getSpeciesArray(renderedMapFeatures);
    const interactionData = await fetchInteractionData(inputSpeciesArray);
    
    const style1 = {
    style: [
      {
        selector: "node",
        style: {
          "height": 80,
          "width": 80,
          "background-fit": "cover",
          "border-color": "#000",
          "border-width": 3,
          "border-opacity": 0.5,
          "label": `data(name)`,
          "text-valign": "center",
          "text-halign": "center"
        },
      },
      {
        selector: "edge",
        style: {
          "curve-style": "bezier",
          "width": 9,
          "label": `data(interaction)`,
          "target-arrow-shape": 'triangle',
          "edge-text-rotation": "autorotate",
          "font-size": 8,
        },
      },
      {
        selector: 'edge[interaction = "eatenBy"]',
        style: {
          "line-color": "#b30000",
          "target-arrow-color": "#b30000",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "killedBy"]',
        style: {
          "line-color": "#b30000",
          "target-arrow-color": "#b30000",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "preyedUponBy"]',
        style: {
          "line-color": "#b30000",
          "target-arrow-color": "#b30000",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "hasPathogen"]',
        style: {
          "line-color": "#7c1158",
          "target-arrow-color": "#7c1158",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "hasParasite"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "parasiteOf"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "hasEctoparasite"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "endoparasiteOf"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "hasEndoparasite"]',
        style: {
          "line-color": "#4421af",
          "target-arrow-color": "#4421af",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "hostOf"]',
        style: {
          "line-color": "#0d88e6",
          "target-arrow-color": "#0d88e6",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "hasHost"]',
        style: {
          "line-color": "#0d88e6",
          "target-arrow-color": "#0d88e6",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "adjacentTo"]',
        style: {
          "line-color": "#00b7c7",
          "target-arrow-color": "#00b7c7",
          "color": "white",
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
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "flowersVisitedBy"]',
        style: {
          "line-color": "#dc0ab4",
          "target-arrow-color": "#dc0ab4",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "visitsFlowersOf"]',
        style: {
          "line-color": "#dc0ab4",
          "target-arrow-color": "#dc0ab4",
          "color": "white",
        },
      },
      {
        selector: 'edge[interaction = "visits"]',
        style: {
          "line-color": "#dc0ab4",
          "target-arrow-color": "#dc0ab4",
          "color": "white",
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
    
    const elements = removeDuplicateNodesEdges(interactionData)
    //document.getElementById("debug").innerHTML = `<p> ResponseFTWW: ${JSON.stringify(elements)} </p>`
    var cy = cytoscape({
      container: document.getElementById("cy-overlay"),
      boxSelectionEnabled: false,
      autounselectify: true,
      style: style1.style,
      elements: elements,
      layout: {
        name: "grid"
      },
    });
    
    /*
    cy.on('tap', 'node', async function (e) {
      const node = e.target;
      const nodeId = node.id();
      // Open a new Portrait for Tapped Node
      const portraitURL = "species-interactions.html?input=" + nodeId;
      window.open(portraitURL, '_blank');
    })
    */
  }  
  
  // Update Polygon Search Status
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
        const gbifGeoJSON = await pageRequest(geoJSONpoly);
        if (map.getSource("airports") == undefined) {
          map.addSource("airports", {
            type: "geojson",
            data: gbifGeoJSON,
          });
        } else {
          map.getSource("airports").setData(gbifGeoJSON);
        }

        // Add flat layer of circles
        if (map.getLayer("airport") == undefined) {
          map.addLayer({
            id: "airport",
            type: "circle",
            source: "airports",
            paint: {
              "circle-radius": 0,
              "circle-stroke-width": 0,
              "circle-color": "red",
              "circle-stroke-color": "white",
            },
          });
        } 

        draw.deleteAll();
        $(".lds-grid").hide();

        // VV Checkbox Filter
        for (const feature of gbifGeoJSON.features) {
          const symbol = feature.properties.kingdom;
          const layerID = `poi-${symbol}`;

          // Add a layer for this symbol type if it hasn't been added already.
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

            // Add checkbox and label elements for the layer.
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
        
        // Add Button to View All Interactions Network
            const interactions = document.createElement("input");
            interactions.type = "checkbox";
            interactions.id = "interactions";
            interactions.checked = false;
            filterGroup.appendChild(interactions);
        
            const interactionsLabel = document.createElement("label");
            interactionsLabel.setAttribute("for", "interactions");
            interactionsLabel.textContent = "Show Interactions";
            filterGroup.appendChild(interactionsLabel);
            
            interactions.addEventListener("change", (e) => {
              const cyOverlay = document.getElementById("cy-overlay");
              if (e.target.checked) {
                cyOverlay.style.display = "block";
              } else {
                cyOverlay.style.display = "none";
              }
                initCytoscapeOverlay()
            });
        
      }
    }
  }
});
