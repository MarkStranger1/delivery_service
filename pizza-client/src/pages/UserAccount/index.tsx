import { useContext, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom";
import { Cart, CourierForManager, DeliveryAddress, Dish, Order, OrderForWorker, User } from "../../shared/DataTypes"

import { MainApi, ClientApi, ManagerApi, CourierApi } from "../../shared/OpenAPI/Api";
import { UserContainer } from "../../shared/Containers/UserContainer";

//@ts-ignore
import AttentionIcon from "../../shared/assets/attention.svg"
//@ts-ignore
import EditIcon from "../../shared/assets/editIcon.svg"

import "./style.scss"

export const UserAccountPage = () => {

    const defaultUser: User = {
        id: -1,
        email: "",
        username: "",
        phone: "",
        scores: 0,
        role: "anonim"
    }

    const convertOrderStatus = {
        'awaiting_payment': 'ожидание оплаты',
        "awaiting_courier": 'ожидание курьера',
        'deliver': "доставляем",
        'delivered': 'доставлен',
        "cancelled": "отменен"
    }

    const clientApi = new ClientApi();
    const courierApi = new CourierApi();
    const managerApi = new ManagerApi();


    const { user, setUser } = useContext(UserContainer);

    const [userAddresses, setUserAddresses] = useState<Array<DeliveryAddress> | null>(null);
    const [newAddress, setNewAddress] = useState<DeliveryAddress | null>(null);
    const [userOrdersHistory, setUserOrdersHistory] = useState<Array<Order> | null>(null);
    const [userCart, setUserCart] = useState<Cart | null>(null);
    const [activeUserCarts, setActiveUserCarts] = useState<Array<Cart> | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);

    const [userRegister, setUserRegister] = useState<User>();
    const [userLogin, setUserLogin] = useState<User>();

    const [userRegisterPass, setUserRegisterPass] = useState<string>("");
    const [userLoginPass, setUserLoginPass] = useState<string>("");
    const [tmpPass, setTmpPass] = useState<string>("");
    const [allDishes, setAllDishes] = useState<Array<Dish> | null>(null);

    ///////////////////////////////////FOR COURIER STATE

    const [courierActiveOrders, setCourierActiveOrders] = useState<Array<OrderForWorker> | null>(null);
    const [courierHistory, setCourierHistory] = useState<Array<OrderForWorker> | null>(null);

    ////////////////////////////////////////////////////

    ///////////////////////////////////FOR MANAGER STATE

    const [allOrders, setAllOrders] = useState<Array<OrderForWorker> | null>(null);
    const [allCouriers, setAllCouriers] = useState<Array<CourierForManager> | null>(null);
    const [editedOrder, setEditedOrder] = useState<OrderForWorker | null>(null);
    const editOrderRef = useRef<HTMLDialogElement>(null);

    ////////////////////////////////////////////////////


    const [selectedPage, setSelectedPage] = useState<'login' | 'updData' | 'currOrder' | 'allOrders' | 'allCouriers'>('login');

    const changeValue = (key: string, value: string, state: 'edit' | 'login' | 'register') => {
        let tmp;
        switch (state) {
            case "edit":
                tmp = JSON.parse(JSON.stringify(editUser));
                break;
            case "login":
                tmp = JSON.parse(JSON.stringify(userLogin));
                break;
            case "register":
                tmp = JSON.parse(JSON.stringify(userRegister));
                break;
        }

        tmp[key] = value;
        switch (state) {
            case "edit":
                setEditUser(tmp);
                break;
            case "login":
                setUserLogin(tmp);
                break;
            case "register":
                setUserRegister(tmp);
                break;
        }
    }

    const getDishTotalCostById = (dishId: number, count: number): number => {
        if (allDishes) {
            const finded = allDishes.find(dish => dish.id === dishId);
            if (finded)
                return finded.cost * count;
        }
        return 0;
    }

    const addDishHandler = (dishName: string) => {
        if (user) {
            const clientApi = new ClientApi();

            const copy = JSON.parse(JSON.stringify(userCart));
            const incDish = copy.dishes.find((d: any) => d.dish === dishName);

            if (incDish) {
                incDish.quantity++;

                Object.assign(copy, { dishes_ordered: copy.dishes });
                delete copy.dishes;

                if (!copy.address) {
                    const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                    copy.address = defaultAddress.id ?? "";
                }
                else {
                    const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                    copy.address = address.id
                }

                copy.dishes_ordered.forEach((d: any) => {
                    if (typeof d.dish === "string" && d.id) {
                        d.dish = d.id
                        delete d.id;
                    }
                })

                clientApi.updateUserCart(copy)
                    .then(r => {
                        clientApi.getUserCart()
                            .then(res => {
                                setUserCart(res[0]);
                            })
                    })
            }
        }
    }

    const removeDishHandler = (dishName: string) => {
        if (user) {
            const clientApi = new ClientApi();

            const copy = JSON.parse(JSON.stringify(userCart));
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

                if (!copy.address) {
                    const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                    copy.address = defaultAddress.id ?? "";
                }
                else {
                    const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                    copy.address = address.id
                }

                copy.dishes_ordered.forEach((d: any) => {
                    if (typeof d.dish === "string" && d.id) {
                        d.dish = d.id
                        delete d.id;
                    }
                })

                clientApi.updateUserCart(copy)
                    .then(r => {
                        clientApi.getUserCart()
                            .then(res => {
                                setUserCart(res[0]);
                            })
                    })
            }
        }
    }

    const clearCartHandler = () => {
        const copy = JSON.parse(JSON.stringify(userCart));

        Object.assign(copy, { dishes_ordered: [] });
        delete copy.dishes;

        const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
        copy.address = defaultAddress.id ?? "";


        clientApi.updateUserCart(copy)
            .then(r => {
                clientApi.getUserCart()
                    .then(res => {
                        setUserCart(res[0]);
                    })
            })
    }

    const sortByDeliveryTime = (a: OrderForWorker, b: OrderForWorker) => Date.parse(a.delivery_time) - Date.parse(b.delivery_time)

    useEffect(() => {
        const mainApi = new MainApi();
        mainApi.getUserInfo()
            .then((r) => {
                if (!r.detail) {
                    setUserLogin(r);
                    selectedPage === 'login' && setSelectedPage('updData');
                }
            })

        mainApi.getDishes()
            .then(r => {
                !allDishes && setAllDishes(r);
            })

        setUserLogin(user ? user : defaultUser);
        setUserRegister(defaultUser);
        //eslint-disable-next-line
    }, [])

    useEffect(() => {
        if (user && user.id !== -1) {
            !editUser && setEditUser(user);


            if (user.role === 'client') {
                Promise.all([
                    clientApi.getOrdersHistory(),
                    clientApi.getUserCart(),
                    clientApi.getDeliveryAddresses(),
                    clientApi.getActiveCart(),
                ]).then(response => {
                    if (response[0] && response[0].length) {
                        const newHistory = response[0].filter((cart: any) => cart.status === "delivered" || cart.status === "cancelled").sort(sortByDeliveryTime)
                        setUserOrdersHistory(newHistory);
                    }

                    if (response[1].length === 0) {
                        clientApi.createUserCart()
                            .then((r: any) => {
                                r && r.id && clientApi.getUserCart(r.id)
                                    .then((res: any) => {
                                        setUserCart(res)
                                    })
                            })
                    }
                    else {
                        if (!response[1][0].address) {
                            const defaultAddress = response[2].find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                            if (defaultAddress) {
                                const copy = JSON.parse(JSON.stringify(response[1][0]))
                                copy.address = defaultAddress.id ?? "";

                                Object.assign(copy, { dishes_ordered: copy.dishes });
                                delete copy.dishes;
                                copy.dishes_ordered.forEach((d: any) => {
                                    if (typeof d.dish === "string" && d.id) {
                                        d.dish = d.id
                                        delete d.id;
                                    }
                                })

                                clientApi.updateUserCart(copy)
                                    .then(res => {
                                        setUserCart(res[0]);
                                    })
                            }
                            else {
                                (response[2][0] as DeliveryAddress).is_default = true
                                const copy = JSON.parse(JSON.stringify(response[1][0]))
                                copy.address = response[2][0].id ?? "";

                                Object.assign(copy, { dishes_ordered: copy.dishes });
                                delete copy.dishes;
                                copy.dishes_ordered.forEach((d: any) => {
                                    if (typeof d.dish === "string" && d.id) {
                                        d.dish = d.id
                                        delete d.id;
                                    }
                                })

                                clientApi.editDeliveryAddresses(response[2][0].id, true)
                                clientApi.updateUserCart(copy)
                                    .then(res => {
                                        setUserCart(res[0])
                                    })
                            }
                        }
                        else {
                            setUserCart(response[1][0])
                        }
                    }
                    setUserAddresses(response[2])
                    !newAddress && setNewAddress({
                        is_default: true,
                        delivery_address: "",
                        id: 0
                    })

                    if (response[3] && response[3].length > 0) {
                        const activeCarts = response[3].filter((cart: any) => cart.status !== "awaiting_payment");
                        setActiveUserCarts(activeCarts);
                    }
                })
            }
            if (user.role === 'courier') {
                Promise.all([
                    courierApi.getActiveOrders(),
                    courierApi.getOrdersHistory()
                ])
                    .then(responses => {
                        if (responses && responses.length) {
                            setCourierActiveOrders(responses[0])
                            setCourierHistory(responses[1])
                        }
                    })
            }
            if (user.role === 'manager') {
                Promise.all([
                    managerApi.getAllOrders(),
                    managerApi.getAllCouriers()
                ])
                    .then(responses => {
                        if (responses && responses.length) {
                            setAllOrders(responses[0].sort(sortByDeliveryTime));
                            setAllCouriers(responses[1]);
                        }
                    })
            }
        }
        //eslint-disable-next-line
    }, [user])


    const renderClientPages = () => {
        if (selectedPage === 'updData') return <>
            <h1 className="main-content__title">Изменить личные данные</h1>
            {editUser
                && <>
                    <h2 className="main-content__sub-title">Данные аккаунта</h2>

                    <div className="main-content__edit-user-info">
                        <div className="edit-user-info__form-item">
                            <label>Username</label>
                            <input
                                type="text"
                                className="create-login-form__input input-login"
                                value={editUser.username}
                                onChange={(e) => changeValue("username", e.target.value, 'edit')}
                                placeholder="Enter username"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Email</label>
                            <input
                                type="email"
                                className="edit-user-info__input input-email"
                                value={editUser.email}
                                onChange={(e) => changeValue("email", e.target.value, 'edit')}
                                placeholder="Enter email@email.com"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Phone number</label>
                            <input
                                type="text"
                                className="edit-user-info__input input-phone"
                                value={editUser.phone}
                                onChange={(e) => changeValue("phone", e.target.value, 'edit')}
                                placeholder="+79998887766"
                            />
                        </div>
                        <button
                            className="edit-user-info__button-submit"
                            onClick={() => {
                                if (user) {
                                    const mainApi = new MainApi();
                                    mainApi.editUserInfo(editUser)
                                        .then(r => {
                                            const tmp = JSON.parse(JSON.stringify(editUser));
                                            delete tmp.id;
                                            if (Object.keys(tmp).every(key => Object.keys(r).includes(key))) {
                                                alert('Данные успешно обновлены!')
                                            }
                                            else {
                                                alert(Object.keys(r).map(key => r[key]).join('\n'))
                                            }
                                        })
                                }
                            }}>
                            Обновить данные
                        </button>
                    </div>

                    <h2 className="main-content__sub-title">Адреса доставки</h2>
                    {userAddresses && <div className="addresses-list__list-item--add-address">
                        <p className="list-item__default-address--void" style={{ margin: 0 }}>Добавить адрес</p>
                        <input value={newAddress?.delivery_address} onChange={(e) => {
                            const copy = JSON.parse(JSON.stringify(newAddress)) as DeliveryAddress;
                            copy.delivery_address = e.target.value;
                            setNewAddress(copy);
                        }} />
                        <button
                            className="list-item__add-address-button"
                            onClick={() => {
                                if (newAddress && newAddress?.delivery_address !== "") {
                                    clientApi.addDeliveryAddresses(newAddress)
                                        .then(r => {
                                            clientApi.getDeliveryAddresses()
                                                .then(r => {
                                                    setUserAddresses(r)
                                                    setNewAddress({
                                                        is_default: true,
                                                        delivery_address: "",
                                                        id: 0
                                                    })
                                                })
                                        })
                                }
                            }}
                        >Добавить</button>
                        <div className="list-item__delete-button--void" />
                    </div>}
                    <div className="main-content__addresses-list">
                        {userAddresses
                            ?
                            <>
                                {userAddresses.sort((a, b) => (a.is_default === b.is_default) ? 0 : a.is_default ? -1 : 1).map(address => {
                                    return <>
                                        <div className="addresses-list__list-item">
                                            <button
                                                className="list-item__default-address"
                                                onClick={() => {
                                                    clientApi.editDeliveryAddresses(address.id, !address.is_default)
                                                        .then(r => {
                                                            clientApi.getDeliveryAddresses()
                                                                .then(r => setUserAddresses(r))
                                                        });
                                                }}
                                            >
                                                {address.is_default ? 'Доставлять сюда' : 'Выбран другой адрес'}
                                            </button>
                                            <p>{address.delivery_address}</p>
                                            <button
                                                className="list-item__delete-button"
                                                onClick={() => {
                                                    clientApi.deleteDeliveryAddresses(address.id)
                                                        .then(r => {
                                                            clientApi.getDeliveryAddresses()
                                                                .then(r => setUserAddresses(r))
                                                        });
                                                }}
                                            >Удалить</button>
                                        </div>
                                    </>
                                })}
                            </>
                            :
                            <>
                                <h2 className="main-content__sub-title">
                                    Адреса пока не были добавлены, но никогда не поздно сделать первый заказ!
                                    <div className="addresses-list__list-item--add-address">
                                        <div className="list-item__default-address--void" />
                                        <input value={newAddress?.delivery_address} onChange={(e) => {
                                            const copy = JSON.parse(JSON.stringify(newAddress)) as DeliveryAddress;
                                            copy.delivery_address = e.target.value;
                                            setNewAddress(copy);
                                        }} />
                                        <button
                                            className="list-item__add-address-button"
                                            onClick={() => {
                                                if (newAddress && newAddress?.delivery_address !== "") {
                                                    clientApi.addDeliveryAddresses(newAddress)
                                                        .then(r => {
                                                            clientApi.getDeliveryAddresses()
                                                                .then(r => setUserAddresses(r))
                                                        })
                                                }
                                            }}
                                        >Добавить</button>
                                        <div className="list-item__delete-button--void" />
                                    </div>
                                </h2>
                            </>
                        }
                    </div>
                </>
            }
        </>
        if (selectedPage === 'currOrder') return <>
            <h1 className="main-content__title">Текущий заказ</h1>

            {userCart
                ?
                <>
                    <div className="main-content__cart-container">

                        <div className="cart-container__left-cart">

                            <span className="left-cart__title"><b>Заказ в</b>
                                <select
                                    className="title__select-address"
                                    value={userCart.address}
                                    onChange={(e) => {
                                        const copy = JSON.parse(JSON.stringify(userCart));
                                        const newAddress = userAddresses?.find((address: DeliveryAddress) => e.target.value === address.delivery_address) as DeliveryAddress;
                                        copy.address = newAddress.id ?? "";


                                        Object.assign(copy, { dishes_ordered: copy.dishes });
                                        delete copy.dishes;
                                        copy.dishes_ordered.forEach((d: any) => {
                                            if (typeof d.dish === "string" && d.id) {
                                                d.dish = d.id
                                                delete d.id;
                                            }
                                        })

                                        clientApi.updateUserCart(copy)
                                            .then(r => {
                                                clientApi.getUserCart()
                                                    .then(res => {
                                                        setUserCart(res[0]);
                                                    })
                                            })
                                    }}
                                >
                                    {userAddresses && userAddresses.map(addr => {
                                        return <option value={addr.delivery_address}>{addr.delivery_address}</option>
                                    })}
                                </select>
                                <p className="title__status"><b>Статус: </b>{convertOrderStatus[userCart.status as keyof typeof convertOrderStatus]}</p>
                            </span>
                            <div className="left-cart__change-time"> <b>Время доставки: </b>
                                <input
                                    type="datetime-local"
                                    className="change-time__input-delvery-time"
                                    value={userCart.delivery_time}
                                    onChange={(e) => {
                                        const copy = JSON.parse(JSON.stringify(userCart));

                                        if (!copy.address) {
                                            const defaultAddress = userAddresses?.find((address: DeliveryAddress) => address.is_default) as DeliveryAddress;
                                            copy.address = defaultAddress.id ?? "";
                                        }
                                        else {
                                            const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                                            copy.address = address.id
                                        }

                                        copy.delivery_time = e.target.value;


                                        Object.assign(copy, { dishes_ordered: copy.dishes });
                                        delete copy.dishes;
                                        copy.dishes_ordered.forEach((d: any) => {
                                            if (typeof d.dish === "string" && d.id) {
                                                d.dish = d.id
                                                delete d.id;
                                            }
                                        })

                                        clientApi.updateUserCart(copy)
                                            .then(r => {
                                                clientApi.getUserCart()
                                                    .then(r => {
                                                        setUserCart(r[0]);
                                                    })
                                            })
                                    }}
                                />
                            </div>

                            <div className="left-cart__dishes-container">

                                <b>Стоимость заказа: </b> {userCart.total_cost} руб.

                                <div className="dishes-container__dishes-list">
                                    <b>Содержимое:</b><br />
                                    {userCart.dishes && userCart.dishes.length > 0 && userCart.dishes.map(dish => {
                                        return <>
                                            <p className="dishes-list__dish-item">
                                                <button
                                                    className="dish-item__remove-item"
                                                    onClick={() => removeDishHandler(dish.dish)}
                                                />
                                                <button
                                                    className="dish-item__inc-item"
                                                    onClick={() => addDishHandler(dish.dish)}
                                                />
                                                {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                            </p>
                                        </>
                                    })}
                                </div>
                            </div>

                            <div className="left-cart__divider" />

                            <div className="left-cart__buttons-container">
                                <button className="buttons-container__button" onClick={() => {
                                    window.open("https://vk.com/mark_stranger", "_blank")
                                    const copy = JSON.parse(JSON.stringify(userCart));
                                    copy.status = "awaiting_courier";

                                    const address = userAddresses?.find((add: DeliveryAddress) => add.delivery_address === copy.address) as DeliveryAddress;
                                    copy.address = address.id

                                    Object.assign(copy, { dishes_ordered: copy.dishes });
                                    delete copy.dishes;
                                    copy.dishes_ordered.forEach((d: any) => {
                                        if (typeof d.dish === "string" && d.id) {
                                            d.dish = d.id
                                            delete d.id;
                                        }
                                    })

                                    clientApi.updateUserCart(copy)
                                        .then(r => {
                                            clientApi.getUserCart()
                                                .then(r => {
                                                    setUserCart(r[0]);
                                                })
                                        })
                                }}>Оплатить</button>
                                <button className="buttons-container__button" onClick={clearCartHandler}>Очистить</button>
                            </div>

                        </div>


                        {activeUserCarts
                            &&
                            <>
                                <div className="cart-container__right-cart-container">
                                    {activeUserCarts.map(activeCart => {
                                        return <>
                                            <div className="cart-container__right-cart">
                                                <span className="right-cart__title">
                                                    <p className="title__select-address"><b>Заказ в</b> {activeCart.address}</p>
                                                    <p className="title__status"><b>Статус: </b>{convertOrderStatus[activeCart.status as keyof typeof convertOrderStatus]}</p>
                                                </span>
                                                <div className="right-cart__change-time"> <b>Время доставки: </b>
                                                    <p className="change-time__text">{activeCart.delivery_time.split("T")[0]} {activeCart.delivery_time.split("T")[1].slice(0, 5)}</p>
                                                </div>

                                                <div className="right-cart__dishes-container">

                                                    <b>Стоимость заказа: </b> {activeCart.total_cost} руб.

                                                    <div className="dishes-container__dishes-list">
                                                        <b>Содержимое:</b><br />
                                                        {activeCart.dishes && activeCart.dishes.length > 0 && activeCart.dishes.map(dish => {
                                                            return <>
                                                                <p className="dishes-list__dish-item">
                                                                    {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                                                </p>
                                                            </>
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="right-cart__divider" />

                                                <div className="right-cart__buttons-container">
                                                    <button className="buttons-container__button" onClick={() => {
                                                        clientApi.updateActiveCart(activeCart.id)
                                                            .then(r => {
                                                                clientApi.getActiveCart()
                                                                    .then(r => {
                                                                        setActiveUserCarts(r);
                                                                    })

                                                                clientApi.getOrdersHistory()
                                                                    .then(r => {
                                                                        setUserOrdersHistory(r);
                                                                    })
                                                            })

                                                    }}>Отменить</button>
                                                </div>
                                            </div>
                                        </>
                                    })}
                                </div>
                            </>
                        }
                    </div>
                </>
                :
                <>
                    <h2 className="main-content__sub-title">Корзина пуста</h2>
                </>
            }
        </>
        if (selectedPage === 'allOrders') return <>
            <h1 className="main-content__title">История заказов</h1>

            {userOrdersHistory
                ?
                <>
                    <div className="main-content__list-container">
                        {userOrdersHistory.map(order => {
                            return <>
                                <div className="list-container__list-item">
                                    <h4 className="list-item__title">Заказ от {order.delivery_time.split('T').at(0)} - {convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</h4>
                                    <p className="list-item__cost"><b>Стоимость:</b> {order.total_cost} руб.</p>
                                    <p className="list-item__count-dishes"><b>Кол-во блюд:</b> {order.count_dishes}</p>
                                    <p className="list-item__address"><b>Адрес:</b> {order.address}</p>
                                    <p className="list-item__comment"><b>Комментарий:</b> {order.comment}</p>
                                    <p><b>Блюда в заказе:</b></p>
                                    <div className="list-item__dishes-list">
                                        {order.dishes.map(dish => {
                                            return <>
                                                <div className="dishes-list__list-item">
                                                    <p>{dish.dish}</p>
                                                    <p>Кол-во: {dish.quantity}</p>
                                                </div>
                                            </>
                                        })}
                                    </div>
                                </div>
                            </>
                        })}
                    </div>
                </>
                :
                <>
                    <h2 className="main-content__sub-title">Заказов ещё не было, но никогда не поздно начать!</h2>
                </>
            }
        </>
    }

    const renderCourierPages = () => {
        if (selectedPage === 'updData') return <>
            <h1 className="main-content__title">Изменить личные данные</h1>
            {editUser
                && <>
                    <h2 className="main-content__sub-title">Данные аккаунта</h2>

                    <div className="main-content__edit-user-info">
                        <div className="edit-user-info__form-item">
                            <label>Username</label>
                            <input
                                type="text"
                                className="create-login-form__input input-login"
                                value={editUser.username}
                                onChange={(e) => changeValue("username", e.target.value, 'edit')}
                                placeholder="Enter username"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Email</label>
                            <input
                                type="email"
                                className="edit-user-info__input input-email"
                                value={editUser.email}
                                onChange={(e) => changeValue("email", e.target.value, 'edit')}
                                placeholder="Enter email@email.com"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Phone number</label>
                            <input
                                type="text"
                                className="edit-user-info__input input-phone"
                                value={editUser.phone}
                                onChange={(e) => changeValue("phone", e.target.value, 'edit')}
                                placeholder="+79998887766"
                            />
                        </div>
                        <button
                            className="edit-user-info__button-submit"
                            onClick={() => {
                                if (user) {
                                    const mainApi = new MainApi();
                                    mainApi.editUserInfo(editUser)
                                        .then(r => {
                                            const tmp = JSON.parse(JSON.stringify(editUser));
                                            delete tmp.id;
                                            if (Object.keys(tmp).every(key => Object.keys(r).includes(key))) {
                                                alert('Данные успешно обновлены!')
                                            }
                                            else {
                                                alert(Object.keys(r).map(key => r[key]).join('\n'))
                                            }
                                        })
                                }
                            }}>
                            Обновить данные
                        </button>
                    </div>
                </>
            }
        </>
        if (selectedPage === 'currOrder') return <>
            <h1 className="main-content__title">Текущий заказ</h1>
            {courierActiveOrders ? courierActiveOrders.map(order => {
                return <div className="cart-container__left-cart--courier">

                    <span className="left-cart__title"><b>Заказ в</b>
                        <p className="title__select-address">{order.address.address}</p>
                        <p className="title__status"><b>Статус: </b>{convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</p>
                    </span>
                    <div className="left-cart__change-time"> <b>Время доставки: </b>
                        <p className="change-time__input-delvery-time">{order.delivery_time.split("T").join(" - ")}</p>
                    </div>

                    <div className="left-cart__dishes-container">

                        <b>Стоимость заказа: </b> {order.total_cost} руб.

                        <div className="dishes-container__dishes-list">
                            <b>Содержимое:</b><br />
                            {order.orderdish_set && order.orderdish_set.length > 0 && order.orderdish_set.map(dish => {
                                return <>
                                    <p className="dishes-list__dish-item">
                                        {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                    </p>
                                </>
                            })}
                        </div>
                    </div>

                    <div className="left-cart__comment">
                        <b>Комментарий:</b><br />
                        <p>{order.comment}</p>
                    </div>
                </div>
            }) : <></>}
        </>
        if (selectedPage === 'allOrders') return <>
            <h1 className="main-content__title">История заказов</h1>
            {courierHistory ? courierHistory.map(order => {
                return <div className="cart-container__left-cart--courier">

                    <span className="left-cart__title"><b>Заказ в</b>
                        <p className="title__select-address">{order.address ? order.address.address : ""}</p>
                        <p className="title__status"><b>Статус: </b>{convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</p>
                    </span>
                    <div className="left-cart__change-time"> <b>Время доставки: </b>
                        <p className="change-time__input-delvery-time">{order.delivery_time.split("T").join(" - ")}</p>
                    </div>

                    <div className="left-cart__dishes-container">

                        <b>Стоимость заказа: </b> {order.total_cost} руб.

                        <div className="dishes-container__dishes-list">
                            <b>Содержимое:</b><br />
                            {order.orderdish_set && order.orderdish_set.length > 0 && order.orderdish_set.map(dish => {
                                return <>
                                    <p className="dishes-list__dish-item">
                                        {dish.dish} - {dish.quantity} шт. ({getDishTotalCostById(dish.id, dish.quantity)} руб.)
                                    </p>
                                </>
                            })}
                        </div>
                    </div>

                    <div className="left-cart__comment">
                        <b>Комментарий:</b><br />
                        <p>{order.comment}</p>
                    </div>
                </div>
            }) : <></>}
        </>
    }

    const renderManagerPages = () => {
        if (selectedPage === 'updData') return <>
            <h1 className="main-content__title">Изменить личные данные</h1>
            {editUser
                && <>
                    <h2 className="main-content__sub-title">Данные аккаунта</h2>

                    <div className="main-content__edit-user-info">
                        <div className="edit-user-info__form-item">
                            <label>Username</label>
                            <input
                                type="text"
                                className="create-login-form__input input-login"
                                value={editUser.username}
                                onChange={(e) => changeValue("username", e.target.value, 'edit')}
                                placeholder="Enter username"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Email</label>
                            <input
                                type="email"
                                className="edit-user-info__input input-email"
                                value={editUser.email}
                                onChange={(e) => changeValue("email", e.target.value, 'edit')}
                                placeholder="Enter email@email.com"
                            />
                        </div>
                        <div className="edit-user-info__form-item">
                            <label>Phone number</label>
                            <input
                                type="text"
                                className="edit-user-info__input input-phone"
                                value={editUser.phone}
                                onChange={(e) => changeValue("phone", e.target.value, 'edit')}
                                placeholder="+79998887766"
                            />
                        </div>
                        <button
                            className="edit-user-info__button-submit"
                            onClick={() => {
                                if (user) {
                                    const mainApi = new MainApi();
                                    mainApi.editUserInfo(editUser)
                                        .then(r => {
                                            const tmp = JSON.parse(JSON.stringify(editUser));
                                            delete tmp.id;
                                            if (Object.keys(tmp).every(key => Object.keys(r).includes(key))) {
                                                alert('Данные успешно обновлены!')
                                            }
                                            else {
                                                alert(Object.keys(r).map(key => r[key]).join('\n'))
                                            }
                                        })
                                }
                            }}>
                            Обновить данные
                        </button>
                    </div>
                </>
            }
        </>
        if (selectedPage === 'allOrders') return <>
            <div className="main-content__list-container">

                <dialog ref={editOrderRef}>
                    {editedOrder && <>
                        <h4 className="list-item__title">Заказ от {editedOrder.delivery_time.split('T').at(0)} - {convertOrderStatus[editedOrder.status as keyof typeof convertOrderStatus]}</h4>
                        <p className="list-item__about-client">
                            <b>Клиент:</b> {editedOrder.user.username} | {editedOrder.user.phone} | {editedOrder.user.email}
                        </p>
                        <p className="list-item__about-courier">
                            <b>Курьер:</b> <select
                                className=""
                                value={editedOrder.courier ? `${editedOrder.courier.id} - ${editedOrder.courier.username}` : ''}
                                onChange={(e) => {
                                    const courierId = e.target.value.split(' - ').at(0);
                                    if (courierId && allCouriers) {
                                        const courier = allCouriers.find(c => c.id === Number.parseInt(courierId))
                                        if (courier) {
                                            const copy = JSON.parse(JSON.stringify(editedOrder)) as OrderForWorker;
                                            copy.courier = courier;
                                            setEditedOrder(copy);
                                            managerApi.editOrder(copy)
                                                .then(r => {
                                                    managerApi.getAllOrders()
                                                        .then(res => setAllOrders(res.sort(sortByDeliveryTime)))
                                                })
                                        }
                                    }
                                }}
                            >
                                {allCouriers && allCouriers.map((courier) => {
                                    return <>
                                        <option>{courier.id} - {courier.username}</option>
                                    </>
                                })}
                            </select>
                            {!editedOrder.courier && <img src={AttentionIcon} alt="attention" style={{ maxHeight: "25px", aspectRatio: "1" }} />}
                        </p>
                        <p className="list-item__cost"><b>Стоимость:</b> {editedOrder.total_cost} руб.</p>
                        <p className="list-item__count-dishes"><b>Кол-во блюд:</b> {editedOrder.count_dishes}</p>
                        <p className="list-item__address"><b>Адрес:</b> {editedOrder.address ? editedOrder.address.address : ''}</p>
                        <p className="list-item__comment"><b>Комментарий:</b> {editedOrder.comment}</p>
                        <p><b>Блюда в заказе:</b></p>
                        <div className="list-item__dishes-list">
                            {editedOrder.orderdish_set.map(dish => {
                                return <>
                                    <div className="dishes-list__list-item">
                                        <p>{dish.dish}</p>
                                        <p>Кол-во: {dish.quantity}</p>
                                    </div>
                                </>
                            })}
                        </div>
                    </>}
                    <button onClick={() => editOrderRef.current?.close()}>Выйти</button>
                </dialog>

                {allOrders && allOrders.map(order => {
                    return <>
                        <div className={"list-container__list-item" + (user && user.role === 'manager' ? "--manager" : "")}>

                            {user && user.role === 'manager' ?
                                <>
                                    <button
                                        className="list-item__edit-button"
                                        style={{ backgroundImage: `url(${EditIcon})` }}
                                        onClick={() => {
                                            editOrderRef.current && editOrderRef.current.showModal();
                                            setEditedOrder(order);
                                        }}
                                    />
                                    <p className="list-item__title">Заказ от {order.delivery_time.split('T').at(0)} - {convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</p>
                                    <p className="list-item__about-client"><b>Клиент:</b> {order.user.username}</p>
                                    <p className="list-item__about-courier"><b>Курьер:</b> {order.courier ? order.courier.username : ''}</p>
                                </>
                                : <>
                                    <h4 className="list-item__title">Заказ от {order.delivery_time.split('T').at(0)} - {convertOrderStatus[order.status as keyof typeof convertOrderStatus]}</h4>
                                    <p className="list-item__about-client">
                                        <b>Клиент:</b> {order.user.username} | {order.user.phone} | {order.user.email}
                                    </p>
                                    <p className="list-item__about-courier">
                                        <b>Курьер:</b> <select
                                            className=""
                                            value={order.courier ? `${order.courier.id} - ${order.courier.username}` : ''}
                                            onChange={(e) => {
                                                const courierId = e.target.value.split(' - ').at(0);
                                                if (courierId && allCouriers) {
                                                    const courier = allCouriers.find(c => c.id === Number.parseInt(courierId))
                                                    if (courier) {
                                                        const copy = JSON.parse(JSON.stringify(order)) as OrderForWorker;
                                                        copy.courier = courier;
                                                        managerApi.editOrder(copy)
                                                            .then(r => {
                                                                managerApi.getAllOrders()
                                                                    .then(res => setAllOrders(res.sort(sortByDeliveryTime)))
                                                            })
                                                    }
                                                }
                                            }}
                                        >
                                            {allCouriers && allCouriers.map((courier) => {
                                                return <>
                                                    <option>{courier.id} - {courier.username}</option>
                                                </>
                                            })}
                                        </select>
                                        {!order.courier && <img src={AttentionIcon} alt="attention" style={{ maxHeight: "25px", aspectRatio: "1" }} />}
                                    </p>
                                    <p className="list-item__cost"><b>Стоимость:</b> {order.total_cost} руб.</p>
                                    <p className="list-item__count-dishes"><b>Кол-во блюд:</b> {order.count_dishes}</p>
                                    <p className="list-item__address"><b>Адрес:</b> {order.address ? order.address.address : ''}</p>
                                    <p className="list-item__comment"><b>Комментарий:</b> {order.comment}</p>
                                    <p><b>Блюда в заказе:</b></p>
                                    <div className="list-item__dishes-list">
                                        {order.orderdish_set.map(dish => {
                                            return <>
                                                <div className="dishes-list__list-item">
                                                    <p>{dish.dish}</p>
                                                    <p>Кол-во: {dish.quantity}</p>
                                                </div>
                                            </>
                                        })}
                                    </div>
                                </>}
                        </div>
                    </>
                })}
            </div>
        </>
        if (selectedPage === 'allCouriers') return <>
            <div className="main-content__list-container">
                {allCouriers && allCouriers.map(courier => {

                    const courierOrders = allOrders ? allOrders?.filter(order => order.courier && order.courier.id === courier.id) : []

                    return <>
                        <div className="list-container__list-item">
                            <h4 className="list-item__title">Курьер: {courier.username}</h4>
                            <p className="list-item__email"><b>Email:</b> {courier.email}</p>
                            <p className="list-item__phone"><b>Номер телефона:</b> {courier.phone}</p>
                            {courierOrders
                                && courierOrders.length
                                ? <>
                                    <p><b>Активные заказы ({courierOrders.length}):</b></p>
                                    <div className="list-item__dishes-list">
                                        {courierOrders.map(order => {
                                            return <>
                                                <div className="dishes-list__list-item">
                                                    <p>Время: {order.delivery_time.split('T').join(' ')}</p>
                                                    <p>Место: {order.address ? order.address.address : ''}</p>
                                                </div>
                                            </>
                                        })}
                                    </div>
                                </> : <>Нет активных заказов</>}
                        </div>
                    </>
                })}
            </div>
        </>
    }

    return <>
        <div className="user-page">

            <div className="user-page__header">
                <Link to="/" className="header__return">Назад</Link>
                <p className="header__title">Личный кабинет {user ? user.username : ''}</p>
                <button className="header__logout" onClick={() => {
                    setUser(null);
                    setUserLogin(defaultUser);
                    document.cookie = `sessionToken=`
                }} />
            </div>

            <div className="user-page__nav-bar">
                {userLogin?.id === -1
                    ? <>
                        <button className="nav-bar__nav-item" disabled>Войти</button>
                    </>
                    :
                    <>
                        {userLogin?.role === 'client'
                            &&
                            <>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('currOrder')}>Текущий заказ</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('allOrders')}>Список оплаченных заказов</button>
                            </>
                        }
                        {userLogin?.role === 'courier'
                            &&
                            <>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('currOrder')}>Активный заказ</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('allOrders')}>Список доставленных заказов</button>
                            </>
                        }
                        {userLogin?.role === 'manager'
                            &&
                            <>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('updData')}>Изменить личные данные</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('allOrders')}>Список всех заказов</button>
                                <button className="nav-bar__nav-item" onClick={() => setSelectedPage('allCouriers')}>Список всех курьеров</button>
                            </>
                        }
                    </>}
            </div>

            <div className="user-page__main-content">

                {userLogin
                    && userLogin?.id === -1
                    && userRegister
                    ? <>
                        <h1 className="main-content__header">Войти в аккаунт или зарегистрироваться</h1>
                        <div className="main-content__forms-container">
                            <div className="forms-container__create-login-form">
                                <h4 className="create-login-form__form-title">Создать аккаунт</h4>
                                <div className="create-login-form__form-item">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        className="create-login-form__input input-login"
                                        value={userRegister.username}
                                        onChange={(e) => changeValue("username", e.target.value, 'register')}
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="create-login-form__input input-email"
                                        value={userRegister.email}
                                        onChange={(e) => changeValue("email", e.target.value, 'register')}
                                        placeholder="Enter email@email.com"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Phone number</label>
                                    <input
                                        type="text"
                                        className="create-login-form__input input-phone"
                                        value={userRegister.phone}
                                        onChange={(e) => changeValue("phone", e.target.value, 'register')}
                                        placeholder="+79998887766"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        className="create-login-form__input input-passwd"
                                        value={userRegisterPass}
                                        onChange={(e) => setUserRegisterPass(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div className="create-login-form__form-item">
                                    <label>Password {userRegisterPass !== "" && tmpPass !== "" && userRegisterPass !== tmpPass ? "Not eval" : ""}</label>
                                    <input
                                        type="password"
                                        className="create-login-form__input input-passwd"
                                        value={tmpPass}
                                        onChange={(e) => setTmpPass(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <button
                                    className="create-login-form__button-submit"
                                    disabled={!userRegister.email || !userRegisterPass}
                                    onClick={() => console.log(userRegister, { userPass: userRegisterPass })}>
                                    Create Login
                                </button>
                            </div>

                            <div className="forms-container__login-form">
                                <h4 className="create-login-form__form-title ">Войти</h4>
                                <div className="login-form__form-item">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="create-login-form__input input-email"
                                        value={userLogin.email}
                                        onChange={(e) => changeValue("email", e.target.value, 'login')}
                                        placeholder="Enter email@email.com"
                                    />
                                </div>
                                <div className="login-form__form-item">
                                    <label>Password</label>
                                    <input
                                        type="password"
                                        className="create-login-form__input input-passwd"
                                        value={userLoginPass}
                                        onChange={(e) => setUserLoginPass(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <button
                                    className="login-form__button-submit"
                                    disabled={!userLogin.email || !userLoginPass}
                                    onClick={() => {
                                        const mainApi = new MainApi();
                                        mainApi.authUser(userLogin, userLoginPass)
                                            .then(async (r) => {
                                                let res = await mainApi.getUserInfo();
                                                if (!res.detail) {
                                                    setUserLogin(res as User);
                                                    setUser(res as User);
                                                    setSelectedPage('currOrder')
                                                }

                                            })
                                    }}>
                                    Login
                                </button>
                            </div>
                        </div>
                    </>
                    :
                    <>
                        {userLogin?.role === 'client' && renderClientPages()}
                        {userLogin?.role === 'courier' && renderCourierPages()}
                        {userLogin?.role === 'manager' && renderManagerPages()}
                    </>}
            </div>
        </div >
    </>
}