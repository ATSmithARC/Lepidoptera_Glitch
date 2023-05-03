/* Toggle between adding and removing the "responsive" class to topnav when the user clicks on the icon */
function myFunction() {
  var x = document.getElementById("myTopnav");
  if (x.className === "topnav") {
    x.className += " responsive";
  } else {
    x.className = "topnav";
  }
}

/* Set the width of the sidebar to 250px and the left margin of the page content to 250px */
function openNav() {
  document.getElementById("mySidebar").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
  //document.getElementById("main").style.marginLeft = "250px";
}

/* Set the width of the sidebar to 0 and the left margin of the page content to 0 */
function closeNav() {
  document.getElementById("mySidebar").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
}

$("#mySidebar").on("swipeleft", function() {
  var sidebar = $("#mySidebar");
  if (sidebar.css("width") === "250px") {
    sidebar.css("width", "0");
    sidebar.css("marginLeft", "0");
  } else {
    sidebar.css("width", "250px");
    sidebar.css("marginLeft", "250px");
  }
});

function overlayOn() {
  document.getElementById('map-overlay').style.display = "flex";
  document.getElementById('interaction-overlay').style.display = "flex";
}

function overlayOff(id) {
  document.getElementById(id).style.display = "none";
}

function togglePre() {
  var pre = document.getElementById("sp-json");
  
  if (pre.style.display == "none") {
    pre.style.display = "block";
  } else {
    pre.style.display = "none";
  }
}

function copyPre(event) {
  var pre = document.getElementById("sp-json");
  
  if (pre.style.display == "none") {
    pre.style.display = "block";
  }
  
  var range = document.createRange();
  range.selectNode(pre);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  document.execCommand("copy");
  var popup = document.getElementById("mycopyPopup");
  popup.style.display = "block";
  popup.style.left = (event.clientX - 30) + "px";
	popup.style.top = (event.clientY - 70) + "px";
  setTimeout(function(){ popup.style.display = "none"; }, 1000);
}

