class BaseApi {

    private basePath = `http://localhost/api/`;

    constructor(basePath?: string) {
        if (basePath) this.basePath = basePath
    }

    protected sendRequest(
        method: 'GET' | 'POST' | 'DELETE',
        url: string,
        data?: any
    ): Promise<any> {
        const requestBody = {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
            withCredentials: true,
        }



        if (url.startsWith('/')) url = url.slice(1);

        const requestUrl = new URLSearchParams();

        if (data) {
            Object.keys(data).forEach(key => {
                requestUrl.append(key, data[key]);
            })
        }

        return fetch(this.basePath + url + requestUrl.toString(), requestBody)
            .then(r => { return r; })
    }
}

export class MainApi extends BaseApi {

    getDishes() {
        return this.sendRequest('GET', 'dishes/')
            .then(r => { return r.json() })
    }

    getTypes() {
        return this.sendRequest('GET', 'types/')
            .then(r => { return r.json() })
    }
}