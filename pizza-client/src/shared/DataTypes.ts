export interface Ingredient {
    id: number,
    name: string,
    amount: number,
    measurement_unit: string
}

export interface TypeOfDish {
    id: number,
    name: string,
    slug: string
}

export interface Dish {
    id: number,
    name: string,
    description: string,
    ingredients: Array<Ingredient>,
    ccal: number,
    cost: number,
    is_in_order: boolean,
    type: TypeOfDish,
    cuisine: string,
    weight: number,
    image: any // по сути должен быть blob хз
}

export interface User {
    id: number,
    email: string,
    username: string,
    phone: string,
    scores: number,
    role: "anonim" | "client" | "courier" | "manager"
}

export interface UserNoId {
    email: string,
    username: string,
    phone: string,
    scores: number,
    role: "anonim" | "client" | "courier" | "manager"
}

export interface Order {
    id: number,
    dishes: Array<{
        dish: string,
        quantity: number
    }>,
    total_cost: number,
    count_dishes: number,
    status: "awaiting_payment" | "awaiting_courier" | "deliver" | "delivered" | "cancelled",
    comment: string,
    delivery_time: string,
    address: string
}

export interface DeliveryAddress {
    id: number,
    delivery_address: string,
    is_default: boolean
}

export interface Cart {
    id: number,
    address: number,
    status: "awaiting_payment" | "awaiting_courier" | "deliver" | "delivered" | "cancelled",
    comment: string,
    count_dishes: number,
    total_cost: number,
    delivery_time: string,
    dishes: Array<{
        id: number,
        dish: string,
        quantity: number
    }>
}

export interface OrderForWorker {
    id: number,
    orderdish_set: Array<{
        id: number,
        dish: string,
        quantity: number
    }>,
    total_cost: number,
    count_dishes: number,
    status: "awaiting_payment" | "awaiting_courier" | "deliver" | "delivered" | "cancelled",
    comment: string,
    delivery_time: string,
    address: {
        id: number,
        address: string
    },
    courier: {
        id: number,
        username: string,
        phone: string,
        email: string,
    },
    user: {
        id: number,
        username: string,
        phone: string,
        email: string,
    }
}

export interface CourierForManager {
    id: number,
    username: string,
    email: string,
    phone: string
}

export interface ApproveModalType {
    text: string,
    resolveText?: string,
    resolve: Function,
    rejectText?: string,
    reject: Function
}