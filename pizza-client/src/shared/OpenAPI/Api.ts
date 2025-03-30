import { DeliveryAddress, User } from "../DataTypes";

class BaseApi {

    private basePath = `http://localhost/api/`;

    constructor(basePath?: string) {
        if (basePath) this.basePath = basePath
    }

    protected sendRequest(
        method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
        url: string,
        data?: any,
        needToken: boolean = false
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

        if (url.startsWith('auth/token/login/')) {
            return fetch(this.basePath + url, requestBody)
                .then(r => {
                    return r.json().then(j => {
                        document.cookie = `sessionToken=${j.auth_token}; SameSite=cross-origin; Secure`
                        return null;
                    })
                })
        }

        if (needToken) {
            Object.assign(requestBody.headers, { "Authorization": "Token " + document.cookie.split("; ").find(cookie => cookie.startsWith("sessionToken"))?.split("=").at(-1) })
        }

        return fetch(this.basePath + url, requestBody)
            .then(r => { return r; })
    }
}

export class MainApi extends BaseApi {
    getDishes() {
        return this.sendRequest('GET', 'dishes/')
            .then(r => { return r.json(); })
    }

    getTypes() {
        return this.sendRequest('GET', 'types/')
            .then(r => { return r.json(); })
    }
}

export class UserApi extends BaseApi {
    authUser(user: User, pwd: string) {
        return this.sendRequest('POST', 'auth/token/login/', { email: user.email, password: pwd })
            .then(r => { return null; })
    }

    getUserInfo() {
        return this.sendRequest('GET', 'users/me/', null, true)
            .then(r => { return r.json(); })
    }

    editUserInfo(user: User) {
        const data = JSON.parse(JSON.stringify(user));
        delete data.id;
        return this.sendRequest('PATCH', 'users/me', data, true)
            .then(r => { return r.json(); })
    }

    getOrdersHistory() {
        return this.sendRequest('GET', 'orders/history/', null, true)
            .then(r => { return r.json(); })
    }

    getDeliveryAddresses() {
        return this.sendRequest('GET', 'deliveryaddress/', null, true)
            .then(r => { return r.json(); })
    }

    addDeliveryAddresses(address: DeliveryAddress) {
        const data = JSON.parse(JSON.stringify(address));
        delete data.id;
        return this.sendRequest('POST', 'deliveryaddress/', data, true)
            .then(r => { return null; })
    }

    editDeliveryAddresses(id: number, is_default: boolean) {
        return this.sendRequest('PATCH', `deliveryaddress/${id}/`, { is_default }, true)
            .then(r => { return null; })
    }

    deleteDeliveryAddresses(id: number) {
        return this.sendRequest('DELETE', `deliveryaddress/${id}/`, null, true)
            .then(r => { return null; })
    }

    getUserCart() {
        return this.sendRequest('GET', 'orders/cart', null, true)
            .then(r => { return r.json(); });
    }
}