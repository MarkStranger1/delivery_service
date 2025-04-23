import { useContext } from "react";
import { Cart as CartType, DeliveryAddress, Dish } from "../../shared/DataTypes";

import "./style.css"
import { UserContainer } from "../../shared/Containers/UserContainer";
import { ClientApi } from "../../shared/OpenAPI/Api";

const Cart = (props: {
    userCart: CartType,
    userAddresses: Array<DeliveryAddress>,
    allDishes: Array<Dish>
    forceUpdCart: Function
}) => {

    // console.log(props.userCart)

    const { user } = useContext(UserContainer);

    const removeDishHandler = (dishName: string) => {
        if (user) {
            const userApi = new ClientApi();

            const copy = JSON.parse(JSON.stringify(props.userCart));
            const removedDish = copy.dishes.find((d: any) => d.dish === dishName);

            if (removedDish) {
                if (removedDish.quantity > 1) {
                    removedDish.quantity--;
                }
                else {
                    copy.dishes = copy.dishes.filter((d: any) => d.dish !== dishName);
                }

                Object.assign(copy, { dishes_ordered: copy.dishes });
                delete copy.dishes;

                const defaultAddress = props.userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                copy.address = defaultAddress.id ?? "";

                copy.dishes_ordered.forEach((d: any) => {
                    if (typeof d.dish === "string" && d.id) {
                        d.dish = d.id
                        delete d.id;
                    }
                })

                userApi.updateUserCart(copy)
                    .then(r => props.forceUpdCart())
            }
        }
    }

    const getDishTotalCostById = (dishId: number, count: number): number => {
        const finded = props.allDishes.find(dish => dish.id === dishId);
        if (finded)
            return finded.cost * count;
        return 0;
    }

    return <>
        <div className="cart-container">
            <h3 className="cart-container__title">Корзина</h3>
            <div className="cart-container__dishes-list">
                {props.userCart && props.userCart.dishes.map(dish => {
                    return <>
                        <div className="dish-list__list-item">
                            <button className="list-item__delete-button" onClick={() => { removeDishHandler(dish.dish) }} />
                            <p className="list-item__text">{dish.dish} - {dish.quantity}шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)</p>
                        </div>
                    </>
                })}
            </div>
            <div className="cart-container__divider" />
            <div className="cart-container__result-container">
                <h4 className="result-container__title">Итого:</h4>
                <p className="result-container__total-cost">{props.userCart.total_cost} руб.</p>
            </div>
        </div>
    </>
}

export default Cart;