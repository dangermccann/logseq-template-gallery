import '@logseq/libs'
import { Card } from './card'
import { Api } from './api'
import * as bootstrap from 'bootstrap';

const baseUrl = 'http://localhost:3000'
const api = new Api(baseUrl)
let userLoves = {}

window.onload = function() {  }

function createModel() {
    return {
        async openGallery() {
            logseq.showMainUI()

            refreshUsernameMessage(logseq.settings['username'])
            await loadLocalTemplates()
            await loadUserLoves(logseq.settings['username'])
            loadRemoteTemplates('popular')

            let app = document.getElementById("app")
            app.classList.remove("hidden")
            app.classList.add("visible")
        },
    }
}
  
async function main() {
    console.log("Loading templates gallery...")
    registerHooks()
}

async function loadRemoteTemplates(which, filter) {
    let cardTemplate = document.getElementById('card-template')
    let cards = document.getElementById('cards')
    cards.replaceChildren()

    cards.innerHTML = '<span class="text-center mb-5">Loading...</span>'


    var templateJson;
    try {
        templateJson = await api.getTemplates(which, filter)
    }
    catch(er) {
        showError(`Failed to load data from server<br/>${er.toString()}`)
        return
    }
    
    //console.log(templateJson);

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

        card.addLoveClickListener(() => {
            if(doesUserLove(template)) {
                card.setLoved(false)
                delete userLoves[`${template.User}\n${template.Template}`]

                api.deleteUserLove(logseq.settings['username'], template.User, template.Template)
                api.templatePopularity(template.User, template.Template, -10)
            }
            else {
                card.setLoved(true)
                userLoves[`${template.User}\n${template.Template}`] = true

                api.putUserLove(logseq.settings['username'], template.User, template.Template)
                api.templatePopularity(template.User, template.Template, 10)
            }
        })
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

    document.getElementById("close-button").addEventListener('click', () => {
        close()
    })

    document.getElementById("share-template-button").addEventListener('click', () => {
        openOverlay('template-login-overlay')
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