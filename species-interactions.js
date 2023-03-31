// Get the input value from the URL parameter
var inputSpeciesName = decodeURIComponent(
  window.location.search.substring(1).split("=")[1]
);

// Get HTML Elements as variables
const header = document.getElementById("interaction-header");
const debug = document.getElementById("debug-text");
header.innerHTML = `<h2>${inputSpeciesName}</h2>`;
initInteractionsCy(inputSpeciesName, "cy");