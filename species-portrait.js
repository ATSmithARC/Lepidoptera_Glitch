// Get the input value from the URL parameter
var inputSpeciesName = decodeURIComponent(
  window.location.search.substring(1).split("=")[1]
);

// Get HTML Elements as variables
const debug = document.getElementById("debug-text");
const image = document.getElementById("species-portrait-img");

function loadImage(name) {
  if (name == "Pica pica") {
   image.innerHTML = `<img src="https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/SP.png?v=1679276878546" alt="Pica Pica">`
  }
  if (name == "Aythya ferina") {
   image.innerHTML = `<img src="https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/SP2.png?v=1679276880077" alt="Aythya ferina">`
  }
  if (name == "Anser Erythropus") {
   image.innerHTML = `<img src="https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/SP3.png?v=1679276882067" alt="Anser Erythropus">`
  }
  if (name == "Helichrysum arenarium") {
   image.innerHTML = `<img src="https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/SP4.png?v=1679276883566" alt="Helichrysum arenarium">`
  }
  if (name == "Apis mellifera") {
   image.innerHTML = `<img src="https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/SP5.png?v=1679276885073" alt="Apis mellifera">`
  }
  if (name == "Dama dama") {
   image.innerHTML = `<img src="https://cdn.glitch.global/83e86ffc-5495-4dc6-a988-f4cfcfb14b31/SP6.png?v=1679276886620" alt="Dama dama">`
  }
}

loadImage(inputSpeciesName)