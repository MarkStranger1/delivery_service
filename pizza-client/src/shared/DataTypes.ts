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