// make <a> tags open href url in new tab
document.addEventListener('DOMContentLoaded', function () {
    var links = document.getElementsByTagName("a");
    for (let i = 0; i < links.length; i++) {
        (function () {
            var ln = links[i];
            var location = ln.href;
            ln.onclick = function () {
                chrome.tabs.create({active: true, url: location});
            };
        })();
    }
})


// collapsible
var coll = document.getElementsByClassName("collapsible");
for (let i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.maxHeight){
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    } 
  });
}


// demo
document.querySelector(".demo-btn").addEventListener("click", () => {
    const demoPage = "https://kamal-os.github.io/RSU-to-AMO/demo/demo.html"
    chrome.tabs.create({
        url: demoPage
    })
})


// parameters
const inputs = document.querySelectorAll(".parameters input")
inputs.forEach(async (input) => {
  // get and set last state from storage
  const key = input.id
  const PARAMETERS = await chrome.storage.local.get([key])
  input.checked = PARAMETERS[key]
  console.log(PARAMETERS)
  // Listerners for inputs parameters
  input.addEventListener("change", async (event) => {
    const target = event.target
    const targetID = target.id.toString()
    const targetState = target.checked
    
    // set current state in storage
    await chrome.storage.local.set({ [targetID]: targetState })
    
    event.preventDefault()
    event.stopPropagation()
  })
})
