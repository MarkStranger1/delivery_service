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
    type: TypeOfDish
    weight: number,
    image: any // по сути должен быть blob хз
}