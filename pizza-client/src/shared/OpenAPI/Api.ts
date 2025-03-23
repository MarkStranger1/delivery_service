import axios, { AxiosRequestConfig } from 'axios'

class BaseApi {

    private basePath = `http://localhost:8000/api/`;

    constructor(basePath?: string) {
        if (basePath) this.basePath = basePath
    }

    protected sendRequest(
        method: 'GET' | 'POST' | 'DELETE',
        url: string,
        data?: any
    ): Promise<any> {
        const requestBody: AxiosRequestConfig = {
            method: method,
            url: "",
            headers: {
                "Content-Type": "application/json",
            },
            withCredentials: true,
        }



        if (url.startsWith('/')) url = url.slice(1);
        Object.assign(requestBody, { url: this.basePath + url });

        const requestUrl = new URLSearchParams();

        if (data) {
            Object.keys(data).forEach(key => {
                requestUrl.append(key, data[key]);
            })
        }

        requestBody.url += requestUrl.toString();


        return axios(requestBody)
            .then(r => {
                debugger
                return r.data
            })
    }

    protected parseXML(xmlString: string): any {
        const { XMLParser } = require("fast-xml-parser");
        const parser = new XMLParser();
        try {
            let jObj = parser.parse(xmlString);
            return jObj
        } catch (error) {
            throw error;
        }
    }
}

export class StationApi extends BaseApi {

    getAllStations() {
        return this.sendRequest('GET', "stations?", { format: 'json', lang: "ru_RU" })
            .then(response => {
                return response;
            })
    }

}