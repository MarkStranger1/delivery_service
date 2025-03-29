import { User } from "../DataTypes";

class BaseApi {

    private basePath = `http://localhost/api/`;
    private static userToken = '';

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

        data && Object.assign(requestBody, { body: JSON.stringify(data) })

        if (url.startsWith('/')) url = url.slice(1);

        if (url.includes('auth/token/login/')) {
            return fetch(this.basePath + url, requestBody)
                .then(r => {
                    return r.json().then(j => {
                        BaseApi.userToken = j.auth_token;
                        return null;
                    })
                })
        }

        if (url.startsWith('users')) {
            Object.assign(requestBody.headers, { "Authorization": "Token " + BaseApi.userToken.toString() })
        }

        return fetch(this.basePath + url, requestBody)
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

export class UserApi extends BaseApi {
    authUser(user: User, pwd: string) {
        return this.sendRequest('POST', 'auth/token/login/', { email: user.email, password: pwd })
            .then(r => { return null })
    }

    getUserInfo() {
        return this.sendRequest('GET', 'users/me/')
            .then(r => { return r.json() })
    }
}