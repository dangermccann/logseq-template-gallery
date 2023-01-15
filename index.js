import '@logseq/libs'
import { Card } from './card'
import { Api } from './api'
import * as bootstrap from 'bootstrap';

const baseUrl = 'https://api.logseqtemplates.com'
const api = new Api(baseUrl)
let userLoves = {}
let stack = []
let blocks = []
let tab = 'popular'
let filter = '' 

window.onload = function() {  }

function createModel() {
    return {
        async openGallery() {
            clearCards()
            show()

            refreshUsernameMessage(getUsername())
            await loadLocalTemplates()

            // show main UI
            openOverlay('main')

            setTimeout(async () => { 
                await loadUserLoves(getUsername())
                await loadRemoteTemplates('popular') 
            }, 1)
        },
    }
}
  
async function main() {
    console.log("Loading templates gallery...")
    registerHooks()
}

function getUsername() {
    return logseq.settings['username']
}


async function share() {
    let tempName = document.getElementById('share-template-name').value
    if(tempName.length === 0) {
        return false
    }

    let tempDesc = document.getElementById('share-template-description').value
    if(tempDesc.length === 0) {
        return false
    }

    // Insert block property if it's not there


    try {
        await api.putTemplate(getUsername(),  tempName, tempDesc, JSON.stringify({ blocks: blocks }))

        logseq.UI.showMsg('Your template was shared in the Logseq Template Gallery.  Thank you for sharing!')
    }
    catch(e) {
        console.log(e)
    }

    return true
}

async function openShare(block) {
    console.log(`Sharing block ${block.uuid}`)
    show()

    if(!getUsername()) {
        openOverlay('template-login-overlay')
        return 
    }

    openOverlay('template-share-overlay')

    blocks = []
    let blockEntity = await logseq.Editor.getBlock(block.uuid, { includeChildren:true })
    buildBlocksArray(blockEntity, blocks, 0)

    let blocksStr = JSON.stringify({ blocks: blocks })

    // TODO: maybe no need to instantiate Card? 
    let card = new Card()
    let contentEl = document.getElementById('share-overlay-content')
    contentEl.innerHTML = ''
    card.insertTemplateContent(contentEl, blocksStr)

    // clear name and description fields 
    document.getElementById('share-template-name').value = ''
    document.getElementById('share-template-description').value = ''

    // look for template name 
    let lines = blocks[0].content.split('\n')
    lines.forEach(line => {
        let parts = line.split('::')
        if(parts[0] === 'template' && parts.length > 1) {
            document.getElementById('share-template-name').value = parts[1]
        }
    })
}

function buildBlocksArray(block, blocks, level) {
    blocks.push({ level: level, content: block.content, children: [] })
    block.children.forEach((child) => {
        buildBlocksArray(child, blocks[blocks.length - 1].children, level+1)
    })
}

function insertBlockProperty(parsed, name) {
    if(parsed.blocks[0].content.indexOf('template::') == -1) {
        var lines = parsed.blocks[0].content.split('\n')
        lines.splice(1, 0, `template:: ${name}`)
        parsed.blocks[0].content = lines.join('\n')
    }
    
    return parsed
}

async function install(content, name) {
    var parsed;
    try {
        parsed = JSON.parse(content)
    }
    catch(e) {
        console.log(e) 
        return
    }

    parsed = insertBlockProperty(parsed, name)

    let batch  = []
    parsed.blocks.forEach(block => { 
        buildBatchBlock(block, batch)
    })

    let current = await logseq.Editor.getCurrentBlock()
    if(current) {
        await logseq.Editor.insertBatchBlock(current.uuid, batch[0])
        return true
    }
    else return false
}

function buildBatchBlock(block, batch) {
    let obj = { content: block.content, children: [] }
    batch.push(obj)

    block.children.forEach(child => {
        buildBatchBlock(child, obj.children)
    })
}

async function refreshMainUI() {
    if(tab === 'popular' || tab === 'new') {
        loadRemoteTemplates(tab, filter)
    }
    else {
        loadRemoteTemplates('user')
    }
}

function clearCards() {
    let cards = document.getElementById('cards')
    cards.replaceChildren()
    cards.innerHTML = '<span class="text-center mb-5">Loading...</span>'
}

async function loadRemoteTemplates(which, filter) {
    let cardTemplate = document.getElementById('card-template')
    let cards = document.getElementById('cards')
    clearCards()


    var templateJson;
    try {
        if(which === 'user')
            templateJson = await api.getUserTemplates(getUsername())
        else
            templateJson = await api.getTemplates(which, filter)
    }
    catch(er) {
        showError(`Failed to load data from server<br/>${er.toString()}`)
        return
    }

    cards.replaceChildren()

    let index = 0;
    templateJson.forEach((template) => {
        let card = new Card(cardTemplate, cards)
        card.render(template, index)

        if(doesUserLove(template))
            card.setLoved(true)

        card.addContentClickListener(() => {
            let overlay = document.getElementById('template-preview-overlay')
            overlay.querySelector('.template-content').innerHTML = card.content.innerHTML
            overlay.querySelector('.card-title').innerHTML = template.Template
            openOverlay('template-preview-overlay')
        })

        card.addInstallClickListener(() => {
            let success = install(template.Content, template.Template)

            if(success) {
                api.templatePopularity(template.User, template.Template, 1)
                closeOverlay('main')
            }
            else {
                // TODO: figure out how to handle the condition where the template couldn't be inserted?
            }
        })

        card.addLoveClickListener(() => {
            if(doesUserLove(template)) {
                card.setLoved(false)
                delete userLoves[`${template.User}\n${template.Template}`]

                api.deleteUserLove(getUsername(), template.User, template.Template)
                api.templatePopularity(template.User, template.Template, -10)
            }
            else {
                card.setLoved(true)
                userLoves[`${template.User}\n${template.Template}`] = true

                api.putUserLove(getUsername(), template.User, template.Template)
                api.templatePopularity(template.User, template.Template, 10)
            }
        })

        if(which === 'user') {
            card.showDelete()
            card.addDeleteClickListener(async() => {
                await api.deleteTemplate(template.User, template.Template)
                setTimeout(refreshMainUI, 250)
            })
        }
        else {
            card.hideDelete()
        }

        index++
    })
}

async function loadUserLoves(user) {
    if(user) {
        let loves = await api.getUserLoves()
        loves.forEach((love) => {
            userLoves[love.LovedTemplate] = true
        })
    }
    else {
        userLoves = {}
    }
}

function doesUserLove(template) {
    return (`${template.User}\n${template.Template}`) in userLoves
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
        //console.log(printTree(parentBlock, 0))
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

function show() {
    logseq.showMainUI()

    let app = document.getElementById("app")
    app.classList.remove("hidden")
    app.classList.add("visible")
}

function close(cb) {
    var app = document.getElementById("app")
    app.classList.remove("visible")
    app.classList.add("hidden")
    setTimeout(() => { 
        logseq.hideMainUI({restoreEditingCursor: true}) 
        stack = []
        cb()
    }, 250)
}

function openOverlay(id) {
    var div = document.getElementById(id)
    div.classList.remove("d-none")
    stack.push(id)
} 

function closeOverlay(id) {
    var top = stack[stack.length-1];
    if(top != id) {
        console.log(`Invalid stack: popping ${id} but top is ${top}`)
    }
    else {
        stack.pop()
    }
    var div = document.getElementById(id)

    if(stack.length === 0) {
        close(() => {
            div.classList.add("d-none")
        })
    }
    else {
        div.classList.add("d-none")
    }
}

function popStack() {
    if(stack.length > 0) {
        closeOverlay(stack[stack.length - 1])
    }
}

function refreshUsernameMessage(username) {
    document.getElementById('username').value = username || ''
    if(username) {
        document.getElementById('username-link').innerText = username
        document.getElementById('username-welcome').classList.remove('d-none')
    }
    else {
        document.getElementById('username-welcome').classList.add('d-none')
    }
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

    document.addEventListener('keyup', (e) => {
        if(e.key == 'Escape') {
            popStack()
        }
    })

    document.getElementById("filter").addEventListener('keyup', (e) => {
        if(e.target.value != filter) {
            filter = e.target.value
            refreshMainUI()
        }
    })

    document.getElementById("close-button").addEventListener('click', () => {
        closeOverlay('main')
    })

    document.getElementById("share-template-button").addEventListener('click', () => {
        if(getUsername()) {
            openOverlay('share-help-overlay')
        }
        else {
            openOverlay('template-login-overlay')
        }
    })

    document.getElementById("username-link").addEventListener('click', () => {
        openOverlay('template-login-overlay')
    })

    document.getElementById("preview-overlay-close").addEventListener('click', () => {
        closeOverlay('template-preview-overlay')
    })

    document.getElementById("login-overlay-close").addEventListener('click', () => {
        closeOverlay('template-login-overlay')
    })

    document.getElementById("share-overlay-share").addEventListener('click', async (event) => {
        event.preventDefault()

        if(await share())
            closeOverlay('template-share-overlay')
    })

    document.getElementById("share-overlay-cancel").addEventListener('click', () => {
        closeOverlay('template-share-overlay')
    })

    document.getElementById("share-help-close").addEventListener('click', () => {
        closeOverlay('share-help-overlay')
    })

    document.getElementById("username-submit").addEventListener('click', () => {
        let username = document.getElementById('username').value
        closeOverlay('template-login-overlay')
        if(username.length > 0) {
            logseq.updateSettings({ 'username': username })
            refreshUsernameMessage(username)
        }
        else {
            logseq.updateSettings( { 'username': null })
            refreshUsernameMessage(null)
        }
    })

    const viewButtons = document.querySelectorAll('input[name="view-radio"]');
    for(const button of viewButtons) {
        button.addEventListener('change', (e) => {
            if(e.target.checked) {
                tab = e.target.value
                refreshMainUI()
            }
        });
    } 

    logseq.Editor.registerBlockContextMenuItem("Share Template", async (block) => {
        openShare(block)
    })

}



function getIconPath() {
    let filename = require('./images/toolbar-icon.png');
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