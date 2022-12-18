
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
    reloadTemplates()
}

async function reloadTemplates() {
    let templateJson = await getTemplates('new')
    console.log(templateJson);

    let cardTemplate = document.getElementById('card-template')
    let cards = document.getElementById('cards')

    templateJson.forEach((template) => {
        let cloned = cardTemplate.cloneNode(true)
        cards.appendChild(cloned)
        cloned.querySelector('h5.card-title').innerText = template.Template
        cloned.querySelector('p.template-user').innerText = `Shared by ${template.User}`
        insertTemplateContent(cloned.querySelector('span.template-content'), testTemplate /*template.Content*/)
        cloned.classList.remove('d-none')
    })
}

async function getTemplates(which, filter) {
    let url = `${baseUrl}/templates?${which}=1`
    if(filter) 
        url += `&filter=${filter}`
    
    let response = await fetch(url)
    return response.json()
}

function insertTemplateContent(container, content) {
    let parsed = JSON.parse(content)

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

