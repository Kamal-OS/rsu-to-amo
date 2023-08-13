"use strict";


(() => {
    const htmlGenderOptions = `
        <div class="gender-input-wrap">
            <div class="gender-input">
                <input id="gender-male_" type="radio" name="gender_" value="M" rowindex="-">
                <label for="gender-male_" class="form-check-label"> ذكر </label>
            </div>
            <div class="gender-input">
                <input id="gender-female_" type="radio" name="gender_" value="F" rowindex="-">
                <label for="gender-female_" class="form-check-label"> أنثى </label>
            </div>
        </div>
    `

    const htmlSubmitBtn = `
        <div style="display: flex; justify-content: center;">
            <button id="amo-btn" type="button" class="ajMemMng" style="background: linear-gradient(90deg,#0062cb 0%,#0479f7 35%,#75b7ff 100%);" disabled>
                <span>طلب "AMO تضامن"</span>
            </button>
        </div>
    `
        
    // '_' prefix added, as they are predefined
    const htmlToggleSwitch = `
        <label class="_switch">
            <input type="checkbox" id="toggle_" rowindex="-" checked>
            <span class="_slider _round"></span>
        </label>
    `
    
    const table = document.querySelector("rsu-members-detail table")
    const headers = table.querySelectorAll("thead tr th")
    
    const makeHeader = (index, title, position) => {
        const tempHeader = headers[index]
        const header = tempHeader.cloneNode(false)
        header.innerText = title
        const insertposition = position + (position == "after" ? "end" : position == "before" ? "begin" : "")
        
        // invalid position
        if (insertposition == position) return
        
        tempHeader.insertAdjacentElement(insertposition, header)
    }

    // Make Toggle Switch header
    makeHeader(0, "تفعيل AMO", "before")
    
    // Make gender header
    makeHeader(2, "النوع", "after")
    
    // insert columns when atleast one row is loaded in the table
    const tempInterval = setInterval(() => {

        const rows = table.querySelectorAll("tbody tr")
        const countRows = rows.length
        if (countRows < 1) return

        // lookup table for gender options (is answered?)
        const genderAnsweredLookup = new Array(countRows).fill(false)

        // lookup table for switchs (is active?)
        const switchStateLookup = new Array(countRows).fill(true) // default is active

        const updateSubmitBtn = () => {
            const isAllAnswered = genderAnsweredLookup.every((ans, index) => {
                const active = switchStateLookup[index]
                if ((!ans && active)) {
                    return false
                }
                return true
            })

            const countEnabled = switchStateLookup.filter((state) => (state === true)).length

            if (isAllAnswered && countEnabled > 0) {
                enabledSubmitBtn()
            }
            else {
                disableSubmitBtn()
            }
        }

        rows.forEach((row, index) => {
            const cells = row.querySelectorAll("td")

            // Add cell for gender options
            const thirdCol = cells[2]
            const genderOptions = thirdCol.cloneNode(false)
            genderOptions.innerHTML = htmlGenderOptions

            // genderOptions's radio input
            const genderInputs = genderOptions.querySelectorAll("input")
            // edit radio IDs of gender options
            genderInputs.forEach((input) => {
                input.id += index

                const nameAttr = input.getAttribute("name") + index
                input.setAttribute("name", nameAttr)

                input.setAttribute("rowindex", index)

                // TODO: add listener to global table only
                input.addEventListener('change', (event) => {
                    const thisIndex = event.target.getAttribute("rowindex")
                    genderAnsweredLookup[thisIndex] = true
                    
                    updateSubmitBtn()

                    event.preventDefault()
                    event.stopPropagation()
                })
            })

            // edit label's' attribute
            genderOptions.querySelectorAll("label").forEach((label) => {
                const forAttr = label.getAttribute("for") + index
                label.setAttribute("for", forAttr)
            })

            // Add cell for toggle switch
            const firstCol = cells[0]
            const toggleSwitch = firstCol.cloneNode(false)
            toggleSwitch.innerHTML = htmlToggleSwitch
            
            // toggleSwitch's checkbox input
            const toggleInput = toggleSwitch.querySelector("input")
            // edit switch IDs and value
            toggleInput.id += index
            toggleInput.setAttribute("rowindex", index)
            // toggleSwitch clicked
            toggleInput.addEventListener("change", (event) => {
                const thisIndex = event.target.getAttribute("rowindex")
                switchStateLookup[thisIndex] = event.target.checked

                updateSubmitBtn()

                event.preventDefault()
                event.stopPropagation()
            })

            firstCol.insertAdjacentElement('beforebegin', toggleSwitch)
            thirdCol.insertAdjacentElement('afterend', genderOptions)
        })

        clearInterval(tempInterval)
    }, 500)

    // insert submit button after the table
    table.insertAdjacentHTML('afterend', htmlSubmitBtn)
    const submitBtn = document.querySelector("#amo-btn")

    const enabledSubmitBtn = () => {
        submitBtn.style.opacity = 1
        submitBtn.disabled = false
    }
    
    const disableSubmitBtn = () => {
        submitBtn.style.opacity = 0.7
        submitBtn.disabled = true
    }
    
    submitBtn.addEventListener("click", () => {
        if (submitBtn.disabled) return

        // only background script can get tabId
        // so we can't run execute scripts from here
        chrome.runtime.sendMessage(
            {
                type: "rsu-ui-ready"
            }
        )
    })
    
})()