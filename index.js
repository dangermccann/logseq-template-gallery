
var baseUrl = 'http://localhost:3000'

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
        cloned.querySelector('span.template-content').innerHTML = formatTemplateContent(template.Content)
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

function formatTemplateContent(content) {
    return content
}

