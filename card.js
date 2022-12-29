
export class Card {
    constructor(_templateEl, _parent) { 
        this.templateEl = _templateEl
        this.parent = _parent
    }

    render(template, index) {
        let cloned = this.templateEl.cloneNode(true)
        this.el = cloned
        cards.appendChild(cloned)
        cloned.id = `template-${index}`
        cloned.querySelector('h5.card-title').innerText = template.Template
        cloned.querySelector('p.template-description').innerText = template.Description
        cloned.querySelector('p.template-user').innerText = `Shared by ${template.User}`
        
        let content = cloned.querySelector('span.template-content')
        this.insertTemplateContent(content, template.Content)
        this.content = content

        cloned.classList.remove('d-none')
    }

    addContentClickListener(listener) {
        this.content.addEventListener('click', listener)
    }

    addInstallClickListener(listener) { 
        this.el.querySelector('#download-button').addEventListener('click', listener)
    }

    addLoveClickListener(listener) { 
        this.el.querySelector('#heart-button').addEventListener('click', listener)
    }

    setLoved(loved) { 
        let icon = this.el.querySelector('#heart-button .inline-icon')
        if(loved) {
            icon.classList.remove('heart-icon')
            icon.classList.add('heart-fill-icon')
        }
        else {
            icon.classList.add('heart-icon')
            icon.classList.remove('heart-fill-icon')
        }
    }


    setInstalled(installed) { }

    insertTemplateContent(container, content) {
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
            this.renderLine(linesEl, lines[0])
            lines.splice(0, 1)
    
            // Render properties
            if(properties.length > 0) {
                let propsEl = document.createElement('div')
                propsEl.classList.add('block-properties')
                linesEl.appendChild(propsEl)
                properties.forEach(prop => {
                    let parts = prop.split("::")
                    this.renderProperty(propsEl, parts)
                })
            }
            
    
            // Render remaining lines
            lines.forEach(line => {
                this.renderLine(linesEl, line)
            })
            
        })
    }
    
    renderLine(parent, line) {
        let p = document.createElement('p')
        p.classList.add('mb-0')
    
        line = this.formatLinks(line)
        line = this.formatMarkdown(line)
        line = this.formatTODOs(line)
    
        p.innerHTML = line
        parent.appendChild(p)
    }
    
    renderProperty(parent, parts) {
        let p = document.createElement('p')
        p.classList.add('mb-0')
    
        var line = `<span class="property-name">${parts[0]}</span><span class="separator">:</span>`
        line += this.formatLinks(parts[0])
        p.innerHTML = line
    
        parent.appendChild(p)
    }
    
    formatLinks(line) {
        line = line.replaceAll(/\#([^\s]+)/g, '<span class="tag">#$1</span>')
        line = line.replaceAll(/\[\[(.*?)\]\]/g, '<span class="bracket">[[</span><span class="link">$1</span><span class="bracket">]]</span>')
        line = line.replaceAll(/\[(.*?)\]\([^\s]+\)/g, '<span class="external-link">$1</span>')
        return line
    }
    
    formatMarkdown(line) {
        line = line.replaceAll(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        line = line.replaceAll(/\_(.*?)\_/g, '<i>$1</i>')
        line = line.replaceAll(/\~\~(.*?)\~\~/g, '<span class="strikethrough">$1</span>')
        line = line.replaceAll(/\^\^(.*?)\^\^/g, '<span class="highlight">$1</span>')
        line = line.replaceAll(/\`(.*?)\`/g, '<span class="code">$1</span>')
        return line
    }
    
    
    formatTODOs(line) {
        const checkbox = '<input type="checkbox" disabled />'
        line = line.replaceAll(/\bNOW\b/g, checkbox)
        line = line.replaceAll(/\bLATER\b/g, checkbox)
        line = line.replaceAll(/\bDOING\b/g, checkbox)
        line = line.replaceAll(/\bTODO\b/g, checkbox)
        line = line.replaceAll(/\bDONE\b/g, checkbox)
        return line
    }
}