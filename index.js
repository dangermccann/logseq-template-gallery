import '@logseq/libs'
import * as bootstrap from 'bootstrap';

const baseUrl = 'http://localhost:3000'

const testTemplate = `{ 
    "blocks": [
        { "level": 0, "content": "**This is** the [[first]] line\\nprop:: value\\nprop2:: value2" },
        { "level": 0, "content": "This #block _has only one_ [line](http://google.com)" },
        { "level": 1, "content": "This #[[block]] is a [[child]] of the ^^one above^^" },
        { "level": 1, "content": "TODO This \`block\` is #another child" },
        { "level": 2, "content": "This block is Level 2" },
        { "level": 2, "content": "This block is Level 2 and has a property\\nsomething:: or other\\nBelow!" }
    ]
}`


window.onload = function() {
    console.log("Template Gallery plugin page load")
}

async function loadRemoteTemplates(which, filter) {
    let cardTemplate = document.getElementById('card-template')
    let cards = document.getElementById('cards')
    cards.replaceChildren()

    cards.innerHTML = '<span class="text-center mb-5">Loading...</span>'


    var templateJson;
    try {
        templateJson = await getTemplates(which, filter)
    }
    catch(er) {
        showError(`Failed to load data from server<br/>${er.toString()}`)
        return
    }
    
    //console.log(templateJson);

    cards.replaceChildren()

    let index = 0;
    templateJson.forEach((template) => {
        let cloned = cardTemplate.cloneNode(true)
        cards.appendChild(cloned)
        cloned.id = `template-${index}`
        cloned.querySelector('h5.card-title').innerText = template.Template
        cloned.querySelector('p.template-user').innerText = `Shared by ${template.User}`
        
        let content = cloned.querySelector('span.template-content')
        insertTemplateContent(content, testTemplate /*template.Content*/)
        content.addEventListener('mousedown', () => {
            let overlay = document.getElementById('template-preview-overlay')
            overlay.querySelector('.template-content').innerHTML = content.innerHTML
            overlay.querySelector('.card-title').innerHTML = template.Template
            openOverlay('template-preview-overlay')
        })
        
        cloned.classList.remove('d-none')
        index++
    })
}

function showError(msg) {
    let errorTemplate = document.getElementById('error-template')
    let cards = document.getElementById('cards')
    cards.replaceChildren()

    let cloned = errorTemplate.cloneNode(true)
    cloned.id = 'error-message'
    cloned.classList.remove('d-none')
    cloned.innerHTML = msg
    cards.appendChild(cloned)
}

async function getTemplates(which, filter) {
    let url = `${baseUrl}/templates?${which}=1`
    if(filter) 
        url += `&filter=${filter}`
    
    let response = await fetch(url)
    return response.json()
}

function insertTemplateContent(container, content) {
    var parsed;
    try {
        parsed = JSON.parse(content)
    }
    catch(e) {
        parsed = { "blocks": [ { "level": 0, "content": "INVALID JSON" } ] }
    }

    var el;
    parsed.blocks.forEach(block => {
        let row = document.createElement('span')
        container.appendChild(row)
        row.classList.add('d-flex')
        row.classList.add('flex-row')
        row.classList.add('mb-1')

        // Insert spacers
        for(var i = 0; i < block.level; i++) {
            el = document.createElement('div')
            el.classList.add('m-2')
            row.appendChild(el)
        }

        // Insert bullet
        el = document.createElement('ul')
        el.classList.add('circle')
        el.classList.add('mb-0')
        el.appendChild(document.createElement('li'))
        row.appendChild(el)

        // Container for lines
        let linesEl = document.createElement('div')
        row.appendChild(linesEl)


        let lines = block.content.split('\n')

        const propRegEx = /[A-Za-z0-9]+\:\:/

        // Extract properties
        let properties = []
        for(var i = lines.length - 1; i >= 0; i--) {
            if(lines[i].match(propRegEx)) {
                properties.push(lines[i])
                lines.splice(i, 1)
            }
        }
        
        // Render first line
        renderLine(linesEl, lines[0])
        lines.splice(0, 1)

        // Render properties
        if(properties.length > 0) {
            let propsEl = document.createElement('div')
            propsEl.classList.add('block-properties')
            linesEl.appendChild(propsEl)
            properties.forEach(prop => {
                let parts = prop.split("::")
                renderProperty(propsEl, parts)
            })
        }
        

        // Render remaining lines
        lines.forEach(line => {
            renderLine(linesEl, line)
        })
        
    })
}

function renderLine(parent, line) {
    let p = document.createElement('p')
    p.classList.add('mb-0')

    line = formatLinks(line)
    line = formatMarkdown(line)
    line = formatTODOs(line)

    p.innerHTML = line
    parent.appendChild(p)
}

function renderProperty(parent, parts) {
    let p = document.createElement('p')
    p.classList.add('mb-0')

    var line = `<span class="property-name">${parts[0]}</span><span class="separator">:</span>`
    line += formatLinks(parts[0])
    p.innerHTML = line

    parent.appendChild(p)
}

function formatLinks(line) {
    line = line.replaceAll(/\#([^\s]+)/g, '<span class="tag">#$1</span>')
    line = line.replaceAll(/\[\[(.*?)\]\]/g, '<span class="bracket">[[</span><span class="link">$1</span><span class="bracket">]]</span>')
    line = line.replaceAll(/\[(.*?)\]\([^\s]+\)/g, '<span class="external-link">$1</span>')
    return line
}

function formatMarkdown(line) {
    line = line.replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    line = line.replaceAll(/\_(.*?)\_/g, '<i>$1</i>')
    line = line.replaceAll(/\~\~(.*?)\~\~/g, '<span class="strikethrough">$1</span>')
    line = line.replaceAll(/\^\^(.*?)\^\^/g, '<span class="highlight">$1</span>')
    line = line.replaceAll(/\`(.*?)\`/g, '<span class="code">$1</span>')
    return line
}


function formatTODOs(line) {
    const checkbox = '<input type="checkbox" disabled />'
    line = line.replaceAll(/\bNOW\b/g, checkbox)
    line = line.replaceAll(/\bLATER\b/g, checkbox)
    line = line.replaceAll(/\bDOING\b/g, checkbox)
    line = line.replaceAll(/\bTODO\b/g, checkbox)
    line = line.replaceAll(/\bDONE\b/g, checkbox)
    return line
}


function createModel () {
    return {
        async openGallery() {
            logseq.showMainUI()
            await loadLocalTemplates()
            loadRemoteTemplates('popular')
            let app = document.getElementById("app")
            if(app) {
                console.log("found app")
                app.classList.remove("hidden")
                app.classList.add("visible")
            }
      },
    }
  }
  

async function main() {
    console.log("Loading templates gallery...")
    registerHooks()
}


async function loadLocalTemplates() {
    let results = await logseq.DB.datascriptQuery(`
    [:find (pull ?b [*])
      :where
      [?b :block/page ?p]
      [?b :block/properties ?prop]
      [(get ?prop :template)]
    ]`)        

    if(!results) {
        console.log("No templates found")
        return []
    } 


    for(var i = 0; i < results.length; i++) {
        let result = results[i][0];
        let name = result.properties['template']
        let uuid = result.uuid

        let parentBlock = await logseq.Editor.getBlock(uuid, { includeChildren: true })
        console.log(printTree(parentBlock, 0))
    }

    return results;
}

function printTree(block, level) {
    let str = ""
    for(var i = 0; i < level; i++) { 
        str += "  " 
    }

    str += block.content + "\n";
    block.children.forEach((child) => {
        str += printTree(child, level+1)
    })
    return str
}

function close() {
    var app = document.getElementById("app")
    app.classList.remove("visible")
    app.classList.add("hidden")
    setTimeout(() => { 
        logseq.hideMainUI({restoreEditingCursor: true}) 
    }, 250)
}

function openOverlay(id) {
    var div = document.getElementById(id)
    div.classList.remove("d-none")
} 

function closeOverlay(id) {
    var div = document.getElementById(id)
    div.classList.add("d-none")
}


function registerHooks() {
    logseq.App.registerUIItem("toolbar", {
        key: "TemplateGallery", 
        template: `
            <a class="button" data-on-click="openGallery">
                <img src="${getIconPath()}" style="height: 20px" />
            </a>
        `,
    })

    document.getElementById("close-button").addEventListener('mousedown', () => {
        close()
    })

    document.getElementById("share-template-button").addEventListener('mousedown', () => {
        openOverlay('template-login-overlay')
    })

    document.getElementById("preview-overlay-close").addEventListener('mousedown', () => {
        closeOverlay('template-preview-overlay')
    })

    document.getElementById("login-overlay-close").addEventListener('mousedown', () => {
        closeOverlay('template-login-overlay')
    })

    const viewButtons = document.querySelectorAll('input[name="view-radio"]');
    for(const button of viewButtons){
        button.addEventListener('change', (e) => {
            if(e.target.checked) {
                let val = e.target.value
                if(val === 'popular' || val === 'new')
                    loadRemoteTemplates(val)
                else
                    console.log('TOOD: implement my templates!')
            }
        });
    } 

    logseq.Editor.registerBlockContextMenuItem("Share Template", (block) => {
        console.log(`Sharing template ${block.uuid}`)
    })

}


function getIconPath() {
    let filename = require('./toolbar-icon.png');
    return getPluginDir() + filename.substr(filename.lastIndexOf("/"))
}

function getPluginDir() {
    const iframe = parent?.document?.getElementById(`${logseq.baseInfo.id}_iframe`,)
    const pluginSrc = iframe.src
    const index = pluginSrc.lastIndexOf("/")
    return pluginSrc.substring(0, index)
}

// bootstrap
logseq.ready(createModel()).then(main).catch(console.error)