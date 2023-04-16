const debug = document.getElementById("debug-text");

function formatJSONfromInputArray(inputs, sourceArrays) {
  const subjects = [
    "behavior",
    "habits",
    "nesting",
    "breeding",
    "habitat",
    "perception",
    "culture",
    "benefits",
  ];

  const entries = [];
  for (let i = 0; i < inputs.length; i++) {
    let sourceList = sourceArrays[i];
    let entry = { subject: subjects[i], desc: inputs[i], src: sourceList };
    entries.push(entry);
  }
  const dataJSON = { data: entries };
  return dataJSON;
}

function formatAnswerstoJSON() {
  var inputs = [];
  var sourceArrays = [];
  for (let i = 0; i < 9; i++) {
    let input = document.getElementById(`input-${i}`).value;
    let sourceArray = [];
    for (let j = 0; j < 8; j++) {
      let source = document.getElementById(`src-${i}-${j}`).value;
      if (source){
      sourceArray.push(source);
      }
    }
    inputs.push(input);
    sourceArrays.push(sourceArray);
  }
  
  const narrative = formatJSONfromInputArray(inputs, sourceArrays);
  document.getElementById("sp-json").textContent = JSON.stringify(narrative, undefined, 2);
}

function formatQuestionsAnimal() {
  const speciesName = document.getElementById("speciesName").value;
  const speciesVernacularName = document.getElementById(
    "speciesVernacularName"
  ).value;
  const country = document.getElementById("country").value;
  const prefix =
    "Can you tell me what research and other scientific sources tell us about the";
  const q0 = `${prefix} behavior of the animal species ${speciesName}, also known as the ${speciesVernacularName}?`;
  const q1 = `${prefix} day-to-day habits of ${speciesName}, also known as the ${speciesVernacularName}?`;
  const q2 = `${prefix} nesting habits of ${speciesName}, also known as the ${speciesVernacularName}?`;
  const q3 = `${prefix} breeding habits of ${speciesName}, also known as the ${speciesVernacularName}?`;
  const q4 = `${prefix} habitat requirements of ${speciesName}, also known as the ${speciesVernacularName}?`;
  const q5 = `What are people's general perception of {species.name}, aka. ${speciesVernacularName} in ${country} or other countries? Are these perecpetions generally positive, negative, or mixed? Why?`;
  const q6 = `Do ${speciesName}, also known as the ${speciesVernacularName} have cultural siginificance in ${country} or in any other countires, cultures, or religions?`;
  const q7 = `Can you list any documented benifits of having ${speciesName} also known as the ${speciesVernacularName} around humans, especially in cities?`;
  const q8 = `If I am designing a building, what should I consider if I want my building design to have a positive impact on an animal species like ${speciesName}, also known as the ${speciesVernacularName}?`;

  const questions = [q0, q1, q2, q3, q4, q5, q6, q7, q8];
  const form = document.getElementById("myForm");

  for (let i = 0; i < questions.length; i++) {
    document.getElementById(`q${i}`).innerHTML = questions[i];
    const div = document.getElementById(`a${i}`);
    const textarea = document.createElement("textarea");
    textarea.id = `input-${i}`;
    textarea.name = `input-${i}`;
    textarea.rows = "4";
    textarea.cols = "70";
    textarea.placeholder = "Enter Answer Here...";
    div.appendChild(textarea);

    for (let j = 0; j < 9; j++) {
      const input = document.createElement("input");
      input.id = `src-${i}-${j}`;
      input.name = `src-${i}-${j}`;
      input.placeholder = "Optional Source URL...";
      input.style.display = "block";
      div.appendChild(input);
    }
  }

  const button = document.getElementById("button-hidden");
  button.style.display = "block";
}
