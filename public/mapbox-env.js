// Initialize Mapbox Map
mapboxgl.accessToken =
  "pk.eyJ1IjoiYXRzbWl0aGFyYyIsImEiOiJjbGJ5eGx0MXEwOXh2M3BtejBvNmUzM3VpIn0.6cxXNEwIUQeui42i9lbHEg";
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

  async function ee_authenticate{
   debug.innerHTML = `<p> Authenticating Earth Engine... </p>`
   // Require client library and private key.
   var ee = require('@google/earthengine');
   var privateKey = require('./.private-key.json');
   // Initialize client library and run analysis.
   var runAnalysis = function() {
    ee.initialize(null, null, function() {
     // ... run analysis ...
    }, function(e) {
      console.error('Initialization error: ' + e);
     });
    };
    // Authenticate using a service account.
    ee.data.authenticateViaPrivateKey(privateKey, runAnalysis, function(e) {
      debug.innerHTML = `<p> Authentication error. </p>`
      console.error('Authentication error: ' + e);
   }); 
  }
  
  // Fetch Data from Google Earth Engine fo a given geoJSON polygon
  async function fetchEarthEngineData(geoJSONpoly) {
  debug.innerHTML = `<p> ${JSON.stringify(geoJSONpoly)} </p>`
  /*
  ee_date_start: ee.Date = ee.Date('2022-08-01')
  ee_date_end: ee.Date = ee.Date('2022-08-30')
  ee_bbox: ee.Geometry = ee.Geometry.BBox(west, south, east, north)
  ee_bbox_poly: ee.Geometry = ee.Geometry.Polygon(ee_bbox._coordinates)
  ee_bbox_poly_crs: ee.Geometry = ee.Geometry.Polygon(ee_bbox._coordinates, proj='EPSG:25832')
  ee_filter_s2:ee.Filter = ee.Filter.And(ee.Filter.bounds(ee_bbox),ee.Filter.date(ee_date_start, ee_date_end), ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 35)) 
  ee_imgc_s2: ee.ImageCollection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filter(ee_filter_s2)\
      .select(['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B9','B11','B12','AOT','WVP','SCL','TCI_R','TCI_G','TCI_B'])
  ee_img_s2: ee.Image = ee.Image(ee_imgc_s2.first())
  ee_img_s2_index = ee_img_s2.get('system:index')
  ee_filter_dw: ee.Filter = ee.Filter.eq('system:index', ee_img_s2_index)
  ee_imgc_dw: ee.ImageCollection = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filter(ee_filter_dw)
  ee_img_dw: ee.Image = ee.Image(ee_imgc_dw.first())
  ee_img_compile_1: ee.Image = ee_img_s2.addBands(srcImg=ee_img_dw, overwrite=False)
  ee_img_evi: ee.Image = getEVI(ee_img_s2).select('EVI')
  ee_img_normdiff: ee.Image = ee_img_s2.normalizedDifference(['B8','B4'])
  ee_img_ndvi: ee.Image = ee_img_normdiff.rename(['NDVI'])
  ee_img_compile_2: ee.Image = ee_img_compile_1.addBands(srcImg=ee_img_evi,overwrite=True)
  ee_img_compile_3: ee.Image = ee_img_compile_2.addBands(srcImg=ee_img_ndvi,overwrite=False)
  ee_img_coords: ee.Image = ee_img_compile_3.pixelCoordinates('EPSG:25832')
  ee_img_compile_4: ee.Image = ee_img_compile_3.addBands(srcImg=ee_img_coords,overwrite=False)
  ee_fc_compile: ee.FeatureCollection = ee_img_compile_4.sample(region=ee_bbox_poly,scale=10,projection='EPSG:25832',geometries=True)
  ee_fc_compile_coords: ee.FeatureCollection = ee_fc_compile.map(projCoord)
  */
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
        const eeData = await fetchEarthEngineData(geoJSONpoly);
        let lastPolygon = geoJSONpoly;
        if (map.getSource("eeData") == undefined) {
          map.addSource("eeData", {
            type: "geojson", //  ?
            data: eeData,
          });
        } else {
          map.getSource("eeData").setData(eeData);
        }
        if (map.getLayer("eeDataLayer") == undefined) {
          map.addLayer({
            id: "eeDataLayer",
            type: "circle",
            source: "eeData",
            paint: {
              "circle-radius": 0,
              "circle-stroke-width": 0,
            },
          });
        }
        draw.deleteAll();
        $(".lds-grid").hide();
      }
    }
  }
});
