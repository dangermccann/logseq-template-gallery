
export class Api {
    constructor(_baseUrl) {
        this.baseUrl = _baseUrl
    }

    async getUserTemplates(user) {
        let url = `${this.baseUrl}/templates?user=${user}`
        let response = await fetch(url)
        return this.processResponse(response)
    }
    
    async getTemplates(which, filter) {
        let url = `${this.baseUrl}/templates?${which}=1`
        if(filter && filter.length > 0)
            url += `&filter=${filter}`
        let response = await fetch(url)
        return this.processResponse(response)
    }

    async putTemplate(user, template, description, content) {
        let url = `${this.baseUrl}/template`
        let opts = {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "user": user,
                "template": template,
                "description": description,
                "content": content
            }) 
        }
        let response = await fetch(url, opts)
        return this.processResponse(response)
    }

    async templatePopularity(user, template, amount) {
        let url = `${this.baseUrl}/templatePopularity`
        let opts = {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "user": user,
                "template": template,
                "amount": amount
            }) 
        }
        let response = await fetch(url, opts)
        return this.processResponse(response)
    }

    async deleteTemplate(user, template) {
        let url = `${this.baseUrl}/template?user=${user}&template=${template}`
        let response = await fetch(url, { method: 'DELETE' })
        return this.processResponse(response)
    }
    
    async getUserLoves(user) {
        let url = `${this.baseUrl}/userLoves?user=${user}`
        let response = await fetch(url)
        return this.processResponse(response)
    }

    async putUserLove(user, lovedUser, lovedTemplate) {
        let url = `${this.baseUrl}/userLove`
        let opts = {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "user": user,
                "lovedUser": lovedUser,
                "lovedTemplate": lovedTemplate
            }) 
        }
        let response = await fetch(url, opts)
        return this.processResponse(response)
    }

    async deleteUserLove(user, lovedUser, lovedTemplate) {
        let url = `${this.baseUrl}/userLove?user=${user}&lovedUser=${lovedUser}&lovedTemplate=${lovedTemplate}`
        let response = await fetch(url, { method: 'DELETE' })
        return this.processResponse(response)
    }

    processResponse(response) {
        if (response.ok) { 
            return response.json()
        }
        else return response.text()
    }
}