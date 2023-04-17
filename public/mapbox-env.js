// Initialize Mapbox Map
mapboxgl.accessToken = "pk.eyJ1IjoiYXRzbWl0aGFyYyIsImEiOiJjbGJ5eGx0MXEwOXh2M3BtejBvNmUzM3VpIn0.6cxXNEwIUQeui42i9lbHEg";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: [12.6074, 55.6921],
  zoom: 14,
  antialias: true,
});

// Create default popup, but don't add it to the map.
const popupOffsets = {
  bottom: [0, -10],
};

// Hide loader
$(".lds-grid").hide();

// Document Elements
const ffilter = document.getElementById("feature-filter");
const flisting = document.getElementById("feature-listing");
const filterGroup = document.getElementById("filter-group");
const functionGroup = document.getElementById("function-group");
const debug = document.getElementById("debug-text");

// Persistant Variables
const lastPolygon = {};

// A collection of functions to execute when the Mapbox map intitializes
map.on("load", () => {
  // Set Map Parameters
  map.boxZoom.disable();

  // Add Data Sources
  // All GBIF Species Occurences
  map.addSource("maps-occurences", {
    type: "vector",
    tiles: ["https:api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}.mvt?"],
    minzoom: 5,
    maxzoom: 22,
  });

  // Digital Terrain Data from DataForSyningen (Official Denmark Terrain Map)
  map.addSource("augmented-dem", {
    type: "raster-dem",
    tiles: [
      "https://lepidoptera-dem.s3.eu-north-1.amazonaws.com/DTM1761772/{z}/{x}/{y}.png",
    ],
    tileSize: 512,
    minzoom: 17,
    maxzoom: 17,
    encoding: "terrarium",
  });

  // Add 3D Terrain to Mapbox map
  map.setTerrain({ source: "augmented-dem", exaggeration: 1.5 });

  // Assign Map Data Sources to Map Layers
  // GBIF - All Species Occurences as small green dots
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

  // Mapbox - 3D Building extrusions ghosted
  map.addLayer({
    id: "3d-buildings-layer",
    source: "composite",
    "source-layer": "building",
    filter: ["==", "extrude", "true"],
    type: "fill-extrusion",
    minzoom: 15,
    paint: {
      "fill-extrusion-color": "#636363",
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

  // Set Mapbox.Draw Polygon (drawing) mode and parameters
  let modes = MapboxDraw.modes;
  modes = MapboxDrawWaypoint.enable(modes);
  const draw = new MapboxDraw({
    modes,
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true,
    },
    //defaultMode: "draw_polygon",
  });

  // Update Occurence Search when polygon draw.create/delete/update events occur
  map.addControl(draw);
  map.on("draw.create", updateSearchEnvironment);
  map.on("draw.delete", updateSearchEnvironment);
  map.on("draw.update", updateSearchEnvironment);

  

  // Fetch Data from Google Earth Engine fo a given geoJSON polygon
  async function fetchEarthEngineData(geoJSONcoords) {
    console.log(`Sending to server [${geoJSONcoords}]`)
   $.ajax({
    url: '/getEEData',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(geoJSONcoords),
    success: function(response) {
      console.log(`Client: My Response was ${JSON.stringify(response)}`);
    },
    error: function(error) {
      console.log(`Client: My Error was ${JSON.stringify(error)}`);
    }
  });
  }

  // Update Polygon Search Results (invoked when a polygon is created, edited, or deleted)
  async function updateSearchEnvironment(e) {
    if (e.type == "draw.delete") {
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
        let lastPolygon = geoJSONpoly;
        const coordinatesPoly = geoJSONpoly.features[0].geometry.coordinates;
        const eeData = await fetchEarthEngineData(coordinatesPoly);
        debug.innerHTML = `${JSON.stringify(coordinatesPoly)}`;
        draw.deleteAll();
        $(".lds-grid").hide();
      }
    }
  }
});
