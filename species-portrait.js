// Get the input value from the URL parameter
const occurenceKey = decodeURIComponent(
  window.location.search.substring(1).split("=")[1]
);
const debug = document.getElementById("debug-text");

function getimages(json) {
  const images = [];
  let count = 0;
  const results = json.results;
  for (let i = 0; i < results.length && count < 3; i++) {
    if (results[i].identifier && typeof results[i].identifier === 'string' && results[i].identifier.trim().length > 0) {
      images.push(results[i].identifier);
      count++;
    }
    else {
      images.push("https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/No_Image_Available.jpg?v=1674680432208");
    }
  }
  return images;
}

function getPoster(taxonKey) {
  const img = document.createElement('img');
  if (taxonKey == 5229490) {
    const source = "https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/5229490.png?v=1679839931706"
    img.src = source;
    document.getElementById('sp-poster').appendChild(img);
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
    {catagory: "RE", src: "RE_big.png?v=1680104102974"},
    {catagory: "CR", src: "CR_big.png?v=1680103966948"},
    {catagory: "EN", src: "EN_big.png?v=1680103968467"},
    {catagory: "VU", src: "VU_big.png?v=1680104103642"},
    {catagory: "NT", src: "NT_big.png?v=1680104102436"},
    {catagory: "DD", src: "DD_big.png?v=1680103967710"},
    {catagory: "LC", src: "LC_big.png?v=1680103969140"},
    {catagory: "NA", src: "NA_big.png?v=1680103970098"},
    {catagory: "NE", src: "NE_big.png?v=1680104101733"},
  ]
  const source = sources.find(source => source.catagory === category);
  const src =  source ? source.src : "NE_big.png?v=1680104101733";
  const srcURL = `https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/${src}`;
  const img = document.createElement('img');
  img.src = srcURL;
  //img.style.objectFit = 'cover';
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

function appendCountryRedlist(speciesPortrait, divId) {
  appendJSONToDiv(jsonObj, divId)
}

const removeEmpty = (obj) => {
  Object.entries(obj).forEach(([key, val])  =>
    (val && typeof val === 'object') && removeEmpty(val) ||
    (val === null || val === "") && delete obj[key]
  );
  return obj;
};

function removeEmptyArrays(obj) {
  if (Array.isArray(obj)) {
    return obj.filter((item) => !Array.isArray(item) || item.length > 0).map(removeEmptyArrays);
  } else if (typeof obj === "object" && obj !== null) {
    return Object.entries(obj)
      .filter(([key, value]) => !Array.isArray(value) || value.length > 0)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: removeEmptyArrays(value) }), {});
  }
  return obj;
}

function removeEmptyObjects(obj) {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') {
      removeEmptyObjects(obj[key]);
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key];
      }
    } else if (obj[key] === null || obj[key] === undefined || obj[key] === '') {
      delete obj[key];
    }
  });
  return obj;
}

function cleanJSON(json) {
  const a = removeEmpty(json);
  const b = removeEmptyArrays(a)
  const c = removeEmptyObjects(b)
  return c;
}

function joinNames(arr) {
  var str = arr.map(obj => obj.name).join(", ");
  return str;
}

function populateDOM(sp) {
  initInteractionsCy(sp.occurence.species, "sp-cy");
  getPoster(sp.occurence.taxonKey);
  initMap(sp.occurence.taxonKey);
  initGallery(sp.occurence.taxonKey);
  appendText("vernacularName", sp.vernacularName);
  appendText("scientificName", sp.occurence.species);
  appendText("sp-kingdom", sp.occurence.kingdom);
  appendText("sp-phylum", sp.occurence.phylum);
  appendText("sp-class", sp.occurence.class);
  appendText("sp-order", sp.occurence.order);
  appendText("sp-family", sp.occurence.family);
  appendText("sp-genus", sp.occurence.genus);
  appendText("sp-species", sp.occurence.species);
  appendText("sp-names", sp.vernacularName);
  appendRodlistImg("sp-rodlist-meter", sp.countryRedlist.redlistCategory.category)
  appendText("sp-rod-category", sp.countryRedlist.redlistCategory.category);
  appendText("sp-rod-year", sp.countryRedlist.assessmentDate);
  appendText("sp-rod-criteria", sp.countryRedlist.redlistCategory.criteria);
  appendText("sp-rod-by", sp.countryRedlist.assessmentInfo.assessedBy);
  appendText("sp-rod-size", sp.countryRedlist.extended.population.matureIndividuals);
  appendText("sp-rod-trend", sp.countryRedlist.additionalInformation.trend);
  appendText("sp-rod-ecosystem", joinNames(sp.countryRedlist.habitat.ecosystems));
  appendText("sp-rod-habitat", joinNames(sp.countryRedlist.habitat.overallHabitatTypes));
  appendText("sp-rod-habitat2", joinNames(sp.countryRedlist.habitat.specificHabitatTypes));
  appendText("sp-rod-substrate", joinNames(sp.countryRedlist.habitat.substrates));
  appendText("sp-rod-threats", joinNames(sp.countryRedlist.extended.threats));
  appendBoolText("sp-rod-native", sp.countryRedlist.extended.native);
}

async function initGallery(taxonKey){
  const api = `https://api.gbif.org/v1/species/${taxonKey}/media`;
  const media = await getDataJSON(api);
  const sources = getimages(media)
  for (let i = 0; i < 3; i++) {
   const a = document.createElement('a');
   a.href = sources[i];
   const img = document.createElement('img');
   img.id = `a-${i}`;
   img.src = sources[i];
   a.appendChild(img);
   document.getElementById('sp-gallery').appendChild(a);
  }
}

async function fetchOccurenceGBIF(occurenceKey) {
  const api = `https://api.gbif.org/v1/occurrence/${occurenceKey}`;
  return await getDataJSON(api);
}

async function fetchSpeciesGBIF(taxonKey) {
  const api = `https://api.gbif.org/v1/species/${taxonKey}/vernacularNames`;
  return await getDataJSON(api);
}

async function buildSpeciesPortrait(occurenceKey) {
  const occurence = await fetchOccurenceGBIF(occurenceKey);
  const interactionData = await fetchInteractionData(occurence.species);
  const interactionSet = convertJsonToSet(interactionData);
  const species = await fetchSpeciesGBIF(occurence.taxonKey);
  const engName = findName(species);
  const rodlist = await fetchRodlist(occurence.species);
  const rodlistClean = cleanJSON(rodlist);
  const sp = {
    occurence: occurence,
    vernacularName: engName,
    countryRedlist: rodlistClean.data[rodlist.data.length - 1],
    bioticInteractions: interactionSet,
  };
  return sp;
}

async function renderSpeciesPortrait(occurenceKey) {
  const sp = await buildSpeciesPortrait(occurenceKey);
  document.getElementById("sp-json").textContent = JSON.stringify(sp, undefined, 2);
  //debug.innerHTML = `<p>${JSON.stringify(sp)}</p>`;
  populateDOM(sp);
}

renderSpeciesPortrait(occurenceKey)










