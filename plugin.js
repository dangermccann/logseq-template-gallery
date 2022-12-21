import '@logseq/libs'
import * as bootstrap from 'bootstrap';

function createModel () {
    return {
        openGallery() {
        logseq.showMainUI()
        reloadTemplates()
        let app = document.getElementById("app")
        if(app) {
            console.log("found app")
            app.style.visibility = "visible"
        }
      },
    }
  }
  

async function main() {
    console.log("Loading templates gallery...")
    registerHooks()

    await loadTemplates()
}


async function loadTemplates() {
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
        document.getElementById("app").style.visibility = "hidden"
        logseq.hideMainUI({restoreEditingCursor: true})
    })

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