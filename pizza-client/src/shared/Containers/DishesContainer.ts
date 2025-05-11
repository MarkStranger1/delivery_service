import { createContext } from "react";
import { Dish } from "../DataTypes";

export const DishesContainer = createContext<{ dishes: Array<Dish> | null, setDishes: Function }>({
    dishes: null,
    setDishes: (user: Dish) => { }
})