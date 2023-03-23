// Get the input value from the URL parameter
var inputSpeciesName = decodeURIComponent(
  window.location.search.substring(1).split("=")[1]
);

// Get HTML Elements as variables
const debug = document.getElementById("debug-text");
const image = document.getElementById("species-portrait-img");


// Fetch JSON data from a URL
async function getDataJSON(url) {
    try {
        let data = await fetch(url);
        return await data.json();
    } catch (error) {
        console.log(error);
    }
}
