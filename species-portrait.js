// Get the input value from the URL parameter
const occurenceKey = decodeURIComponent(
  window.location.search.substring(1).split("=")[1]
);
const debug = document.getElementById("debug-text");
debug.innerHTML = `<p> Occurence Key Recieved ${occurenceKey}. Fetching Occurence Data... </p>`
renderSpeciesPortrait(occurenceKey);

function getimages(json) {
  const images = [];
  let count = 0;
  const results = json.results;
  for (let i = 0; i < results.length && count < 3; i++) {
    if (
      results[i].identifier &&
      typeof results[i].identifier === "string" &&
      results[i].identifier.trim().length > 0
    ) {
      images.push(results[i].identifier);
      count++;
    } else {
      images.push(
        "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/No_Image_Available.jpg?v=1674680432208"
      );
    }
  }
  return images;
}

function getPoster(taxonKey) {
  const img = document.createElement("img");
  if (taxonKey == 5229490) {
    const source =
      "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/5229490.png?v=1679839931706";
    img.src = source;
    document.getElementById("sp-poster").appendChild(img);
  }
}

function initMap(taxonKey) {
  // Init Mapbox Map
  mapboxgl.accessToken =
    "pk.eyJ1IjoiYXRzbWl0aGFyYyIsImEiOiJjbGJ5eGx0MXEwOXh2M3BtejBvNmUzM3VpIn0.6cxXNEwIUQeui42i9lbHEg";
  const map = new mapboxgl.Map({
    container: "sp-map",
    style: "mapbox://styles/mapbox/light-v11",
    center: [12.6074, 55.6921],
    zoom: 1,
  });

  // A collection of functions to execute when the Mapbox map intitializes
  map.on("load", () => {
    // Set Map Parameters
    map.boxZoom.disable();
    map.doubleClickZoom.disable();
    // Add Data Sources
    // All GBIF Species Occurences
    map.addSource("maps-occurences", {
      type: "raster",
      tiles: [
        `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${taxonKey}&style=greenHeat.point`,
      ],
      tileSize: 512,
      minzoom: 0,
      maxzoom: 22,
    });
    map.addLayer({
      id: "occurence",
      type: "raster",
      source: "maps-occurences",
      minzoom: 0,
      maxzoom: 22,
    });
  });
}

function appendRodlistImg(domID, category) {
  const sources = [
    { catagory: "RE", src: "RE_big.png?v=1680104102974" },
    { catagory: "CR", src: "CR_big.png?v=1680103966948" },
    { catagory: "EN", src: "EN_big.png?v=1680103968467" },
    { catagory: "VU", src: "VU_big.png?v=1680104103642" },
    { catagory: "NT", src: "NT_big.png?v=1680104102436" },
    { catagory: "DD", src: "DD_big.png?v=1680103967710" },
    { catagory: "LC", src: "LC_big.png?v=1680103969140" },
    { catagory: "NA", src: "NA_big.png?v=1680103970098" },
    { catagory: "NE", src: "NE_big.png?v=1680104101733" },
  ];
  const source = sources.find((source) => source.catagory === category);
  const src = source ? source.src : "NE_big.png?v=1680104101733";
  const srcURL = `https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/${src}`;
  const img = document.createElement("img");
  img.src = srcURL;
  const div = document.getElementById(domID);
  div.appendChild(img);
}

function appendJSONToDiv(jsonObj, divKeyID, divValueID) {
  const divK = document.getElementById(divKeyID);
  const divV = document.getElementById(divValueID);
  for (const [key, value] of Object.entries(jsonObj)) {
    const textNodeK = document.createTextNode(`${key}`);
    const textNodeV = document.createTextNode(`${value}`);
    divK.appendChild(textNodeK);
    divV.appendChild(textNodeV);
  }
}

function appendNationalRedlist(speciesPortrait, divId) {
  appendJSONToDiv(jsonObj, divId);
}

function joinNames(strArray) {
  //var str = strArray.map((obj) => obj.name).join(", ");
  //return str;
}

// Appends text to a DOM element by ID. Red "No Data" if text is empty or null 
function appendText(domID, text) {
  if (text === undefined || text == null) {   
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

// Populate the HTML elements with Species Portrait data
function populateDOM(sp) { 
  initInteractionsCy(sp.species.species, "sp-cy");
  getPoster(sp.species.key);
  initMap(sp.species.key);
  initGallery(sp.species.key);

  appendText("vernacularName", sp.vernacularName);
  appendText("scientificName", sp.species.species);
  appendText("sp-kingdom", sp.species.kingdom);
  appendText("sp-phylum", sp.species.phylum);
  appendText("sp-class", sp.species.class);
  appendText("sp-order", sp.species.order);
  appendText("sp-family", sp.species.family);
  appendText("sp-genus", sp.species.genus);
  appendText("sp-species", sp.species.species);
  appendText("sp-names", sp.vernacularName);
  appendRodlistImg("sp-rodlist-meter",sp.nationalRedlist.redlistCategory.category);
  appendText("sp-rod-category", sp.nationalRedlist.redlistCategory.category);
  appendText("sp-rod-year", sp.nationalRedlist.assessmentDate);
  appendText("sp-rod-criteria", sp.nationalRedlist.redlistCategory.criteria);
  appendText("sp-rod-by", sp.nationalRedlist.assessmentInfo.assessedBy);
  appendText("sp-rod-size",sp.nationalRedlist.extended.population.matureIndividuals);
  appendText("sp-rod-trend", sp.nationalRedlist.additionalInformation.trend);

  if (sp.nationalRedlist.habitat) {
   appendText("sp-rod-ecosystem", joinNames(sp.nationalRedlist.habitat.ecosystems));
   appendText("sp-rod-habitat",joinNames(sp.nationalRedlist.habitat.overallHabitatTypes));
   appendText("sp-rod-habitat2",joinNames(sp.nationalRedlist.habitat.specificHabitatTypes));
   appendText("sp-rod-substrate",joinNames(sp.nationalRedlist.habitat.substrates));
  }
  
  if (sp.nationalRedlist.extended) {
   appendText("sp-rod-threats", joinNames(sp.nationalRedlist.extended.threats));
   appendBoolText("sp-rod-native", sp.nationalRedlist.extended.native);
  }
  if (sp.narrative) {
   appendText("sp-general", sp.narrative.data[0].desc);
   appendText("sp-daytoday", sp.narrative.data[1].desc);
   appendText("sp-nesting", sp.narrative.data[2].desc);
   appendText("sp-breeding", sp.narrative.data[3].desc);
   appendText("sp-habitat-general", sp.narrative.data[4].desc);
   appendText("sp-perception-general", sp.narrative.data[5].desc);
   appendText("sp-perception-cultural", sp.narrative.data[6].desc);
   appendText("sp-perception-benefits", sp.narrative.data[7].desc);
  }
}

async function initGallery(taxonKey) {
  const api = `https://api.gbif.org/v1/species/${taxonKey}/media`;
  const media = await getDataJSON(api);
  const sources = getimages(media);
  for (let i = 0; i < 3; i++) {
    const a = document.createElement("a");
    a.href = sources[i];
    const img = document.createElement("img");
    img.id = `a-${i}`;
    img.src = sources[i];
    a.appendChild(img);
    document.getElementById("sp-gallery").appendChild(a);
  }
}

async function fetchOccurenceGBIF(occurenceKey) {
  const api = `https://api.gbif.org/v1/occurrence/${occurenceKey}`;
  return await getDataJSON(api);
}

async function renderSpeciesPortrait(occurenceKey) {
  const occurence = await fetchOccurenceGBIF(occurenceKey);
  debug.innerHTML = `<p> Occurence Data Recieved. Building Species Portrait... </p>`
  const sp = await buildSpeciesPortrait(occurence.taxonKey);
  document.getElementById("sp-json").textContent = JSON.stringify(
    sp,
    undefined,
    2
  );
  populateDOM(sp);
}
